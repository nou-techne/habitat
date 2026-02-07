# Transaction Model

*Sprint 5 — Building on: [Chart of Accounts](chart-of-accounts.md)*

---

## Overview

Sprint 4 defined where value lives (accounts). This document defines how value moves (transactions). Every economic event in the organization — a contribution, a payment, a patronage allocation — produces one or more transactions that shift balances between accounts.

The transaction model is the heartbeat of the system. Get it right and everything downstream (balances, reports, allocations, K-1s) derives cleanly. Get it wrong and the system becomes a source of confusion rather than clarity.

## Core Principles

**1. Double-entry is non-negotiable.** Every transaction consists of two or more entries that sum to zero. Debits equal credits. This is not a software design choice — it is a mathematical invariant that has sustained 700 years of accounting practice because it makes errors self-revealing.

**2. Transactions are immutable.** Once recorded, a transaction cannot be modified or deleted. Errors are corrected by recording new adjusting transactions. This preserves the audit trail and supports event sourcing — the current state of any account is always derivable by replaying its transaction history.

**3. Every transaction traces to an event.** No balance changes without a reason. The event might be a contribution, an invoice, a period close allocation, or an error correction — but it always exists and is always linked.

**4. Dual-basis transactions travel together.** When an event affects capital accounts, it produces entries in both book and tax basis accounts. These entries share an event ID but may differ in amount (as established in Sprint 3).

## Transaction Schema

```
Transaction
├── id              (uuid)
├── event_id        (uuid — the originating economic event)
├── date            (date the economic event occurred)
├── recorded_at     (timestamp when the transaction was recorded)
├── period_id       (which accounting period this belongs to)
├── description     (human-readable explanation)
├── status          (posted | pending | reversed)
├── entries[]
│   ├── id          (uuid)
│   ├── account_id  (references chart of accounts)
│   ├── amount      (decimal, exact precision)
│   ├── direction   (debit | credit)
│   └── memo        (per-entry note, optional)
└── metadata        (extensible: tags, source system, approver)
```

### Invariants Enforced

| Rule | Enforcement |
|------|------------|
| Sum of debits = sum of credits | Reject transaction if entries don't balance to zero |
| Period must be open | Reject if target period is closed/locked |
| Account must be active | Reject if any referenced account is inactive |
| Event must exist | Every transaction links to a valid event |
| Amount precision | Minimum 4 decimal places for financial calculations |
| No orphan entries | Entries cannot exist outside a transaction |

## Event Types and Their Transactions

Each economic event produces a predictable pattern of journal entries. These patterns are the bridge between "something happened" and "the books reflect it."

### Cash Contribution

*A member contributes cash to the cooperative.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1110 Operating Checking | $5,000 | |
| 2 | 3100-{member} Book Capital | | $5,000 |
| 3 | 1110 Operating Checking | $5,000 | |
| 4 | 3200-{member} Tax Capital | | $5,000 |

Book and tax entries are identical for cash. Entries 1-2 and 3-4 share the same event_id but are separate transactions (one per basis type).

### Property Contribution (FMV ≠ Tax Basis)

*A member contributes equipment with FMV $10,000 and tax basis $7,000.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| Book 1 | 1420 Computer Equipment | $10,000 | |
| Book 2 | 3100-{member} Book Capital | | $10,000 |
| Tax 1 | 1420 Computer Equipment | $7,000 | |
| Tax 2 | 3200-{member} Tax Capital | | $7,000 |
| 704(c) | 3400-{asset} Built-in Gain | | $3,000 |

The 704(c) entry records the $3,000 difference for future tax allocation tracking.

### Revenue Recognition (Space Rental)

*A non-member rents event space for $500.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1110 Operating Checking | $500 | |
| 2 | 4130 Event Space Rental | | $500 |

Simple revenue. No capital account impact until period-end allocation.

### Service Credit Issuance

*A member purchases 100 service credits at $10/unit = $1,000.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1110 Operating Checking | $1,000 | |
| 2 | 2220 Service Credits Outstanding | | $1,000 |

This is a **liability**, not revenue. The organization owes infrastructure services. Revenue is not recognized until redemption.

### Service Credit Redemption

*A member redeems 20 credits worth of compute services.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 2220 Service Credits Outstanding | $200 | |
| 2 | 4420 Credit Redemption Revenue | | $200 |

Now it's revenue. The liability decreases, recognized revenue increases. This revenue will flow through the patronage allocation at period end.

### Superfluid Stream Sampling

*Periodic snapshot captures $150 of accumulated streaming income.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1520 Wrapped/Streaming Tokens | $150 | |
| 2 | 4510 Streaming Income | | $150 |

Streams are continuous but accounting is discrete. The system samples at configurable intervals (daily, weekly) and records the accumulated delta as a standard transaction.

### Guaranteed Payment to Member

*A member receives $2,000 for services rendered.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 5210 Guaranteed Payments | $2,000 | |
| 2 | 1110 Operating Checking | | $2,000 |

Under IRC § 707(c), this is deductible by the partnership and taxable to the member. It is **not** an adjustment to the member's capital account — it flows through as an expense that reduces net income available for patronage allocation.

### Period-End Allocation

*At quarter end, net income of $12,000 is allocated to three members by patronage formula (40%, 35%, 25%).*

Step 1 — Close revenue and expense to current year net income:

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 4xxx All Revenue accounts | $X | |
| 2 | 5xxx All Expense accounts | | $Y |
| 3 | 3310 Current Year Net Income | | $12,000 |

Step 2 — Allocate to member capital accounts (book basis):

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 3310 Current Year Net Income | $12,000 | |
| 2 | 3100-{member_A} Book Capital | | $4,800 |
| 3 | 3100-{member_B} Book Capital | | $4,200 |
| 4 | 3100-{member_C} Book Capital | | $3,000 |

Step 3 — Allocate to member capital accounts (tax basis, same or different amounts depending on 704(c)):

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 3310 Current Year Net Income | $12,000 | |
| 2 | 3200-{member_A} Tax Capital | | (calculated) |
| 3 | 3200-{member_B} Tax Capital | | (calculated) |
| 4 | 3200-{member_C} Tax Capital | | (calculated) |

Tax allocations may differ from book if 704(c) layers exist. Sprint 10 (Revaluation Events) will detail the calculation.

### Cash Distribution to Member

*A member receives $1,000 cash distribution from their capital account.*

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 3100-{member} Book Capital | $1,000 | |
| 2 | 1110 Operating Checking | | $1,000 |
| 3 | 3200-{member} Tax Capital | $1,000 | |
| 4 | 1110 Operating Checking | | $1,000 |

Distributions reduce capital accounts. If a distribution would drive a capital account negative, the system flags this for DRO/QIO review (Sprint 2).

### Error Correction

*A transaction was recorded at the wrong amount. Original: $500, correct: $300.*

The original transaction is **not modified**. Instead:

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 (reversal) | Original accounts, reversed | $500 credit / $500 debit | |
| 2 (correction) | Same accounts, correct amount | $300 debit / $300 credit | |

Both the reversal and correction link to the original event_id. The original transaction's status changes to `reversed`. Full audit trail preserved.

## Transaction Lifecycle

```
Created → Pending → Posted
                  ↘ Reversed (if error discovered)
```

- **Created:** Transaction assembled, invariants checked
- **Pending:** Awaiting approval (for transactions requiring it)
- **Posted:** Applied to account balances, period assigned
- **Reversed:** Offset by a reversing transaction (original preserved)

Not all transactions require the Pending state. Automated transactions (stream sampling, period-close entries) can move directly from Created to Posted. Contributions and manual entries may require approval, governed by the organization's configured workflow (Sprint 10: Approval Workflow).

## Querying Transactions

The event-sourced design supports:

| Query | Method |
|-------|--------|
| Account balance at any point in time | Sum entries for account through target date |
| Trial balance | Sum all accounts, verify assets = liabilities + equity |
| Journal for a period | All transactions within period boundaries |
| Member statement | All entries touching member's capital and distribution accounts |
| Audit trail for an event | All transactions sharing an event_id |
| Book/tax divergence | Compare 3100-{member} vs 3200-{member} balances |

## Connection to Next Sprint

Sprint 6 (Balance Computation) will define how the system derives current state from transaction history — the aggregation layer that turns individual entries into the balances, summaries, and reports that make the organization legible.

---

*Sprint 5 | February 7, 2026 | Habitat*
