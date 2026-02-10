# Q1 2026 Period Close Guide

**Period:** Q1 2026 (January 1 - March 31, 2026)  
**Close Date:** March 31, 2026  
**System:** Habitat Patronage Accounting  
**Organization:** Techne / RegenHub LCA

---

## Overview

This guide covers the process for closing the Q1 2026 allocation period and completing the patronage allocation. This is the final step in the quarterly cycle, where contributions are finalized, allocations calculated, and capital accounts updated.

**Process Flow:**
1. Pre-close verification
2. Initiate period close
3. Review proposed allocations
4. Governance approval
5. Generate K-1 data
6. Record distributions
7. Verify capital account updates
8. Announce completion

**Estimated Time:** 2-4 hours (excluding governance meeting)

---

## Prerequisites

Before closing the period:

**Member Participation:**
- [ ] All founding members have submitted contributions
- [ ] No pending questions from members
- [ ] All members notified of close date (1 week advance notice)

**Steward Review:**
- [ ] All contributions reviewed (approved or rejected)
- [ ] Pending queue empty (or only minor items)
- [ ] No unresolved disputes

**System Health:**
- [ ] All services running
- [ ] No critical bugs
- [ ] Database backed up (within last 24 hours)
- [ ] Event processing working

**Data Quality:**
- [ ] No orphaned records
- [ ] All amounts reasonable
- [ ] All descriptions adequate
- [ ] Validation checks passing

---

## Phase 1: Pre-Close Verification

### 1.1 Check Contribution Status

```bash
# SSH into production server
ssh habitat@<PRODUCTION_IP>
cd /home/habitat/habitat

# Check total contributions
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  COUNT(*) as total_contributions,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  SUM(amount::numeric) FILTER (WHERE status = 'approved') as approved_total
FROM contributions
WHERE period_id = (
  SELECT id FROM allocation_periods WHERE name = 'Q1 2026'
);
EOF
```

**Expected Output:**
```
 total_contributions | pending | approved | rejected | approved_total 
--------------------+---------+----------+----------+----------------
                 XX |       0 |       XX |        X |      XXXX.XX
```

**Verify:**
- Pending count = 0 (or close to 0, only minor items OK)
- Approved count > 0 (at least some contributions)
- Approved total > 0

### 1.2 Check Member Participation

```bash
# Check which members have contributed
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  m.display_name,
  m.email,
  COUNT(c.id) as contribution_count,
  SUM(c.amount::numeric) FILTER (WHERE c.status = 'approved') as approved_amount
FROM members m
LEFT JOIN contributions c ON c.member_id = m.id 
  AND c.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
WHERE m.status = 'active'
GROUP BY m.id, m.display_name, m.email
ORDER BY contribution_count DESC;
EOF
```

**Verify:**
- All active members appear in list
- All members have at least 1 contribution (target: 100% participation)
- Amounts seem reasonable (no outliers)

### 1.3 Verify Data Quality

```bash
# Run validation checks
docker compose -f docker-compose.prod.yml exec api \
  tsx migrations/data/validate_migration.ts
```

**Expected:** All checks pass

**If validation fails:**
1. Review error messages
2. Fix data issues (update records if needed)
3. Re-run validation
4. Don't proceed until all checks pass

### 1.4 Backup Database

```bash
# Create pre-close backup
BACKUP_DIR="/var/backups/habitat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/pre_close_q1_2026_${TIMESTAMP}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -d habitat | gzip > "${BACKUP_FILE}"

# Verify backup created
ls -lh "${BACKUP_FILE}"

# Expected: File exists, size > 1 MB
```

**Checklist:**
- [ ] All contributions finalized
- [ ] Pending queue empty (or minimal)
- [ ] All active members participated
- [ ] Data validation passes
- [ ] Database backed up

---

## Phase 2: Initiate Period Close

### 2.1 Close Period in Database

**Action:** Change period status from 'open' to 'closed'

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
UPDATE allocation_periods
SET 
  status = 'closed',
  closed_at = NOW()
WHERE name = 'Q1 2026'
RETURNING id, name, status, closed_at;
EOF
```

**Expected Output:**
```
                  id                  |   name   | status |         closed_at
--------------------------------------+----------+--------+---------------------------
 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Q1 2026  | closed | 2026-03-31 23:59:59
```

**Verify:**
- Status changed to 'closed'
- closed_at timestamp set

### 2.2 Verify Period Closed

```bash
# Check period status via API
curl https://habitat.eth/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ allocationPeriods { items { name status closedAt } } }"}'

# Expected: Q1 2026 shows status: "closed", closedAt: timestamp
```

**Verify:**
- Period shows as closed in UI
- Members can no longer submit contributions for Q1 2026
- "Calculate Allocations" button appears for admins

### 2.3 Calculate Totals

```bash
# Calculate period totals
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  COUNT(DISTINCT member_id) as unique_members,
  COUNT(*) as total_approved_contributions,
  SUM(amount::numeric) as total_amount,
  SUM(amount::numeric) FILTER (WHERE contribution_type = 'labor') as labor_total,
  SUM(amount::numeric) FILTER (WHERE contribution_type = 'capital') as capital_total,
  SUM(amount::numeric) FILTER (WHERE contribution_type = 'property') as property_total
FROM contributions
WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
  AND status = 'approved';
EOF
```

**Record these numbers for governance review.**

**Checklist:**
- [ ] Period status = 'closed'
- [ ] closed_at timestamp set
- [ ] Period closed in UI
- [ ] Totals calculated

---

## Phase 3: Calculate Allocations

### 3.1 Determine Distribution Amount

**Decision Point:** How much to distribute?

**Options:**

**Option A: Fixed Amount**
- Decide fixed amount (e.g., $10,000)
- Simple, predictable
- Good for early periods

**Option B: Percentage of Contributions**
- Distribute X% of total contributions (e.g., 50%)
- Proportional to activity
- Good for ongoing periods

**Option C: Based on Revenue/Surplus**
- Distribute actual surplus from cooperative operations
- Most accurate, but requires financial accounting
- Good for mature cooperatives

**For Q1 2026 (recommended):** Use fixed amount for simplicity. Example: $10,000.

**Record decision:** Distribution Amount = $10,000

### 3.2 Calculate Weighted Contributions

**Formula:**
```
Weighted Contribution = (Labor Amount × 1.0) + (Capital Amount × 0.5) + (Property Amount × 0.5)
```

**Why weights?**
- Labor contributions are primary basis of cooperative value
- Capital/property important but secondary
- Prevents capital-heavy members from dominating allocations

```bash
# Calculate weighted contributions per member
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  m.display_name,
  m.email,
  SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'labor') as labor,
  SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'capital') as capital,
  SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'property') as property,
  (
    COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'labor'), 0) * 1.0 +
    COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'capital'), 0) * 0.5 +
    COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'property'), 0) * 0.5
  ) as weighted_total
FROM members m
JOIN contributions c ON c.member_id = m.id
WHERE c.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
  AND c.status = 'approved'
GROUP BY m.id, m.display_name, m.email
ORDER BY weighted_total DESC;
EOF
```

**Save this output for governance review.**

### 3.3 Calculate Patronage Scores

**Formula:**
```
Patronage Score = Member Weighted Contribution / Total Weighted Contributions
```

**Example:**
- Member A: $400 labor + $1,000 capital = ($400 × 1.0) + ($1,000 × 0.5) = $900 weighted
- Member B: $600 labor = $600 weighted
- Total weighted: $1,500
- Member A score: $900 / $1,500 = 0.6 (60%)
- Member B score: $600 / $1,500 = 0.4 (40%)

```bash
# Calculate patronage scores
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
WITH weighted_contributions AS (
  SELECT 
    m.id as member_id,
    m.display_name,
    (
      COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'labor'), 0) * 1.0 +
      COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'capital'), 0) * 0.5 +
      COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'property'), 0) * 0.5
    ) as weighted_total
  FROM members m
  JOIN contributions c ON c.member_id = m.id
  WHERE c.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
    AND c.status = 'approved'
  GROUP BY m.id, m.display_name
),
total_weighted AS (
  SELECT SUM(weighted_total) as total FROM weighted_contributions
)
SELECT 
  wc.display_name,
  wc.weighted_total,
  ROUND(wc.weighted_total / tw.total, 4) as patronage_score,
  ROUND((wc.weighted_total / tw.total) * 10000, 2) as allocation_amount
FROM weighted_contributions wc, total_weighted tw
ORDER BY patronage_score DESC;
EOF
```

**Verify:**
- Patronage scores sum to 1.0 (100%)
- Allocation amounts sum to distribution amount ($10,000)
- No negative scores
- No scores > 1.0

### 3.4 Create Allocation Records

**Use API endpoint to calculate and create allocations:**

```bash
# Via GraphQL mutation
curl https://habitat.eth/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{
    "query": "mutation { calculateAllocations(periodId: \"<PERIOD_ID>\", distributionAmount: 10000.00) { success count } }"
  }'
```

**Or directly in database:**

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
-- Calculate and insert allocations
WITH weighted_contributions AS (
  SELECT 
    m.id as member_id,
    (
      COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'labor'), 0) * 1.0 +
      COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'capital'), 0) * 0.5 +
      COALESCE(SUM(c.amount::numeric) FILTER (WHERE c.contribution_type = 'property'), 0) * 0.5
    ) as weighted_total
  FROM members m
  JOIN contributions c ON c.member_id = m.id
  WHERE c.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
    AND c.status = 'approved'
  GROUP BY m.id
),
total_weighted AS (
  SELECT SUM(weighted_total) as total FROM weighted_contributions
)
INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
SELECT 
  wc.member_id,
  (SELECT id FROM allocation_periods WHERE name = 'Q1 2026'),
  ROUND((wc.weighted_total / tw.total) * 10000.00, 2),
  ROUND(wc.weighted_total / tw.total, 10),
  'calculated'
FROM weighted_contributions wc, total_weighted tw;
EOF
```

**Verify allocations created:**

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  COUNT(*) as allocation_count,
  SUM(amount::numeric) as total_allocated,
  MIN(amount::numeric) as min_allocation,
  MAX(amount::numeric) as max_allocation,
  AVG(amount::numeric) as avg_allocation
FROM allocations
WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026');
EOF
```

**Verify:**
- Allocation count matches member count
- Total allocated equals distribution amount ($10,000)
- All amounts > 0
- Amounts seem reasonable

**Checklist:**
- [ ] Distribution amount decided ($10,000)
- [ ] Weighted contributions calculated
- [ ] Patronage scores calculated (sum to 1.0)
- [ ] Allocation records created
- [ ] Totals verified

---

## Phase 4: Governance Review & Approval

### 4.1 Prepare Allocation Report

**Create report for governance review:**

```bash
# Generate allocation summary
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
\o /tmp/q1_2026_allocations.txt
SELECT 
  m.display_name,
  m.email,
  a.amount as allocation,
  a.patronage_score,
  (a.patronage_score * 100) as percentage,
  ca.balance as current_balance,
  (ca.balance::numeric + a.amount::numeric) as new_balance
FROM allocations a
JOIN members m ON m.id = a.member_id
JOIN capital_accounts ca ON ca.member_id = m.id
WHERE a.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
ORDER BY a.amount DESC;
\o
EOF

# Copy report out
docker compose -f docker-compose.prod.yml exec postgres cat /tmp/q1_2026_allocations.txt
```

**Report should show:**
- Member name and email
- Allocation amount
- Patronage score (and percentage)
- Current capital account balance
- New balance after allocation

### 4.2 Schedule Governance Meeting

**Send meeting invitation:**

```
Subject: Governance Meeting - Q1 2026 Allocation Review

Hi everyone,

Q1 2026 period is closed. Time to review and approve allocations!

Meeting: [Date/Time]
Duration: 30-60 minutes
Location: [Zoom link / in-person]

Agenda:
1. Review Q1 contribution summary
2. Review proposed allocations
3. Discuss any concerns
4. Vote to approve allocations
5. Next steps (K-1 data, distribution)

Attached: Q1 2026 Allocation Report

Please review before the meeting. Come with questions!
```

### 4.3 Governance Meeting

**Meeting Agenda:**

**1. Introduction (5 min)**
- Recap Q1 2026 period
- Participation: X members, Y contributions, $Z total approved

**2. Contribution Summary (10 min)**
- Show contribution breakdown by type (labor, capital, property)
- Show contribution breakdown by member
- Highlight any patterns or observations

**3. Allocation Methodology (10 min)**
- Explain weighted contribution formula
- Explain patronage score calculation
- Explain distribution amount decision
- Answer methodology questions

**4. Review Proposed Allocations (15 min)**
- Present allocation report (member by member)
- Show patronage scores and amounts
- Show impact on capital accounts
- Answer allocation-specific questions

**5. Discussion & Concerns (10 min)**
- Open floor for concerns
- Address any issues
- Adjust if needed (re-calculate if major changes)

**6. Vote (5 min)**
- Motion: "Approve Q1 2026 allocations as presented"
- Vote: Yay / Nay / Abstain
- Record vote in meeting minutes

**7. Next Steps (5 min)**
- Generate K-1 data (admin task)
- Update capital accounts (admin task)
- Announce to members
- Plan Q2 2026 period

**Governance Approval Required:**
- Majority vote to approve allocations
- Record vote in meeting minutes
- Document any adjustments made

### 4.4 Handle Adjustments (if needed)

**If governance requests adjustments:**

1. **Recalculate with new parameters**
   - Different distribution amount?
   - Different weights?
   - Exclude certain contributions?

2. **Delete existing allocations:**
   ```sql
   DELETE FROM allocations 
   WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026');
   ```

3. **Recalculate with new parameters** (repeat Phase 3)

4. **Re-present to governance** (iterate until approved)

**Checklist:**
- [ ] Allocation report generated
- [ ] Governance meeting scheduled
- [ ] Meeting agenda prepared
- [ ] Allocations reviewed by governance
- [ ] Vote taken and recorded
- [ ] Allocations approved (or adjusted)

---

## Phase 5: Generate K-1 Data

### 5.1 Assemble K-1 Data

**Run K-1 assembly for each member:**

```bash
# Generate K-1 data for all members
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
\o /tmp/k1_data_q1_2026.csv
SELECT 
  m.display_name as member_name,
  m.email,
  ca.balance as ending_capital,
  ca.tax_basis,
  a.amount as patronage_dividend,
  a.patronage_score,
  (SELECT SUM(amount::numeric) 
   FROM contributions c2 
   WHERE c2.member_id = m.id 
     AND c2.period_id = ap.id 
     AND c2.status = 'approved') as total_contributions
FROM members m
JOIN allocations a ON a.member_id = m.id
JOIN capital_accounts ca ON ca.member_id = m.id
JOIN allocation_periods ap ON ap.id = a.period_id
WHERE ap.name = 'Q1 2026'
ORDER BY m.display_name;
\o
EOF

# Copy K-1 data out
docker compose -f docker-compose.prod.yml exec postgres cat /tmp/k1_data_q1_2026.csv
```

**K-1 data includes:**
- Member name and identifying info
- Beginning capital account balance
- Current year contributions
- Current year patronage dividend (allocation)
- Ending capital account balance
- Tax basis

### 5.2 Verify K-1 Data

**Check that K-1 data is complete and accurate:**

```bash
# Run K-1 validation
docker compose -f docker-compose.prod.yml exec api \
  node -e "
    const { assembleK1Data } = require('./dist/exports/k1-export');
    // Assemble for all members
    // Verify all required fields present
    // Verify calculations correct
  "
```

**Verify:**
- All members have K-1 data
- Beginning + contributions + allocations = ending balance
- Tax basis tracked correctly
- No missing fields

**Checklist:**
- [ ] K-1 data assembled for all members
- [ ] K-1 validation passes
- [ ] Data ready for export

---

## Phase 6: Update Capital Accounts

### 6.1 Distribute Allocations to Capital Accounts

**This updates member equity based on patronage allocations:**

```bash
# Update capital accounts
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
UPDATE capital_accounts ca
SET 
  balance = balance::numeric + a.amount::numeric,
  tax_basis = tax_basis::numeric + a.amount::numeric,
  last_updated = NOW()
FROM allocations a
WHERE a.member_id = ca.member_id
  AND a.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
  AND a.status = 'calculated'
RETURNING ca.member_id, ca.balance, a.amount;
EOF
```

### 6.2 Mark Allocations as Distributed

```bash
# Mark allocations as distributed
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
UPDATE allocations
SET 
  status = 'distributed',
  distributed_at = NOW()
WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
  AND status = 'calculated'
RETURNING member_id, amount, status, distributed_at;
EOF
```

### 6.3 Verify Capital Account Updates

```bash
# Verify all capital accounts updated
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  m.display_name,
  ca.balance as current_balance,
  a.amount as allocation_received,
  a.status as allocation_status
FROM members m
JOIN capital_accounts ca ON ca.member_id = m.id
LEFT JOIN allocations a ON a.member_id = m.id 
  AND a.period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
WHERE m.status = 'active'
ORDER BY m.display_name;
EOF
```

**Verify:**
- All members show allocation_received
- All allocations status = 'distributed'
- Capital account balances increased by allocation amounts
- No NULL allocations for active members

**Checklist:**
- [ ] Capital accounts updated
- [ ] Allocations marked as distributed
- [ ] Updates verified

---

## Phase 7: Post-Close Verification

### 7.1 Run Full Validation

```bash
# Run comprehensive validation
docker compose -f docker-compose.prod.yml exec api \
  tsx migrations/data/validate_migration.ts
```

**Expected:** All checks pass

### 7.2 Verify Period Status

```bash
# Check period final state
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
SELECT 
  ap.name,
  ap.status,
  ap.closed_at,
  COUNT(DISTINCT c.member_id) as unique_contributors,
  COUNT(c.id) FILTER (WHERE c.status = 'approved') as approved_contributions,
  COUNT(a.id) as allocations_created,
  COUNT(a.id) FILTER (WHERE a.status = 'distributed') as allocations_distributed
FROM allocation_periods ap
LEFT JOIN contributions c ON c.period_id = ap.id
LEFT JOIN allocations a ON a.period_id = ap.id
WHERE ap.name = 'Q1 2026'
GROUP BY ap.id, ap.name, ap.status, ap.closed_at;
EOF
```

**Verify:**
- Status = 'closed'
- closed_at timestamp set
- allocations_created = unique_contributors
- allocations_distributed = allocations_created

### 7.3 Verify IRC 704(b) Compliance

```bash
# Run compliance checks
docker compose -f docker-compose.prod.yml exec api \
  node -e "
    const { validate704bCapitalAccount } = require('./dist/compliance/704b-validator');
    // Validate all member capital accounts
    // Check balance = contributions + allocations
    // Check tax basis tracking
  "
```

**Expected:** All capital accounts pass IRC 704(b) validation

**Checklist:**
- [ ] Full validation passes
- [ ] Period status correct
- [ ] All allocations distributed
- [ ] IRC 704(b) compliance verified

---

## Phase 8: Announce Completion

### 8.1 Send Member Notification

**Email all members:**

```
Subject: Q1 2026 Allocation Complete!

Hi everyone,

Great news! Q1 2026 patronage allocation is complete. 🎉

Your Q1 Summary:
- Contributions submitted: X
- Contributions approved: Y
- Total contribution value: $Z
- Your patronage score: XX.X%
- Your Q1 allocation: $X,XXX.XX

Your capital account has been updated:
- Previous balance: $X,XXX.XX
- Q1 allocation: +$X,XXX.XX
- New balance: $X,XXX.XX

What This Means:
Your allocation represents your share of the cooperative's surplus based 
on your patronage (contributions) in Q1. This increases your equity stake 
in RegenHub LCA.

Tax Note:
This allocation is taxable income for 2026. You'll receive a K-1 form 
early next year for tax filing. Track your tax basis for future reference.

View Details:
Log in to Habitat to see your full allocation breakdown:
https://habitat.eth/patronage

Questions?
Reply to this email or ask in #habitat Slack channel.

Thank you for your contributions to Techne/RegenHub in Q1!

Looking forward to Q2! 🚀
```

### 8.2 Update Documentation

**Update CHANGELOG:**
- Q1 2026 period closed on [date]
- X members participated
- Y contributions approved
- $Z total distributed
- Capital accounts updated

**Update README (if needed):**
- Q1 2026 complete
- Q2 2026 period open

### 8.3 Backup Final State

```bash
# Create post-close backup
BACKUP_DIR="/var/backups/habitat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/post_close_q1_2026_${TIMESTAMP}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -d habitat | gzip > "${BACKUP_FILE}"

# Verify backup
ls -lh "${BACKUP_FILE}"
```

**Checklist:**
- [ ] Member notification sent
- [ ] Documentation updated
- [ ] Final backup created
- [ ] Celebration! 🎉

---

## Troubleshooting

### Issue: Patronage Scores Don't Sum to 1.0

**Cause:** Rounding errors

**Solution:**
Adjust last member's score to make total exactly 1.0:
```sql
WITH total_score AS (
  SELECT SUM(patronage_score::numeric) as total 
  FROM allocations 
  WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
)
UPDATE allocations
SET patronage_score = patronage_score::numeric + (1.0 - (SELECT total FROM total_score))
WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
  AND member_id = (
    SELECT member_id FROM allocations 
    WHERE period_id = (SELECT id FROM allocation_periods WHERE name = 'Q1 2026')
    ORDER BY amount DESC LIMIT 1
  );
```

### Issue: Allocation Amounts Don't Sum to Distribution

**Cause:** Rounding errors

**Solution:**
Similar adjustment to last member's allocation.

### Issue: Member Missing from Allocations

**Cause:** No approved contributions

**Solution:**
1. Check if member has contributions: `SELECT * FROM contributions WHERE member_id = 'xxx'`
2. If yes but not approved: Have steward review and approve
3. If no contributions: Member gets 0 allocation (correct behavior)

### Issue: Capital Account Update Failed

**Cause:** Database constraint or connection issue

**Solution:**
1. Check error message
2. Verify capital account exists for member
3. Manually update if needed:
   ```sql
   UPDATE capital_accounts 
   SET balance = balance + X.XX, last_updated = NOW()
   WHERE member_id = 'xxx';
   ```

---

## Success Criteria

Q1 2026 period close complete when:

**Technical:**
- [ ] Period status = 'closed'
- [ ] All contributions finalized (approved/rejected)
- [ ] Allocations calculated for all members
- [ ] Patronage scores sum to 1.0
- [ ] Allocation amounts sum to distribution amount
- [ ] Capital accounts updated
- [ ] Allocations marked as distributed
- [ ] K-1 data generated
- [ ] IRC 704(b) compliance verified
- [ ] Database backed up

**Governance:**
- [ ] Governance reviewed allocations
- [ ] Vote taken and recorded
- [ ] Allocations approved

**Communication:**
- [ ] Members notified
- [ ] Documentation updated
- [ ] Questions addressed

**Verification:**
- [ ] All validation checks pass
- [ ] No data integrity issues
- [ ] System health good

---

## Next Steps

After Q1 2026 close complete:

**Immediate:**
- Monitor member questions/issues
- Address any calculation concerns
- Verify UI shows updated balances correctly

**This Week:**
- Collect feedback on close process
- Document lessons learned
- Identify improvements for Q2

**Q2 2026 Planning:**
- Create Q2 2026 period (April 1 - June 30)
- Apply lessons learned
- Consider process improvements

---

## Appendix: Formulas

### Weighted Contribution

```
Weighted Contribution = 
  (Labor Amount × Labor Weight) + 
  (Capital Amount × Capital Weight) + 
  (Property Amount × Property Weight)

Default Weights:
  Labor Weight = 1.0
  Capital Weight = 0.5
  Property Weight = 0.5

Example:
  $400 labor + $1,000 capital = 
  ($400 × 1.0) + ($1,000 × 0.5) = 
  $400 + $500 = $900 weighted
```

### Patronage Score

```
Patronage Score = 
  Member Weighted Contribution / Total Weighted Contributions

Example:
  Member weighted: $900
  Total weighted: $3,000
  Score: $900 / $3,000 = 0.3 (30%)
```

### Allocation Amount

```
Allocation Amount = 
  Distribution Amount × Patronage Score

Example:
  Distribution: $10,000
  Score: 0.3 (30%)
  Allocation: $10,000 × 0.3 = $3,000
```

### Capital Account Update

```
New Balance = 
  Previous Balance + Contributions + Allocations - Distributions

Q1 2026 Example (no distributions):
  Previous: $0 (new member)
  Contributions: $400 (contributed)
  Allocations: $3,000 (received)
  New Balance: $0 + $400 + $3,000 = $3,400
```

---

**Period Close Guide Version:** 1.0.0  
**Last Updated:** 2026-02-10  
**Target:** Q1 2026 allocation by March 31
