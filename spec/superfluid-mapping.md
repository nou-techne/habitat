# Superfluid Mapping

*Sprint 18 — Building on: [Revaluation Events](revaluation-events.md)*

---

## Overview

Superfluid enables continuous, real-time token streams on Ethereum. Instead of discrete payments — "send $100 on the 1st of each month" — a stream flows continuously: $100/month means tokens transfer every second, proportionally, without individual transactions.

This is a fundamentally different temporal pattern than anything else in the accounting system. Every prior sprint assumes discrete events: a contribution logged, a transaction posted, a period closed. Streams don't start and stop — they flow. The accounting system must bridge between continuous onchain reality and discrete ledger entries.

This sprint defines that bridge.

## The Problem

A Superfluid stream of 0.015 ETHx per month doesn't produce monthly transactions on-chain. It produces a continuously increasing balance, claimable at any moment. From the blockchain's perspective, the recipient's balance is always growing. From the accounting system's perspective, income must be recognized in discrete amounts, assigned to periods, and allocated through the patronage formula.

The question: how often do you sample the stream, and what do you record?

## Stream Types

Streams interact with the cooperative's accounting in two directions:

### Inbound Streams (Income)

Tokens flowing into the cooperative's wallet. Examples:
- Investor distributions (ETHx, SUP)
- Revenue share from ventures
- Grant disbursements structured as streams
- Service credit redemption flows (future)

**Accounting treatment:** Revenue, recognized periodically.

### Outbound Streams (Expense or Distribution)

Tokens flowing out of the cooperative's wallet. Examples:
- Member compensation as continuous payment
- Patronage distributions streamed rather than lump-sum
- Service provider payments
- Infrastructure cost streams (hosting, compute)

**Accounting treatment:** Expense or distribution, recognized periodically.

## The Sampling Model

The system samples streams at configurable intervals, recording the accumulated delta as a discrete transaction.

### Sampling Configuration

```
StreamSamplingConfig
├── default_interval     (daily | weekly | monthly)
├── period_end_sample    (true — always sample on last day of period)
├── price_source         (exchange | oracle | manual)
├── price_averaging      (spot | 24h_vwap | period_average)
└── stream_configs[]
    ├── stream_id
    ├── token             (ETHx, SUP, CELOx, etc.)
    ├── direction         (inbound | outbound)
    ├── account_id        (Treasury account to credit/debit)
    ├── override_interval (optional — per-stream override)
    └── denomination      (USD | native — whether to convert to USD)
```

**Recommended default:** Daily sampling with mandatory period-end samples. This balances accuracy against transaction volume. A monthly stream of 0.015 ETHx produces ~30 daily transactions rather than one monthly lump — more granular for reporting, but not overwhelming.

### The Sampling Event

Each sample reads the stream's accumulated balance since the last sample:

```
Event: stream.sampled
├── stream_id
├── sample_timestamp
├── token                 (ETHx)
├── amount_since_last     (0.0005 ETHx — one day's accumulation)
├── usd_value             ($1.25 — at sample-time price)
├── price_used            ($2,500/ETH)
├── price_source          (Coinbase, 24h VWAP)
├── cumulative_period     (0.0075 ETHx — total this period so far)
└── onchain_balance       (0.0150 ETHx — total claimable)
```

### Treasury Transaction

Each sample produces a standard transaction:

**Inbound stream (revenue):**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1520 Wrapped/Streaming Tokens | $1.25 | |
| 2 | 4510 Streaming Income | | $1.25 |

**Outbound stream (expense):**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 5xxx Appropriate Expense | $X.XX | |
| 2 | 1520 Wrapped/Streaming Tokens | | $X.XX |

**Outbound stream (patronage distribution):**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 3100-{member} Book Capital | $X.XX | |
| 2 | 1520 Wrapped/Streaming Tokens | | $X.XX |

## Price Handling

Streams denominated in volatile tokens require USD conversion for the books. The system supports three approaches:

| Method | Description | Best For |
|--------|-------------|----------|
| **Spot** | Price at exact sample time | Simplicity, small streams |
| **24h VWAP** | Volume-weighted average over 24 hours | Reducing volatility impact |
| **Period average** | Average price across the accounting period | Most conservative, smooths fluctuations |

The chosen method is documented per stream and applied consistently. Changing the method mid-period requires a documented reason and adjusting entries.

**Unrealized gain/loss:** Between samples, the token price may change. The system tracks:
- **Cost basis per token:** USD value at the time each sample was recorded
- **Current market value:** Token quantity × current price
- **Unrealized gain/loss:** The difference

Unrealized gains and losses are reported but not recognized as income until the tokens are sold or converted. This follows standard cryptocurrency accounting treatment.

## Stream Lifecycle in Treasury

```
Stream Created (onchain)
  ↓
Registered in system (stream_id, token, rate, accounts mapped)
  ↓
Sampling begins (daily or configured interval)
  ↓
Each sample → Treasury transaction → account balances update
  ↓
Period end → final sample → all stream income included in net income
  ↓
Patronage allocation includes streaming revenue
  ↓
Stream Updated/Cancelled (onchain) → system adjusts sampling
```

### Stream Registration

When a new stream is detected or manually registered:

```
StreamRegistration
├── stream_id              (Superfluid stream identifier)
├── sender                 (onchain address)
├── receiver               (cooperative wallet)
├── token                  (Super Token: ETHx, SUPx, etc.)
├── flow_rate              (tokens per second)
├── monthly_equivalent     (human-readable rate)
├── start_date             (when the stream began)
├── treasury_account       (which account to credit/debit)
├── revenue_account        (4510 or specific sub-account)
├── denomination           (USD conversion or native tracking)
├── sampling_interval      (daily, weekly, etc.)
└── status                 (active | paused | cancelled)
```

### Stream Changes

Superfluid streams can be updated (rate changed) or cancelled at any time. The system handles:

**Rate change:** Record a final sample at the old rate, then begin sampling at the new rate. The change is documented as a stream event.

**Cancellation:** Record a final sample capturing any unrecorded accumulation. Mark the stream as cancelled. No further samples.

**New stream from same sender:** Treated as a new registration, not a continuation. Separate stream_id, separate sampling history.

## Reconciliation

Stream balances must reconcile between the accounting system and the blockchain:

| Check | Method | Frequency |
|-------|--------|-----------|
| Cumulative samples ≈ onchain flow | Compare sum of all samples to expected flow (rate × elapsed time) | Daily |
| Token balance | Compare 1520 account balance to actual wallet token balance | Daily |
| Claimed vs unclaimed | Note any unclaimed tokens (accumulated but not withdrawn onchain) | Weekly |

**Tolerance:** Due to sampling intervals and price conversion timing, a small discrepancy is expected. The system flags discrepancies exceeding a configurable threshold (e.g., 1% of period stream value).

## Streams as Patronage Distribution

The most architecturally significant future application: using Superfluid to distribute patronage allocations continuously rather than in quarterly lump sums.

After period close (Sprint 13), instead of a single distribution transaction, the system could:

1. Calculate each member's allocation percentage
2. Create or update outbound streams to each member at proportional rates
3. Patronage flows continuously until the next period close adjusts the rates

This makes the economic watershed literal — value flows continuously from the cooperative to its members, proportional to their contribution. The capital account decreases continuously rather than in quarterly steps, and the member's wallet balance increases continuously.

**Prerequisites:** This requires the cooperative to hold sufficient streaming tokens and the members to have wallets capable of receiving Superfluid streams. It is an enhancement, not a replacement for traditional lump-sum distributions.

## Retroactive Update

Sprint 4 (Chart of Accounts) already includes account 1520 (Wrapped/Streaming Tokens) and 4510 (Streaming Income). Sprint 5 (Transaction Model) already includes a Superfluid stream sampling example. No retroactive changes needed — the prior sprints anticipated this integration.

## Connection to Next Sprint

Sprint 19 (Distribution Mechanics) will define how the cooperative distributes value to members — both traditional lump-sum and the continuous streaming approach introduced here.

---

*Sprint 18 | February 8, 2026 | Habitat*
