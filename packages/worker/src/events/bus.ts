/**
 * Event Bus Connection
 * 
 * RabbitMQ-based event bus for pub/sub messaging
 * Supports multiple exchange topologies (direct, topic, fanout)
 */

import amqp from 'amqplib'
import type { Channel, Connection } from 'amqplib'
import type { EventEnvelope } from './schema.js'

export interface EventBusConfig {
  url: string
  exchange: string
  exchangeType: 'direct' | 'topic' | 'fanout'
  queues?: QueueConfig[]
  prefetch?: number
  reconnectInterval?: number
}

export interface QueueConfig {
  name: string
  routingKey?: string
  durable?: boolean
  exclusive?: boolean
  autoDelete?: boolean
}

/**
 * Event Bus client for publishing and consuming events
 */
export class EventBus {
  private connection: Connection | null = null
  private channel: Channel | null = null
  private config: EventBusConfig
  private reconnectTimer: NodeJS.Timeout | null = null

  constructor(config: EventBusConfig) {
    this.config = {
      prefetch: 10,
      reconnectInterval: 5000,
      ...config,
    }
  }

  /**
   * Connect to RabbitMQ and declare exchange/queues
   */
  async connect(): Promise<void> {
    try {
      console.log(`Connecting to RabbitMQ at ${this.config.url}...`)
      
      this.connection = await amqp.connect(this.config.url)
      this.channel = await this.connection.createChannel()

      // Set prefetch for fair dispatch
      await this.channel.prefetch(this.config.prefetch!)

      // Declare exchange
      await this.channel.assertExchange(
        this.config.exchange,
        this.config.exchangeType,
        { durable: true }
      )

      console.log(`✓ Exchange '${this.config.exchange}' (${this.config.exchangeType}) declared`)

      // Declare queues and bindings
      if (this.config.queues) {
        for (const queueConfig of this.config.queues) {
          await this.channel.assertQueue(queueConfig.name, {
            durable: queueConfig.durable !== false,
            exclusive: queueConfig.exclusive || false,
            autoDelete: queueConfig.autoDelete || false,
          })

          // Bind queue to exchange
          if (queueConfig.routingKey) {
            await this.channel.bindQueue(
              queueConfig.name,
              this.config.exchange,
              queueConfig.routingKey
            )
            console.log(`✓ Queue '${queueConfig.name}' bound to '${queueConfig.routingKey}'`)
          }
        }
      }

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err)
        this.reconnect()
      })

      this.connection.on('close', () => {
        console.warn('RabbitMQ connection closed')
        this.reconnect()
      })

      console.log('✓ Event bus connected')
    } catch (error) {
      console.error('Failed to connect to event bus:', error)
      this.reconnect()
      throw error
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    if (this.reconnectTimer) return

    console.log(`Reconnecting in ${this.config.reconnectInterval}ms...`)
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch (error) {
        console.error('Reconnection failed:', error)
      }
    }, this.config.reconnectInterval)
  }

  /**
   * Publish an event to the exchange
   */
  async publish<T>(
    event: EventEnvelope<T>,
    routingKey?: string
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Event bus not connected')
    }

    const key = routingKey || event.eventType
    const message = Buffer.from(JSON.stringify(event))

    try {
      const published = this.channel.publish(
        this.config.exchange,
        key,
        message,
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now(),
          messageId: event.eventId,
          type: event.eventType,
        }
      )

      if (!published) {
        console.warn(`Event ${event.eventId} not published (buffer full)`)
      }

      return published
    } catch (error) {
      console.error('Failed to publish event:', error)
      throw error
    }
  }

  /**
   * Subscribe to events on a queue
   */
  async subscribe<T = unknown>(
    queueName: string,
    handler: (event: EventEnvelope<T>) => Promise<void>,
    options?: {
      noAck?: boolean
    }
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Event bus not connected')
    }

    await this.channel.consume(
      queueName,
      async (msg) => {
        if (!msg) return

        try {
          const event = JSON.parse(msg.content.toString()) as EventEnvelope<T>

          console.log(`Processing event ${event.eventType} (${event.eventId})`)
          
          await handler(event)

          // Acknowledge message
          if (!options?.noAck) {
            this.channel!.ack(msg)
          }
        } catch (error) {
          console.error('Event handler error:', error)
          
          // Reject and requeue
          this.channel!.nack(msg, false, true)
        }
      },
      {
        noAck: options?.noAck || false,
      }
    )

    console.log(`✓ Subscribed to queue '${queueName}'`)
  }

  /**
   * Close connection gracefully
   */
  async close(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.channel) {
      await this.channel.close()
      this.channel = null
    }

    if (this.connection) {
      await this.connection.close()
      this.connection = null
    }

    console.log('✓ Event bus closed')
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null
  }
}

/**
 * Create event bus from environment configuration
 */
export function createEventBus(): EventBus {
  const config: EventBusConfig = {
    url: process.env.RABBITMQ_URL || 'amqp://localhost',
    exchange: process.env.EVENT_EXCHANGE || 'habitat.events',
    exchangeType: (process.env.EVENT_EXCHANGE_TYPE as 'direct' | 'topic' | 'fanout') || 'topic',
    queues: [
      {
        name: 'habitat.treasury',
        routingKey: 'treasury.#',
        durable: true,
      },
      {
        name: 'habitat.people',
        routingKey: 'people.#',
        durable: true,
      },
      {
        name: 'habitat.agreements',
        routingKey: 'agreements.#',
        durable: true,
      },
    ],
    prefetch: parseInt(process.env.EVENT_PREFETCH || '10', 10),
    reconnectInterval: parseInt(process.env.EVENT_RECONNECT_INTERVAL || '5000', 10),
  }

  return new EventBus(config)
}
