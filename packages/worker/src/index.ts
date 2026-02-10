/**
 * Event Worker Entry Point
 * 
 * Starts event consumer to process cross-context events
 */

import { createDatabaseClient } from '@habitat/api/db/client'
import { getConfig } from '@habitat/api/config'
import { createEventBus } from './events/bus.js'
import { startEventConsumer } from './handlers/index.js'

async function main() {
  console.log('Habitat Event Worker starting...')

  // Load configuration
  const config = getConfig()

  // Connect to database
  console.log('Connecting to database...')
  const db = await createDatabaseClient(config.database)

  // Connect to event bus
  console.log('Connecting to event bus...')
  const eventBus = createEventBus()
  await eventBus.connect()

  // Start event consumer
  await startEventConsumer(db, eventBus)

  console.log('✓ Event Worker running')

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down gracefully...')
    
    await eventBus.close()
    console.log('✓ Event bus closed')
    
    if ('end' in db) {
      await (db as any).end()
      console.log('✓ Database connections closed')
    }
    
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((error) => {
  console.error('Worker failed to start:', error)
  process.exit(1)
})
