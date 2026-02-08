# Service Credit Integration

*Sprint 16 — Building on: [Member Allocation Statements](member-allocation-statements.md)*

---

## Overview

Phase 4 begins. The three-phase core (Treasury, People, Agreements) is specified. This sprint integrates the service credit protocol (context document 13) into the accounting system — connecting the postage stamp layer to the ledger that tracks it.

Service credits are a prepaid medium for information economy infrastructure. A member buys credits. Credits are redeemable against four resource primitives: compute, transfer, long-term memory, short-term memory. The issuing organization publishes a rate card mapping credits to resource units. Credits are transferable within the network but not tradeable on external markets.

For the accounting system, service credits create a specific pattern: **liability at issuance, revenue at redemption.** Getting this right matters for two reasons — accurate financial reporting and regulatory classification. Credits designed to avoid securities classification under the Howey test must behave as prepaid consumption instruments, not investment vehicles. The accounting must reflect this.

## Credit Lifecycle in Treasury

### Issuance

A member purchases 100 credits at the fixed issuance rate (10 credits per $1 = $10 purchase).

```
Event: credit.issued
├── member_id
├── quantity: 100
├── amount_paid: $10.00
├── issuance_rate: 10 credits / $1
└── timestamp
```

**Treasury transactions:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1110 Operating Checking | $10.00 | |
| 2 | 2220 Service Credits Outstanding | | $10.00 |

Cash increases. Liability increases. No revenue yet — the organization owes infrastructure services.

### Redemption

The member uses 20 credits for compute services. Current rate card: 1 credit = 0.1 compute-hours.

```
Event: credit.redeemed
├── member_id
├── quantity: 20
├── primitive: compute
├── resource_units: 2.0 compute-hours
├── credit_value: $2.00
└── timestamp
```

**Treasury transactions:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 2220 Service Credits Outstanding | $2.00 | |
| 2 | 4420 Credit Redemption Revenue | | $2.00 |

Liability decreases. Revenue recognized. This revenue flows through the patronage allocation at period end — it is real income from services delivered.

**Corresponding expense** (the cost of providing the compute):

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 5510 Compute | $X.XX | |
| 2 | 1110 Operating Checking (or 2110 AP) | | $X.XX |

The margin between redemption revenue ($2.00) and infrastructure cost ($X.XX) is the organization's operating margin on service credits.

### Transfer

A member transfers 30 credits to another member within the network.

```
Event: credit.transferred
├── from_member_id
├── to_member_id
├── quantity: 30
└── timestamp
```

**Treasury transactions:** None. Transfers are ledger movements within the credit system, not economic events for the organization. The liability (2220) remains unchanged — the organization still owes 30 credits worth of services, just to a different member.

The credit ledger (not Treasury) tracks the per-member credit balance.

### Expiration (if configured)

If credits expire after a defined period:

```
Event: credit.expired
├── member_id
├── quantity: 10
├── credit_value: $1.00
└── timestamp
```

**Treasury transactions:**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 2220 Service Credits Outstanding | $1.00 | |
| 2 | 4420 Credit Redemption Revenue | | $1.00 |

Expired credits become revenue — the obligation is extinguished. This is standard breakage accounting, similar to gift card expiration. Note: frequent expiration undermines the consumption-instrument argument for Howey test purposes. Expiration should be long (recommended: 24 months minimum) or absent.

## The Credit Ledger

Treasury tracks the aggregate liability (2220). The credit ledger tracks per-member balances and transaction history:

```
CreditLedger
├── member_id
├── balance              (current credits held)
├── transactions[]
│   ├── id
│   ├── type             (issuance | redemption | transfer_in | transfer_out | expiration)
│   ├── quantity          (credits)
│   ├── counterparty_id   (for transfers)
│   ├── primitive          (for redemptions: compute | transfer | lt_memory | st_memory)
│   ├── resource_units     (for redemptions: how much of the primitive was consumed)
│   ├── timestamp
│   └── rate_card_version  (which rate card was in effect)
└── history_hash          (rolling hash for audit integrity)
```

**Reconciliation invariant:** Sum of all member credit balances = 2220 Service Credits Outstanding balance in Treasury, converted at issuance rate. This is checked daily.

## Rate Card

The rate card maps credits to resource primitives. It is the variable in the system — adjusted periodically to reflect actual infrastructure costs.

```
RateCard
├── version            ("2026-Q1")
├── effective_date     (2026-01-01)
├── notice_date        (2025-12-01 — 30 days prior)
├── approved_by        (governance body)
├── rates
│   ├── compute        (credits per compute-hour)
│   ├── transfer       (credits per GB transferred)
│   ├── lt_memory      (credits per GB-month)
│   └── st_memory      (credits per GB-hour)
└── cost_basis
    ├── compute_cost   (actual $/compute-hour from 5510)
    ├── transfer_cost  (actual $/GB from infrastructure)
    ├── lt_memory_cost (actual $/GB-month from 5530)
    └── st_memory_cost (actual $/GB-hour from infrastructure)
```

**Rate card → chart of accounts connection:** The infrastructure expense accounts (5510–5540) directly inform rate card pricing. If compute costs $0.10/hour and the rate card prices compute at 1 credit/hour, then each credit redeemed for compute recognizes $0.10 in revenue against $0.10 in expense — breakeven on that primitive. The organization's margin comes from the spread between issuance price and aggregate redemption cost.

**Rate card governance:** Changes require member notice (30 days recommended) and governance approval (Sprint 20). The rate card history is preserved — members can verify how pricing has changed over time.

## Reserve Ratio

The protocol requires a public reserve ratio: liquid reserves divided by outstanding credit liabilities.

```
Reserve ratio = Liquid assets (1100) / Service Credits Outstanding (2220)
```

This is computed daily and displayed on the reserve dashboard (a View-layer report added to Sprint 7's catalog):

```
Service Credit Reserve Dashboard

Credits outstanding:     5,000 credits ($500.00)
Liquid reserves:         $11,550
Reserve ratio:           23.1x

Status: HEALTHY (ratio > 1.0x required)
```

A ratio below 1.0x means the organization cannot honor all outstanding credits at current rates. The system alerts management when the ratio drops below configurable thresholds (e.g., warning at 3.0x, critical at 1.5x).

## Patronage Interaction

Service credit revenue flows through the standard patronage allocation:

1. Credits are redeemed → revenue recognized (4420)
2. Period closes → 4420 balance included in total revenue
3. Net income calculated (revenue - expenses)
4. Patronage formula allocates net income to members

Service credit revenue is not attributed to the member who redeemed the credits — it is organizational revenue allocated by the patronage formula like any other revenue. The member who redeemed credits received infrastructure services, not an allocation claim.

However, if the organization wants to attribute service credit *sales* (issuance) as a contribution type for patronage purposes — "this member brought in $500 in credit purchases" — that is handled through the revenue attribution contribution type (Sprint 8), not through the credit system itself.

## Interoperability

When multiple organizations adopt the protocol, their credits are mutually legible through published rate cards. Cross-network redemption requires bilateral clearing:

```
ClearingAgreement
├── issuer_a_id
├── issuer_b_id
├── exchange_ratio         (derived from rate card comparison)
├── settlement_frequency   (monthly)
├── settlement_method      (net settlement in reference currency)
├── effective_date
└── terms
```

The clearing agreement creates periodic settlement transactions in Treasury — receivables or payables depending on the net flow direction.

## Howey Test Compliance

The accounting treatment reinforces the regulatory design from the protocol spec:

| Howey Element | Accounting Evidence |
|---------------|-------------------|
| Investment of money | Recorded as liability (prepayment), not equity or investment |
| Common enterprise | No pooled investment accounts; credits are individual prepaid balances |
| Expectation of profit | Rate card may decline (credit buys less); no appreciation mechanism visible in ledger |
| Efforts of others | Revenue recognized only on service delivery; value tied to resource consumption, not management activity |

If an auditor or regulator examines the books, the accounting tells a clear story: members prepaid for services, services were delivered, revenue was recognized on delivery. This is gift card accounting, not securities.

## Connection to Next Sprint

Sprint 17 (Revaluation Events) addresses what happens to capital accounts when new members join or existing members' interests change — the book-up/book-down mechanics and their 704(c) implications.

---

*Sprint 16 | February 8, 2026 | Habitat*
