# Sprint 122: Cooperative Setup Guide

**Sprint:** 122  
**Role:** Product Engineer (00)  
**Layer:** Cross-cutting  
**Type:** Documentation  
**Status:** COMPLETE

---

## Overview

Comprehensive guide for onboarding new cooperatives to Habitat patronage accounting system. Documents all configurable parameters, provides configuration templates, and outlines integration with cooperative operating agreements. Enables new cooperatives to configure Habitat without code changes.

---

## Prerequisites

Before setting up Habitat for your cooperative, ensure you have:

1. **Legal Structure:** Limited Cooperative Association (LCA) or equivalent cooperative entity
2. **Operating Agreement:** Defines patronage allocation methodology, governance structure, member rights
3. **Tax Status:** Subchapter T entity election (for U.S. cooperatives)
4. **Member Registry:** List of founding members with contact information
5. **Contribution Categories:** Defined types of member contributions (labor, capital, space, materials)

---

## Configuration Parameters

Habitat supports cooperative-specific configuration without code changes. All parameters are set in the database configuration tables.

### 1. Patronage Allocation Formula

**Table:** `allocation_config`

**Configurable Parameters:**

#### Contribution Type Weights

Determine how different contribution types are valued in patronage calculations.

```sql
INSERT INTO allocation_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'weight.labor', '1.0', 'Labor contribution weight (baseline)'),
  ('coop-001', 'weight.capital', '0.8', 'Capital contribution weight relative to labor'),
  ('coop-001', 'weight.space', '0.6', 'Space contribution weight relative to labor'),
  ('coop-001', 'weight.materials', '0.5', 'Materials contribution weight relative to labor');
```

**Default:** All weights = 1.0 (equal valuation)

**Example Configurations:**

**Labor-Focused Cooperative:**
```sql
-- Labor-intensive cooperative (software, consulting)
weight.labor = 1.0
weight.capital = 0.5
weight.space = 0.3
weight.materials = 0.3
```

**Capital-Focused Cooperative:**
```sql
-- Capital-intensive cooperative (equipment, real estate)
weight.labor = 0.8
weight.capital = 1.0
weight.space = 0.9
weight.materials = 0.7
```

**Balanced Cooperative:**
```sql
-- Balanced multi-capital cooperative
weight.labor = 1.0
weight.capital = 1.0
weight.space = 1.0
weight.materials = 1.0
```

#### Contribution Category Weights

Further granularity within contribution types.

```sql
INSERT INTO allocation_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'category.development', '1.0', 'Software development'),
  ('coop-001', 'category.design', '1.0', 'Design work'),
  ('coop-001', 'category.operations', '0.9', 'Operational/administrative'),
  ('coop-001', 'category.governance', '1.1', 'Governance participation (encouraged)'),
  ('coop-001', 'category.community', '0.8', 'Community building'),
  ('coop-001', 'category.infrastructure', '1.0', 'Infrastructure maintenance');
```

**Use case:** Encourage governance participation by weighting it higher (1.1x), or adjust for market rates of different labor types.

---

### 2. Cash vs. Retained Allocation Ratio

**Table:** `allocation_config`

**Parameter:** `distribution.cash_ratio`

Determines what percentage of patronage allocations are distributed as cash vs. retained in capital accounts.

```sql
INSERT INTO allocation_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'distribution.cash_ratio', '0.20', '20% cash, 80% retained'),
  ('coop-001', 'distribution.retained_ratio', '0.80', '80% retained in capital account');
```

**Common Configurations:**

| Cooperative Type | Cash % | Retained % | Rationale |
|------------------|--------|------------|-----------|
| Early-stage startup | 0% | 100% | Build capital base |
| Growth-stage | 20% | 80% | Small cash return, build capital |
| Mature cooperative | 40% | 60% | Balanced distributions |
| Stable/established | 60% | 40% | Prioritize member cash needs |
| Liquidating | 100% | 0% | Return capital to members |

**IRS Requirement:** At least 20% of patronage allocations must be distributed in cash for Subchapter T cooperatives (or member can consent to retain 100%).

**Configuration Notes:**
- Ratio can change by period (e.g., Q1-Q3 retain 100%, Q4 distribute 40%)
- Member-specific ratios possible (some members opt for higher retention)
- Must track member consent for non-cash distributions

---

### 3. Approval Thresholds

**Table:** `approval_config`

**Configurable Parameters:**

#### Contribution Approval

```sql
INSERT INTO approval_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'approval.contribution.required_approvers', '1', 'Minimum approvers per contribution'),
  ('coop-001', 'approval.contribution.steward_count', '3', 'Total number of stewards'),
  ('coop-001', 'approval.contribution.auto_approve_threshold', '0', 'Hours below which auto-approved (0=disabled)'),
  ('coop-001', 'approval.contribution.multi_approve_threshold', '40', 'Hours requiring 2+ approvers');
```

**Example Configurations:**

**Single Approver (Small Cooperative):**
```sql
required_approvers = 1
steward_count = 2
auto_approve_threshold = 0  -- All contributions need approval
multi_approve_threshold = 100  -- Very high threshold (rarely hit)
```

**Multi-Approver (Large Cooperative):**
```sql
required_approvers = 1  -- Default is 1
steward_count = 6  -- More stewards
auto_approve_threshold = 2  -- Small contributions auto-approved
multi_approve_threshold = 20  -- Large contributions need 2+ approvers
```

**Trust-Based (Mature Cooperative):**
```sql
required_approvers = 0  -- Members self-certify
steward_count = 3  -- Stewards audit periodically
auto_approve_threshold = 999  -- Everything auto-approved
multi_approve_threshold = 999  -- No multi-approval needed
```

#### Allocation Approval

```sql
INSERT INTO approval_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'approval.allocation.governance_vote_required', 'true', 'Members vote on proposed allocations'),
  ('coop-001', 'approval.allocation.vote_threshold', '0.66', 'Percentage required to approve (66% = supermajority)'),
  ('coop-001', 'approval.allocation.quorum', '0.50', 'Minimum participation for valid vote');
```

**Governance Models:**

**Consensus:**
```sql
governance_vote_required = true
vote_threshold = 1.0  -- 100% approval
quorum = 1.0  -- All members must participate
```

**Supermajority:**
```sql
governance_vote_required = true
vote_threshold = 0.66  -- 2/3 approval
quorum = 0.50  -- Half of members must vote
```

**Simple Majority:**
```sql
governance_vote_required = true
vote_threshold = 0.51  -- >50% approval
quorum = 0.33  -- 1/3 participation required
```

**Admin-Approved (Trust-Based):**
```sql
governance_vote_required = false  -- Admin can approve directly
vote_threshold = 0  -- Not used
quorum = 0  -- Not used
```

---

### 4. Period Frequency and Duration

**Table:** `period_config`

**Configurable Parameters:**

```sql
INSERT INTO period_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'period.frequency', 'quarterly', 'How often periods occur'),
  ('coop-001', 'period.duration_days', '90', 'Length of each period'),
  ('coop-001', 'period.fiscal_year_start', '01-01', 'Fiscal year start (MM-DD)'),
  ('coop-001', 'period.close_grace_days', '14', 'Days after period end to submit contributions');
```

**Common Configurations:**

**Quarterly (Default):**
```sql
frequency = 'quarterly'
duration_days = 90
fiscal_year_start = '01-01'
close_grace_days = 14
```
- **Pros:** Aligns with standard financial reporting, manageable workload
- **Cons:** Quarterly overhead, delayed distributions
- **Best for:** Most cooperatives (standard)

**Monthly:**
```sql
frequency = 'monthly'
duration_days = 30
fiscal_year_start = '01-01'
close_grace_days = 7
```
- **Pros:** Frequent distributions, tight feedback loop
- **Cons:** High administrative overhead, members must track monthly
- **Best for:** Service cooperatives with steady cash flow

**Semi-Annual:**
```sql
frequency = 'semi-annual'
duration_days = 180
fiscal_year_start = '01-01'
close_grace_days = 21
```
- **Pros:** Lower admin overhead, longer planning cycles
- **Cons:** Infrequent distributions, members wait 6 months
- **Best for:** Capital-intensive cooperatives, mature organizations

**Annual:**
```sql
frequency = 'annual'
duration_days = 365
fiscal_year_start = '01-01'
close_grace_days = 30
```
- **Pros:** Minimal overhead, aligns with tax year
- **Cons:** Very infrequent distributions, hard to track contributions
- **Best for:** Small cooperatives, low-activity periods

**Rolling (Continuous):**
```sql
frequency = 'rolling'
duration_days = 90
fiscal_year_start = null
close_grace_days = 0
```
- **Pros:** No waiting for period end, immediate processing
- **Cons:** Complex accounting, harder to audit
- **Best for:** Real-time patronage models (not typical)

---

### 5. Contribution Submission Rules

**Table:** `submission_config`

```sql
INSERT INTO submission_config (cooperative_id, parameter, value, description) VALUES
  ('coop-001', 'submission.max_hours_per_contribution', '40', 'Maximum hours in single contribution'),
  ('coop-001', 'submission.require_date', 'true', 'Contribution date required'),
  ('coop-001', 'submission.allow_future_date', 'false', 'Can submit contributions for future dates'),
  ('coop-001', 'submission.allow_backdate_days', '30', 'How far back contributions can be dated'),
  ('coop-001', 'submission.require_description', 'true', 'Description required'),
  ('coop-001', 'submission.min_description_length', '10', 'Minimum description characters'),
  ('coop-001', 'submission.require_category', 'true', 'Category selection required'),
  ('coop-001', 'submission.allow_edit_window_minutes', '60', 'Minutes after submission when edit allowed (0=no edit)');
```

**Strict (High Accountability):**
```sql
max_hours_per_contribution = 8  -- Daily limit
allow_backdate_days = 7  -- Must submit within a week
min_description_length = 50  -- Detailed descriptions
allow_edit_window_minutes = 0  -- No edits after submission
```

**Flexible (Trust-Based):**
```sql
max_hours_per_contribution = 168  -- Weekly limit
allow_backdate_days = 90  -- Can submit for whole quarter
min_description_length = 10  -- Brief descriptions okay
allow_edit_window_minutes = 1440  -- Can edit for 24 hours
```

**Balanced (Default):**
```sql
max_hours_per_contribution = 40  -- Weekly limit
allow_backdate_days = 30  -- Submit within a month
min_description_length = 20  -- Moderate detail
allow_edit_window_minutes = 60  -- 1-hour edit window
```

---

## Configuration Templates

### Template 1: Early-Stage Tech Cooperative

**Profile:**
- Software development focus
- 5-10 members
- Building capital base
- Democratic governance

**Configuration:**

```sql
-- Contribution weights (labor-focused)
INSERT INTO allocation_config VALUES
  ('tech-coop-001', 'weight.labor', '1.0'),
  ('tech-coop-001', 'weight.capital', '0.5'),
  ('tech-coop-001', 'weight.space', '0.3'),
  ('tech-coop-001', 'weight.materials', '0.3');

-- Category weights
INSERT INTO allocation_config VALUES
  ('tech-coop-001', 'category.development', '1.0'),
  ('tech-coop-001', 'category.design', '1.0'),
  ('tech-coop-001', 'category.operations', '0.9'),
  ('tech-coop-001', 'category.governance', '1.1');  -- Encourage participation

-- Distribution (retain capital)
INSERT INTO allocation_config VALUES
  ('tech-coop-001', 'distribution.cash_ratio', '0.20'),  -- 20% cash
  ('tech-coop-001', 'distribution.retained_ratio', '0.80');  -- 80% retained

-- Approval (trust-based, small group)
INSERT INTO approval_config VALUES
  ('tech-coop-001', 'approval.contribution.required_approvers', '1'),
  ('tech-coop-001', 'approval.contribution.steward_count', '2'),
  ('tech-coop-001', 'approval.allocation.governance_vote_required', 'true'),
  ('tech-coop-001', 'approval.allocation.vote_threshold', '0.66'),  -- Supermajority
  ('tech-coop-001', 'approval.allocation.quorum', '0.80');  -- High participation

-- Period (quarterly)
INSERT INTO period_config VALUES
  ('tech-coop-001', 'period.frequency', 'quarterly'),
  ('tech-coop-001', 'period.duration_days', '90'),
  ('tech-coop-001', 'period.close_grace_days', '14');

-- Submission (flexible for small group)
INSERT INTO submission_config VALUES
  ('tech-coop-001', 'submission.max_hours_per_contribution', '40'),
  ('tech-coop-001', 'submission.allow_backdate_days', '30'),
  ('tech-coop-001', 'submission.min_description_length', '20'),
  ('tech-coop-001', 'submission.allow_edit_window_minutes', '60');
```

---

### Template 2: Mature Real Estate Cooperative

**Profile:**
- Commercial real estate ownership
- 50+ members
- Capital-intensive
- Stable cash flow

**Configuration:**

```sql
-- Contribution weights (capital-focused)
INSERT INTO allocation_config VALUES
  ('realestate-coop-001', 'weight.labor', '0.7'),
  ('realestate-coop-001', 'weight.capital', '1.0'),  -- Capital is primary
  ('realestate-coop-001', 'weight.space', '0.9'),
  ('realestate-coop-001', 'weight.materials', '0.6');

-- Distribution (higher cash distributions)
INSERT INTO allocation_config VALUES
  ('realestate-coop-001', 'distribution.cash_ratio', '0.60'),  -- 60% cash
  ('realestate-coop-001', 'distribution.retained_ratio', '0.40');  -- 40% retained

-- Approval (formal process, large group)
INSERT INTO approval_config VALUES
  ('realestate-coop-001', 'approval.contribution.required_approvers', '1'),
  ('realestate-coop-001', 'approval.contribution.steward_count', '5'),
  ('realestate-coop-001', 'approval.contribution.multi_approve_threshold', '20'),  -- Large contributions need 2 approvers
  ('realestate-coop-001', 'approval.allocation.governance_vote_required', 'true'),
  ('realestate-coop-001', 'approval.allocation.vote_threshold', '0.51'),  -- Simple majority
  ('realestate-coop-001', 'approval.allocation.quorum', '0.33');  -- Lower quorum for large group

-- Period (semi-annual for lower overhead)
INSERT INTO period_config VALUES
  ('realestate-coop-001', 'period.frequency', 'semi-annual'),
  ('realestate-coop-001', 'period.duration_days', '180'),
  ('realestate-coop-001', 'period.close_grace_days', '21');

-- Submission (stricter rules for audit trail)
INSERT INTO submission_config VALUES
  ('realestate-coop-001', 'submission.max_hours_per_contribution', '8'),  -- Daily limit
  ('realestate-coop-001', 'submission.allow_backdate_days', '14'),  -- 2-week window
  ('realestate-coop-001', 'submission.min_description_length', '50'),  -- Detailed
  ('realestate-coop-001', 'submission.allow_edit_window_minutes', '0');  -- No edits
```

---

### Template 3: Service Cooperative (Consulting, Freelance)

**Profile:**
- Professional services
- 10-20 members
- Monthly billing cycles
- Member-owned clients

**Configuration:**

```sql
-- Contribution weights (labor-only, all equal)
INSERT INTO allocation_config VALUES
  ('service-coop-001', 'weight.labor', '1.0'),
  ('service-coop-001', 'weight.capital', '1.0'),
  ('service-coop-001', 'weight.space', '1.0'),
  ('service-coop-001', 'weight.materials', '1.0');

-- Distribution (frequent cash distributions)
INSERT INTO allocation_config VALUES
  ('service-coop-001', 'distribution.cash_ratio', '0.80'),  -- 80% cash
  ('service-coop-001', 'distribution.retained_ratio', '0.20');  -- 20% retained

-- Approval (lightweight, trust-based)
INSERT INTO approval_config VALUES
  ('service-coop-001', 'approval.contribution.required_approvers', '1'),
  ('service-coop-001', 'approval.contribution.steward_count', '3'),
  ('service-coop-001', 'approval.contribution.auto_approve_threshold', '8'),  -- Auto-approve < 8hr
  ('service-coop-001', 'approval.allocation.governance_vote_required', 'false');  -- Admin-approved

-- Period (monthly for frequent distributions)
INSERT INTO period_config VALUES
  ('service-coop-001', 'period.frequency', 'monthly'),
  ('service-coop-001', 'period.duration_days', '30'),
  ('service-coop-001', 'period.close_grace_days', '7');

-- Submission (flexible for consulting work)
INSERT INTO submission_config VALUES
  ('service-coop-001', 'submission.max_hours_per_contribution', '80'),  -- 2-week chunks
  ('service-coop-001', 'submission.allow_backdate_days', '60'),  -- Flexible
  ('service-coop-001', 'submission.min_description_length', '15'),  -- Brief okay
  ('service-coop-001', 'submission.allow_edit_window_minutes', '120');  -- 2-hour edit window
```

---

## Operating Agreement Integration

### Section 1: Patronage Allocation Methodology

**Required Operating Agreement Language:**

> **Article X: Patronage Allocations**
>
> 1. **Calculation Period:** The Board shall close accounting periods [quarterly/monthly/semi-annually/annually] and calculate patronage allocations within [14/21/30] days of period end.
>
> 2. **Contribution Tracking:** Members shall submit records of their contributions (labor, capital, space, materials) via the Habitat patronage accounting system. Contributions are subject to approval by [Stewards/Board/Membership].
>
> 3. **Weighting Formula:** Contributions shall be weighted according to the following schedule:
>    - Labor contributions: [1.0] weight
>    - Capital contributions: [0.8] weight
>    - Space contributions: [0.6] weight
>    - Materials contributions: [0.5] weight
>
>    The Board may adjust weights annually subject to [supermajority/consensus] member approval.
>
> 4. **Allocation Formula:** Patronage allocations shall be calculated using the weighted contribution formula as implemented in the Habitat system, dividing the allocable surplus proportionally among members based on their weighted patronage.
>
> 5. **Cash vs. Retained:** [20%/40%/60%] of each member's patronage allocation shall be distributed in cash, with the remainder retained in the member's capital account. Members may consent to retain 100% in their capital account.
>
> 6. **Approval Process:** Proposed allocations shall be [reviewed by membership with [66%/51%] approval required / approved by Board / approved by Finance Committee] before distribution.

### Section 2: Contribution Approval

> **Article XI: Contribution Approval**
>
> 1. **Stewardship:** The cooperative shall maintain [2-6] Contribution Stewards responsible for reviewing and approving member contributions.
>
> 2. **Approval Threshold:** Contributions exceeding [20/40] hours require approval from [1/2] Steward(s). Contributions below [2/8] hours may be auto-approved.
>
> 3. **Timeline:** Stewards shall review pending contributions within [3/7] business days. Members shall be notified of approval/rejection via the Habitat notification system.
>
> 4. **Dispute Resolution:** Members may appeal rejected contributions to [Operations Committee/Board/Membership] within [14] days.

### Section 3: Capital Accounts

> **Article XII: Capital Accounts**
>
> 1. **Maintenance:** The cooperative shall maintain IRC Section 704(b) capital accounts for each member, tracked in the Habitat system.
>
> 2. **Initial Contribution:** New members shall contribute $[500/1000/5000] as initial capital, credited to their capital account.
>
> 3. **Retained Allocations:** Retained patronage allocations shall be credited to members' capital accounts and are subject to redemption per the cooperative's redemption policy.
>
> 4. **Tax Reporting:** The cooperative shall provide members with Schedule K-1 (Form 1065) annually, generated from Habitat capital account data.

---

## Multi-Cooperative Deployment

Habitat supports multiple cooperatives in a single deployment (multi-tenant architecture).

### Database Schema

Each cooperative has a unique `cooperative_id`:

```sql
CREATE TABLE cooperatives (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  tax_id TEXT,  -- EIN
  jurisdiction TEXT,  -- State/country
  entity_type TEXT,  -- 'LCA', 'LLC', '501(c)(3)', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- All configuration tables include cooperative_id
CREATE TABLE allocation_config (
  cooperative_id UUID REFERENCES cooperatives(id),
  parameter TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (cooperative_id, parameter)
);
```

### Row-Level Security

PostgreSQL RLS ensures cooperative data isolation:

```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY members_isolation ON members
  USING (cooperative_id = current_setting('app.current_cooperative')::UUID);
```

### API Authentication

JWT tokens include `cooperativeId` claim:

```json
{
  "sub": "user-id",
  "email": "member@example.com",
  "role": "member",
  "cooperativeId": "coop-001",
  "iat": 1678901234,
  "exp": 1678904834
}
```

All queries automatically scoped to user's cooperative.

---

## Setup Checklist

### Phase 1: Legal & Organizational

- [ ] Cooperative entity formed (LCA, LLC, etc.)
- [ ] Operating agreement drafted (includes patronage methodology)
- [ ] Tax status elected (Subchapter T for U.S.)
- [ ] EIN obtained
- [ ] Banking accounts opened
- [ ] Founding members identified

### Phase 2: Configuration

- [ ] Cooperative record created in Habitat
- [ ] Contribution type weights configured
- [ ] Category weights configured (if applicable)
- [ ] Cash/retained distribution ratio set
- [ ] Approval thresholds configured
- [ ] Period frequency and duration set
- [ ] Submission rules configured
- [ ] Member accounts created

### Phase 3: Integration

- [ ] Operating agreement language references Habitat
- [ ] Contribution categories align with operating agreement
- [ ] Approval process documented in member handbook
- [ ] Stewards trained on approval workflow
- [ ] Members trained on contribution submission

### Phase 4: Launch

- [ ] First period opened
- [ ] Members submit initial contributions
- [ ] Stewards approve contributions
- [ ] Period closed
- [ ] Allocations calculated and proposed
- [ ] Governance approval obtained (if required)
- [ ] Allocations distributed
- [ ] K-1 data generated

---

## Configuration Management

### Version Control

Configuration changes should be versioned and audited:

```sql
CREATE TABLE config_change_log (
  id UUID PRIMARY KEY,
  cooperative_id UUID REFERENCES cooperatives(id),
  parameter TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES members(id),
  reason TEXT,
  effective_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Governance Process

**Recommendation:** Configuration changes (especially weights and distribution ratios) should require governance approval:

1. Admin proposes configuration change
2. Change logged with rationale and effective date
3. Members notified via Habitat notifications
4. Vote conducted (if required by operating agreement)
5. Upon approval, configuration updated
6. Members notified of change

### Effective Dating

Some configuration changes should be period-scoped:

```sql
-- Configuration can vary by period
CREATE TABLE period_config_overrides (
  period_id UUID REFERENCES periods(id),
  parameter TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (period_id, parameter)
);

-- Example: Change distribution ratio for a specific period
INSERT INTO period_config_overrides VALUES
  ('q4-2026', 'distribution.cash_ratio', '0.80');  -- Year-end bonus
```

---

## Validation & Testing

Before going live, validate configuration:

### 1. Calculate Test Allocations

Create test period with sample contributions:

```sql
-- Test member A: 100 hours labor
-- Test member B: 50 hours labor + $5000 capital
-- Test member C: 75 hours labor + workspace

-- Expected allocation should match cooperative's understanding
```

### 2. Verify Operating Agreement Alignment

- [ ] Weights match operating agreement
- [ ] Distribution ratio matches operating agreement
- [ ] Approval process matches operating agreement
- [ ] Period frequency matches operating agreement

### 3. Tax Compliance Check

- [ ] IRC 704(b) capital accounts maintain correctly
- [ ] 20% cash distribution requirement met (or member consents obtained)
- [ ] K-1 data exports correctly

---

## Support & Customization

### Standard Configuration

Most cooperatives can configure Habitat using the parameters documented above without code changes.

### Custom Requirements

If your cooperative needs capabilities not covered by standard configuration:

1. **Contact:** support@habitat.example.com
2. **Provide:** Operating agreement excerpt, specific requirement, rationale
3. **Options:**
   - Add new configuration parameter (if generalizable)
   - Custom code development (if cooperative-specific)
   - Consultation on alternative approach using existing configuration

### Community Templates

Share your configuration template with the Habitat community:

**Repository:** https://github.com/habitat/coop-configs  
**Submit:** PR with your cooperative profile + SQL configuration  
**Benefits:** Help other cooperatives, learn from others' configurations

---

## Examples from Real Cooperatives

### Techne / RegenHub (Boulder, CO)

**Profile:** Venture studio, multi-capital, 8 founding members

**Configuration:**
- **Weights:** Labor 1.0, Capital 0.8, Space 0.6, Materials 0.5
- **Distribution:** 20% cash, 80% retained (building capital base)
- **Approval:** 1 steward required, governance vote on allocations (66% threshold)
- **Period:** Quarterly (Q1-Q4)
- **Result:** Successfully completed Q1 2026 allocation, $10,000 distributed

---

## Conclusion

Habitat patronage accounting system is designed for configurability. By setting the parameters documented in this guide, your cooperative can tailor Habitat to match your operating agreement, governance structure, and member needs — without writing code.

**Key Principle:** Configuration should reflect your cooperative's values and decision-making processes. There is no "right" configuration — only what works for your specific context.

**Next Steps:**

1. Review configuration parameters with your cooperative's board
2. Select appropriate template (or create custom configuration)
3. Align configuration with operating agreement language
4. Set up test environment and validate
5. Launch with founding members

---

**Status:** COMPLETE — Comprehensive setup guide enabling new cooperatives to configure and deploy Habitat without code changes.
