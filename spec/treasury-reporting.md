# Treasury Reporting

*Sprint 7 — Building on: [Balance Computation](balance-computation.md)*

---

## Overview

Sprint 6 established that every balance is a derivation from transaction history. This document defines the reports built on that computation layer — the View layer of the pattern stack applied to Treasury. Reports are how the system becomes legible to the people who need it.

Different audiences need different views of the same underlying data. A member wants to know their capital account balance. A manager wants to know cash position. An accountant wants trial balances for K-1 preparation. An auditor wants full transaction trails. The data is one; the views are many.

## Report Catalog

### 1. Balance Sheet

**Audience:** Management, accountants, auditors, members (simplified version)

**Content:** Assets, Liabilities, and Equity at a point in time.

```
RegenHub LCA — Balance Sheet
As of March 31, 2026

ASSETS
  Cash & Cash Equivalents          $11,550
  Receivables                       $3,200
  Prepaid & Deposits                $2,400
  Property & Equipment (net)        $8,900
  Digital Assets                    $4,150
                                  ────────
  Total Assets                    $30,200

LIABILITIES
  Current Liabilities               $4,800
  Deferred Revenue                  $2,200
  Member Obligations                $1,000
                                  ────────
  Total Liabilities                 $8,000

EQUITY
  Member Capital (Book Basis)      $18,700
  Retained Patronage                $3,500
                                  ────────
  Total Equity                    $22,200

  Total Liabilities + Equity      $30,200  ✓
```

**Derivation:** Layer 3 type summaries from Sprint 6. The equation must balance — if it doesn't, the report refuses to render and flags an error.

### 2. Income Statement

**Audience:** Management, members, accountants

**Content:** Revenue minus Expenses for a period. Shows the net income available for patronage allocation.

```
RegenHub LCA — Income Statement
For the Quarter Ended March 31, 2026

REVENUE
  Space Revenue                     $8,400
  Service Revenue                   $4,200
  Venture Revenue                   $1,800
  $CLOUD Credit Revenue              $600
  Digital Asset Revenue               $450
  Other Revenue                       $150
                                  ────────
  Total Revenue                   $15,600

EXPENSES
  Space Costs                       $5,100
  People Costs                      $4,200
  Operations                        $1,800
  Professional Services               $900
  Infrastructure Costs                $400
  Depreciation                        $200
                                  ────────
  Total Expenses                  $12,600

  NET INCOME                       $3,000
                                  ════════

  Available for Patronage Allocation: $3,000
```

**Derivation:** Movement computation (Sprint 6) across all Revenue and Expense accounts for the period.

### 3. Member Capital Statement

**Audience:** Individual members

**Content:** A member's capital account activity for a period, on both book and tax basis.

```
Member Capital Statement — Alice Chen
For the Quarter Ended March 31, 2026

BOOK BASIS (§704(b) Capital Account)
  Opening Balance                   $5,000
  + Cash Contributions              $2,000
  + Patronage Allocation            $1,200
  − Distributions                       $0
                                  ────────
  Closing Balance                   $8,200

TAX BASIS
  Opening Balance                   $4,200
  + Cash Contributions              $2,000
  + Tax Allocation                  $1,050
  − Distributions                       $0
                                  ────────
  Closing Balance                   $7,250

  Book/Tax Divergence:                $950
  (See 704(c) detail below if applicable)
```

**Key design decision:** The statement must be understandable without accounting background. Plain language, clear labels, running totals. The divergence line alerts the member (and their tax preparer) that book and tax differ, pointing to 704(c) details when applicable.

### 4. Trial Balance

**Audience:** Accountants, auditors

**Content:** All account balances at a point in time, verifying total debits equal total credits.

```
RegenHub LCA — Trial Balance
As of March 31, 2026

Account                          Debit       Credit
──────────────────────────────────────────────────────
1110 Operating Checking          $3,350
1120 Savings / Reserve           $8,000
1130 Petty Cash                    $200
1210 Member Receivables          $3,200
...
2110 Accounts Payable                        $2,800
2220 $CLOUD Credits Outstanding             $2,200
...
3100-001 Alice Book Capital                  $8,200
3100-002 Bob Book Capital                    $5,500
3100-003 Carol Book Capital                  $5,000
3310 Current Year Net Income                     $0
...
──────────────────────────────────────────────────────
TOTALS                         $30,200     $30,200  ✓
```

**Derivation:** Layer 1 balances (Sprint 6) for all leaf accounts. The totals must match. This is the accountant's primary reconciliation tool.

### 5. Transaction Journal

**Audience:** Auditors, management (for review)

**Content:** All transactions for a period, in chronological order with full entry detail.

```
Date        Event           Description                 Debit     Credit
────────────────────────────────────────────────────────────────────────
2026-01-15  CONTRIB-001     Cash contribution: Alice
            1110 Operating Checking                    $5,000
            3100-001 Alice Book Capital                          $5,000

2026-01-20  INV-003         Event space rental
            1210 Member Receivables                      $500
            4130 Event Space Rental                                $500

2026-02-01  PAY-007         Guaranteed payment: Bob
            5210 Guaranteed Payments                   $2,000
            1110 Operating Checking                              $2,000
...
```

**Filters:** By date range, account, member, event type, amount range. The journal is the raw material from which all other reports derive.

### 6. Cash Flow Statement

**Audience:** Management

**Content:** Cash movements categorized by activity type.

```
RegenHub LCA — Cash Flow Statement
For the Quarter Ended March 31, 2026

OPERATING ACTIVITIES
  Cash received from space revenue      $8,400
  Cash received from services           $4,200
  Cash paid for space costs            ($5,100)
  Cash paid for people                 ($4,200)
  Cash paid for operations             ($1,800)
                                      ────────
  Net Operating Cash Flow               $1,500

INVESTING ACTIVITIES
  Equipment purchases                    ($800)
                                      ────────
  Net Investing Cash Flow                ($800)

FINANCING ACTIVITIES
  Member contributions                  $3,000
  Member distributions                      $0
                                      ────────
  Net Financing Cash Flow               $3,000

  NET CHANGE IN CASH                    $3,700
  Beginning Cash Balance                $7,850
  Ending Cash Balance                  $11,550  ✓
```

**Derivation:** Movement computation on cash accounts, categorized by the contra-account in each transaction. Operating = revenue/expense related. Investing = asset purchases/sales. Financing = capital contributions/distributions.

### 7. Book/Tax Divergence Report

**Audience:** Accountants (K-1 preparation)

**Content:** Per-member comparison of book and tax capital accounts, with 704(c) layer detail.

```
Book/Tax Divergence Summary
As of March 31, 2026

Member       Book Capital   Tax Capital   Divergence   704(c) Layers
──────────────────────────────────────────────────────────────────────
Alice Chen      $8,200        $7,250          $950     Equipment: $950
Bob Park        $5,500        $5,500             $0    None
Carol Wu        $5,000        $5,000             $0    None
──────────────────────────────────────────────────────────────────────
Totals        $18,700       $17,750          $950
```

This report feeds directly into K-1 preparation (Sprint 14). It surfaces exactly where book and tax diverge and why — critical for the accountant who needs to calculate 704(c) tax allocations.

## Report Properties

All reports share common properties:

| Property | Purpose |
|----------|---------|
| `as_of` or `period` | Temporal scope (point-in-time or range) |
| `generated_at` | When the report was computed |
| `basis` | Book, tax, or both |
| `format` | Screen (HTML/dashboard), PDF, CSV, JSON |
| `access_level` | Who can view (member: own data, manager: all, auditor: all + journal) |
| `verification` | Checksum / equation balance confirmation |

## Export Formats

| Format | Audience | Use |
|--------|----------|-----|
| **Dashboard (Glide)** | Members, management | Day-to-day visibility |
| **PDF** | Members, external parties | Formal statements, archive |
| **CSV** | Accountants | Import to tax preparation software |
| **JSON/API** | External systems | Programmatic access, webhook integration |
| **QBO/IIF** | Accountants | QuickBooks import (if needed for transition) |

The CSV and JSON exports for K-1 data are the critical external interface — the accountant must be able to extract everything needed for Schedule K-1 preparation without requiring system access. This is detailed in Sprint 14.

## Access Model

| Role | Sees |
|------|------|
| **Member** | Own capital statement, simplified balance sheet, own transaction history |
| **Manager** | All reports, all members, full journal |
| **Accountant** | Trial balance, divergence report, full journal, CSV/JSON exports |
| **Auditor** | Everything, including transaction-level detail and period snapshots |

Members should never see other members' individual capital accounts. Aggregate equity is visible; individual positions are private to the member and to management/accounting roles.

## Connection to Next Sprint

Sprint 8 (Contribution Lifecycle) begins Phase 2, moving from Treasury into People. With the Foundation complete — accounts, transactions, balances, and reports — we can now define how contributions enter the system and flow into the capital accounts that Treasury maintains.

---

*Sprint 7 | February 8, 2026 | Habitat*
