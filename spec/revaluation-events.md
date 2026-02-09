# Revaluation Events

*Sprint 17 — Building on: [$CLOUD Credit Integration](service-credit-integration.md)*

---

## Overview

When a new member joins a cooperative that already has accumulated value, or when a member leaves, the existing capital accounts must be adjusted to reflect the current fair market value of the organization's assets. Without this adjustment, new members would share in gains that accrued before they joined, and departing members would lose value they helped create.

This is the book-up/book-down mechanism. Sprint 2 identified it as a gap. Sprint 3 noted that dual-basis tracking makes it possible. This sprint specifies how it works.

## Why Revaluation Matters

Consider: the cooperative owns equipment originally purchased for $5,000 that is now worth $12,000. Three existing members each have book capital accounts of $10,000.

Without revaluation, a new member contributing $10,000 in cash would hold 25% of the cooperative ($10,000 / $40,000 total capital). But the cooperative's assets are worth more than the books show — the $7,000 unrealized gain on the equipment belongs to the existing members, not the new one.

Revaluation adjusts the books to reflect reality before the new member enters, ensuring they receive a fair share — not more, not less.

## Triggering Events

Revaluation is permitted (not required) under Treasury Regulation § 1.704-1(b)(2)(iv)(f) when:

| Event | Description |
|-------|-------------|
| **New member admission** | A new partner contributes capital and joins the cooperative |
| **Member withdrawal** | A partner exits and receives a liquidating distribution |
| **Interest change** | A partner's ownership percentage changes significantly |
| **Contribution of property** | A partner contributes property with FMV substantially different from book value |
| **Distribution of property** | The partnership distributes property in kind |

The most common trigger for a cooperative is new member admission. The organization should adopt a policy (in its operating agreement) specifying which events trigger mandatory revaluation.

## The Revaluation Process

### Step 1: Determine Fair Market Value

The organization must determine the FMV of all partnership assets. Methods, in order of preference:

| Method | When Appropriate | Documentation |
|--------|-----------------|---------------|
| Independent appraisal | High-value assets, real estate, significant equipment | Appraiser's report |
| Comparable market data | Readily tradeable assets, standard equipment | Market research, quotes |
| Internal valuation | Low-value items, immaterial assets | Management's documented estimate |
| Book value | Assets where FMV ≈ book value | Assertion with rationale |

**Digital assets:** Cryptocurrency and streaming tokens are valued at market price on the revaluation date, sourced from a documented exchange or oracle.

**$CLOUD credits outstanding:** The liability (2220) is already at face value — no revaluation needed on the liability side.

### Step 2: Calculate Unrealized Gain or Loss

For each asset, compare current book value to FMV:

```
Revaluation Detail — February 15, 2026

Asset                    Book Value    FMV          Gain/(Loss)
──────────────────────────────────────────────────────────────
1110 Operating Checking    $11,550    $11,550           $0
1420 Computer Equipment     $5,000    $12,000       $7,000
1510 Crypto Holdings        $3,000     $4,500       $1,500
1430 Leasehold Improve.     $4,000     $3,200        ($800)
──────────────────────────────────────────────────────────────
Total                      $23,550    $31,250       $7,700
```

### Step 3: Adjust Book Capital Accounts

The total unrealized gain ($7,700) is allocated to existing members in proportion to their current book capital account percentages:

```
Pre-Revaluation Book Capital:
  Member A:  $10,000  (33.33%)
  Member B:  $10,000  (33.33%)
  Member C:  $10,000  (33.33%)
  Total:     $30,000

Revaluation Allocation ($7,700):
  Member A:  +$2,566.67
  Member B:  +$2,566.67
  Member C:  +$2,566.66

Post-Revaluation Book Capital:
  Member A:  $12,566.67
  Member B:  $12,566.67
  Member C:  $12,566.66
  Total:     $37,700
```

### Step 4: Record Treasury Transactions

**Asset revaluation entries (book basis only):**

| Entry | Account | Debit | Credit |
|-------|---------|-------|--------|
| 1 | 1420 Computer Equipment | $7,000 | |
| 2 | 1510 Crypto Holdings | $1,500 | |
| 3 | 1430 Leasehold Improvements | | $800 |
| 4 | 3100-A Book Capital | | $2,566.67 |
| 5 | 3100-B Book Capital | | $2,566.67 |
| 6 | 3100-C Book Capital | | $2,566.66 |

**Tax basis accounts are NOT adjusted.** This is the fundamental rule of revaluation: book accounts adjust to FMV, tax accounts remain at historical cost. The gap between them creates 704(c) layers.

### Step 5: Create 704(c) Layers

Each revalued asset now has a book/tax divergence that must be tracked:

```
704(c) Layers Created — Revaluation Event rev-2026-02-15

Asset                    Book Value    Tax Basis    Built-in Gain/(Loss)
────────────────────────────────────────────────────────────────────────
1420 Computer Equipment    $12,000      $5,000           $7,000
1510 Crypto Holdings        $4,500      $3,000           $1,500
1430 Leasehold Improve.     $3,200      $4,000            ($800)
────────────────────────────────────────────────────────────────────────
Total                                                    $7,700

Attributable to: Members A, B, C (pre-revaluation partners)
```

These layers affect future tax allocations. When the equipment is eventually sold or depreciated, the $7,000 built-in gain must be allocated to Members A, B, C for tax purposes — not to the new member who joined after the revaluation. This prevents the new member from bearing tax on gains that accrued before they arrived.

### Step 6: Admit New Member

Now the new member's contribution enters a cooperative whose books reflect reality:

```
New Member D contributes $12,567 in cash.

Post-admission Book Capital:
  Member A:  $12,566.67  (25.00%)
  Member B:  $12,566.67  (25.00%)
  Member C:  $12,566.66  (25.00%)
  Member D:  $12,567.00  (25.00%)
  Total:     $50,267.00
```

Member D's 25% reflects their actual economic position — they are entitled to 25% of the cooperative's value going forward, not 25% of gains that predated their admission.

## Revaluation Record

```
RevaluationEvent
├── id                    (uuid)
├── trigger               (admission | withdrawal | interest_change | property)
├── date                  (revaluation date)
├── triggered_by          (event that caused it: new member admission, etc.)
├── asset_valuations[]
│   ├── account_id
│   ├── book_value_before
│   ├── fair_market_value
│   ├── gain_loss
│   └── valuation_method   (appraisal | market | internal | book)
├── allocation_to_members[]
│   ├── member_id
│   ├── percentage
│   └── amount
├── section_704c_layers[]
│   ├── asset_account_id
│   ├── book_value
│   ├── tax_basis
│   ├── built_in_gain_loss
│   └── attributable_to[]  (member_ids)
├── transaction_ids        (Treasury transactions created)
├── approved_by
├── approved_at
└── notes
```

## 704(c) Allocation Methods

When an asset with a 704(c) layer is sold, depreciated, or amortized, the built-in gain or loss must be allocated. Three methods are permitted under the regulations:

| Method | Description | Best For |
|--------|-------------|----------|
| **Traditional** | Allocate tax depreciation/gain to match book, but never allocate more tax gain than the asset's total. Simplest. May create "ceiling rule" distortions. | Most cooperatives — simplest to administer |
| **Traditional with curative** | Like traditional, but can use other items (income, other deductions) to cure ceiling rule distortions. | Organizations with significant 704(c) exposure |
| **Remedial** | Creates notional tax items to eliminate any distortion. Most accurate, most complex. | Large partnerships with sophisticated tax advisors |

The system should default to the Traditional method and allow configuration of alternatives. The choice is stored in the operating agreement configuration (Agreements tool) and documented in the revaluation record.

## Retroactive Updates

This sprint changes an assumption in Sprint 3 (Capital Account Mechanics). The capital account can now change not just from contributions, allocations, and distributions, but also from revaluation adjustments. Sprint 3's event flow table needs a new row:

| Event | Effect | Direction |
|-------|--------|-----------|
| Revaluation adjustment | Increase or decrease by share of unrealized gain/loss | +/− |

This is a retroactive resonance update — the prior document's model is extended, not contradicted.

## Connection to Next Sprint

Sprint 18 (Superfluid Mapping) will define how continuous onchain streams — a fundamentally different temporal pattern than discrete transactions — map into the accounting system's event-sourced model.

---

*Sprint 17 | February 8, 2026 | Habitat*
