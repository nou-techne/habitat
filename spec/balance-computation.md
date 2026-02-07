# Balance Computation

*Sprint 6 — Building on: [Transaction Model](transaction-model.md)*

---

## Overview

Sprint 5 defined how value moves (transactions). This document defines how value is known (balances). A balance is never stored independently — it is always derived from the transaction history. This is the event sourcing guarantee: the ledger is the single source of truth, and every number anyone sees is a view computed from it.

This sprint completes the Foundation layer. After this, we can answer the Phase 1 validation question: *Can we produce an accurate balance sheet?*

## The Derivation Rule

A balance is a summation:

```
Balance(account, as_of) = Σ entries
  WHERE entry.account_id = account
  AND entry.transaction.status = 'posted'
  AND entry.transaction.date <= as_of
  APPLYING direction:
    IF account.normal_balance = debit:  debits ADD, credits SUBTRACT
    IF account.normal_balance = credit: credits ADD, debits SUBTRACT
```

That's it. Every balance in the system — from a member's capital account to the total assets of the organization — reduces to this formula applied at different scopes.

## Computation Layers

Balances aggregate at four layers, each built from the one below:

### Layer 1: Entry-Level (Leaf Accounts)

The raw summation of posted entries for a single account. This is the foundation.

```
Account 1110 (Operating Checking) as of 2026-03-31:
  Entry 1: +$5,000 (contribution received)
  Entry 2: -$2,000 (guaranteed payment)
  Entry 3: +$500   (event rental)
  Entry 4: -$150   (supplies)
  ─────────
  Balance: $3,350
```

### Layer 2: Hierarchical (Parent Accounts)

Parent account balances are the sum of their children's balances. No entries post directly to parent accounts.

```
1100 Cash & Cash Equivalents:
  1110 Operating Checking:  $3,350
  1120 Savings / Reserve:   $8,000
  1130 Petty Cash:            $200
  ─────────
  1100 Balance:            $11,550
```

### Layer 3: Type Summaries

All accounts of a type aggregate for the fundamental equation.

```
Total Assets:      $45,000
Total Liabilities: $12,000
Total Equity:      $33,000

Check: 45,000 = 12,000 + 33,000 ✓
```

If this check fails, there is a bug. Double-entry makes imbalance impossible if the transaction invariants hold. The system should run this verification continuously and halt posting if it ever fails.

### Layer 4: Derived Reports

Higher-order computations built from layer 1–3 balances:

| Report | Derivation |
|--------|-----------|
| **Balance Sheet** | Assets, Liabilities, Equity at a point in time |
| **Income Statement** | Revenue minus Expenses for a period |
| **Member Statement** | All entries touching a member's accounts for a period |
| **Trial Balance** | All leaf account balances, verifying debits = credits |
| **Book/Tax Divergence** | 3100-{member} minus 3200-{member} per member |
| **Net Income** | Total Revenue (4xxx) minus Total Expenses (5xxx) for a period |
| **Patronage Base** | Net Income available for allocation (input to Sprint 12) |

## Temporal Queries

Event sourcing makes time travel free. The same derivation rule applied with different `as_of` dates produces balances at any historical point:

| Query | as_of | Use |
|-------|-------|-----|
| Current balance | now | Member dashboard, operational decisions |
| Period-end balance | last day of quarter | Period close, allocation calculation |
| Year-end balance | December 31 | Annual reporting, K-1 preparation |
| Point-in-time | any date | Audit support, historical research |
| Movement | range (from, to) | Period activity, contribution summaries |

**Movement computation:**

```
Movement(account, from, to) = Balance(account, to) - Balance(account, from)
```

This gives the net change in an account over any period — essential for income statements, contribution summaries, and allocation inputs.

## Materialized Views

Computing every balance from raw entries on every query is correct but potentially slow as transaction volume grows. The system uses materialized views — cached balances that are updated as transactions post.

### Period Snapshots

At period close (Sprint 13), the system captures a full snapshot:

```
PeriodSnapshot
├── period_id
├── snapshot_date
├── account_balances[]
│   ├── account_id
│   ├── balance (derived from entries)
│   └── entry_count (for verification)
└── verification
    ├── total_debits
    ├── total_credits
    └── assets_minus_liabilities_minus_equity (must = 0)
```

Snapshots are immutable once a period is locked. They serve as checkpoints: queries for dates within a closed period can start from the snapshot rather than replaying from genesis.

### Running Balances

For active periods, the system maintains running balances updated on each posted transaction:

```
RunningBalance
├── account_id
├── balance
├── last_transaction_id
└── last_updated
```

These are caches, not sources of truth. If a running balance ever disagrees with the derivation from entries, the derivation wins and the cache is rebuilt.

## Validation

The system performs continuous validation:

| Check | Frequency | Action on Failure |
|-------|-----------|-------------------|
| Debits = Credits (per transaction) | On every post | Reject transaction |
| Assets = Liabilities + Equity | On every post | Halt posting, alert |
| Running balance = derived balance | Periodic (hourly) | Rebuild cache, log warning |
| Period snapshot = derived balance | On period close | Block close until resolved |
| All entries belong to valid transactions | Daily | Flag orphans for review |

### Reconciliation

External reconciliation compares internal balances against external sources:

| Internal Account | External Source | Frequency |
|-----------------|----------------|-----------|
| 1110 Operating Checking | Bank statement | Monthly |
| 1510 Cryptocurrency Holdings | Blockchain query | Daily |
| 1520 Streaming Tokens | Superfluid subgraph | Per sampling interval |
| 2220 Service Credits Outstanding | Credit ledger | On each issuance/redemption |

Discrepancies produce reconciliation events, which generate adjusting transactions through the standard error correction pattern (Sprint 5).

## Implementation Notes for Supabase

The balance computation maps to PostgreSQL naturally:

```sql
-- Leaf account balance at a point in time
SELECT
  e.account_id,
  SUM(CASE
    WHEN a.normal_balance = e.direction THEN e.amount
    ELSE -e.amount
  END) AS balance
FROM entries e
JOIN accounts a ON a.id = e.account_id
JOIN transactions t ON t.id = e.transaction_id
WHERE t.status = 'posted'
  AND t.date <= :as_of
  AND e.account_id = :account_id
GROUP BY e.account_id;

-- Trial balance (all accounts)
SELECT
  a.id, a.name, a.type, a.normal_balance,
  SUM(CASE
    WHEN a.normal_balance = e.direction THEN e.amount
    ELSE -e.amount
  END) AS balance
FROM entries e
JOIN accounts a ON a.id = e.account_id
JOIN transactions t ON t.id = e.transaction_id
WHERE t.status = 'posted'
  AND t.date <= :as_of
GROUP BY a.id, a.name, a.type, a.normal_balance
ORDER BY a.id;
```

Running balances can be maintained via PostgreSQL triggers on the entries table. Period snapshots are materialized views refreshed at close.

## Phase 1 Validation

With Sprints 2–6 complete, the Foundation layer can answer its validation question:

**Can we produce an accurate balance sheet?**

Yes, if:
- [x] Chart of accounts defined (Sprint 4)
- [x] Transactions record every economic event as balanced entries (Sprint 5)
- [x] Balances derive from transaction history (Sprint 6)
- [x] Assets = Liabilities + Equity verified continuously
- [x] Capital accounts maintained per 704(b) on dual basis (Sprint 3)

The system can now produce a balance sheet at any point in time, a trial balance for any period, and member capital account statements on both book and tax basis. The Foundation is laid.

## Connection to Next Sprint

Sprint 7 (Treasury Reporting) will define the specific reports built on this computation layer — member statements, period summaries, and balance sheets formatted for the audiences that need them: members, managers, accountants, and auditors.

---

*Sprint 6 | February 7, 2026 | Habitat*
