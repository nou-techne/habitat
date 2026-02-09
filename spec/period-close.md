# Period Close Process

*Sprint 13 — Building on: [Patronage Formula](patronage-formula.md)*

---

## Overview

Period close is the moment when everything comes together. Contributions are finalized, the allocation formula runs, net income flows into capital accounts, and the books lock against further changes. It is the organizational equivalent of exhaling — the cycle completes, results become real, and a new period begins.

This sprint defines the end-to-end workflow. Every prior sprint feeds into it: the chart of accounts (Sprint 4), the transaction model (Sprint 5), the balance computation (Sprint 6), the contribution lifecycle (Sprint 8), and the patronage formula (Sprint 12). Period close is where the system proves itself.

## Period Structure

```
Period
├── id              (uuid)
├── name            ("Q1 2026")
├── start_date      (2026-01-01)
├── end_date        (2026-03-31)
├── status          (open | closing | closed | locked)
├── grace_end_date  (2026-04-07 — 7 days after end for late logging)
├── close_initiated (timestamp)
├── close_completed (timestamp)
├── closed_by       (who initiated the close)
├── snapshot_id     (reference to the period snapshot)
└── next_period_id  (auto-created when this period closes)
```

**Period lifecycle:**

```
Open → Closing → Closed → Locked
                    ↓
              (Reopened — emergency only, with audit trail)
```

## The Close Workflow

Seven steps, executed in order. Each step must complete before the next begins.

### Step 1: Pre-Close Review

**Trigger:** Manager initiates period close (or automated trigger on grace_end_date).

**System checks:**
- All members notified that period is closing
- Count of pending (unapproved) contributions — surfaced for review
- Count of unlogged days for active members — surfaced as warning
- Draft allocation calculation generated for preview

**Output:** Pre-close report showing what will happen if close proceeds now.

```
Pre-Close Report — Q1 2026

Contributions:      147 applied, 3 pending, 0 logged
Pending review:     Alice (2h labor Feb 28), Bob (1h community Mar 15),
                    Carol (3h labor Mar 30)
Revenue:            $15,600
Expenses:           $12,600
Net Income:         $3,000
Draft Allocation:   Alice 43.78%, Bob 32.43%, Carol 23.78%

⚠ 3 contributions still pending approval.
   Proceed? These will be excluded from this period's allocation.
```

**Decision point:** The manager can:
- **Proceed** — pending contributions are excluded (they can be approved into the next period)
- **Wait** — allow more time for approvals
- **Override** — approve pending contributions now, then proceed

### Step 2: Contribution Cutoff

Status changes to `closing`. No new contributions can be logged for this period (they route to the next period automatically). Existing `logged` contributions that haven't entered review are flagged — the member is notified that they will roll to the next period unless approved before close completes.

### Step 3: Revenue and Expense Finalization

Verify all revenue and expense transactions for the period are posted:

- Recurring expenses (rent, subscriptions) — confirm they've been recorded
- Accruals — any earned-but-not-received revenue or incurred-but-not-paid expenses
- Superfluid streams — final sampling to capture accumulated income through period end
- $CLOUD credit redemptions — all redemptions within the period recorded as revenue
- Guaranteed payments — all member payments recorded as expenses

**Adjusting entries:** Any accruals or corrections generate standard transactions (Sprint 5) dated on the last day of the period.

### Step 4: Income Statement Generation

Compute net income for the period:

```
Total Revenue (4xxx accounts, period movement)     $15,600
Total Expenses (5xxx accounts, period movement)   ($12,600)
                                                  ────────
Net Income                                          $3,000
```

This is the amount available for patronage allocation. The system generates the Income Statement report (Sprint 7) and holds it for verification before proceeding.

### Step 5: Allocation Calculation (Final)

Run the patronage formula (Sprint 12) in `final` mode:

1. Gather all `applied` contributions for the period, by member and category
2. Apply category weights
3. Calculate member percentages
4. Apply thresholds (minimum contribution, maximum cap)
5. Allocate net income to each member
6. Handle rounding
7. Verify: total allocated = net income

The calculation record is created with status `final`. It requires manager approval before application.

```
Allocation Calculation — Q1 2026 (FINAL)

Member     Weighted Contrib.   Percentage   Book Allocation   Tax Allocation
────────────────────────────────────────────────────────────────────────────
Alice          $4,050           43.78%         $1,313.40       (calculated)
Bob            $3,000           32.43%           $972.90       (calculated)
Carol          $2,200           23.78%           $713.40       (calculated)
────────────────────────────────────────────────────────────────────────────
Total          $9,250          100.00%         $3,000.00

Rounding adjustment: $0.30 assigned to Alice (largest allocation)

Status: FINAL — awaiting approval to apply
```

**Tax allocations:** May differ from book allocations if 704(c) layers exist (Sprint 17: Revaluation Events). For organizations without property contributions creating book/tax divergence, book and tax allocations are identical.

### Step 6: Apply to Capital Accounts

After manager approval, the allocation generates Treasury transactions:

**Revenue/Expense close:**
- Debit all Revenue accounts (zeroing them)
- Credit all Expense accounts (zeroing them)
- Net to 3310 Current Year Net Income

**Allocation entries (book basis):**
- Debit 3310 Current Year Net Income: $3,000
- Credit 3100-Alice Book Capital: $1,313.40
- Credit 3100-Bob Book Capital: $972.90
- Credit 3100-Carol Book Capital: $713.70

**Allocation entries (tax basis):**
- Same structure with 3200-{member} accounts, amounts per tax calculation

All transactions link to the allocation calculation's event_id. Revenue and expense accounts start the new period at zero.

### Step 7: Lock and Snapshot

**Period snapshot captured** (Sprint 6): all account balances frozen as of period end.

**Period status → `closed`.** No new transactions can post to this period. The snapshot becomes the starting point for balance queries in the next period.

**Period status → `locked`** (after configurable review window, e.g., 30 days). Once locked, the period cannot be reopened without executive override and audit documentation.

**Next period auto-created** with status `open`.

## Period Close Checklist

The system tracks completion of each step:

```
Period Close Checklist — Q1 2026

[✓] Step 1: Pre-close review generated
[✓] Step 2: Contribution cutoff applied
[✓] Step 3: Revenue/expense finalized (3 adjusting entries)
[✓] Step 4: Income statement generated (Net Income: $3,000)
[✓] Step 5: Allocation calculated (FINAL, approved by operations steward 2026-04-05)
[✓] Step 6: Capital accounts updated (6 transactions posted)
[✓] Step 7: Period locked, snapshot captured

Close completed: 2026-04-05T16:30:00Z
Next period: Q2 2026 (open)
```

## Emergency Reopen

Closed (but not locked) periods can be reopened for corrections:

1. Manager requests reopen with documented reason
2. System reverses the allocation transactions (Sprint 5 reversal pattern)
3. Period status returns to `open`
4. Corrections are made (new contributions approved, adjusting entries posted)
5. Close workflow runs again from Step 1

**After lock:** Reopening a locked period requires executive-level override, creates a prominent audit entry, and should be extremely rare. The preferred approach is to correct in the current period via adjusting entries that reference the prior period error.

## Timing

Recommended close timeline for quarterly periods:

| Day | Action |
|-----|--------|
| Period end | Contribution cutoff begins; grace period starts |
| +7 days | Grace period ends; late contributions require override |
| +14 days | Pre-close review; pending contributions resolved |
| +21 days | Allocation calculated, reviewed, approved |
| +30 days | Capital accounts updated; period closed |
| +60 days | Period locked |

This gives adequate time for reconciliation, review, and accountant involvement before the period becomes immutable.

## Connection to Next Sprint

Sprint 14 (K-1 Data Assembly) will define how the closed period's data — capital account movements, allocation calculations, guaranteed payments — assembles into the Schedule K-1 output that the accountant needs for member tax reporting.

---

*Sprint 13 | February 8, 2026 | Habitat*
