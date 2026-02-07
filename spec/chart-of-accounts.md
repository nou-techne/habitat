# Chart of Accounts

*Sprint 4 — Building on: [Capital Account Mechanics](capital-accounts.md)*

---

## Overview

Sprint 3 established that every member needs a dual-basis capital account pair (book and tax) in Treasury. But capital accounts don't float in isolation — they exist within a complete chart of accounts that tracks all economic activity of the organization.

This document defines the account structure for a cooperative organization, using a Colorado LCA as the reference case. The chart is designed to be configurable: simpler organizations use fewer accounts, more complex ones extend the structure. The LCA case is the most demanding, so everything simpler is already covered.

## Account Types

The chart follows standard double-entry accounting with five root types:

| Type | Normal Balance | Purpose |
|------|---------------|---------|
| **Asset** | Debit | What the organization owns or controls |
| **Liability** | Credit | What the organization owes |
| **Equity** | Credit | Members' residual interest (capital accounts live here) |
| **Revenue** | Credit | Value flowing in from operations |
| **Expense** | Debit | Value consumed in operations |

The fundamental equation holds at all times: **Assets = Liabilities + Equity**

Revenue and Expense are temporary accounts that close into Equity at period end, which is where the patronage allocation calculation lives — it determines *how* net income flows into individual capital accounts.

## Account Hierarchy

Accounts are organized hierarchically. Parent accounts aggregate their children. The hierarchy enables both detailed tracking and summary reporting.

### Assets (1000–1999)

```
1000  Assets
├── 1100  Cash & Cash Equivalents
│   ├── 1110  Operating Checking
│   ├── 1120  Savings / Reserve
│   └── 1130  Petty Cash
├── 1200  Receivables
│   ├── 1210  Member Receivables
│   ├── 1220  Client Receivables
│   └── 1230  Other Receivables
├── 1300  Prepaid & Deposits
│   ├── 1310  Prepaid Rent
│   ├── 1320  Security Deposits
│   └── 1330  Prepaid Insurance
├── 1400  Property & Equipment
│   ├── 1410  Furniture & Fixtures
│   ├── 1420  Computer Equipment
│   ├── 1430  Leasehold Improvements
│   └── 1490  Accumulated Depreciation (contra)
├── 1500  Digital Assets
│   ├── 1510  Cryptocurrency Holdings
│   ├── 1520  Wrapped/Streaming Tokens
│   └── 1530  Service Credits Held
└── 1900  Other Assets
```

### Liabilities (2000–2999)

```
2000  Liabilities
├── 2100  Current Liabilities
│   ├── 2110  Accounts Payable
│   ├── 2120  Accrued Expenses
│   ├── 2130  Payroll Liabilities
│   └── 2140  Sales Tax Payable
├── 2200  Deferred Revenue
│   ├── 2210  Prepaid Memberships
│   ├── 2220  Service Credits Outstanding
│   └── 2230  Event Deposits
├── 2300  Member Obligations
│   ├── 2310  Member Loans Payable
│   └── 2320  Patronage Distributions Payable
└── 2900  Long-term Liabilities
    ├── 2910  Notes Payable
    └── 2920  Capital Lease Obligations
```

### Equity (3000–3999)

This is where the cooperative's distinctive structure lives. Standard corporations have a simple equity section (common stock, retained earnings). A cooperative under Subchapter K needs far more granularity.

```
3000  Equity
├── 3100  Member Capital Accounts (Book Basis — 704(b))
│   ├── 3100-{member_id}  Individual Member Book Capital
│   └── (one sub-account per member, created on admission)
├── 3200  Member Capital Accounts (Tax Basis)
│   ├── 3200-{member_id}  Individual Member Tax Capital
│   └── (mirrors 3100 structure, may differ in amounts)
├── 3300  Retained Patronage
│   ├── 3310  Current Year Net Income (pre-allocation)
│   ├── 3320  Allocated but Undistributed Patronage
│   └── 3330  Unallocated Reserves
├── 3400  704(c) Tracking
│   └── 3400-{asset_id}  Built-in Gain/Loss by Asset
├── 3500  Other Equity
│   ├── 3510  Donated Capital
│   └── 3520  Grant Proceeds (restricted)
└── 3900  Drawing / Distribution
    └── 3900-{member_id}  Member Distributions (current period)
```

**Key design decisions:**

- **3100 vs 3200:** The dual-basis requirement from Sprint 3. Every member has two capital accounts. The book account (3100) drives economic rights and 704(b) compliance. The tax account (3200) drives K-1 reporting.
- **3310 (Current Year Net Income):** Revenue and expense accounts close here at period end, *before* the patronage allocation runs. The allocation then moves amounts from 3310 into individual capital accounts (3100-{member_id}).
- **3320 (Allocated but Undistributed):** Patronage allocated to members but not yet paid in cash. This is the cooperative's internal financing mechanism — members effectively lend their patronage back to the organization.
- **3400 (704(c) Tracking):** When property is contributed with FMV ≠ tax basis, the difference is tracked here per asset. This supports the 704(c) allocation rules identified in Sprint 2.

### Revenue (4000–4999)

```
4000  Revenue
├── 4100  Space Revenue
│   ├── 4110  Membership Dues
│   ├── 4120  Day Passes
│   ├── 4130  Event Space Rental
│   └── 4140  Mail/Address Service
├── 4200  Service Revenue
│   ├── 4210  Formation Assistance
│   ├── 4220  Business Planning
│   ├── 4230  Technology Services
│   └── 4240  Back-Office Services
├── 4300  Venture Revenue
│   ├── 4310  Equity Returns
│   ├── 4320  Revenue Share / Reciprocity
│   └── 4330  Consulting to Ventures
├── 4400  Service Credit Revenue
│   ├── 4410  Credit Issuance (contra: 2220)
│   └── 4420  Credit Redemption (recognized revenue)
├── 4500  Digital Asset Revenue
│   ├── 4510  Streaming Income (Superfluid)
│   ├── 4520  Staking / Yield
│   └── 4530  Token Grants
└── 4900  Other Revenue
    ├── 4910  Interest Income
    ├── 4920  Donations
    └── 4930  Grant Income
```

**Service credit note:** Issuance (4410) creates a liability (2220), not revenue. Revenue is recognized at redemption (4420), when infrastructure service is actually delivered. This distinction matters for 704(b) — only recognized revenue flows through the patronage allocation.

**Streaming income note:** Superfluid streams (4510) present an accounting challenge: they are continuous, not discrete. The system must periodically sample stream balances and record the accumulated income as discrete transactions. Sprint 18 (Superfluid Mapping) will address this in detail.

### Expenses (5000–5999)

```
5000  Expenses
├── 5100  Space Costs
│   ├── 5110  Rent
│   ├── 5120  Utilities
│   ├── 5130  Internet/Telecom
│   ├── 5140  Maintenance
│   └── 5150  Insurance
├── 5200  People Costs
│   ├── 5210  Guaranteed Payments (member compensation)
│   ├── 5220  Contractor Payments
│   ├── 5230  Benefits
│   └── 5240  Professional Development
├── 5300  Operations
│   ├── 5310  Software & Subscriptions
│   ├── 5320  Office Supplies
│   ├── 5330  Marketing
│   └── 5340  Travel
├── 5400  Professional Services
│   ├── 5410  Legal
│   ├── 5420  Accounting
│   └── 5430  Consulting
├── 5500  Infrastructure Costs
│   ├── 5510  Compute (hosting, cloud)
│   ├── 5520  Transfer (bandwidth)
│   ├── 5530  Storage
│   └── 5540  Domain & Certificates
├── 5600  Depreciation & Amortization
│   ├── 5610  Equipment Depreciation
│   └── 5620  Leasehold Amortization
└── 5900  Other Expenses
    ├── 5910  Bank Fees
    ├── 5920  Bad Debt
    └── 5930  Miscellaneous
```

**Guaranteed payments note (5210):** Under Subchapter K, payments to members for services rendered are "guaranteed payments" (IRC § 707(c)), not wages. They are deductible by the partnership and taxable to the member regardless of partnership income. The chart separates these from contractor payments (5220) because they receive different tax treatment.

**Infrastructure costs (5500):** These accounts map directly to the four service credit primitives — compute, transfer, long-term memory (storage), short-term memory (not separately tracked at this level). When the service credit system is operational, these costs become the basis for rate card pricing.

## Account Properties

Every account in the system carries:

| Property | Purpose |
|----------|---------|
| `id` | Unique identifier (e.g., "1110") |
| `name` | Human-readable name |
| `type` | Asset, Liability, Equity, Revenue, Expense |
| `normal_balance` | Debit or Credit |
| `parent_id` | Parent account for hierarchy |
| `member_id` | For per-member accounts (capital, distributions) |
| `basis_type` | `book`, `tax`, or `null` (for non-capital accounts) |
| `is_active` | Whether the account accepts new transactions |
| `created_at` | When the account was created |
| `metadata` | Extensible properties (currency, department, project) |

## Configuring for Different Organizations

The full chart above serves a cooperative with space operations, service revenue, venture participation, and service credits. Simpler organizations use subsets:

| Organization Type | Accounts Needed |
|-------------------|----------------|
| Freelancer | 1100, 1200, 2100, 4200, 5300 |
| Nonprofit | 1000s, 2100, 3500 (grants), 4900, 5000s |
| Startup | 1000s, 2000s, 3000 (simple equity), 4000s, 5000s |
| Worker cooperative | Full 1000–5000 with 3100/3200 per member |
| Venture studio (LCA) | Everything above |
| Enterprise division | Full chart with department codes in metadata |

The chart is additive — start with what you need, add accounts as operations expand. The hierarchy ensures that summary reporting works regardless of how many leaf accounts exist.

## Connection to Next Sprint

Sprint 5 (Transaction Model) will define how value actually moves between these accounts — the transaction schema, double-entry enforcement, and event patterns that produce the journal entries connecting the chart of accounts to the capital account mechanics from Sprint 3.

---

*Sprint 4 | February 7, 2026 | Habitat*
