# February 10, 2026 — Orchestration Block (Partial)

**Sprints 74-79: Event & Flow Layers**

The Event layer (Layer 4) is complete, and the Flow layer (Layer 5) has begun. Events now flow through RabbitMQ, cross-context handlers coordinate state changes, and end-to-end workflows demonstrate value movement through the system.

---

## Block Summary

| Sprint | Role | Artifact | Layer |
|--------|------|----------|-------|
| 74 | Event Systems Engineer | Event schema & bus | 4 (Event) |
| 75 | Event Systems Engineer | Event publishers | 4 (Event) |
| 76 | Event Systems Engineer | Event handlers (cross-context) | 4 (Event) |
| 77 | Workflow Engineer | Contribution → claim workflow | 5 (Flow) |
| 78 | Workflow Engineer | Period close orchestration | 5 (Flow) |
| 79 | Workflow Engineer | Allocation → distribution workflow | 5 (Flow) |

**Version:** 0.5.0 (Orchestration — partial)

---

## Sprint 74: Event Schema & Bus Setup

**Role:** Event Systems Engineer (04)  
**Artifact:** `packages/worker/src/events/`  
**Deliverable:** Event type definitions and RabbitMQ connection

600 lines. Event sourcing infrastructure.

**Event Schema:**
- EventEnvelope<T> wrapper for all domain events
- EventMetadata (userId, correlationId, causationId, ipAddress)
- Schema versioning for payload migration
- 16 event payload types across 3 bounded contexts

**Event Types:**
- Treasury (5): TransactionPosted, PeriodOpened, PeriodClosed, etc.
- People (5): ContributionSubmitted, ContributionApproved, etc.
- Agreements (6): AllocationProposed, DistributionCompleted, etc.

**Event Bus:**
- RabbitMQ client with amqplib
- Topic exchange (habitat.events)
- 3 queues: habitat.treasury, habitat.people, habitat.agreements
- Routing keys: treasury.#, people.#, agreements.#
- Automatic reconnection with exponential backoff
- Message persistence (durable queues)
- Prefetch limit for fair dispatch

---

## Sprint 75: Event Publishers

**Role:** Event Systems Engineer (04)  
**Artifact:** `packages/api/src/events/publishers.ts`  
**Deliverable:** Event publishing from mutation resolvers

416 lines. Event publishing infrastructure.

**Publisher Functions (10):**
- Treasury: publishTransactionPosted, publishPeriodOpened, publishPeriodClosed
- People: publishContributionSubmitted, publishContributionApproved, publishContributionRejected
- Agreements: publishAllocationProposed, publishAllocationApproved, publishDistributionScheduled, publishDistributionCompleted

**Features:**
- Full event payload with entity details
- Metadata injection (userId, memberId, correlationId)
- Event envelope creation via createEvent helper
- RabbitMQ publish via EventBus
- Error handling that doesn't fail mutations
- withEventPublishing() wrapper pattern

**Integration pattern:** Publishers called after successful database operations. Event failures logged but don't fail mutations. Events can be replayed from database state if needed.

---

## Sprint 76: Event Handlers (Cross-Context)

**Role:** Event Systems Engineer (04)  
**Artifact:** `packages/worker/src/handlers/`  
**Deliverable:** Event consumer handlers with idempotency

412 lines. Cross-context coordination.

**Event Handlers (3):**
1. handleContributionApproved (agreements.ts)  
   → contribution.approved → create patronage claim in Agreements  
   → Links People context to Agreements context

2. handleAllocationApproved (treasury.ts)  
   → allocation.approved → update capital accounts in Treasury  
   → Updates retainedPatronage and lastAllocationId  
   → Links Agreements context to Treasury context

3. handleDistributionCompleted (treasury.ts)  
   → distribution.completed → record transaction in Treasury  
   → Creates double-entry transaction (debit capital, credit cash)  
   → Links Agreements context to Treasury context

**Idempotency System:**
- processed_events table for tracking
- isEventProcessed(eventId) → check
- markEventProcessed(eventId, eventType, handlerName) → mark
- withIdempotency() wrapper → check + execute + mark pattern
- Prevents duplicate processing on replay

**Worker Process:**
- Standalone event consumer
- Subscribes to 3 RabbitMQ queues
- Event dispatcher routes to handlers
- Graceful shutdown on SIGTERM/SIGINT

---

## Sprint 77: Contribution → Claim Workflow

**Role:** Workflow Engineer (05)  
**Artifact:** `packages/worker/src/workflows/contribution-claim.ts`  
**Deliverable:** End-to-end workflow demonstration

438 lines. Layer 5 (Flow) begins.

**7-Step Workflow:**
1. Get initial patronage value (baseline)
2. Create contribution (draft status)
3. Submit contribution (draft → submitted)
4. Approve contribution (submitted → approved)
5. Publish approval event to RabbitMQ
6. Event handler creates patronage claim (cross-context)
7. Verify patronage increment (validation)

**Features:**
- Console logging for observability
- Before/after state tracking
- Compensating actions (compensateContributionApproval)
- Workflow invariant verification
- Integration tests

**Value flow demonstration:** Member creates contribution (People) → Steward approves (People) → Event published (Event layer) → Handler creates claim (Agreements) → Patronage incremented (observable outcome).

This is the first workflow showing how value moves through the system end-to-end, crossing bounded context boundaries via events.

---

## Sprint 78: Period Close Orchestration

**Role:** Workflow Engineer (05)  
**Artifact:** `packages/worker/src/workflows/period-close.ts`  
**Deliverable:** Multi-step period close with resumability

565 lines. Complex orchestration.

**5-Step Workflow:**
1. Aggregate patronage — sum approved contributions by member and type
2. Apply type weights — multiply patronage by configured weights
3. Calculate member allocations — distribute surplus proportionally
4. Propose allocations — create allocation records (draft → proposed)
5. Await governance approval — return control to stewards

**Resumability:**
- PeriodCloseState tracks current step and checkpoints
- resumePeriodClose() resumes from last checkpoint
- Enables recovery after failure or interruption
- Each step marked complete before proceeding

**Default Weights:**
- Labor: 1.0 (baseline)
- Expertise: 1.5 (premium for specialized knowledge)
- Capital: 1.0 (baseline)
- Relationship: 0.5 (reduced for non-monetary value)

**Features:**
- Dry-run mode for testing without persistence
- Error recovery with compensating actions
- Invariant verification (sum = surplus, cash >= 20% IRC 1385)
- Step-by-step logging

**Partial formula implementation:** Weighted patronage calculation, proportional allocation distribution, cash/retained split, by-type breakdown. Full formula specification deferred to Sprint 90-91.

---

## Sprint 79: Allocation → Distribution Workflow

**Role:** Workflow Engineer (05)  
**Artifact:** `packages/worker/src/workflows/allocation-distribution.ts`  
**Deliverable:** Value execution from allocation to payment

445 lines. Payment workflow.

**4-Step Workflow:**
1. Calculate cash/retained split — extract from approved allocation
2. Update capital account — retained portion stays in cooperative equity
3. Schedule cash distribution — create distribution record (scheduled status)
4. Mark complete — payment executes on scheduled date

**Distribution Completion:**
- completeDistributionWorkflow() — execute payment
- Mark distribution as completed
- Record treasury transaction (double-entry)
- Publish distribution.completed event

**Partial Distributions:**
- schedulePartialDistributions() — split into multiple payments
- Validate sum equals cash distribution
- Support staggered payment schedules
- Metadata tracks part number and total

**Treasury Integration:**
- recordDistributionTransaction() — double-entry accounting
- Debit: Member Capital Account (equity)
- Credit: Cash (asset)
- Maintains accounting integrity

**Value flow:** Allocation approved (Agreements) → Retained portion → Capital Account (Treasury equity) → Cash portion → Distribution scheduled (Agreements) → Payment processed → Transaction recorded (Treasury).

---

## What's Solid

**Layer 4 (Event):** Complete event sourcing infrastructure. Events flow through RabbitMQ. Cross-context handlers coordinate state changes. Idempotency prevents duplicate processing. Event-driven architecture enables scalability.

**Layer 5 (Flow) — Partial:** Three end-to-end workflows demonstrate value movement. Contribution → Claim shows patronage creation. Period Close orchestrates allocation calculation. Allocation → Distribution executes payments.

**Event-driven coordination:** Bounded contexts communicate via events, not direct calls. Maintains loose coupling. Enables independent scaling. Provides audit trail.

**Workflow patterns established:** Multi-step orchestration, checkpoint-based resumability, compensating actions, invariant verification, dry-run mode.

---

## What's Missing

**Formula engine.** Period close calculates allocations, but patronage formula is simplified. Full formula specification and implementation deferred to Sprint 90-91 (Constraint layer).

**Account lookups.** Distribution transactions reference placeholder account IDs. Need account registry and lookup by member.

**Current period context.** Workflows hardcode period IDs. Need context injection with current period.

**704(c) compliance.** Capital account updates assume book balance = tax balance. Full IRC 704(c) adjustments for contributed property deferred.

**Distribution execution.** Scheduled distributions created but not automatically processed. Need cron job or scheduled task runner (Sprint 80-84).

**Payment integration.** Distribution completion records transactions but doesn't integrate with payment providers (Stripe, ACH, etc.). Payment gateway integration deferred.

---

## Observations

**Event sourcing works.** Events published from API mutations. Event bus routes to handlers. Handlers coordinate across contexts. System maintains integrity through eventual consistency.

**Idempotency is critical.** Event replay happens (connection failures, deployments, debugging). Idempotency tracking prevents duplicate side effects. Database-backed tracking more reliable than in-memory.

**Workflows are composable.** Contribution → Claim is reused within Period Close. Allocation → Distribution is triggered by Period Close approval. Workflows compose into larger processes.

**Resumability matters.** Period close takes minutes. If it fails halfway, resuming from checkpoint is essential. Step tracking and checkpoint pattern proven effective.

**Dry-run mode is valuable.** Testing allocation calculations without persisting results. Validates formulas before committing. Reduces risk of production errors.

**Compensating actions are hard.** Knowing when to compensate vs. fail forward. Ensuring compensation doesn't introduce new inconsistencies. Requires careful design.

**The gap between specs and reality.** Specs describe ideal flows. Reality includes errors, timeouts, partial failures. Workflows must handle all cases, not just happy path.

**Placeholders are debt.** Account lookups, period context, 704(c) adjustments — all marked as "TODO" or "placeholder". These aren't skipped work; they're deferred complexity. But they accumulate. Sprint 90+ will need to address them systematically.

---

## Integration Block Complete (Sprints 69-76)

**Layer 3 (Relationship):** GraphQL API with resolvers ✓  
**Layer 4 (Event):** Event sourcing + cross-context coordination ✓

The Integration block delivered a working API and event-driven architecture. The system can now serve queries, execute mutations, publish events, and coordinate across bounded contexts.

---

## Orchestration Block Partial (Sprints 77-79)

**Layer 5 (Flow):** Three end-to-end workflows ✓

The Orchestration block is demonstrating how value flows through the system. Contribution → Claim shows patronage creation. Period Close orchestrates allocation calculation. Allocation → Distribution executes payments.

**Remaining:** Distribution execution automation, patronage claim details, compliance checks (Sprints 80-84).

---

**Total progress: 79 sprints, ~4,900 lines of code across 6 sprints (Sprints 74-79).**

**Next focus:** Continue Orchestration block (Sprints 80-84), then move to Constraint layer (Sprints 85-98) for formula engine and compliance rules.
