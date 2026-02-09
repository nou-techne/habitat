# REA Event Grammar Specification

*Resource-Event-Agent ontology formalized as event grammar for Habitat patronage accounting*

---

## Abstract

The REA (Resource-Event-Agent) ontology provides a universal grammar for economic coordination systems. This specification formalizes REA as an event grammar for Habitat, defining how economic events are modeled, recorded, and interpreted across the Treasury, People, and Agreements bounded contexts.

REA is not an accounting framework — it's a way of describing economic reality that happens to enable accounting as one of many possible views. This specification shows how Habitat uses REA events as the single source of truth from which all system state (accounts, balances, allocations, capital accounts) is derived.

---

## 1. Core Ontology

### 1.1 Resources

A **Resource** is an economic good or service with utility or value.

**In Habitat:**
- Cash (USD, cryptocurrency)
- Member time (hours of labor)
- Specialized expertise (professional services)
- Property (equipment, intellectual property, real estate)
- Relationships (business connections, revenue opportunities)

Resources have:
- **Type** — what kind of thing it is
- **Quantity** — how much exists
- **Unit of measure** — how quantity is expressed (dollars, hours, items)
- **Value** — economic worth (may differ from quantity)

### 1.2 Events

An **Event** is an occurrence that changes the state of resources.

**In Habitat:**
- Economic events (transfers, transformations, consumption, production)
- Commitment events (promises to deliver resources in the future)
- Claim events (rights to receive resources)

Events have:
- **Type** — what happened
- **Timestamp** — when it occurred
- **Resources** — what was affected
- **Agents** — who participated
- **Quantity** — how much changed

### 1.3 Agents

An **Agent** is an individual or organization capable of economic action.

**In Habitat:**
- Members (individuals contributing to and benefiting from the cooperative)
- The Cooperative itself (legal entity)
- External parties (vendors, clients, lenders, grant-makers)
- Ventures (organizations benefiting from Techne infrastructure)

Agents have:
- **Identity** — unique identifier (ENS name, member_id, tax ID)
- **Roles** — how they participate (member, board, treasurer, approver)
- **Relationships** — connections to other agents (membership, partnership, contract)

---

## 2. Economic Events

### 2.1 Event Duality

Every economic event involves **two agents** and **two resource flows** (the duality principle):

```
Agent A → Resource R1 → Agent B
Agent B → Resource R2 → Agent A
```

Examples:
- **Purchase:** Cooperative gives cash, receives goods
- **Labor:** Member gives time, receives compensation claim
- **Investment:** Investor gives capital, receives equity claim

This duality ensures every event is balanced — nothing appears or disappears, it only moves between agents.

### 2.2 Event Types

REA defines **increment** and **decrement** event types:

| Event Type | Effect on Resource | Example |
|------------|-------------------|---------|
| **Provide** | Decrement (give) | Member provides labor hours to Cooperative |
| **Receive** | Increment (get) | Cooperative receives payment from client |
| **Consume** | Decrement (use up) | Cooperative consumes supplies |
| **Produce** | Increment (create) | Cooperative produces a service deliverable |
| **Transfer** | Decrement (from) + Increment (to) | Cooperative transfers cash to member |

**In Habitat:**
- All events recorded in `events` tables (treasury_events, people_events, agreements_events)
- Event types mapped to economic primitives: Contribution, Transaction, Allocation, Distribution
- Every event has an inverse (contribution → compensation claim, allocation → capital account increase)

### 2.3 Event Attributes

Standard attributes for all economic events:

```typescript
interface EconomicEvent {
  event_id: string;
  event_type: string;  // ContributionSubmitted, TransactionPosted, AllocationApproved
  occurred_at: timestamp;
  recorded_at: timestamp;
  
  provider: Agent;  // Who gave
  receiver: Agent;  // Who got
  
  resource_type: string;  // Labor, Cash, Expertise, Property
  quantity: number;
  unit: string;  // hours, USD, items
  
  payload: object;  // Event-specific details (JSONB)
  metadata: object;  // Context (causation, correlation)
}
```

### 2.4 Commitments vs. Events

REA distinguishes:
- **Commitments** — promises of future economic events
- **Economic Events** — actual resource flows

**In Habitat:**
- A member logging a contribution creates a **commitment** (draft status)
- Approval of the contribution creates an **economic event** (approved status)
- Period close creates an **allocation commitment** (proposed status)
- Governance approval creates an **allocation event** (approved status)
- Scheduled distributions are **commitments**
- Completed payments are **economic events**

This distinction enables:
- Tracking planned vs. actual
- Variance analysis (promised vs. delivered)
- Forward-looking liquidity management

---

## 3. REA Patterns in Habitat

### 3.1 Pattern: Member Contribution

**Scenario:** Alice contributes 10 hours of labor to the Cooperative

**REA Model:**
- **Agent (Provider):** Alice (member_id: alice)
- **Agent (Receiver):** Cooperative (RegenHub, LCA)
- **Resource (Provided):** Labor (10 hours @ $50/hr = $500 value)
- **Resource (Received):** Compensation claim ($500)

**Event Sequence:**

1. **ContributionDrafted** (People)
   ```json
   {
     "event_type": "ContributionDrafted",
     "aggregate_type": "Contribution",
     "aggregate_id": "contrib_001",
     "payload": {
       "member_id": "alice",
       "contribution_type": "labor",
       "hours_worked": 10,
       "hourly_rate": 50,
       "period_id": "2026_Q1"
     }
   }
   ```

2. **ContributionApproved** (People)
   ```json
   {
     "event_type": "ContributionApproved",
     "aggregate_id": "contrib_001",
     "payload": {
       "approved_by": "treasurer",
       "approved_at": "2026-02-09T18:00:00Z"
     }
   }
   ```

3. **CompensationClaimCreated** (implicit, derived from approval)
   - Alice now has a claim against the Cooperative for $500
   - Claim will be satisfied via patronage allocation at period close

**State Changes:**
- People: contribution status draft → approved
- Cooperative liability: +$500 (accrued compensation)
- Alice claim: +$500 (compensation due)

### 3.2 Pattern: Revenue Receipt

**Scenario:** Cooperative receives $3,500 from space rental

**REA Model:**
- **Agent (Provider):** Tenant
- **Agent (Receiver):** Cooperative
- **Resource (Provided):** Cash ($3,500 USD)
- **Resource (Received):** Space access (service already delivered)

**Event Sequence:**

1. **TransactionPosted** (Treasury)
   ```json
   {
     "event_type": "TransactionPosted",
     "aggregate_type": "Transaction",
     "aggregate_id": "tx_revenue_001",
     "payload": {
       "description": "Space rental - February 2026",
       "period_id": "2026_02",
       "entries": [
         {
           "account_id": "1000_cash",
           "ledger_type": "book",
           "debit": 3500,
           "credit": 0
         },
         {
           "account_id": "4000_space_revenue",
           "ledger_type": "book",
           "debit": 0,
           "credit": 3500
         }
       ]
     }
   }
   ```

**State Changes:**
- Treasury: cash balance +$3,500
- Treasury: revenue +$3,500
- Allocable surplus (at period close): includes this $3,500

### 3.3 Pattern: Patronage Allocation

**Scenario:** Period close allocates $2,000 surplus to Alice based on her 40% patronage share

**REA Model:**
- **Agent (Provider):** Cooperative
- **Agent (Receiver):** Alice
- **Resource (Provided):** Surplus distribution claim ($2,000)
- **Resource (Received):** Alice's labor contribution (already provided, now being compensated)

**Event Sequence:**

1. **PeriodClosing** (Treasury + People + Agreements)
   - Treasury: calculate allocable surplus
   - People: aggregate member contributions
   - Agreements: apply patronage weights

2. **AllocationProposed** (Agreements)
   ```json
   {
     "event_type": "AllocationProposed",
     "aggregate_type": "AllocationAgreement",
     "aggregate_id": "alloc_2026_Q1",
     "payload": {
       "period_id": "2026_Q1",
       "allocable_surplus": 5000,
       "total_weighted_patronage": 10000,
       "member_allocations": [
         {
           "member_id": "alice",
           "weighted_patronage": 4000,
           "patronage_share": 0.40,
           "total_allocation": 2000,
           "cash_distribution": 400,
           "retained_allocation": 1600
         }
       ]
     }
   }
   ```

3. **AllocationApproved** (Agreements)
   ```json
   {
     "event_type": "AllocationApproved",
     "aggregate_id": "alloc_2026_Q1",
     "payload": {
       "approved_by": "board_resolution_2026_02_15",
       "approved_at": "2026-02-15T20:00:00Z"
     }
   }
   ```

4. **CapitalAccountUpdated** (Treasury)
   ```json
   {
     "event_type": "CapitalAccountUpdated",
     "aggregate_type": "Account",
     "aggregate_id": "capital_alice",
     "payload": {
       "member_id": "alice",
       "allocation_id": "alloc_alice_2026_Q1",
       "book_increase": 2000,
       "tax_increase": 2000
     }
   }
   ```

5. **DistributionScheduled** (Agreements)
   ```json
   {
     "event_type": "DistributionScheduled",
     "aggregate_type": "Distribution",
     "aggregate_id": "dist_alice_001",
     "payload": {
       "member_id": "alice",
       "distribution_type": "patronage_cash",
       "amount": 400,
       "scheduled_date": "2026-03-01",
       "allocation_id": "alloc_alice_2026_Q1"
     }
   }
   ```

**State Changes:**
- Agreements: allocation status draft → proposed → approved
- Treasury: Alice's capital account +$2,000 (book and tax)
- Agreements: distribution scheduled for $400 cash
- Cooperative equity: +$1,600 retained (Alice's claim, redeemable later)

### 3.4 Pattern: Cash Distribution

**Scenario:** Alice receives $400 cash distribution via ACH

**REA Model:**
- **Agent (Provider):** Cooperative
- **Agent (Receiver):** Alice
- **Resource (Provided):** Cash ($400 USD)
- **Resource (Received):** Satisfaction of distribution claim

**Event Sequence:**

1. **DistributionProcessing** (Agreements)
   ```json
   {
     "event_type": "DistributionProcessing",
     "aggregate_id": "dist_alice_001",
     "payload": {
       "payment_method": "ach",
       "initiated_at": "2026-03-01T09:00:00Z"
     }
   }
   ```

2. **TransactionPosted** (Treasury)
   ```json
   {
     "event_type": "TransactionPosted",
     "aggregate_type": "Transaction",
     "aggregate_id": "tx_dist_alice_001",
     "payload": {
       "description": "Patronage distribution - Alice - Q1 2026",
       "period_id": "2026_03",
       "entries": [
         {
           "account_id": "2200_distributions_payable",
           "ledger_type": "book",
           "debit": 400,
           "credit": 0
         },
         {
           "account_id": "1000_cash",
           "ledger_type": "book",
           "debit": 0,
           "credit": 400
         }
       ]
     }
   }
   ```

3. **DistributionCompleted** (Agreements)
   ```json
   {
     "event_type": "DistributionCompleted",
     "aggregate_id": "dist_alice_001",
     "payload": {
       "payment_date": "2026-03-01",
       "payment_reference": "ACH_20260301_0042"
     }
   }
   ```

**State Changes:**
- Treasury: cash balance -$400
- Treasury: distributions payable -$400
- Agreements: distribution status scheduled → processing → completed
- Alice: cash in hand +$400

---

## 4. Event Grammar Rules

### 4.1 Immutability

Once recorded, events cannot be modified or deleted. Corrections are made by recording compensating events.

**Example:** If a contribution was recorded with the wrong hours:
- ❌ Edit the original event
- ✅ Record a **ContributionAmended** event with the correction

This preserves audit trail and enables event replay.

### 4.2 Causation

Events may reference the event that caused them via `causation_id`.

**Example:**
- ContributionApproved (event A)
- → CompensationClaimCreated (event B, causation_id = A)

This creates explicit causal chains for audit and debugging.

### 4.3 Correlation

Related events may share a `correlation_id` to group them into a process or workflow.

**Example:** All events from a single period close share the same correlation_id:
- PeriodClosing
- AllocationProposed
- AllocationApproved
- CapitalAccountUpdated (Alice)
- CapitalAccountUpdated (Bob)
- CapitalAccountUpdated (Carol)

Correlation enables process-level queries and monitoring.

### 4.4 Sequence

Events within an aggregate must have unique, monotonically increasing `sequence_number` values.

This enables:
- Ordered replay (rebuild state by replaying events in sequence)
- Optimistic concurrency control (detect concurrent modifications)
- Temporal queries (state at any point in history)

### 4.5 Duality Preservation

Every economic event must preserve duality — what one agent gives, another receives.

**In Treasury double-entry accounting:**
- Every transaction has balanced debits and credits
- Debit total = Credit total (enforced by constraint trigger)

**In People contributions:**
- Member provides resource (labor, capital, expertise, relationship)
- Cooperative receives resource and incurs compensation liability

**In Agreements allocations:**
- Cooperative provides surplus distribution claim
- Member receives capital account increase

---

## 5. Integration Across Bounded Contexts

### 5.1 Cross-Context Event Flow

Events in one bounded context may trigger events in another:

```
People: ContributionApproved
  → Agreements: CompensationClaimCreated (implicit)
  
Agreements: AllocationApproved
  → Treasury: CapitalAccountUpdated
  → Treasury: TransactionPosted (if cash distribution)
  
Agreements: DistributionCompleted
  → Treasury: TransactionPosted
```

**Implementation:**
- Event handlers subscribe to event streams
- Handlers publish new events to downstream contexts
- Pub/sub event bus coordinates (see Sprint 50: Event Bus Spec)

### 5.2 REA Mapping by Context

| Context | Resources | Events | Agents |
|---------|-----------|--------|--------|
| **Treasury** | Cash, Capital Accounts, Allocations | Transactions, Distributions, Capital Account Updates | Cooperative, Members, Vendors, Clients |
| **People** | Labor, Expertise, Contributions | Contributions, Approvals | Members, Approvers |
| **Agreements** | Surplus, Allocations, Distribution Claims | Allocation Proposals, Approvals, Distributions | Members, Governance Bodies |

### 5.3 Eventual Consistency

Bounded contexts maintain their own event stores and may have temporary inconsistencies:
- People records a contribution approval
- Agreements hasn't yet created the compensation claim
- Eventually (milliseconds to seconds), the claim appears

This is acceptable because:
- Each context is internally consistent
- Event ordering is preserved within aggregates
- Compensation claims don't affect period close until the allocation agreement is approved (barrier event)

---

## 6. Querying REA Data

### 6.1 Event Sourcing Queries

**Resource inventory at time T:**
```sql
SELECT resource_type, SUM(quantity) as total
FROM economic_events
WHERE occurred_at <= T
  AND receiver_agent_id = 'cooperative'
GROUP BY resource_type;
```

**Agent balance with another agent:**
```sql
SELECT
  SUM(CASE WHEN provider = 'alice' THEN quantity ELSE 0 END) as provided,
  SUM(CASE WHEN receiver = 'alice' THEN quantity ELSE 0 END) as received
FROM economic_events
WHERE resource_type = 'cash'
  AND ('alice' IN (provider, receiver));
```

**Event replay (rebuild state):**
```sql
SELECT *
FROM treasury_events
WHERE aggregate_id = 'account_1000_cash'
ORDER BY sequence_number;
```

Apply each event in order to rebuild the account's current state.

### 6.2 Materialized Views

For performance, commonly queried REA data is pre-aggregated into materialized views:

- `account_balances` — current balance per account (Treasury)
- `member_patronage_summary` — contributions by member/period/type (People)
- `period_allocation_summary` — allocations per period (Agreements)

Views are refreshed when events occur or on a schedule. Queries against views are fast; queries against raw events are flexible but slower.

---

## 7. Compliance and Audit

### 7.1 Audit Trail

REA event stores provide complete audit trail:
- Who did what, when, and why (event payload + metadata)
- Immutable history (no deletions)
- Causation chains (why this event happened)
- Correlation groups (which events belong to the same process)

### 7.2 Tax Reporting

REA events map directly to tax reporting requirements:

**IRS Form 1065 (Partnership Return):**
- Income events (revenue receipts) → Line 1
- Expense events (cash payments, accruals) → Lines 9-27
- Allocation events → Schedule K-1 preparation

**IRC Section 704(b) Capital Accounts:**
- All capital account events (contributions, allocations, distributions) tracked in tax ledger
- REA duality ensures book/tax reconciliation is always possible

**Section 1385 Qualified Allocations:**
- Allocation events contain cash/retained split
- Cash distribution events prove 20% minimum was paid
- Events are timestamped, proving allocations were made within required timeframe

### 7.3 Legal Discovery

In legal proceedings, REA event stores provide:
- Complete transaction history
- Evidence of governance decisions (approval events)
- Member contribution records (labor, capital, expertise)
- Distribution history (cash payments, tax reporting)

Event immutability ensures evidence integrity.

---

## 8. Extensions and Future Work

### 8.1 REA Vocabularies

Standard vocabularies for resource types, event types, and agent roles enable interoperability:
- Multiple cooperatives using compatible REA vocabularies can exchange data
- Common resource types (USD, labor hours) have standard units of measure
- Event types align with industry standards (UN/CEFACT, ValueFlows)

### 8.2 REA in Smart Contracts

REA events can be recorded on-chain:
- Superfluid streams as continuous resource flows
- ERC-20 transfers as discrete economic events
- Safe multisig approvals as governance approval events

On-chain REA events are publicly verifiable and censorship-resistant.

### 8.3 Cross-Organizational REA

REA enables economic coordination between organizations:
- Techne (Cooperative A) provides services to Venture B
- Venture B provides revenue to Techne
- Both record REA events referencing the same external transaction
- Events can be reconciled and verified

This is the foundation for inter-cooperative accounting and multi-stakeholder value networks.

---

## 9. Implementation Guidance

### 9.1 Event Naming Conventions

**Pattern:** `{Entity}{Action}`

Examples:
- ContributionSubmitted
- AllocationApproved
- DistributionCompleted
- TransactionPosted
- CapitalAccountUpdated

### 9.2 Payload Design

Event payloads should be:
- **Self-contained** — include enough context to understand the event without querying other systems
- **Minimal** — don't duplicate data available in the aggregate
- **Versioned** — include schema version for backward compatibility

Example:
```json
{
  "schema_version": "1.0",
  "contribution_id": "contrib_042",
  "member_id": "alice",
  "contribution_type": "labor",
  "hours": 10,
  "rate": 50,
  "period_id": "2026_Q1"
}
```

### 9.3 Event Store Schema

All bounded contexts follow the same event store schema:

```sql
CREATE TABLE {context}_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    sequence_number INTEGER NOT NULL,
    causation_id TEXT,
    correlation_id TEXT,
    UNIQUE (aggregate_type, aggregate_id, sequence_number)
);
```

This uniformity enables:
- Generic event replay infrastructure
- Cross-context event subscriptions
- Consistent tooling (event browsers, audit reports)

---

## 10. Conclusion

The REA event grammar provides Habitat with:

1. **Universal economic language** — all bounded contexts speak REA
2. **Audit trail** — every state change is an event, events are immutable
3. **Temporal queries** — state at any point in history via event replay
4. **Interoperability** — compatible with other REA-based systems
5. **Compliance** — direct mapping to tax and legal requirements
6. **Flexibility** — new views can be derived from existing events without schema migration

By treating REA events as the single source of truth, Habitat achieves:
- **Correctness** — state is always derived from events, never directly mutated
- **Auditability** — complete history, no gaps, no deletions
- **Scalability** — events can be replayed in parallel, sharded, or archived
- **Evolvability** — new features query existing events without breaking old ones

REA is not just an accounting framework. It's an ontology for making economic coordination legible, verifiable, and composable.

---

**Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.**

This specification is part of the Habitat Protocol Documentation, developed by Techne / RegenHub, LCA.  
License: Peer Production License (CopyFarLeft) — free for cooperatives and nonprofits; commercial license required for for-profit use.

the-habitat.org | github.com/nou-techne/habitat
