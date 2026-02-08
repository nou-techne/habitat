# K-1 Data Assembly

*Sprint 14 — Building on: [Period Close Process](period-close.md)*

---

## Overview

The Schedule K-1 (Form 1065) is the document that connects the cooperative's internal accounting to each member's personal tax return. It reports each partner's share of income, deductions, credits, and other tax items for the year.

The system does not file K-1s — that is the accountant's responsibility. The system's job is to assemble all the data the accountant needs, in a format they can use, without requiring them to have system access or accounting software compatibility. This is the critical external interface: where Habitat meets the world outside the cooperative.

Sprint 13 closed the period and locked the books. This sprint extracts what the accountant needs from those locked records.

## What a K-1 Contains

The Schedule K-1 reports these items per member per tax year (assembled from one or more closed periods):

### Part II: Information About the Partner

| Line | Item | Source in Habitat |
|------|------|-------------------|
| J | Partner's share of profit, loss, and capital | Allocation percentage from patronage formula (Sprint 12) |
| K | Partner's share of liabilities | Calculated from partnership liabilities and agreement terms |
| L | Partner's capital account analysis | Tax capital account (3200-{member}) movement for the year |

### Part II, Line L Detail — Capital Account Analysis

This is the most critical section. It maps directly to the tax capital account:

| Field | Source |
|-------|--------|
| Beginning capital account | 3200-{member} balance at start of year |
| Capital contributed during year | Sum of `applied` contributions (tax basis) for the year |
| Current year increase (decrease) | Tax allocation from patronage formula |
| Withdrawals & distributions | Sum of distributions from 3900-{member} for the year |
| Ending capital account | 3200-{member} balance at end of year |
| Tax basis method | Check: Tax basis (not GAAP, not Section 704(b)) |

**Verification:** Beginning + Contributions + Allocation - Distributions = Ending. If this doesn't balance, there is an error in the data.

### Part III: Partner's Share of Current Year Income, Deductions, Credits

| Line | Item | Source |
|------|------|--------|
| 1 | Ordinary business income (loss) | Member's tax allocation of net ordinary income |
| 2 | Net rental real estate income | If applicable — allocated by formula |
| 4a | Guaranteed payments for services | From 5210 account, filtered by member |
| 4b | Guaranteed payments for capital | If applicable |
| 5 | Interest income | Member's share of 4910 interest |
| 11 | Other income | Member's share of other revenue categories |
| 13 | Deductions — various | Member's share of deductible expenses |
| 19 | Distributions | Cash and property distributed to member |
| 20 | Other information | Section 199A (QBI), self-employment earnings, etc. |

### Section 199A (Qualified Business Income)

For pass-through entities, the QBI deduction requires additional reporting:

| Item | Source |
|------|--------|
| QBI or qualified PTP income | Member's share of ordinary income (with adjustments) |
| W-2 wages | Partnership's total W-2 wages × member's allocation % |
| UBIA of qualified property | Unadjusted basis of qualified property × member's allocation % |

## Data Assembly Process

The system assembles K-1 data after the final period of the tax year is closed and locked.

### Step 1: Aggregate Periods

If the organization closes quarterly, four periods compose one tax year:

```
Tax Year 2026 K-1 Assembly

Periods included:
  Q1 2026 (locked ✓)
  Q2 2026 (locked ✓)
  Q3 2026 (locked ✓)
  Q4 2026 (locked ✓)

All periods locked: YES — proceed with assembly
```

If any period is not locked, the system warns but allows draft assembly for planning purposes.

### Step 2: Per-Member Extraction

For each member, the system pulls:

```
K1MemberData
├── member_id
├── tax_year
├── tax_id_reference        (reference to secure storage, never stored in Habitat)
├── capital_account
│   ├── beginning_balance    (3200-{member} at Jan 1)
│   ├── contributions        (sum of tax-basis contributions for year)
│   ├── allocation           (sum of tax allocations across all periods)
│   ├── distributions        (sum of distributions for year)
│   └── ending_balance       (3200-{member} at Dec 31)
├── income_items
│   ├── ordinary_income      (allocated ordinary business income)
│   ├── guaranteed_payments  (from 5210, filtered by member)
│   ├── interest_income      (allocated share of 4910)
│   ├── rental_income        (if applicable)
│   └── other_income         (allocated shares of other revenue)
├── deduction_items
│   ├── section_179          (if applicable)
│   ├── charitable           (if applicable)
│   └── other_deductions     (allocated shares of deductible expenses)
├── allocation_percentages
│   ├── profit               (patronage % for income allocation)
│   ├── loss                 (may differ from profit %)
│   └── capital              (may differ — based on capital account ratio)
├── liability_share
│   ├── recourse             (member's share of recourse liabilities)
│   ├── qualified_nonrecourse (member's share)
│   └── nonrecourse          (member's share)
├── section_199a
│   ├── qbi                  (qualified business income)
│   ├── w2_wages             (allocated share)
│   └── ubia                 (allocated share)
└── section_704c
    └── adjustments[]        (if book/tax divergence exists)
```

### Step 3: Verification

Before export, the system runs consistency checks:

| Check | Rule |
|-------|------|
| Capital account reconciliation | Beginning + contributions + allocation - distributions = ending |
| Allocation totals | Sum of all members' allocations = total partnership income/loss |
| Guaranteed payments | Sum across members = total 5210 account for year |
| Distribution totals | Sum across members = total distributions recorded |
| Percentage totals | Profit/loss/capital percentages sum to 100% across all members |
| 704(c) consistency | Book/tax divergence per member = sum of their 704(c) layers |

Failed checks block export and surface the specific discrepancy for resolution.

## Export Format

### Primary: CSV Package

A zip file containing structured CSVs that any tax preparation software can import:

```
k1-export-2026/
├── summary.csv              (one row per member, high-level)
├── capital-accounts.csv     (Line L detail per member)
├── income-deductions.csv    (Part III items per member)
├── guaranteed-payments.csv  (detail of 5210 by member and date)
├── distributions.csv        (detail of distributions by member and date)
├── allocation-calculations.csv  (full calculation records from each period)
├── section-199a.csv         (QBI detail per member)
├── 704c-adjustments.csv     (if applicable)
└── verification-report.csv  (all checks with pass/fail status)
```

### Secondary: JSON API

For accountants using modern tax platforms with API import:

```json
{
  "tax_year": 2026,
  "entity": {
    "name": "RegenHub LCA",
    "ein_reference": "secure_vault_ref",
    "entity_type": "partnership",
    "tax_treatment": "subchapter_k"
  },
  "partners": [
    {
      "member_id": "uuid",
      "capital_account": { ... },
      "income_items": { ... },
      "deduction_items": { ... },
      "allocation_percentages": { ... }
    }
  ],
  "verification": {
    "all_checks_passed": true,
    "generated_at": "2026-02-15T10:00:00Z"
  }
}
```

### Tertiary: PDF Summary

A human-readable summary per member, formatted to mirror the K-1 layout. Not a substitute for the actual K-1 (which the accountant prepares), but useful for member communication: "here's what your K-1 will approximately show."

## Security

K-1 data contains sensitive financial information. The system enforces:

- **No SSN/TIN storage in Habitat.** Tax IDs are stored in a separate secure vault. The export references them by member_id; the accountant matches to TINs from their own records.
- **Export access restricted** to finance_lead and accountant roles.
- **Export logged** — every export is recorded with who, when, and what was included.
- **Encrypted transit** — exports delivered via secure channel (encrypted email, secure file share), never via unencrypted attachment.

## Accountant Workflow

The intended handoff:

1. All periods for the tax year are closed and locked
2. Finance lead triggers K-1 data assembly
3. System runs verification checks
4. Export package generated (CSV + verification report)
5. Package delivered to accountant via secure channel
6. Accountant imports into tax preparation software
7. Accountant prepares actual K-1 forms, applying professional judgment on items requiring interpretation (e.g., Section 199A eligibility, state-specific adjustments)
8. K-1s distributed to members

The system provides data, not tax advice. The accountant provides professional interpretation. The boundary is clear and intentional.

## Phase 3 Validation

With Sprints 12–14 complete, the Allocation layer can answer its validation question:

**Does the calculation match manual verification?**

Yes, if:
- [x] Patronage formula applies weights to verified contributions (Sprint 12)
- [x] Period close finalizes contributions and runs the allocation (Sprint 13)
- [x] K-1 data assembles from locked period records with full verification (Sprint 14)
- [x] Every number traces from K-1 export back through allocation → contributions → transactions
- [x] Verification checks confirm internal consistency before export

The accountant can independently verify by recalculating from the exported contribution data and allocation weights. If their number matches the system's number, the system is correct.

## Connection to Next Sprint

Sprint 15 (Member Allocation Statements) will define the member-facing communication of allocation results — how members understand what they received and why, without requiring accounting knowledge. This completes Phase 3.

---

*Sprint 14 | February 8, 2026 | Habitat*
