/**
 * Event Handlers Registry
 * 
 * Maps event types to handler functions
 * Orchestrates cross-context event processing
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import { EventTypes, type EventEnvelope } from '../events/index.js'
import { handleContributionApproved } from './agreements.js'
import { handleAllocationApproved, handleDistributionCompleted } from './treasury.js'

/**
 * Event handler function signature
 */
export type EventHandler = (
  db: DatabaseClient,
  event: EventEnvelope
) => Promise<void>

/**
 * Registry of event handlers by event type
 */
export const eventHandlers: Record<string, EventHandler> = {
  // People → Agreements
  [EventTypes.CONTRIBUTION_APPROVED]: handleContributionApproved,

  // Agreements → Treasury
  [EventTypes.ALLOCATION_APPROVED]: handleAllocationApproved,
  [EventTypes.DISTRIBUTION_COMPLETED]: handleDistributionCompleted,
}

/**
 * Process an event by dispatching to appropriate handler
 */
export async function processEvent(
  db: DatabaseClient,
  event: EventEnvelope
): Promise<void> {
  const handler = eventHandlers[event.eventType]

  if (!handler) {
    console.log(`No handler for event type: ${event.eventType}`)
    return
  }

  console.log(`Processing event: ${event.eventType} (${event.eventId})`)

  try {
    await handler(db, event)
    console.log(`✓ Event processed: ${event.eventId}`)
  } catch (error) {
    console.error(`✗ Event processing failed: ${event.eventId}`, error)
    throw error // Re-throw for dead-letter queue handling
  }
}

/**
 * Start event consumer worker
 */
export async function startEventConsumer(
  db: DatabaseClient,
  eventBus: any // EventBus type from worker package
): Promise<void> {
  console.log('Starting event consumer...')

  // Subscribe to all queues
  const queues = ['habitat.treasury', 'habitat.people', 'habitat.agreements']

  for (const queue of queues) {
    await eventBus.subscribe(queue, async (event: EventEnvelope) => {
      await processEvent(db, event)
    })
  }

  console.log('✓ Event consumer started')
}
