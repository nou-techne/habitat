# Habitat Event Worker

Event consumer and workflow orchestration for Habitat patronage system.

## Architecture

The worker package handles:
- **Event consumption** from RabbitMQ queues
- **Cross-context coordination** via event handlers
- **End-to-end workflows** demonstrating value flow

## Components

### Events (`src/events/`)
- Event schema definitions (16 event types)
- RabbitMQ event bus client
- Topic-based routing (treasury.#, people.#, agreements.#)

### Handlers (`src/handlers/`)
- Cross-context event handlers
- Idempotency tracking (prevents duplicate processing)
- Event dispatcher and registry

**Handlers:**
- `handleContributionApproved` — People → Agreements (create patronage claim)
- `handleAllocationApproved` — Agreements → Treasury (update capital account)
- `handleDistributionCompleted` — Agreements → Treasury (record transaction)

### Workflows (`src/workflows/`)
- End-to-end integration workflows (Layer 5: Flow)
- Demonstrate complete value flows through system
- Include compensating actions for failure scenarios

**Workflows:**
- `contribution-claim` — Submit → Approve → Claim → Patronage (Sprint 77)

## Running

```bash
# Development mode (with hot reload)
pnpm worker

# Production mode
pnpm build
pnpm start
```

## Environment Variables

```bash
# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
EVENT_EXCHANGE=habitat.events
EVENT_EXCHANGE_TYPE=topic
EVENT_PREFETCH=10

# Database (same as API)
DATABASE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## Event Flow

1. **Mutation** in API publishes event to RabbitMQ
2. **Event bus** routes event to appropriate queue(s)
3. **Worker** consumes event from queue
4. **Dispatcher** routes to handler based on event type
5. **Handler** executes cross-context logic
6. **Idempotency** prevents duplicate processing on replay

## Idempotency

All event handlers are idempotent via `processed_events` table:

```sql
CREATE TABLE processed_events (
    event_id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    handler_name TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL
);
```

Events are checked before processing and marked after successful completion.

## Testing

```bash
# Run workflow integration tests
pnpm test

# Run specific workflow test
pnpm test contribution-claim
```

## Layer Mapping

- **Layer 4 (Event):** Event schema, bus, handlers (Sprints 74-76)
- **Layer 5 (Flow):** Workflows showing value movement (Sprints 77-84)

## Dependencies

- `@habitat/shared` — Common types
- `@habitat/api` — Data access layer, event publishers
- `amqplib` — RabbitMQ client
- `vitest` — Testing framework
