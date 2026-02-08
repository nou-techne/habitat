# Distribution Mechanics

*Sprint 19 — Building on: [Superfluid Mapping](superfluid-mapping.md)*

---

## Overview

Allocations tell members what they earned. Distributions give it to them. These are distinct events — a member can be allocated $5,000 in patronage without receiving a single dollar in cash. The allocated amount sits in their capital account, growing their stake in the cooperative. Distribution is when value actually leaves the organization and reaches the member.

This distinction matters legally (distributions reduce capital accounts and affect 704(b) compliance), financially (the cooperative needs to retain capital for operations), and strategically (the ratio of retained to distributed patronage shapes the cooperative's capitalization).

## Distribution vs. Allocation

| | Allocation | Distribution |
|---|-----------|-------------|
| **What** | Credit to capital account | Cash or property to member |
| **When** | Period close (Sprint 13) | Whenever the cooperative decides |
| **Effect on capital** | Increases balance | Decreases balance |
| **Tax impact** | Member owes tax on allocated share | Generally not taxable (return of capital) |
| **Required** | Yes — 704(b) requires allocation | No — cooperative chooses when and how much |

A member may be allocated income they never receive in cash. They still owe taxes on it. This is a fundamental feature of partnership taxation that the system must communicate clearly (Sprint 15 addresses this in the member statement).

## Distribution Policy

The cooperative configures its distribution policy in Agreements:

```
DistributionPolicy
├── id
├── name                    ("Standard Quarterly Distribution")
├── frequency               (quarterly | annually | on_demand | continuous)
├── retention_ratio         (0.60 — retain 60%, distribute 40%)
├── minimum_reserve          ($10,000 — don't distribute below this cash level)
├── distribution_basis       (capital_account | allocation | equal | custom)
├── eligible_members         (all_cooperative | positive_balance | minimum_tenure)
├── payment_methods[]        (bank_transfer | check | crypto | superfluid_stream)
├── approval_required        (board | manager | automatic)
├── effective_date
└── approved_by
```

### Retention Ratio

The retention ratio determines how much of each period's allocation is distributed vs. retained:

```
Period allocation:     $3,000 to Member A
Retention ratio:       60%
Retained (in capital): $1,800
Distributed (in cash): $1,200
```

Retained patronage stays in the member's capital account — it is the cooperative's internal financing mechanism. The member effectively lends their patronage back to the organization. This is standard cooperative practice and creates member investment without requiring additional cash contributions.

### Distribution Basis

How the distribution pool is divided among members:

| Basis | Method | Use Case |
|-------|--------|----------|
| **Capital account** | Proportional to book capital balances | Most common — distributes based on total stake |
| **Allocation** | Proportional to current period's allocation | Distributes based on recent patronage only |
| **Equal** | Same amount to each eligible member | Egalitarian cooperatives |
| **Custom** | Formula-based | Complex multi-class structures |

## Distribution Lifecycle

```
Calculated → Approved → Scheduled → Executed → Recorded
                                       ↓
                              Payment Method
                           ├── Bank transfer
                           ├── Check
                           ├── Crypto transfer
                           └── Superfluid stream
```

### Step 1: Calculate

The system computes each member's distribution based on the policy:

```
Distribution Calculation — Q1 2026

Available for distribution:
  Total allocations this period:    $3,000.00
  Retention ratio:                  60%
  Distribution pool:                $1,200.00
  Cash available:                   $11,550.00
  Minimum reserve:                  $10,000.00
  Distributable cash:               $1,550.00  ✓ (exceeds pool)

Per-member distributions:
  Member A (43.78%):    $525.36
  Member B (32.43%):    $389.16
  Member C (23.78%):    $285.36
  Rounding adjustment:      $0.12 → Member A
                         ─────────
  Total:                $1,200.00
```

**Cash sufficiency check:** If distributable cash is less than the distribution pool, the system either reduces all distributions proportionally or defers the distribution. It never distributes below the minimum reserve.

### Step 2: Approve

Distribution requires approval per the policy configuration:

- **Board approval:** For large or non-routine distributions
- **Manager approval:** For routine quarterly distributions
- **Automatic:** System executes without human approval (for continuous/streaming distributions)

### Step 3: Schedule

Distributions are scheduled with a payment date. Members are notified of the upcoming distribution and amount.

### Step 4: Execute

Payment is sent via the member's configured payment method.

**Bank transfer:** Standard ACH or wire. System records the transfer reference.

**Check:** Generates check record. Increasingly rare.

**Crypto transfer:** Sends tokens to member's wallet address. Transaction hash recorded.

**Superfluid stream:** Creates or updates an outbound stream to the member (Sprint 18). The distribution flows continuously until the next period adjusts the rate.

### Step 5: Record

Treasury transactions are created:

**Book basis:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 3100-{member} Book Capital | $525.36 | |
| 2 | 1110 Operating Checking | | $525.36 |

**Tax basis:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 3200-{member} Tax Capital | $525.36 | |
| 2 | 1110 Operating Checking | | $525.36 |

For crypto distributions, the debit to 1510/1520 instead of 1110.

## Non-Negative Guard

Distributions must not drive a member's book capital account below zero unless the member has a Deficit Restoration Obligation (Sprint 2):

```
Member A book capital:    $8,313.40
Proposed distribution:    $525.36
Post-distribution balance: $7,788.04  ✓

Member D book capital:    $200.00
Proposed distribution:    $300.00
Post-distribution balance: ($100.00)  ✗ BLOCKED

  → Reduce to $200.00 (maximum distributable)
  → Or require DRO agreement before proceeding
```

The system enforces this automatically. No manual override is permitted without DRO documentation.

## Qualified Income Offset Integration

If a prior allocation reduced a member's capital account (loss allocation), the QIO provision from Sprint 2 applies:

Before distributing to a member with a negative or low capital account, the system checks:
1. Does the member have a QIO obligation?
2. Would this distribution violate the QIO threshold?
3. If yes, the distribution is withheld until the capital account recovers through future allocations.

## Continuous Distribution via Superfluid

Sprint 18 introduced the concept of streaming patronage distributions. Here is the full flow:

1. Period closes. Allocations calculated. Distribution pool determined.
2. Instead of lump-sum payment, the system calculates a flow rate per member:

```
Member A distribution: $525.36 over 90 days (next quarter)
Flow rate: $5.84/day = $0.000068/second
```

3. System creates or updates a Superfluid outbound stream to the member's wallet
4. Tokens flow continuously until the next period close adjusts the rate
5. Each daily sample (Sprint 18) records the outflow as a distribution transaction

**Advantages:** Members receive value continuously rather than waiting for quarterly payouts. The cooperative's cash position decreases gradually rather than in lumps. The economic watershed becomes literal.

**Constraints:** Requires sufficient streaming token balance. Members must have compatible wallets. Not all members may prefer continuous over lump-sum.

**Configuration:** Members choose their preferred distribution method. Some may receive streams while others receive quarterly bank transfers. The system handles mixed methods within a single distribution cycle.

## Member Withdrawal (Exit Distribution)

When a member leaves the cooperative, their entire capital account balance is due as a liquidating distribution — per the 704(b) requirement that liquidation follows positive capital account balances (Sprint 2).

```
Member Withdrawal — Member B

Book capital account:       $5,500.00
Less: any outstanding obligations   ($0.00)
                              ─────────
Liquidating distribution:    $5,500.00

Payment schedule:
  Immediate (30%):          $1,650.00
  12 months (35%):          $1,925.00
  24 months (35%):          $1,925.00
```

**Payment schedule:** The operating agreement typically allows the cooperative to pay the liquidating distribution over time (commonly 2–3 years) rather than immediately. This protects the cooperative's cash position. The system tracks the schedule, records each payment, and adjusts the departing member's capital account accordingly.

The departing member's capital account remains open until fully paid out, with a status of `withdrawing`. Once fully distributed, the account is closed.

## Connection to Next Sprint

Sprint 20 (Governance Controls) will define the approval workflows, access rules, and audit trail requirements that govern all of the processes specified in Phases 1–4 — the Constraint layer of the pattern stack applied across the entire system.

---

*Sprint 19 | February 8, 2026 | Habitat*
