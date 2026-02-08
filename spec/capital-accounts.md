# Capital Account Mechanics

*Sprint 3 — Building on: [704(b) Compliance Mapping](../compliance/704b-mapping.md)*

---

## Overview

The capital account is the spine of patronage accounting. Every member of the cooperative has one. It answers the fundamental question: *what is this member's economic stake in the entity?*

Sprint 2 identified that IRC Section 704(b) requires capital account maintenance as the first condition of the "economic effect" test. This document specifies how capital accounts work inside the Treasury tool — including the dual-basis tracking that Sprint 2 identified as the highest-priority gap.

## What a Capital Account Records

A capital account is a running balance that increases and decreases over the life of a member's participation:

| Event | Effect | Direction |
|-------|--------|-----------|
| Cash contribution | Increase by amount contributed | + |
| Property contribution | Increase by fair market value at time of contribution | + |
| Allocation of income or gain | Increase by member's allocated share | + |
| Cash distribution | Decrease by amount distributed | − |
| Property distribution | Decrease by FMV at time of distribution | − |
| Allocation of loss or deduction | Decrease by member's allocated share | − |
| Revaluation adjustment | Increase or decrease by share of unrealized gain/loss (book basis only) | +/− |

When a member joins, their capital account starts at zero (or at the value of their initial contribution). When a member exits, their capital account determines their liquidation entitlement.

## The Dual-Basis Requirement

Here is where cooperative accounting diverges from simple bookkeeping. The IRS requires that the partnership be able to report on two different bases:

**Book basis (§ 704(b) capital account):** Tracks fair market value. This is the account that matters for the economic effect test. Contributions enter at FMV. Property is revalued when members join or leave. Allocations follow the operating agreement.

**Tax basis:** Tracks the original cost basis of contributed property and the member's share of taxable income and deductions. This is what appears on the Schedule K-1. Tax basis often differs from book basis because contributed property may have a FMV different from its cost, and because tax depreciation schedules differ from economic depreciation.

### Why Both Matter

The book capital account drives *economic rights* — who gets what upon liquidation, whether allocations have economic effect.

The tax capital account drives *tax reporting* — what the IRS sees on the K-1, what the member reports on their personal return.

The gap between them creates **Section 704(c) allocations** — special rules ensuring that when property with built-in gain or loss is contributed, the tax consequences stick with the contributing partner, not the other members. This is addressed in a future sprint (Sprint 10: Revaluation Events).

## Treasury Implementation

### Account Structure

Each cooperative member gets a **capital account pair** in Treasury:

```
Member: Alice
├── Book Capital Account (704(b) basis)
│   └── Balance: $15,000
└── Tax Capital Account (tax basis)
    └── Balance: $12,000
```

Both accounts are of type `equity`. Both are maintained through double-entry transactions. Both share the same event source — the same contribution, allocation, or distribution event creates entries in both accounts, potentially at different amounts.

### Event Flow

When a contribution occurs:

```
1. People: Contribution logged (type: cash, amount: $5,000)
   └── Event published: contribution.approved

2. Treasury: Receives contribution.approved
   ├── Book entry: Debit Cash $5,000 / Credit Alice-Book-Capital $5,000
   └── Tax entry:  Debit Cash $5,000 / Credit Alice-Tax-Capital $5,000
```

For cash, book and tax entries are identical. For property:

```
1. People: Contribution logged (type: property, FMV: $10,000, tax basis: $7,000)
   └── Event published: contribution.approved

2. Treasury: Receives contribution.approved
   ├── Book entry: Debit Property $10,000 / Credit Alice-Book-Capital $10,000
   └── Tax entry:  Debit Property $7,000  / Credit Alice-Tax-Capital $7,000
   └── 704(c) layer created: Property, built-in gain $3,000, attributable to Alice
```

The $3,000 difference between book and tax becomes a **704(c) layer** — a persistent record that follows the property and affects future tax allocations (addressed in Sprint 10).

### Transaction Schema

Every transaction in the capital account system carries:

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier |
| `event_id` | Link to the originating event (contribution, allocation, distribution) |
| `account_id` | Which capital account (book or tax) |
| `member_id` | Which member |
| `amount` | Dollar value of the entry |
| `direction` | Debit or credit |
| `basis_type` | `book` or `tax` |
| `period_id` | Which accounting period |
| `timestamp` | When recorded |
| `metadata` | Additional context (FMV determination method, appraiser, etc.) |

### Invariants

The system enforces these at all times:

1. **Double-entry balance**: Every transaction has equal debits and credits
2. **Dual-basis completeness**: Every event that affects a capital account must create entries in *both* book and tax accounts
3. **Event sourcing integrity**: The current balance of any capital account can be reconstructed by replaying its transaction history from zero
4. **Period boundaries**: Transactions are assigned to periods; closed periods cannot be modified
5. **Non-negative guard** (configurable): Flag or prevent transactions that would drive a book capital account below zero without DRO coverage

## Querying Capital Accounts

Because the system is event-sourced, capital accounts support temporal queries:

- **Current balance**: Sum all transactions through present
- **Balance at date**: Sum all transactions through a given date
- **Balance at period close**: Sum all transactions within a closed period
- **Movement report**: All transactions within a date range, grouped by type
- **Book/tax divergence**: Compare book and tax balances to identify 704(c) exposure

These queries serve different audiences: members see their current position, managers see period activity, accountants see K-1 preparation data, auditors see full history.

## Connection to Next Sprint

Sprint 4 (Contribution Lifecycle) will detail how contributions enter the system — the approval workflow, valuation rules, and the events that trigger the capital account entries described here. Capital accounts are the destination; contributions are the first source of movement.

---

*Sprint 3 | February 7, 2026 | Habitat*
