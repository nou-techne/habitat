# Event Bus Implementation

**Sprint:** 55  
**Phase:** 3 — Production Deployment  
**Layer:** Infrastructure (Flow + Event)  
**Status:** Specification

---

## Purpose

Implement RabbitMQ-based event bus for cross-context coordination. Enable mutation events to trigger handlers across bounded contexts (Treasury, People, Agreements), supporting workflows like contribution approval → patronage increment → allocation calculation → capital account update.

---

## Architecture Overview

**Event-Driven Coordination:**

```
Mutation (API Server)
    ↓
Database Write (Transaction)
    ↓
Event Published (RabbitMQ)
    ↓
Event Handler (Worker Process)
    ↓
Cross-Context Action
    ↓
New Event Published
    ↓
... (workflow continues)
```

**Key Components:**

1. **Exchanges** — Topic exchanges per bounded context (treasury.events, people.events, agreements.events)
2. **Queues** — Durable queues per handler with dead-letter handling
3. **Routing Keys** — Event type as routing key (e.g., `people.contribution.approved`)
4. **Handlers** — Worker processes consuming events and executing logic
5. **Idempotency** — Event ID tracking to prevent duplicate processing

---

## RabbitMQ Topology

### Exchanges

```
treasury.events (type: topic, durable: true)
    ↓
    Publishes: treasury.transaction.posted
               treasury.period.opened
               treasury.period.closed
               treasury.account.created

people.events (type: topic, durable: true)
    ↓
    Publishes: people.member.created
               people.contribution.submitted
               people.contribution.approved
               people.contribution.rejected

agreements.events (type: topic, durable: true)
    ↓
    Publishes: agreements.allocations.proposed
               agreements.allocations.approved
               agreements.distribution.scheduled
               agreements.distribution.completed
```

### Queues

Each handler has a dedicated queue bound to relevant routing keys:

```
patronage_handler_queue
    ← people.contribution.approved
    → Updates patronage summary in Agreements context

allocation_handler_queue
    ← treasury.period.closed
    → Triggers allocation calculation

capital_account_handler_queue
    ← agreements.allocations.approved
    → Updates capital accounts in Treasury

distribution_handler_queue
    ← agreements.allocations.approved
    → Schedules distributions
```

### Dead Letter Exchange

```
dlx.habitat (type: topic, durable: true)
    ↓
dlq.patronage_handler (stores failed events from patronage handler)
dlq.allocation_handler (stores failed events from allocation handler)
dlq.capital_account_handler
dlq.distribution_handler
```

---

## Event Schema

**Standard Event Envelope:**

```json
{
  "eventId": "uuid",
  "eventType": "people.contribution.approved",
  "aggregateId": "contribution-uuid",
  "payload": {
    "contributionId": "uuid",
    "contributorId": "uuid",
    "contributionType": "LABOR",
    "approverId": "uuid"
  },
  "actorId": "uuid-of-member-who-triggered",
  "timestamp": "2026-02-09T23:00:00Z",
  "metadata": {
    "version": "1.0",
    "correlationId": "optional-workflow-id"
  }
}
```

---

## RabbitMQ Setup

**File:** `services/worker/src/config/rabbitmq.ts`

```typescript
import amqp from 'amqplib';

export async function setupRabbitMQ(connection: amqp.Connection) {
  const channel = await connection.createChannel();

  // Create exchanges
  await channel.assertExchange('treasury.events', 'topic', { durable: true });
  await channel.assertExchange('people.events', 'topic', { durable: true });
  await channel.assertExchange('agreements.events', 'topic', { durable: true });

  // Create dead-letter exchange
  await channel.assertExchange('dlx.habitat', 'topic', { durable: true });

  // Patronage handler queue
  await channel.assertQueue('patronage_handler_queue', {
    durable: true,
    deadLetterExchange: 'dlx.habitat',
    deadLetterRoutingKey: 'dlq.patronage_handler',
  });
  await channel.bindQueue(
    'patronage_handler_queue',
    'people.events',
    'people.contribution.approved'
  );

  // Allocation handler queue
  await channel.assertQueue('allocation_handler_queue', {
    durable: true,
    deadLetterExchange: 'dlx.habitat',
    deadLetterRoutingKey: 'dlq.allocation_handler',
  });
  await channel.bindQueue(
    'allocation_handler_queue',
    'treasury.events',
    'treasury.period.closed'
  );

  // Capital account handler queue
  await channel.assertQueue('capital_account_handler_queue', {
    durable: true,
    deadLetterExchange: 'dlx.habitat',
    deadLetterRoutingKey: 'dlq.capital_account_handler',
  });
  await channel.bindQueue(
    'capital_account_handler_queue',
    'agreements.events',
    'agreements.allocations.approved'
  );

  // Distribution handler queue
  await channel.assertQueue('distribution_handler_queue', {
    durable: true,
    deadLetterExchange: 'dlx.habitat',
    deadLetterRoutingKey: 'dlq.distribution_handler',
  });
  await channel.bindQueue(
    'distribution_handler_queue',
    'agreements.events',
    'agreements.allocations.approved'
  );

  // Dead-letter queues
  await channel.assertQueue('dlq.patronage_handler', { durable: true });
  await channel.bindQueue('dlq.patronage_handler', 'dlx.habitat', 'dlq.patronage_handler');

  await channel.assertQueue('dlq.allocation_handler', { durable: true });
  await channel.bindQueue('dlq.allocation_handler', 'dlx.habitat', 'dlq.allocation_handler');

  await channel.assertQueue('dlq.capital_account_handler', { durable: true });
  await channel.bindQueue('dlq.capital_account_handler', 'dlx.habitat', 'dlq.capital_account_handler');

  await channel.assertQueue('dlq.distribution_handler', { durable: true });
  await channel.bindQueue('dlq.distribution_handler', 'dlx.habitat', 'dlq.distribution_handler');

  console.log('✓ RabbitMQ topology initialized');

  return channel;
}
```

---

## Event Handlers

### Patronage Handler

**Purpose:** When a contribution is approved, increment the member's patronage summary.

**File:** `services/worker/src/handlers/patronage.ts`

```typescript
import { ConsumeMessage } from 'amqplib';
import { pool } from '../utils/db';
import { isProcessed, markProcessed } from '../utils/idempotency';

export async function handleContributionApproved(msg: ConsumeMessage) {
  const event = JSON.parse(msg.content.toString());
  
  // Idempotency check
  if (await isProcessed(event.eventId)) {
    console.log(`Event ${event.eventId} already processed, skipping`);
    return { ack: true };
  }

  try {
    const { contributionId, contributorId } = event.payload;

    // Fetch contribution details
    const contributionResult = await pool.query(
      `SELECT contribution_type, period_id FROM people.contributions WHERE contribution_id = $1`,
      [contributionId]
    );

    if (contributionResult.rows.length === 0) {
      console.warn(`Contribution ${contributionId} not found`);
      return { ack: true }; // Ack anyway, no retry needed
    }

    const { contribution_type, period_id } = contributionResult.rows[0];

    // Compute patronage value for this contribution
    const patronageValue = await computePatronageValue(contributionId);

    // Increment patronage summary in agreements context
    await pool.query(
      `INSERT INTO agreements.patronage_claims 
        (member_id, period_id, contribution_type, patronage_value, contribution_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (contribution_id) DO NOTHING`,
      [contributorId, period_id, contribution_type, patronageValue, contributionId]
    );

    // Mark event as processed
    await markProcessed(event.eventId, 'patronage_handler');

    console.log(`✓ Patronage incremented for member ${contributorId}, contribution ${contributionId}`);

    return { ack: true };
  } catch (error) {
    console.error('Patronage handler error:', error);
    return { ack: false, requeue: true };
  }
}

async function computePatronageValue(contributionId: string): Promise<number> {
  // Call the database function that computes weighted patronage value
  const result = await pool.query(
    `SELECT people.compute_patronage_value($1) as value`,
    [contributionId]
  );
  return result.rows[0].value;
}
```

---

### Allocation Handler

**Purpose:** When a period is closed, trigger allocation calculation.

**File:** `services/worker/src/handlers/allocation.ts`

```typescript
import { ConsumeMessage } from 'amqplib';
import { pool } from '../utils/db';
import { isProcessed, markProcessed } from '../utils/idempotency';
import { publishEvent } from '../utils/events';

export async function handlePeriodClosed(msg: ConsumeMessage) {
  const event = JSON.parse(msg.content.toString());

  if (await isProcessed(event.eventId)) {
    console.log(`Event ${event.eventId} already processed, skipping`);
    return { ack: true };
  }

  try {
    const { periodId } = event.payload;

    // Aggregate patronage from all members for this period
    const patronageResult = await pool.query(
      `SELECT 
        member_id,
        SUM(CASE WHEN contribution_type = 'LABOR' THEN patronage_value ELSE 0 END) as labor_patronage,
        SUM(CASE WHEN contribution_type = 'EXPERTISE' THEN patronage_value ELSE 0 END) as expertise_patronage,
        SUM(CASE WHEN contribution_type = 'CAPITAL' THEN patronage_value ELSE 0 END) as capital_patronage,
        SUM(CASE WHEN contribution_type = 'RELATIONSHIP' THEN patronage_value ELSE 0 END) as relationship_patronage
      FROM agreements.patronage_claims
      WHERE period_id = $1
      GROUP BY member_id`,
      [periodId]
    );

    if (patronageResult.rows.length === 0) {
      console.log(`No patronage claims for period ${periodId}`);
      await markProcessed(event.eventId, 'allocation_handler');
      return { ack: true };
    }

    // Fetch current agreement weights
    const weightsResult = await pool.query(
      `SELECT labor_weight, expertise_weight, capital_weight, relationship_weight
      FROM agreements.operating_agreements
      WHERE effective_date <= (SELECT start_date FROM treasury.periods WHERE period_id = $1)
      ORDER BY effective_date DESC
      LIMIT 1`,
      [periodId]
    );

    const weights = weightsResult.rows[0];

    // Calculate total weighted patronage per member
    const allocations = patronageResult.rows.map((row: any) => {
      const totalPatronage =
        row.labor_patronage * weights.labor_weight +
        row.expertise_patronage * weights.expertise_weight +
        row.capital_patronage * weights.capital_weight +
        row.relationship_patronage * weights.relationship_weight;

      return {
        memberId: row.member_id,
        laborPatronage: row.labor_patronage,
        expertisePatronage: row.expertise_patronage,
        capitalPatronage: row.capital_patronage,
        relationshipPatronage: row.relationship_patronage,
        totalPatronage,
      };
    });

    // Calculate allocation amounts (proportional to total patronage)
    const grandTotal = allocations.reduce((sum, a) => sum + a.totalPatronage, 0);

    // Fetch period surplus to allocate
    const surplusResult = await pool.query(
      `SELECT agreements.calculate_period_surplus($1) as surplus`,
      [periodId]
    );
    const surplusToAllocate = surplusResult.rows[0].surplus;

    // Insert proposed allocations
    for (const allocation of allocations) {
      const patronageWeight = allocation.totalPatronage / grandTotal;
      const allocatedAmount = Math.round(surplusToAllocate * patronageWeight);

      await pool.query(
        `INSERT INTO agreements.member_allocations
          (allocation_id, period_id, member_id, labor_patronage, expertise_patronage, 
           capital_patronage, relationship_patronage, total_patronage, patronage_weight,
           allocated_amount_cents, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'proposed', NOW())`,
        [
          periodId,
          allocation.memberId,
          allocation.laborPatronage,
          allocation.expertisePatronage,
          allocation.capitalPatronage,
          allocation.relationshipPatronage,
          allocation.totalPatronage,
          patronageWeight,
          allocatedAmount,
        ]
      );
    }

    // Publish event
    await publishEvent({
      eventType: 'agreements.allocations.calculated',
      aggregateId: periodId,
      payload: {
        periodId,
        memberCount: allocations.length,
        totalAllocated: surplusToAllocate,
      },
      actorId: 'system',
    });

    await markProcessed(event.eventId, 'allocation_handler');

    console.log(`✓ Allocations calculated for period ${periodId}, ${allocations.length} members`);

    return { ack: true };
  } catch (error) {
    console.error('Allocation handler error:', error);
    return { ack: false, requeue: true };
  }
}
```

---

### Capital Account Handler

**Purpose:** When allocations are approved, update members' capital accounts.

**File:** `services/worker/src/handlers/capital-account.ts`

```typescript
import { ConsumeMessage } from 'amqplib';
import { pool } from '../utils/db';
import { isProcessed, markProcessed } from '../utils/idempotency';

export async function handleAllocationsApproved(msg: ConsumeMessage) {
  const event = JSON.parse(msg.content.toString());

  if (await isProcessed(event.eventId)) {
    return { ack: true };
  }

  try {
    const { periodId } = event.payload;

    // Fetch approved allocations
    const allocationsResult = await pool.query(
      `SELECT member_id, allocated_amount_cents, cash_distribution_cents, retained_amount_cents
      FROM agreements.member_allocations
      WHERE period_id = $1 AND status = 'approved'`,
      [periodId]
    );

    for (const allocation of allocationsResult.rows) {
      const { member_id, allocated_amount_cents, retained_amount_cents } = allocation;

      // Update capital account (book balance increases by retained amount)
      await pool.query(
        `INSERT INTO treasury.capital_account_transactions
          (member_id, transaction_date, description, book_amount, tax_amount, allocation_id)
        VALUES ($1, NOW(), 'Period allocation', $2, $2, $3)`,
        [member_id, retained_amount_cents, periodId]
      );

      console.log(`✓ Capital account updated for member ${member_id}, +${retained_amount_cents} cents`);
    }

    await markProcessed(event.eventId, 'capital_account_handler');

    return { ack: true };
  } catch (error) {
    console.error('Capital account handler error:', error);
    return { ack: false, requeue: true };
  }
}
```

---

### Distribution Handler

**Purpose:** When allocations are approved, schedule cash distributions.

**File:** `services/worker/src/handlers/distribution.ts`

```typescript
import { ConsumeMessage } from 'amqplib';
import { pool } from '../utils/db';
import { isProcessed, markProcessed } from '../utils/idempotency';

export async function handleAllocationsApprovedForDistribution(msg: ConsumeMessage) {
  const event = JSON.parse(msg.content.toString());

  if (await isProcessed(event.eventId)) {
    return { ack: true };
  }

  try {
    const { periodId } = event.payload;

    // Fetch approved allocations with cash distributions
    const allocationsResult = await pool.query(
      `SELECT allocation_id, member_id, cash_distribution_cents
      FROM agreements.member_allocations
      WHERE period_id = $1 AND status = 'approved' AND cash_distribution_cents > 0`,
      [periodId]
    );

    // Schedule distributions (default: 30 days after allocation approval)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    for (const allocation of allocationsResult.rows) {
      await pool.query(
        `INSERT INTO agreements.distributions
          (distribution_id, member_id, allocation_id, amount_cents, distribution_type,
           scheduled_date, status, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'CASH', $4, 'scheduled', NOW())`,
        [
          allocation.member_id,
          allocation.allocation_id,
          allocation.cash_distribution_cents,
          scheduledDate,
        ]
      );

      console.log(`✓ Distribution scheduled for member ${allocation.member_id}, ${allocation.cash_distribution_cents} cents`);
    }

    await markProcessed(event.eventId, 'distribution_handler');

    return { ack: true };
  } catch (error) {
    console.error('Distribution handler error:', error);
    return { ack: false, requeue: true };
  }
}
```

---

## Idempotency Tracking

**Purpose:** Prevent duplicate event processing if a handler crashes and the message is redelivered.

**File:** `services/worker/src/utils/idempotency.ts`

```typescript
import { pool } from './db';

export async function isProcessed(eventId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM public.processed_events WHERE event_id = $1`,
    [eventId]
  );
  return result.rowCount > 0;
}

export async function markProcessed(eventId: string, handlerName: string): Promise<void> {
  await pool.query(
    `INSERT INTO public.processed_events (event_id, handler_name, processed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (event_id, handler_name) DO NOTHING`,
    [eventId, handlerName]
  );
}
```

**Database Table:**

```sql
CREATE TABLE IF NOT EXISTS public.processed_events (
  event_id UUID NOT NULL,
  handler_name TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, handler_name)
);

CREATE INDEX idx_processed_events_processed_at ON public.processed_events(processed_at);

-- Cleanup old processed events (retention: 30 days)
CREATE OR REPLACE FUNCTION cleanup_processed_events() RETURNS void AS $$
BEGIN
  DELETE FROM public.processed_events WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## Worker Process

**File:** `services/worker/src/index.ts`

```typescript
import amqp from 'amqplib';
import { setupRabbitMQ } from './config/rabbitmq';
import { handleContributionApproved } from './handlers/patronage';
import { handlePeriodClosed } from './handlers/allocation';
import { handleAllocationsApproved } from './handlers/capital-account';
import { handleAllocationsApprovedForDistribution } from './handlers/distribution';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '4');

async function main() {
  console.log('Starting Habitat Event Worker...');

  const connection = await amqp.connect(process.env.RABBITMQ_URL!);
  const channel = await setupRabbitMQ(connection);

  // Set prefetch count (how many messages to fetch at once)
  await channel.prefetch(CONCURRENCY);

  // Consume patronage handler queue
  channel.consume('patronage_handler_queue', async (msg) => {
    if (!msg) return;

    const result = await handleContributionApproved(msg);

    if (result.ack) {
      channel.ack(msg);
    } else if (result.requeue) {
      channel.nack(msg, false, true); // Requeue for retry
    } else {
      channel.nack(msg, false, false); // Send to dead-letter queue
    }
  });

  // Consume allocation handler queue
  channel.consume('allocation_handler_queue', async (msg) => {
    if (!msg) return;

    const result = await handlePeriodClosed(msg);

    if (result.ack) {
      channel.ack(msg);
    } else if (result.requeue) {
      channel.nack(msg, false, true);
    } else {
      channel.nack(msg, false, false);
    }
  });

  // Consume capital account handler queue
  channel.consume('capital_account_handler_queue', async (msg) => {
    if (!msg) return;

    const result = await handleAllocationsApproved(msg);

    if (result.ack) {
      channel.ack(msg);
    } else if (result.requeue) {
      channel.nack(msg, false, true);
    } else {
      channel.nack(msg, false, false);
    }
  });

  // Consume distribution handler queue
  channel.consume('distribution_handler_queue', async (msg) => {
    if (!msg) return;

    const result = await handleAllocationsApprovedForDistribution(msg);

    if (result.ack) {
      channel.ack(msg);
    } else if (result.requeue) {
      channel.nack(msg, false, true);
    } else {
      channel.nack(msg, false, false);
    }
  });

  console.log('✓ Event Worker ready, consuming events...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await channel.close();
    await connection.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Worker startup error:', error);
  process.exit(1);
});
```

---

## Error Handling and Retry Strategy

**Retry Policy:**

1. **Transient errors** (network issues, temporary DB unavailability): Requeue message, retry up to 3 times
2. **Permanent errors** (invalid data, constraint violations): Send to dead-letter queue, no retry
3. **Dead-letter queue monitoring:** Alert on DLQ depth > 10 messages

**Implementation:**

```typescript
export async function handleEvent(msg: ConsumeMessage, handler: Function) {
  const event = JSON.parse(msg.content.toString());
  const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;

  try {
    const result = await handler(msg);
    return result;
  } catch (error: any) {
    console.error(`Handler error:`, error);

    // Check if error is retryable
    const isRetryable = isRetryableError(error);

    if (isRetryable && retryCount < 3) {
      console.log(`Retrying event ${event.eventId}, attempt ${retryCount + 1}`);
      return { ack: false, requeue: true };
    } else {
      console.error(`Event ${event.eventId} failed permanently, sending to DLQ`);
      return { ack: false, requeue: false };
    }
  }
}

function isRetryableError(error: any): boolean {
  // Network errors, connection issues
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Database temporary unavailability
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    return true;
  }

  // Constraint violations, validation errors are NOT retryable
  if (error.code === '23505' || error.code === '23503') {
    return false;
  }

  // Default: retry
  return true;
}
```

---

## Monitoring and Observability

**Metrics to track:**

- Event processing rate (events/second per handler)
- Event processing latency (time from publish to ack)
- Queue depth (messages waiting in each queue)
- Dead-letter queue depth (failed events)
- Handler error rate
- Idempotency cache hit rate

**Prometheus Metrics:**

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

export const eventProcessedCounter = new Counter({
  name: 'habitat_events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['handler', 'status'],
});

export const eventProcessingDuration = new Histogram({
  name: 'habitat_event_processing_duration_seconds',
  help: 'Event processing duration',
  labelNames: ['handler'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const queueDepthGauge = new Gauge({
  name: 'habitat_queue_depth',
  help: 'Number of messages in queue',
  labelNames: ['queue'],
});
```

---

## Testing Strategy

### Unit Tests

Test individual handlers with mock events:

```typescript
describe('Patronage Handler', () => {
  it('should increment patronage when contribution approved', async () => {
    const mockEvent = {
      eventId: 'test-event-id',
      eventType: 'people.contribution.approved',
      payload: {
        contributionId: 'contrib-123',
        contributorId: 'member-456',
      },
    };

    const mockMsg = {
      content: Buffer.from(JSON.stringify(mockEvent)),
      properties: { headers: {} },
    } as any;

    const result = await handleContributionApproved(mockMsg);

    expect(result.ack).toBe(true);
    // Verify patronage claim was inserted
  });
});
```

### Integration Tests

Test end-to-end workflow:

```typescript
describe('Allocation Workflow', () => {
  it('should complete full cycle from contribution to distribution', async () => {
    // 1. Submit contribution
    // 2. Approve contribution
    // 3. Close period
    // 4. Verify allocations calculated
    // 5. Approve allocations
    // 6. Verify capital account updated
    // 7. Verify distribution scheduled
  });
});
```

---

## Next Steps (Sprint 56+)

Sprint 55 completes the Infrastructure block. Sprint 56 begins Essential UI:
- Next.js + TypeScript setup
- GraphQL Code Generator
- Authentication (JWT)
- Layout and navigation

---

*Sprint 55 complete. Event bus infrastructure specified.*

**Repository:** github.com/nou-techne/habitat  
**Event Bus:** habitat/infrastructure/event-bus-implementation.md
