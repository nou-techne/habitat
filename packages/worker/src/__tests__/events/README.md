# Event Contract Tests

Contract tests for event sourcing (Layer 4 - Event), verifying that events publish, consume, and process correctly with idempotency guarantees.

## Test Files

### `schema.test.ts`

Tests event schema definitions and structure.

**Validates:**
- All event types defined
- Consistent naming pattern (entity.action)
- BaseEvent structure (eventId, eventType, timestamp, payload)
- Event-specific payload schemas
- Required vs optional fields
- Field types (Date, string, etc.)
- ID format consistency (evt_)
- Timestamp format (Date objects)
- Amount format (string with precision)
- Metadata structure
- Event versioning support
- Schema completeness

**Example:**
```typescript
it('should have required payload fields', () => {
  const event: ContributionSubmittedEvent = {
    eventId: 'evt_123',
    eventType: EventType.ContributionSubmitted,
    timestamp: new Date(),
    payload: {
      contributionId: 'contrib_123',
      memberId: 'member_123',
      periodId: 'period_123',
      contributionType: 'labor',
      amount: '100.00',
    },
  };
  
  expect(event.payload.contributionId).toBeTruthy();
  expect(event.payload.amount).toBeTruthy();
});
```

### `integration.test.ts`

Tests event publishing, consumption, and idempotency.

**Tests:**
- **Event Publishing:**
  - Publish to RabbitMQ queue
  - Correct serialization
  - Queue stats verification

- **Event Consumption:**
  - Handler processes events
  - Database updates applied
  - processed_events tracking
  - Error handling for missing entities

- **Idempotency:**
  - Same event not processed twice
  - event_id as idempotency key
  - Retry after error allowed
  - Duplicate detection

- **Event Ordering:**
  - Sequential processing for same entity
  - Timestamp-based ordering
  - State consistency

- **Error Handling:**
  - Errors recorded in processed_events
  - Other events continue processing
  - Graceful degradation

- **Metadata:**
  - Preserved through publish/consume
  - Correlation tracking
  - Causation tracking

- **Concurrency:**
  - Different entities processed concurrently
  - No race conditions
  - Idempotency under concurrency

**Example:**
```typescript
it('should not process same event twice', async () => {
  const event: ContributionSubmittedEvent = { /* ... */ };
  
  // First processing
  await handleContributionSubmitted(event, pool);
  
  // Second processing (should be skipped)
  await handleContributionSubmitted(event, pool);
  
  // Verify only one processed_events record
  const result = await pool.query(
    'SELECT COUNT(*) FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  expect(parseInt(result.rows[0].count)).toBe(1);
});
```

## Running Tests

```bash
# Run all event tests
pnpm test events

# Run specific test file
pnpm test schema.test
pnpm test integration.test

# Watch mode
pnpm test events --watch

# With coverage
pnpm test events --coverage
```

## Test Requirements

### Database

Integration tests require test database:

```bash
export DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test
```

### RabbitMQ

Integration tests require RabbitMQ:

```bash
export RABBITMQ_URL=amqp://localhost
```

Or use Docker:

```bash
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management-alpine
```

### Schema Applied

Database schema must exist:

```bash
psql $DATABASE_URL < schema/01_treasury_core.sql
psql $DATABASE_URL < schema/06_processed_events.sql
# ... etc
```

## Event Types

### Contribution Events

- `contribution.submitted` - New contribution created
- `contribution.approved` - Contribution approved by steward
- `contribution.rejected` - Contribution rejected

### Period Events

- `period.closed` - Allocation period closed

### Allocation Events

- `allocation.calculated` - Allocation amounts calculated
- `allocation.distributed` - Allocations paid out

### Payment Events

- `payment.initiated` - Payment process started
- `payment.completed` - Payment confirmed

## Event Schema Pattern

```typescript
interface BaseEvent {
  eventId: string;           // Unique ID (evt_xxx)
  eventType: EventType;      // Event type enum
  timestamp: Date;           // When event occurred
  payload: Record<string, any>; // Event-specific data
  metadata?: {               // Optional metadata
    source?: string;         // Event source (api, worker, etc.)
    userId?: string;         // User who triggered event
    correlationId?: string;  // Request correlation
    causationId?: string;    // Causing event ID
    version?: string;        // Schema version
  };
}
```

## Idempotency

### How It Works

1. Event handler checks `processed_events` table
2. If `event_id` exists, skip processing
3. If not, process and insert record
4. Unique constraint on `event_id` prevents duplicates

### Database Table

```sql
CREATE TABLE processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,  -- 'pending', 'success', 'error'
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Testing Idempotency

```typescript
it('should not process same event twice', async () => {
  const event = { /* ... */ };
  
  // Process first time
  await handleEvent(event, pool);
  
  // Check processed
  const firstResult = await pool.query(
    'SELECT * FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  expect(firstResult.rows.length).toBe(1);
  
  // Process second time (should skip)
  await handleEvent(event, pool);
  
  // Still only one record
  const secondResult = await pool.query(
    'SELECT * FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  expect(secondResult.rows.length).toBe(1);
});
```

## Event Publishing

### Publisher Function

```typescript
async function publishEvent(
  eventBus: EventBus,
  event: BaseEvent
): Promise<void> {
  await eventBus.publish(event.eventType, event);
}
```

### Testing Publishing

```typescript
it('should publish event to queue', async () => {
  const event: ContributionSubmittedEvent = { /* ... */ };
  
  await publishEvent(eventBus, event);
  
  // Wait for message to be queued
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify queue has message
  const stats = await eventBus.getQueueStats();
  expect(stats.messageCount).toBeGreaterThanOrEqual(0);
});
```

## Event Handlers

### Handler Pattern

```typescript
async function handleContributionSubmitted(
  event: ContributionSubmittedEvent,
  pool: pg.Pool
): Promise<void> {
  // Check idempotency
  const existing = await pool.query(
    'SELECT id FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  
  if (existing.rows.length > 0) {
    return; // Already processed
  }
  
  try {
    // Process event
    // ... business logic ...
    
    // Record success
    await pool.query(
      'INSERT INTO processed_events (event_id, event_type, payload, status) VALUES ($1, $2, $3, $4)',
      [event.eventId, event.eventType, JSON.stringify(event.payload), 'success']
    );
  } catch (error) {
    // Record error
    await pool.query(
      'INSERT INTO processed_events (event_id, event_type, payload, status, error_message) VALUES ($1, $2, $3, $4, $5)',
      [event.eventId, event.eventType, JSON.stringify(event.payload), 'error', error.message]
    );
  }
}
```

### Testing Handlers

```typescript
it('should process event and update database', async () => {
  const event: ContributionApprovedEvent = { /* ... */ };
  
  await handleContributionApproved(event, pool);
  
  // Verify database updated
  const result = await pool.query(
    'SELECT status FROM contributions WHERE id = $1',
    [event.payload.contributionId]
  );
  expect(result.rows[0].status).toBe('approved');
  
  // Verify event recorded
  const processedResult = await pool.query(
    'SELECT status FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  expect(processedResult.rows[0].status).toBe('success');
});
```

## Error Handling

### Error Recording

```typescript
it('should record error on failure', async () => {
  const event: ContributionApprovedEvent = {
    eventId: 'evt_error_1',
    eventType: EventType.ContributionApproved,
    timestamp: new Date(),
    payload: {
      contributionId: 'nonexistent', // Will cause error
      approvedBy: 'steward_123',
      approvedAt: new Date(),
    },
  };
  
  await handleContributionApproved(event, pool);
  
  // Verify error recorded
  const result = await pool.query(
    'SELECT status, error_message FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  
  expect(result.rows[0].status).toBe('error');
  expect(result.rows[0].error_message).toBeTruthy();
});
```

### Retry Logic

```typescript
it('should allow retry after error', async () => {
  const event = { /* ... */ };
  
  // First attempt (fails)
  await handleEvent(event, pool);
  
  // Update to pending for retry
  await pool.query(
    'UPDATE processed_events SET status = $1 WHERE event_id = $2',
    ['pending', event.eventId]
  );
  
  // Second attempt
  await handleEvent(event, pool);
  
  // Verify retry count incremented
  const result = await pool.query(
    'SELECT retry_count FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  expect(result.rows[0].retry_count).toBeGreaterThan(0);
});
```

## When Tests Fail

### Schema Validation Failure

```
Expected event.payload.contributionId to be truthy
Received: undefined
```

**Fix:** Add missing required field to event schema.

### Idempotency Failure

```
Expected 1 processed_events record
Received: 2 records
```

**Fix:** Check idempotency logic in handler, ensure event_id check happens first.

### Handler Not Processing

```
Expected contribution.status to be 'approved'
Received: 'pending'
```

**Fix:** Verify handler implementation, check database query, verify event handler called.

### Publishing Failure

```
Expected queue messageCount to be > 0
Received: 0
```

**Fix:** Check RabbitMQ connection, verify exchange/queue setup, check publishing code.

## Maintenance

### Adding New Event Type

1. **Define event type**
   ```typescript
   export enum EventType {
     NewEvent = 'entity.action',
   }
   ```

2. **Define event interface**
   ```typescript
   export interface NewEvent extends BaseEvent {
     eventType: EventType.NewEvent;
     payload: {
       entityId: string;
       // ... other fields
     };
   }
   ```

3. **Add schema test**
   ```typescript
   describe('NewEvent Schema', () => {
     it('should have required payload fields', () => {
       const event: NewEvent = { /* ... */ };
       expect(event.payload.entityId).toBeTruthy();
     });
   });
   ```

4. **Create handler**
   ```typescript
   export async function handleNewEvent(
     event: NewEvent,
     pool: pg.Pool
   ): Promise<void> {
     // Implementation
   }
   ```

5. **Add integration test**
   ```typescript
   it('should process new event', async () => {
     const event: NewEvent = { /* ... */ };
     await handleNewEvent(event, pool);
     // Assertions
   });
   ```

## Best Practices

1. **Always use idempotency**
   - Check event_id before processing
   - Handle duplicate deliveries

2. **Record all events**
   - Success and error states
   - Enables audit and replay

3. **Use metadata**
   - Track correlationId for request tracing
   - Include causationId for event chains

4. **Test error cases**
   - Missing entities
   - Invalid data
   - Concurrent processing

5. **Clean up test data**
   - Use beforeEach/afterEach
   - Avoid test pollution

6. **Test idempotency explicitly**
   - Process same event twice
   - Verify single record

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
test-events:
  services:
    postgres:
      image: postgres:15-alpine
    rabbitmq:
      image: rabbitmq:3.12-alpine
  steps:
    - name: Run event tests
      run: pnpm test events
```

## References

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Idempotency in Distributed Systems](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [RabbitMQ Testing](https://www.rabbitmq.com/confirms.html)
