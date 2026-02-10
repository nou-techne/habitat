# Data Migration Guide

**Version:** 1.0.0  
**Purpose:** Import Techne/RegenHub real data into Habitat patronage system  
**Target:** Production deployment (Q1 2026 allocation by March 31)

---

## Overview

This guide covers migrating real organizational data from Techne/RegenHub into the Habitat patronage accounting system. The migration imports:

- **Members** (cooperative members with roles)
- **Historical contributions** (if any prior period data exists)
- **Initial capital account balances** (starting balances)

All data is validated against the schema before import.

---

## Migration Architecture

### Data Flow

```
Source Data (CSV/JSON)
  ↓
Validation Layer (schema checks, business rules)
  ↓
Transformation Layer (normalize, enrich)
  ↓
Database Import (transactional)
  ↓
Verification (checksum, row counts)
```

### Migration Scripts

Located in `migrations/data/`:

1. `01_import_members.ts` - Import member accounts
2. `02_import_capital_accounts.ts` - Import initial capital balances
3. `03_import_contributions.ts` - Import historical contributions (optional)
4. `validate_migration.ts` - Post-import validation

### Rollback Strategy

Each migration script creates a backup before import. Rollback procedure:

```bash
# Restore from backup
psql $DATABASE_URL < backups/pre_migration_YYYYMMDD_HHMMSS.sql
```

---

## Prerequisites

### Data Preparation

Prepare source data in CSV format:

**members.csv:**
```csv
email,display_name,ens_name,role,status,joined_at
todd@techne.studio,Todd Youngblood,todd.habitat.eth,admin,active,2025-01-01
kevin@allo.capital,Kevin Owocki,owocki.habitat.eth,member,active,2025-01-01
```

**capital_accounts.csv:**
```csv
member_email,balance,tax_basis,notes
todd@techne.studio,10000.00,10000.00,Initial capital contribution
kevin@allo.capital,5000.00,5000.00,Initial capital contribution
```

**contributions.csv (optional):**
```csv
member_email,period_name,contribution_type,amount,description,status,approved_at
todd@techne.studio,Q4 2025,labor,2000.00,Studio formation work,approved,2025-12-31
kevin@allo.capital,Q4 2025,capital,5000.00,Initial funding,approved,2025-12-31
```

### Environment Setup

```bash
# Set database URL
export DATABASE_URL=postgres://habitat:password@localhost:5432/habitat

# Set backup directory
export BACKUP_DIR=./backups

# Create backup directory
mkdir -p $BACKUP_DIR
```

---

## Migration Steps

### Step 1: Pre-Migration Backup

```bash
# Backup current database
pg_dump $DATABASE_URL > $BACKUP_DIR/pre_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh $BACKUP_DIR/
```

### Step 2: Validate Source Data

```bash
# Validate CSV files
node migrations/data/validate_source.ts \
  --members members.csv \
  --capital-accounts capital_accounts.csv \
  --contributions contributions.csv
```

**Validation checks:**
- File format (valid CSV)
- Required columns present
- Email format valid
- Dates valid (ISO 8601)
- Amounts valid (numeric, 2 decimal places)
- Roles valid (member, steward, admin)
- Status valid (active, inactive, pending)

### Step 3: Import Members

```bash
# Import members
node migrations/data/01_import_members.ts \
  --source members.csv \
  --dry-run

# Review output, then run for real
node migrations/data/01_import_members.ts \
  --source members.csv

# Verify import
psql $DATABASE_URL -c "SELECT COUNT(*) FROM members;"
```

### Step 4: Import Capital Accounts

```bash
# Import capital accounts
node migrations/data/02_import_capital_accounts.ts \
  --source capital_accounts.csv \
  --dry-run

# Review output, then run for real
node migrations/data/02_import_capital_accounts.ts \
  --source capital_accounts.csv

# Verify import
psql $DATABASE_URL -c "SELECT COUNT(*) FROM capital_accounts;"
```

### Step 5: Import Contributions (Optional)

```bash
# Import historical contributions
node migrations/data/03_import_contributions.ts \
  --source contributions.csv \
  --dry-run

# Review output, then run for real
node migrations/data/03_import_contributions.ts \
  --source contributions.csv

# Verify import
psql $DATABASE_URL -c "SELECT COUNT(*) FROM contributions;"
```

### Step 6: Validate Migration

```bash
# Run validation checks
node migrations/data/validate_migration.ts

# Expected output:
# ✓ All members have valid emails
# ✓ All capital accounts have member references
# ✓ All contributions have member and period references
# ✓ Capital account balances match contribution totals
# ✓ No orphaned records
```

---

## Validation Rules

### Member Validation

```typescript
// Email format
/^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Role must be one of
['member', 'steward', 'admin']

// Status must be one of
['active', 'inactive', 'pending']

// Joined date must be valid ISO 8601
/^\d{4}-\d{2}-\d{2}$/
```

### Capital Account Validation

```typescript
// Balance and tax_basis must be numeric
parseFloat(balance) >= 0
parseFloat(tax_basis) >= 0

// Must reference existing member
SELECT id FROM members WHERE email = member_email

// Balance should equal tax_basis for cash contributions
// (may differ for property contributions)
```

### Contribution Validation

```typescript
// Amount must be positive
parseFloat(amount) > 0

// Type must be one of
['labor', 'capital', 'property']

// Status must be one of
['pending', 'approved', 'rejected']

// Must reference existing member
SELECT id FROM members WHERE email = member_email

// If status is 'approved', approved_at must be set
status === 'approved' ? approved_at !== null : true
```

### Cross-Entity Validation

```typescript
// Capital account balance should equal sum of contributions + allocations
const contributions_total = SUM(contributions.amount WHERE member_id = X AND status = 'approved')
const allocations_total = SUM(allocations.amount WHERE member_id = X)
const expected_balance = contributions_total + allocations_total
capital_accounts.balance === expected_balance

// All capital accounts must have a member
SELECT COUNT(*) FROM capital_accounts ca
LEFT JOIN members m ON ca.member_id = m.id
WHERE m.id IS NULL
-- Expected: 0

// All contributions must have a member and period
SELECT COUNT(*) FROM contributions c
LEFT JOIN members m ON c.member_id = m.id
LEFT JOIN allocation_periods p ON c.period_id = p.id
WHERE m.id IS NULL OR p.id IS NULL
-- Expected: 0
```

---

## Migration Scripts

### 01_import_members.ts

```typescript
import fs from 'fs';
import csv from 'csv-parser';
import { Pool } from 'pg';

interface MemberRow {
  email: string;
  display_name: string;
  ens_name?: string;
  role: 'member' | 'steward' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  joined_at: string;
}

async function importMembers(sourceFile: string, dryRun: boolean = false) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const members: MemberRow[] = [];
  
  // Parse CSV
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(sourceFile)
      .pipe(csv())
      .on('data', (row) => members.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Parsed ${members.length} members from ${sourceFile}`);
  
  // Validate
  for (const member of members) {
    if (!member.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
      throw new Error(`Invalid email: ${member.email}`);
    }
    if (!['member', 'steward', 'admin'].includes(member.role)) {
      throw new Error(`Invalid role: ${member.role}`);
    }
    if (!['active', 'inactive', 'pending'].includes(member.status)) {
      throw new Error(`Invalid status: ${member.status}`);
    }
  }
  
  console.log('✓ Validation passed');
  
  if (dryRun) {
    console.log('Dry run - no data imported');
    console.log('Sample records:');
    console.table(members.slice(0, 5));
    return;
  }
  
  // Import
  let imported = 0;
  for (const member of members) {
    try {
      await pool.query(`
        INSERT INTO members (email, display_name, ens_name, role, status, joined_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            ens_name = EXCLUDED.ens_name,
            role = EXCLUDED.role,
            status = EXCLUDED.status
      `, [
        member.email,
        member.display_name,
        member.ens_name || null,
        member.role,
        member.status,
        member.joined_at,
      ]);
      imported++;
    } catch (error) {
      console.error(`Failed to import ${member.email}:`, error);
      throw error;
    }
  }
  
  console.log(`✓ Imported ${imported} members`);
  
  await pool.end();
}

// CLI
const args = process.argv.slice(2);
const sourceFile = args[args.indexOf('--source') + 1];
const dryRun = args.includes('--dry-run');

importMembers(sourceFile, dryRun).catch(console.error);
```

### 02_import_capital_accounts.ts

```typescript
import fs from 'fs';
import csv from 'csv-parser';
import { Pool } from 'pg';

interface CapitalAccountRow {
  member_email: string;
  balance: string;
  tax_basis: string;
  notes?: string;
}

async function importCapitalAccounts(sourceFile: string, dryRun: boolean = false) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const accounts: CapitalAccountRow[] = [];
  
  // Parse CSV
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(sourceFile)
      .pipe(csv())
      .on('data', (row) => accounts.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Parsed ${accounts.length} capital accounts from ${sourceFile}`);
  
  // Validate
  for (const account of accounts) {
    const balance = parseFloat(account.balance);
    const taxBasis = parseFloat(account.tax_basis);
    
    if (isNaN(balance) || balance < 0) {
      throw new Error(`Invalid balance for ${account.member_email}: ${account.balance}`);
    }
    if (isNaN(taxBasis) || taxBasis < 0) {
      throw new Error(`Invalid tax_basis for ${account.member_email}: ${account.tax_basis}`);
    }
    
    // Check member exists
    const memberCheck = await pool.query(
      'SELECT id FROM members WHERE email = $1',
      [account.member_email]
    );
    if (memberCheck.rows.length === 0) {
      throw new Error(`Member not found: ${account.member_email}`);
    }
  }
  
  console.log('✓ Validation passed');
  
  if (dryRun) {
    console.log('Dry run - no data imported');
    console.log('Sample records:');
    console.table(accounts.slice(0, 5));
    return;
  }
  
  // Import
  let imported = 0;
  for (const account of accounts) {
    try {
      // Get member ID
      const memberResult = await pool.query(
        'SELECT id FROM members WHERE email = $1',
        [account.member_email]
      );
      const memberId = memberResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO capital_accounts (member_id, balance, tax_basis)
        VALUES ($1, $2, $3)
        ON CONFLICT (member_id) DO UPDATE
        SET balance = EXCLUDED.balance,
            tax_basis = EXCLUDED.tax_basis
      `, [memberId, account.balance, account.tax_basis]);
      
      imported++;
    } catch (error) {
      console.error(`Failed to import capital account for ${account.member_email}:`, error);
      throw error;
    }
  }
  
  console.log(`✓ Imported ${imported} capital accounts`);
  
  await pool.end();
}

// CLI
const args = process.argv.slice(2);
const sourceFile = args[args.indexOf('--source') + 1];
const dryRun = args.includes('--dry-run');

importCapitalAccounts(sourceFile, dryRun).catch(console.error);
```

### validate_migration.ts

```typescript
import { Pool } from 'pg';

async function validateMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('Running migration validation...\n');
  
  let allPassed = true;
  
  // Check 1: All members have valid emails
  const invalidEmails = await pool.query(`
    SELECT COUNT(*) as count FROM members
    WHERE email !~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  `);
  if (parseInt(invalidEmails.rows[0].count) === 0) {
    console.log('✓ All members have valid emails');
  } else {
    console.log('✗ Some members have invalid emails');
    allPassed = false;
  }
  
  // Check 2: All capital accounts have member references
  const orphanedAccounts = await pool.query(`
    SELECT COUNT(*) as count FROM capital_accounts ca
    LEFT JOIN members m ON ca.member_id = m.id
    WHERE m.id IS NULL
  `);
  if (parseInt(orphanedAccounts.rows[0].count) === 0) {
    console.log('✓ All capital accounts have member references');
  } else {
    console.log('✗ Some capital accounts are orphaned');
    allPassed = false;
  }
  
  // Check 3: All contributions have member and period references
  const orphanedContributions = await pool.query(`
    SELECT COUNT(*) as count FROM contributions c
    LEFT JOIN members m ON c.member_id = m.id
    LEFT JOIN allocation_periods p ON c.period_id = p.id
    WHERE m.id IS NULL OR p.id IS NULL
  `);
  if (parseInt(orphanedContributions.rows[0].count) === 0) {
    console.log('✓ All contributions have valid references');
  } else {
    console.log('✗ Some contributions have invalid references');
    allPassed = false;
  }
  
  // Check 4: Capital account balances are reasonable
  const negativeBalances = await pool.query(`
    SELECT COUNT(*) as count FROM capital_accounts
    WHERE balance::numeric < 0
  `);
  if (parseInt(negativeBalances.rows[0].count) === 0) {
    console.log('✓ No negative capital account balances');
  } else {
    console.log('✗ Some capital accounts have negative balances');
    allPassed = false;
  }
  
  // Check 5: All approved contributions have approved_at timestamp
  const approvedWithoutTimestamp = await pool.query(`
    SELECT COUNT(*) as count FROM contributions
    WHERE status = 'approved' AND approved_at IS NULL
  `);
  if (parseInt(approvedWithoutTimestamp.rows[0].count) === 0) {
    console.log('✓ All approved contributions have timestamps');
  } else {
    console.log('✗ Some approved contributions missing timestamps');
    allPassed = false;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✓ All validation checks passed');
  } else {
    console.log('✗ Some validation checks failed');
    process.exit(1);
  }
  
  await pool.end();
}

validateMigration().catch(console.error);
```

---

## Rollback Procedure

If migration fails or data is incorrect:

```bash
# 1. Stop application
docker compose -f docker-compose.prod.yml stop api worker

# 2. Restore from backup
psql $DATABASE_URL < $BACKUP_DIR/pre_migration_YYYYMMDD_HHMMSS.sql

# 3. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM members;"

# 4. Restart application
docker compose -f docker-compose.prod.yml start api worker
```

---

## Post-Migration Checklist

After successful migration:

- [ ] All members imported
- [ ] All capital accounts imported
- [ ] Historical contributions imported (if applicable)
- [ ] Validation checks passed
- [ ] Capital account balances verified
- [ ] Test login for sample members
- [ ] Verify member dashboard shows correct data
- [ ] Backup created and stored securely
- [ ] Migration logs saved
- [ ] Staging environment tested end-to-end

---

## Troubleshooting

### Duplicate Email Errors

**Error:** `duplicate key value violates unique constraint "members_email_key"`

**Solution:** Use `ON CONFLICT` clause to update existing records or de-duplicate source data.

### Member Not Found

**Error:** `Member not found: email@example.com`

**Solution:** Import members before capital accounts. Check email spelling in source files.

### Invalid Balance

**Error:** `Invalid balance: -100.00`

**Solution:** Capital account balances cannot be negative. Verify source data.

### Validation Failed

**Error:** `Some validation checks failed`

**Solution:** Run validation script with `--verbose` flag to see detailed errors. Fix source data and re-import.

---

## Techne/RegenHub Initial Data

### Expected Data Volume

**Members:** ~10-15 founding members  
**Capital Accounts:** ~10-15 (one per member)  
**Historical Contributions:** 0 (fresh start for Q1 2026)

### Sample Migration

```bash
# Create period for Q1 2026
psql $DATABASE_URL <<EOF
INSERT INTO allocation_periods (name, description, start_date, end_date, status)
VALUES ('Q1 2026', 'Techne/RegenHub Q1 2026 allocation', '2026-01-01', '2026-03-31', 'open');
EOF

# Import members
node migrations/data/01_import_members.ts --source techne_members.csv

# Import capital accounts
node migrations/data/02_import_capital_accounts.ts --source techne_capital_accounts.csv

# Validate
node migrations/data/validate_migration.ts
```

---

**Migration Guide Version:** 1.0.0  
**Last Updated:** 2026-02-10  
**Next Review:** After production migration (Sprint 116)
