# Patronage Formula

*Sprint 12 — Building on: [People-Treasury Integration](people-treasury-integration.md)*

---

## Overview

This is the heart of cooperative economics. The patronage formula answers: *given that the organization earned net income this period, how much does each member receive?*

In a corporation, this question is answered by share ownership — fixed percentages determined at investment time. In a cooperative under Subchapter K, it is answered by patronage — dynamic percentages determined by each member's contribution during the period. The formula must satisfy the 704(b) substantiality test (Sprint 2): allocations based on genuine economic factors, not tax-motivated shifting.

Phase 1 gave us the net income figure (revenue minus expenses). Phase 2 gave us verified, valued contributions per member. This sprint connects them.

## The Formula

The patronage allocation for a member in a period is:

```
member_allocation = net_income × member_patronage_percentage
```

Where:

```
member_patronage_percentage = member_weighted_contribution / total_weighted_contributions
```

And:

```
member_weighted_contribution = Σ (contribution_value × category_weight)
                               for all contribution categories
```

This is a weighted sum. Each category of contribution (labor, cash, revenue, community) has a weight reflecting its relative importance to the organization. The weights are the cooperative's value statement expressed as arithmetic.

## Weights

Weights are configurable per organization and per period. They must sum to 1.0 (100%).

**Example configuration:**

| Category | Weight | Rationale |
|----------|--------|-----------|
| Labor | 0.40 | Primary value creator — the work itself |
| Revenue | 0.30 | Direct economic contribution — bringing in income |
| Cash | 0.20 | Financial commitment — providing operating capital |
| Community | 0.10 | Organizational health — governance, mentoring, culture |
| **Total** | **1.00** | |

**What the weights mean:** A cooperative that weights labor at 0.40 and cash at 0.20 is saying that an hour of work matters twice as much as the equivalent dollar amount of capital. A different cooperative might weight them equally, or invert them. There is no correct answer — only the answer that reflects the organization's values and satisfies the substantiality test.

**Substantiality constraint:** The weights must have documented business purpose. "We weight labor heavily because our organization's value comes primarily from member expertise and effort" is sufficient. "We weight labor heavily because it shifts taxable income to lower-bracket members" is not. The rationale is stored with the weight configuration.

## Calculation Walkthrough

### Inputs

Three members, one quarter:

| Member | Labor ($) | Revenue ($) | Cash ($) | Community ($) |
|--------|----------|-------------|----------|---------------|
| Alice | $6,000 | $4,000 | $2,000 | $500 |
| Bob | $4,000 | $1,000 | $5,000 | $1,000 |
| Carol | $3,000 | $2,000 | $1,000 | $2,000 |

Net income for the period: $12,000

### Step 1: Apply Weights

Using weights: Labor 0.40, Revenue 0.30, Cash 0.20, Community 0.10

| Member | Labor × 0.4 | Revenue × 0.3 | Cash × 0.2 | Community × 0.1 | Weighted Total |
|--------|-------------|----------------|------------|------------------|----------------|
| Alice | $2,400 | $1,200 | $400 | $50 | $4,050 |
| Bob | $1,600 | $300 | $1,000 | $100 | $3,000 |
| Carol | $1,200 | $600 | $200 | $200 | $2,200 |
| **Sum** | | | | | **$9,250** |

### Step 2: Calculate Percentages

| Member | Weighted Total | Percentage |
|--------|---------------|------------|
| Alice | $4,050 | 43.78% |
| Bob | $3,000 | 32.43% |
| Carol | $2,200 | 23.78% |
| **Total** | **$9,250** | **100.00%** |

### Step 3: Allocate Net Income

| Member | Percentage | Allocation |
|--------|-----------|------------|
| Alice | 43.78% | $5,253.60 |
| Bob | 32.43% | $3,891.60 |
| Carol | 23.78% | $2,853.60 |
| **Total** | **100.00%** | **$11,998.80** |

**Rounding:** The allocations don't sum to exactly $12,000 due to decimal rounding. The system handles this by assigning the residual ($1.20) to the member with the largest allocation. This is standard practice and is documented in the calculation record.

## Thresholds

Organizations may configure minimum thresholds for patronage participation:

### Minimum Contribution Threshold

Members who contribute below a minimum level receive zero allocation for the period. Their share is redistributed among qualifying members.

```
minimum_threshold:
  type: percentage_of_average  |  fixed_amount  |  fixed_hours
  value: 25%                   |  $500           |  40 hours
  applies_to: total_weighted   |  any_category   |  specific_category
```

**Example:** If the threshold is 25% of average weighted contribution, a member must contribute at least $2,312.50 in weighted value (25% of $9,250 / 3 = $3,083.33 average) to qualify. In our walkthrough, all three members exceed this.

**704(b) note:** Thresholds must be applied consistently and have documented business purpose. "Members who don't meet the minimum threshold haven't provided sufficient patronage to justify an allocation" is defensible. The threshold itself should be set by member governance, not by management discretion.

### Maximum Allocation Cap

Optional ceiling on any single member's allocation percentage, preventing concentration:

```
maximum_cap:
  type: percentage
  value: 50%
  redistribution: proportional_to_remaining
```

If Alice's calculated percentage were 55%, it would be capped at 50% and the excess 5% redistributed proportionally among Bob and Carol.

## The Calculation Record

Every allocation calculation produces a permanent record:

```
AllocationCalculation
├── id                    (uuid)
├── period_id             (which period)
├── calculated_at         (timestamp)
├── calculated_by         (system or person who triggered it)
├── status                (draft | final | applied)
├── inputs
│   ├── net_income        (from Income Statement)
│   ├── weights           (category weights used)
│   ├── thresholds        (minimum/maximum if any)
│   └── member_contributions[]
│       ├── member_id
│       ├── category_totals (labor, revenue, cash, community)
│       └── source         (contribution_ids used)
├── calculations
│   ├── weighted_totals[] (per member)
│   ├── percentages[]     (per member)
│   ├── allocations[]     (per member)
│   └── rounding_adjustment
├── outputs
│   ├── member_allocations[]
│   │   ├── member_id
│   │   ├── percentage
│   │   ├── book_allocation
│   │   └── tax_allocation
│   └── verification
│       ├── total_allocated
│       ├── equals_net_income (boolean)
│       └── all_members_accounted (boolean)
└── approval
    ├── approved_by
    ├── approved_at
    └── notes
```

**Why this detail matters:** The calculation record is the primary audit artifact for 704(b) compliance. It proves that allocations were based on genuine economic factors (substantiality), that the inputs trace to verified contributions (economic effect), and that the math is correct and complete. If the IRS examines the allocation, this record is what they review.

## Draft vs. Final

Calculations can be run in `draft` mode any time during a period — showing members what their allocation would be if the period closed now. This provides transparency and motivation without committing to the numbers.

The `final` calculation runs during period close (Sprint 13). Once marked `final`, it becomes the basis for Treasury transactions that credit member capital accounts. Once `applied`, it is immutable.

```
Draft (run anytime, informational)
  ↓
Final (run at period close, committed)
  ↓
Applied (Treasury transactions created)
```

## Alternative Formulas

The weighted-sum formula is the default, but the system is formula-agnostic. Organizations may configure alternatives:

**Equal allocation:** Every qualifying member receives the same share. Simple, egalitarian, ignores contribution differences.

**Hours-only:** Allocation proportional to hours contributed, regardless of type. Values all time equally.

**Revenue-only:** Allocation proportional to revenue generated. Maximally incentivizes business development.

**Tiered:** Different formulas for different member classes (e.g., cooperative members use weighted patronage, co-working members use hours-only).

**Custom:** An evaluated expression that takes member contribution data as input and outputs percentages. For organizations with unique allocation logic.

The formula is stored as configuration in Agreements, not hardcoded. Changing the formula requires the same governance process as changing valuation rates (Sprint 9): proposal, notice period, approval, documentation.

## Connection to Next Sprint

Sprint 13 (Period Close Process) will define the end-to-end workflow for closing a period: finalizing contributions, running the allocation calculation, generating Treasury transactions, locking the period against further changes, and producing the reports that make the result legible to members and accountants.

---

*Sprint 12 | February 8, 2026 | Habitat*
