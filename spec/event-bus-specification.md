# Habitat Event Bus Specification

*Pub/sub infrastructure for coordinating bounded contexts via events*

---

## Abstract

The Habitat event bus is the nervous system of the patronage accounting system. It coordinates the three bounded contexts (Treasury, People, Agreements) by propagating events between them, enabling reactive workflows without tight coupling.

When a contribution is approved in People, the event bus notifies Agreements so a compensation claim can be created. When an allocation is approved in Agreements, the bus notifies Treasury so capital accounts can be updated. The bounded contexts remain independent — they communicate through events, not direct database access.

This specification defines:
- Event catalog (what events exist across all contexts)
- Pub/sub topology (who publishes, who subscribes)
- Event routing rules (how events find their handlers)
- Delivery guarantees (at-least-once, ordering, idempotency)
- Integration patterns (how to build event-driven features)

---

## 1. Architecture Principles

### 1.1 Bounded Context Independence

Each bounded context (Treasury, People, Agreements) maintains its own:
- Event store (`{context}_events` table)
- Domain logic (business rules, validation)
- State projections (materialized views, aggregate tables)

Contexts do NOT:
- Share database tables
- Call each other's functions directly
- Depend on each other's implementation details

They communicate exclusively through events on the bus.

### 1.2 Event-Driven Coordination

Cross-context workflows are choreographed via events, not orchestrated by a central controller.

**Example: Patronage allocation workflow**

Traditional orchestration (❌):
```
Orchestrator:
  1. Query People for contributions
  2. Query Agreements for patronage weights
  3. Calculate allocations
  4. Call Treasury to update capital accounts
  5. Call Agreements to record distributions
```

Event-driven choreography (✅):
```
PeriodCloseRequested (Treasury)
  → ContributionsAggregationStarted (People)
  → PatronageWeightsApplied (Agreements)
  → AllocationProposed (Agreements)
  → AllocationApproved (Agreements)
  → CapitalAccountsUpdated (Treasury)
  → DistributionsScheduled (Agreements)
```

Each context responds to events it cares about. No single component knows the full workflow. The workflow emerges from the collective behavior.

### 1.3 At-Least-Once Delivery

Events are delivered **at least once**. Handlers must be **idempotent** — applying the same event multiple times produces the same result as applying it once.

**Why at-least-once:**
- Simpler than exactly-once (no distributed transactions)
- More reliable (failures are retried automatically)
- Matches event sourcing semantics (events are immutable, replaying is safe)

**Idempotency strategies:**
- Check event ID before processing (skip if already handled)
- Use upserts instead of inserts (update if exists, insert otherwise)
- Design state transitions to be idempotent (e.g., "mark as approved" is safe to repeat)

### 1.4 Ordering Within Aggregate

Events for the same aggregate (e.g., all events for `contribution_123`) are delivered **in order**. Events for different aggregates may be delivered in any order.

This preserves causality within an entity's lifecycle while allowing parallelism across entities.

### 1.5 Eventual Consistency

The system is **eventually consistent** across bounded contexts. After an event is published:
- Subscribers receive it within milliseconds to seconds
- Each context updates its own state
- Eventually (usually quickly), all contexts reflect the same logical state

Temporary inconsistencies are acceptable:
- People records contribution approval
- Agreements hasn't yet created compensation claim
- Eventually (≤1 second), claim appears

This is normal. The system is internally consistent within each context, and becomes globally consistent as events propagate.

---

## 2. Event Catalog

### 2.1 Event Naming Convention

Events are named: `{Entity}{Action}` (past tense)

Examples:
- `ContributionSubmitted`
- `AllocationApproved`
- `DistributionCompleted`
- `TransactionPosted`

### 2.2 Treasury Events

| Event | Published When | Payload |
|-------|---------------|---------|
| `AccountCreated` | New account added to chart | `{ accountId, accountNumber, accountName, accountType, ledgerType }` |
| `TransactionPosted` | Transaction recorded | `{ transactionId, periodId, entries[], description, amount }` |
| `PeriodOpened` | New accounting period created | `{ periodId, periodName, startDate, endDate, periodType }` |
| `PeriodClosing` | Period close initiated | `{ periodId, closedBy }` |
| `PeriodClosed` | Period close completed | `{ periodId, closedAt, finalBalance }` |
| `CapitalAccountUpdated` | Member capital account changed | `{ memberId, periodId, allocationAmount, newBalance, ledgerType }` |
| `Section704cLayerCreated` | Built-in gain layer recorded | `{ layerId, memberId, propertyDescription, bookValue, taxBasis, builtInGain }` |

### 2.3 People Events

| Event | Published When | Payload |
|-------|---------------|---------|
| `MemberJoined` | New member admitted | `{ memberId, legalName, tier, joinedAt }` |
| `MemberStatusChanged` | Member status updated | `{ memberId, oldStatus, newStatus, reason }` |
| `ContributionDrafted` | Contribution created | `{ contributionId, memberId, contributionType, periodId, value }` |
| `ContributionSubmitted` | Contribution submitted for approval | `{ contributionId, memberId, submittedAt }` |
| `ContributionApproved` | Contribution approved | `{ contributionId, memberId, approverId, approvedAt, value }` |
| `ContributionRejected` | Contribution rejected | `{ contributionId, memberId, rejectedBy, reason }` |
| `ApprovalRecorded` | Approval vote recorded | `{ approvalId, contributionId, approverId, approved, comments }` |

### 2.4 Agreements Events

| Event | Published When | Payload |
|-------|---------------|---------|
| `PatronageWeightSet` | Patronage weight configured | `{ weightId, periodId, contributionType, weight }` |
| `AllocationProposed` | Allocation agreement proposed | `{ agreementId, periodId, allocableSurplus, totalWeightedPatronage, memberAllocations[] }` |
| `AllocationApproved` | Allocation agreement approved | `{ agreementId, approvedBy, approvedAt }` |
| `MemberAllocationRecorded` | Individual allocation recorded | `{ allocationId, agreementId, memberId, totalAllocation, cashDistribution, retainedAllocation }` |
| `DistributionScheduled` | Cash distribution scheduled | `{ distributionId, memberId, amount, scheduledDate, distributionType }` |
| `DistributionProcessing` | Payment initiated | `{ distributionId, paymentMethod, initiatedAt }` |
| `DistributionCompleted` | Payment confirmed | `{ distributionId, paymentDate, paymentReference }` |
| `DistributionFailed` | Payment failed | `{ distributionId, errorMessage, retryable }` |
| `PeriodCloseStepCompleted` | Period close step finished | `{ stepId, periodId, stepName, completedAt }` |

---

## 3. Pub/Sub Topology

### 3.1 Publishers

Each bounded context publishes events to its own topic:

- **Treasury** → `treasury.events`
- **People** → `people.events`
- **Agreements** → `agreements.events`

Events are published by:
- Mutation resolvers (GraphQL API)
- Background workers (period close, batch jobs)
- External integrations (bank feeds, payroll imports)

### 3.2 Subscribers

Contexts subscribe to events from other contexts:

```
People subscribes to:
  - treasury.events (PeriodOpened, PeriodClosed)

Agreements subscribes to:
  - treasury.events (PeriodClosed)
  - people.events (ContributionApproved, ContributionRejected)

Treasury subscribes to:
  - agreements.events (AllocationApproved, DistributionCompleted)
```

### 3.3 Subscription Handlers

Each subscriber registers **handlers** — functions that process specific event types.

Example (Agreements subscribing to People events):
```typescript
// Agreements context
eventBus.subscribe('people.events', {
  async onEvent(event) {
    switch (event.eventType) {
      case 'ContributionApproved':
        await handleContributionApproved(event);
        break;
      case 'ContributionRejected':
        await handleContributionRejected(event);
        break;
      default:
        // Ignore events we don't care about
        break;
    }
  }
});

async function handleContributionApproved(event) {
  const { contributionId, memberId, value } = event.payload;
  
  // Create compensation claim (implied)
  // This increments the member's patronage for the period
  // No explicit action needed — patronage is calculated from approved contributions
  
  logger.info('Contribution approved', { contributionId, memberId, value });
}
```

### 3.4 Event Routing

Events flow from publishers to subscribers via the bus:

```
Publisher → Event Bus → Topic → Subscribers → Handlers
```

The bus is responsible for:
- Accepting published events
- Routing to appropriate topics
- Delivering to all subscribers on that topic
- Retrying on failure
- Dead-letter handling for persistent failures

---

## 4. Technology Options

### 4.1 Option 1: PostgreSQL LISTEN/NOTIFY

**How it works:**
- Each context publishes events to its event store table
- Database trigger fires on INSERT to events table
- Trigger calls `pg_notify('topic', event_json)`
- Subscribers execute `LISTEN topic` and receive notifications

**Pros:**
- No external dependencies (built into PostgreSQL)
- Transactional (event + notification in same transaction)
- Low latency (<10ms)

**Cons:**
- Payload size limited (8KB)
- No persistence (if subscriber is offline, messages are lost)
- Single database instance (doesn't scale horizontally)

**Best for:** Single-tenant deployments, low to medium volume.

### 4.2 Option 2: Redis Pub/Sub

**How it works:**
- Events published to Redis channels
- Subscribers connect and listen to channels
- Redis delivers to all active subscribers

**Pros:**
- Fast (sub-millisecond latency)
- Simple API
- Widely supported

**Cons:**
- No persistence (messages lost if no active subscribers)
- No delivery guarantees (fire-and-forget)
- Requires external Redis instance

**Best for:** Real-time notifications where persistence isn't critical.

### 4.3 Option 3: RabbitMQ / AMQP

**How it works:**
- Events published to exchanges
- Exchanges route to queues based on routing keys
- Subscribers consume from queues
- Messages acknowledged after processing

**Pros:**
- Durable (messages persisted to disk)
- At-least-once delivery (redelivered on failure)
- Flexible routing (topic exchange, fanout, direct)
- Battle-tested at scale

**Cons:**
- Operational complexity (cluster management)
- Requires external RabbitMQ instance
- More moving parts

**Best for:** Production deployments, high reliability requirements, multi-tenant.

### 4.4 Option 4: Apache Kafka

**How it works:**
- Events published to topics (partitioned logs)
- Consumers read from topics (can replay)
- Offsets track consumer position in log

**Pros:**
- Event log persistence (indefinite retention)
- Replay capability (reprocess historical events)
- High throughput (millions of events/second)
- Partition-based parallelism

**Cons:**
- High operational complexity
- Overkill for small deployments
- Requires JVM ecosystem

**Best for:** Large-scale deployments, event replay requirements, analytics.

### 4.5 Option 5: Cloud-Native (AWS SNS/SQS, GCP Pub/Sub)

**How it works:**
- Events published to cloud messaging service
- Service delivers to subscribers (push or pull)
- Managed infrastructure (no servers to maintain)

**Pros:**
- Zero operational overhead
- Automatic scaling
- High reliability (cloud SLAs)

**Cons:**
- Vendor lock-in
- Cost scales with volume
- Latency higher than local options

**Best for:** Cloud-hosted deployments, minimal ops team.

---

## 5. Recommended Implementation: RabbitMQ

For production Habitat deployments, **RabbitMQ with topic exchange** is recommended:

### 5.1 Exchange and Queue Setup

```
Exchange: habitat.events (type: topic)
  |
  ├─ Routing key: treasury.*
  │   └─ Queue: agreements.treasury_events
  │   └─ Queue: people.treasury_events
  |
  ├─ Routing key: people.*
  │   └─ Queue: agreements.people_events
  │   └─ Queue: treasury.people_events
  |
  └─ Routing key: agreements.*
      └─ Queue: treasury.agreements_events
```

Each context publishes to the exchange with routing key `{context}.{eventType}`.

Subscribers create queues bound to routing patterns (e.g., `people.*` matches all People events).

### 5.2 Publishing Events

```typescript
// Treasury context publishing TransactionPosted event
async function publishTransactionPosted(transaction) {
  const event = {
    event_id: generateId(),
    event_type: 'TransactionPosted',
    aggregate_type: 'Transaction',
    aggregate_id: transaction.id,
    occurred_at: new Date(),
    recorded_at: new Date(),
    payload: {
      transactionId: transaction.id,
      periodId: transaction.periodId,
      entries: transaction.entries,
      description: transaction.description,
      amount: transaction.totalAmount,
    },
    metadata: {
      source: 'treasury-api',
      user: currentUser.id,
    },
    sequence_number: await getNextSequence(transaction.id),
  };
  
  // Write to event store (source of truth)
  await db.treasury_events.insert(event);
  
  // Publish to bus
  await rabbitMQ.publish('habitat.events', 'treasury.TransactionPosted', event);
  
  return event;
}
```

### 5.3 Subscribing to Events

```typescript
// Agreements context subscribing to People events
async function startPeopleEventsSubscriber() {
  const queue = 'agreements.people_events';
  
  // Ensure queue exists and is bound
  await rabbitMQ.assertQueue(queue, { durable: true });
  await rabbitMQ.bindQueue(queue, 'habitat.events', 'people.*');
  
  // Consume messages
  rabbitMQ.consume(queue, async (msg) => {
    const event = JSON.parse(msg.content.toString());
    
    try {
      // Check if already processed (idempotency)
      const processed = await db.processed_events.exists(event.event_id);
      if (processed) {
        rabbitMQ.ack(msg); // Already handled, skip
        return;
      }
      
      // Route to handler
      await handlePeopleEvent(event);
      
      // Mark as processed
      await db.processed_events.insert({ event_id: event.event_id, processed_at: new Date() });
      
      // Acknowledge
      rabbitMQ.ack(msg);
    } catch (error) {
      logger.error('Event handling failed', { event, error });
      
      // Retry logic
      if (msg.fields.deliveryTag < 3) {
        rabbitMQ.nack(msg, false, true); // Requeue for retry
      } else {
        rabbitMQ.nack(msg, false, false); // Send to dead-letter queue
      }
    }
  });
}

async function handlePeopleEvent(event) {
  switch (event.event_type) {
    case 'ContributionApproved':
      await handleContributionApproved(event);
      break;
    case 'ContributionRejected':
      await handleContributionRejected(event);
      break;
    default:
      // Ignore
      break;
  }
}
```

### 5.4 Idempotency Tracking

Maintain a `processed_events` table in each context:

```sql
CREATE TABLE processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handler VARCHAR(255)
);

CREATE INDEX idx_processed_events_processed_at ON processed_events (processed_at);
```

Before processing an event, check if `event_id` exists. If yes, skip (already processed).

Periodically purge old entries (e.g., events older than 30 days) to prevent unbounded growth.

---

## 6. Event-Driven Workflows

### 6.1 Workflow: Member Contribution → Compensation Claim

```
1. People: Member logs contribution (draft)
   Event: ContributionDrafted
   
2. People: Member submits contribution
   Event: ContributionSubmitted
   
3. People: Approver reviews and approves
   Event: ContributionApproved
   
4. Agreements: Listens to ContributionApproved
   → Increments member's patronage for the period (implicit)
   
5. No explicit compensation claim created — patronage is calculated
   from approved contributions at period close
```

### 6.2 Workflow: Period Close → Allocation → Distribution

```
1. Treasury: Period close initiated
   Event: PeriodClosing
   
2. People: Calculate patronage summary per member
   Query: Aggregate approved contributions by member/type/period
   
3. Agreements: Apply patronage weights
   Query: Get patronage weights for the period
   Calculate: weighted_patronage = Σ(contribution_value × weight)
   
4. Agreements: Propose allocation
   Calculate: member allocations using patronage formula
   Event: AllocationProposed
   
5. Agreements: Governance approves allocation
   Event: AllocationApproved
   
6. Treasury: Listens to AllocationApproved
   → Update member capital accounts
   Event: CapitalAccountUpdated (per member)
   
7. Treasury: Record transactions for capital account updates
   Event: TransactionPosted (per member)
   
8. Agreements: Schedule distributions (cash portion)
   Event: DistributionScheduled (per member)
   
9. Treasury: Mark period as closed
   Event: PeriodClosed
```

### 6.3 Workflow: Distribution Payment

```
1. Agreements: Distribution scheduled
   Event: DistributionScheduled
   
2. Payment processor: Payment initiated
   Event: DistributionProcessing
   
3. Payment processor: Payment succeeds
   Event: DistributionCompleted
   
4. Treasury: Listens to DistributionCompleted
   → Record cash outflow transaction
   Event: TransactionPosted
```

---

## 7. Monitoring and Observability

### 7.1 Event Metrics

Track:
- **Events published** per context per minute
- **Events consumed** per subscriber per minute
- **Handling latency** (time from publish to handled)
- **Queue depth** (backlog of unprocessed events)
- **Dead-letter queue size** (failed events requiring manual intervention)
- **Retry rate** (how often events are retried)

### 7.2 Event Tracing

Use `correlation_id` to trace event chains:

```
correlation_id: "period_close_2026_Q1"

Events:
  1. PeriodClosing (correlation_id: period_close_2026_Q1)
  2. AllocationProposed (correlation_id: period_close_2026_Q1)
  3. AllocationApproved (correlation_id: period_close_2026_Q1)
  4. CapitalAccountUpdated (correlation_id: period_close_2026_Q1) [×N members]
  5. DistributionScheduled (correlation_id: period_close_2026_Q1) [×N members]
```

Querying by correlation_id shows the entire workflow.

### 7.3 Health Checks

Monitor event bus health:
- RabbitMQ connection status
- Queue depths (alert if >1000 backlog)
- Consumer lag (time since last event processed)
- Dead-letter queue accumulation (alert if >10 events)

---

## 8. Error Handling and Recovery

### 8.1 Retry Strategy

**Automatic retry** for transient failures:
- Network errors
- Database connection timeouts
- Temporary unavailability

**Exponential backoff:**
- 1st retry: immediate
- 2nd retry: 1 second
- 3rd retry: 5 seconds
- 4th retry: 30 seconds
- 5th+ retry: dead-letter queue

### 8.2 Dead-Letter Queue

Failed events (after max retries) move to dead-letter queue for manual review.

**Dead-letter handling process:**
1. Alert ops team (Slack, PagerDuty)
2. Review event and error logs
3. Fix underlying issue (code bug, data inconsistency)
4. Requeue event for reprocessing

### 8.3 Event Replay

If a subscriber was offline or had a bug:
1. Fix the bug in subscriber code
2. Replay events from event store

```sql
-- Get events since last processed
SELECT * FROM people_events
WHERE occurred_at > (
  SELECT MAX(processed_at) FROM processed_events
)
ORDER BY occurred_at, sequence_number;
```

Republish to bus, subscribers reprocess.

---

## 9. Security Considerations

### 9.1 Event Authorization

Publish events only from authenticated services:
- RabbitMQ users per context (treasury_publisher, people_publisher)
- Permissions: publish to own topic, consume from subscribed topics
- No wildcard permissions

### 9.2 Event Encryption

For sensitive payloads (PII, financial data):
- Encrypt payload before publishing
- Decrypt in subscriber
- Use envelope encryption (data key encrypted with master key)

Alternatively: store sensitive data in database, publish only IDs + event metadata. Subscribers query database for full details.

### 9.3 Audit Trail

Event store IS the audit trail. Every state change has a corresponding event with:
- Who (user ID in metadata)
- When (occurred_at timestamp)
- What (event_type + payload)
- Why (causation_id references triggering event)

---

## 10. Testing Event-Driven Systems

### 10.1 Unit Tests

Test event handlers in isolation:

```typescript
describe('handleContributionApproved', () => {
  it('should increment member patronage', async () => {
    const event = {
      event_type: 'ContributionApproved',
      payload: {
        contributionId: 'contrib_123',
        memberId: 'alice',
        value: 500,
        periodId: '2026_Q1',
      },
    };
    
    await handleContributionApproved(event);
    
    const patronage = await getPatronageSummary('alice', '2026_Q1');
    expect(patronage.totalValue).toEqual(500);
  });
});
```

### 10.2 Integration Tests

Test event flows across contexts:

```typescript
describe('Contribution approval workflow', () => {
  it('should create compensation claim when contribution approved', async () => {
    // 1. Create contribution in People
    const contribution = await createContribution({ memberId: 'alice', value: 500 });
    
    // 2. Approve it
    await approveContribution(contribution.id);
    
    // 3. Wait for event propagation
    await sleep(100);
    
    // 4. Verify compensation claim exists in Agreements
    const patronage = await getPatronageSummary('alice', '2026_Q1');
    expect(patronage.totalValue).toEqual(500);
  });
});
```

### 10.3 Load Tests

Simulate high event volume:
- Publish 10,000 events/second
- Measure lag (time from publish to handled)
- Verify no events dropped
- Check dead-letter queue (should be empty)

---

## 11. Migration Strategy

### 11.1 Start Simple (PostgreSQL LISTEN/NOTIFY)

For early deployments:
- Use PostgreSQL LISTEN/NOTIFY
- Single database instance
- Low operational complexity
- Sufficient for <10k events/day

### 11.2 Evolve to RabbitMQ

When scaling beyond single database:
- Add RabbitMQ alongside PostgreSQL
- Dual-publish (to event store + to RabbitMQ)
- Gradually migrate subscribers from LISTEN to RabbitMQ
- Remove LISTEN once all subscribers migrated

### 11.3 Future: Kafka for Analytics

If event replay / analytics becomes critical:
- Add Kafka as durable event log
- Triple-publish (event store + RabbitMQ + Kafka)
- RabbitMQ for operational workflows (low latency)
- Kafka for analytics, replay, long-term storage

---

## 12. Example: Complete Allocation Workflow

Here's how the period close → allocation → distribution workflow looks with the event bus:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Treasury: Period Close Initiated                         │
│    Event: PeriodClosing { periodId: "2026_Q1" }            │
│    Published to: treasury.events                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. People: Aggregate Contributions                          │
│    Triggered by: PeriodClosing event                        │
│    Action: Calculate patronage summary per member           │
│    Result: Patronage data ready for allocation              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Agreements: Propose Allocation                           │
│    Action: Apply patronage weights, calculate allocations   │
│    Event: AllocationProposed { agreementId, memberAllocations[] } │
│    Published to: agreements.events                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Governance: Approve Allocation                           │
│    Human action: Board approves allocation agreement        │
│    Event: AllocationApproved { agreementId, approvedBy }    │
│    Published to: agreements.events                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Treasury: Update Capital Accounts                        │
│    Triggered by: AllocationApproved event                   │
│    Action: Update each member's capital account             │
│    Events: CapitalAccountUpdated (×N members)               │
│    Published to: treasury.events                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Agreements: Schedule Distributions                       │
│    Triggered by: AllocationApproved event                   │
│    Action: Schedule cash distributions (20% of allocation)  │
│    Events: DistributionScheduled (×N members)               │
│    Published to: agreements.events                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Treasury: Mark Period Closed                            │
│    Action: Update period status to CLOSED                   │
│    Event: PeriodClosed { periodId, closedAt }              │
│    Published to: treasury.events                            │
└─────────────────────────────────────────────────────────────┘
```

Each arrow represents event propagation through the bus. No context calls another directly. The workflow emerges from choreography.

---

## 13. Conclusion

The event bus is essential infrastructure for Habitat. It enables:

1. **Bounded context independence** — Treasury, People, and Agreements remain decoupled
2. **Reactive workflows** — allocation happens automatically when contributions are approved
3. **Auditability** — every state change has a corresponding event
4. **Scalability** — contexts can scale independently, events route efficiently
5. **Extensibility** — new features subscribe to existing events without modifying sources

The patronage accounting system is not a monolith. It's a constellation of services coordinated by events. The event bus is the fabric that holds it together.

---

**Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.**

This specification is part of the Habitat Protocol Documentation, developed by Techne / RegenHub, LCA.  
License: Peer Production License (CopyFarLeft) — free for cooperatives and nonprofits; commercial license required for for-profit use.

the-habitat.org | github.com/nou-techne/habitat
