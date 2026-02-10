/**
 * Idempotency Tracking
 * 
 * Ensures event handlers are idempotent on replay
 * Tracks processed events to prevent duplicate processing
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import type { UUID } from '@habitat/shared'

/**
 * Check if an event has already been processed
 */
export async function isEventProcessed(
  db: DatabaseClient,
  eventId: UUID
): Promise<boolean> {
  if ('from' in db) {
    // Supabase
    const { data, error } = await db
      .from('processed_events')
      .select('event_id')
      .eq('event_id', eventId)
      .single()
    
    return !error && data !== null
  } else {
    // PostgreSQL
    const result = await db.query(
      'SELECT event_id FROM processed_events WHERE event_id = $1',
      [eventId]
    )
    return result.rows.length > 0
  }
}

/**
 * Mark an event as processed
 */
export async function markEventProcessed(
  db: DatabaseClient,
  eventId: UUID,
  eventType: string,
  handlerName: string
): Promise<void> {
  const now = new Date().toISOString()

  if ('from' in db) {
    // Supabase
    await db
      .from('processed_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        handler_name: handlerName,
        processed_at: now,
      })
  } else {
    // PostgreSQL
    await db.query(
      `INSERT INTO processed_events (event_id, event_type, handler_name, processed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType, handlerName, now]
    )
  }
}

/**
 * Wrap handler with idempotency check
 */
export async function withIdempotency<T>(
  db: DatabaseClient,
  eventId: UUID,
  eventType: string,
  handlerName: string,
  handler: () => Promise<T>
): Promise<T | null> {
  // Check if already processed
  const processed = await isEventProcessed(db, eventId)
  
  if (processed) {
    console.log(`Event ${eventId} already processed by ${handlerName}, skipping`)
    return null
  }

  // Execute handler
  const result = await handler()

  // Mark as processed
  await markEventProcessed(db, eventId, eventType, handlerName)

  return result
}
