# Database Deployment Guide

**Sprint:** 52  
**Phase:** 3 — Production Deployment  
**Layer:** Infrastructure (State + Constraint)  
**Status:** Specification

---

## Purpose

Complete deployment guide for Habitat PostgreSQL database: schema deployment order, seed data loading, Row-Level Security (RLS) policies, database roles, and verification procedures.

---

## Prerequisites

- PostgreSQL 14+ installed and running
- Superuser access to database server
- Schema files available at `habitat/schema/`

---

## Schema Files

| File | Purpose | Dependencies |
|------|---------|--------------|
| `01_treasury_core.sql` | Treasury bounded context: events, accounts, transactions, entries, periods | None |
| `02_treasury_migrations.sql` | Treasury extensions: 704(c) layers, minimum gain, QIO/DRO | `01_treasury_core.sql` |
| `03_treasury_seed_data.sql` | Sample data for testing and validation | `01_treasury_core.sql`, `02_treasury_migrations.sql` |
| `04_people_core.sql` | People bounded context: members, contributions, approvals, ENS | None |
| `05_agreements_core.sql` | Agreements bounded context: allocations, distributions, period close | `01_treasury_core.sql`, `04_people_core.sql` |

**Deployment Order:**
1. Treasury core (01)
2. People core (04) — independent of Treasury migrations
3. Treasury migrations (02)
4. Agreements core (05) — depends on both Treasury and People
5. Seed data (03) — optional, testing only

---

## Database Creation

### Development Database

```bash
# Create database and owner
sudo -u postgres psql -c "CREATE DATABASE habitat_dev;"
sudo -u postgres psql -c "CREATE USER habitat_admin WITH PASSWORD 'dev_password_change_in_production';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE habitat_dev TO habitat_admin;"

# Enable required extensions
sudo -u postgres psql -d habitat_dev -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -d habitat_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Production Database

```bash
# Generate strong password
export PGPASSWORD=$(openssl rand -base64 32)

# Create database and owner
sudo -u postgres psql -c "CREATE DATABASE habitat;"
sudo -u postgres psql -c "CREATE USER habitat_admin WITH PASSWORD '$PGPASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE habitat TO habitat_admin;"

# Enable required extensions
sudo -u postgres psql -d habitat -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -d habitat -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Store password securely
echo "habitat_admin:$PGPASSWORD" >> ~/.habitat_credentials
chmod 600 ~/.habitat_credentials
```

---

## Schema Deployment

### Automated Deployment Script

**File:** `scripts/deploy-schemas.sh`

```bash
#!/bin/bash
set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-habitat}"
DB_USER="${DB_USER:-habitat_admin}"
SCHEMA_DIR="${SCHEMA_DIR:-./schema}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Habitat Database Deployment${NC}"
echo "========================================"
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Verify connection
echo -n "Testing connection... "
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Cannot connect to database. Check credentials and connection."
    exit 1
fi

# Deploy schemas in order
SCHEMAS=(
    "01_treasury_core.sql"
    "04_people_core.sql"
    "02_treasury_migrations.sql"
    "05_agreements_core.sql"
)

for schema in "${SCHEMAS[@]}"; do
    echo ""
    echo -e "${YELLOW}Deploying: $schema${NC}"
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCHEMA_DIR/$schema"; then
        echo -e "${GREEN}✓ $schema deployed successfully${NC}"
    else
        echo -e "${RED}✗ $schema deployment failed${NC}"
        exit 1
    fi
done

# Optional: Load seed data
if [ "$LOAD_SEED_DATA" = "true" ]; then
    echo ""
    echo -e "${YELLOW}Loading seed data...${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCHEMA_DIR/03_treasury_seed_data.sql"
    echo -e "${GREEN}✓ Seed data loaded${NC}"
fi

echo ""
echo -e "${GREEN}========================================"
echo "All schemas deployed successfully!"
echo "========================================${NC}"
```

**Usage:**

```bash
# Development
chmod +x scripts/deploy-schemas.sh
DB_NAME=habitat_dev LOAD_SEED_DATA=true ./scripts/deploy-schemas.sh

# Production (no seed data)
DB_NAME=habitat ./scripts/deploy-schemas.sh
```

---

### Manual Deployment

```bash
# Connect to database
psql -h localhost -p 5432 -U habitat_admin -d habitat

# Deploy schemas in order
\i schema/01_treasury_core.sql
\i schema/04_people_core.sql
\i schema/02_treasury_migrations.sql
\i schema/05_agreements_core.sql

# Optional: load seed data (dev only)
\i schema/03_treasury_seed_data.sql

# Verify
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('treasury', 'people', 'agreements')
ORDER BY schemaname, tablename;
```

---

## Database Roles

Habitat uses three application roles in addition to the `habitat_admin` superuser:

| Role | Access | Use Case |
|------|--------|----------|
| `habitat_read` | Read-only (SELECT) | Reporting, analytics, read replicas |
| `habitat_write` | Read + Write (SELECT, INSERT, UPDATE) | API server, event workers |
| `habitat_audit` | Read all + audit tables | Compliance audits, external auditors |

### Role Creation Script

**File:** `scripts/create-roles.sh`

```bash
#!/bin/bash
set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-habitat}"
DB_ADMIN="${DB_ADMIN:-habitat_admin}"

# Generate passwords
READ_PASS=$(openssl rand -base64 24)
WRITE_PASS=$(openssl rand -base64 24)
AUDIT_PASS=$(openssl rand -base64 24)

echo "Creating Habitat database roles..."

# Create roles
psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN -d $DB_NAME << EOF

-- Read-only role
CREATE ROLE habitat_read WITH LOGIN PASSWORD '$READ_PASS';
GRANT CONNECT ON DATABASE $DB_NAME TO habitat_read;
GRANT USAGE ON SCHEMA treasury, people, agreements TO habitat_read;
GRANT SELECT ON ALL TABLES IN SCHEMA treasury, people, agreements TO habitat_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA treasury, people, agreements 
  GRANT SELECT ON TABLES TO habitat_read;

-- Read-write role (for API server and workers)
CREATE ROLE habitat_write WITH LOGIN PASSWORD '$WRITE_PASS';
GRANT CONNECT ON DATABASE $DB_NAME TO habitat_write;
GRANT USAGE ON SCHEMA treasury, people, agreements TO habitat_write;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA treasury, people, agreements TO habitat_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA treasury, people, agreements TO habitat_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA treasury, people, agreements 
  GRANT SELECT, INSERT, UPDATE ON TABLES TO habitat_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA treasury, people, agreements 
  GRANT USAGE, SELECT ON SEQUENCES TO habitat_write;

-- Audit role (read all, including audit tables)
CREATE ROLE habitat_audit WITH LOGIN PASSWORD '$AUDIT_PASS';
GRANT CONNECT ON DATABASE $DB_NAME TO habitat_audit;
GRANT USAGE ON SCHEMA treasury, people, agreements TO habitat_audit;
GRANT SELECT ON ALL TABLES IN SCHEMA treasury, people, agreements TO habitat_audit;
ALTER DEFAULT PRIVILEGES IN SCHEMA treasury, people, agreements 
  GRANT SELECT ON TABLES TO habitat_audit;

EOF

echo "Roles created successfully!"
echo ""
echo "Store these credentials securely:"
echo "habitat_read: $READ_PASS"
echo "habitat_write: $WRITE_PASS"
echo "habitat_audit: $AUDIT_PASS"
```

**Usage:**

```bash
chmod +x scripts/create-roles.sh
./scripts/create-roles.sh > ~/.habitat_roles_credentials
chmod 600 ~/.habitat_roles_credentials
```

---

## Row-Level Security (RLS) Policies

RLS policies enforce member-level access control. Members can only view/modify their own data unless they have elevated permissions.

### Policy Deployment Script

**File:** `scripts/deploy-rls-policies.sh`

```bash
#!/bin/bash
set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-habitat}"
DB_ADMIN="${DB_ADMIN:-habitat_admin}"

echo "Deploying Row-Level Security policies..."

psql -h $DB_HOST -p $DB_PORT -U $DB_ADMIN -d $DB_NAME << 'EOF'

-- Enable RLS on sensitive tables
ALTER TABLE people.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE people.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE people.contribution_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements.member_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements.distributions ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view their own profile
CREATE POLICY member_view_own_profile ON people.members
  FOR SELECT
  USING (member_id = current_setting('app.current_member_id')::uuid);

-- Policy: Members can view their own contributions
CREATE POLICY member_view_own_contributions ON people.contributions
  FOR SELECT
  USING (contributor_id = current_setting('app.current_member_id')::uuid);

-- Policy: Members can submit contributions
CREATE POLICY member_submit_contribution ON people.contributions
  FOR INSERT
  WITH CHECK (contributor_id = current_setting('app.current_member_id')::uuid);

-- Policy: Approvers can view contributions awaiting their approval
CREATE POLICY approver_view_pending ON people.contributions
  FOR SELECT
  USING (
    status = 'pending_approval' 
    AND EXISTS (
      SELECT 1 FROM people.contribution_approvals ca
      WHERE ca.contribution_id = contributions.contribution_id
        AND ca.approver_id = current_setting('app.current_member_id')::uuid
        AND ca.status = 'pending'
    )
  );

-- Policy: Approvers can create approval records
CREATE POLICY approver_can_approve ON people.contribution_approvals
  FOR INSERT
  WITH CHECK (approver_id = current_setting('app.current_member_id')::uuid);

-- Policy: Members can view their own allocations
CREATE POLICY member_view_own_allocations ON agreements.member_allocations
  FOR SELECT
  USING (member_id = current_setting('app.current_member_id')::uuid);

-- Policy: Members can view their own distributions
CREATE POLICY member_view_own_distributions ON agreements.distributions
  FOR SELECT
  USING (
    member_id = current_setting('app.current_member_id')::uuid
    OR 'governance' = ANY(current_setting('app.current_member_roles')::text[])
  );

-- Policy: Governance role can view all data
CREATE POLICY governance_view_all_members ON people.members
  FOR SELECT
  USING ('governance' = ANY(current_setting('app.current_member_roles')::text[]));

CREATE POLICY governance_view_all_contributions ON people.contributions
  FOR SELECT
  USING ('governance' = ANY(current_setting('app.current_member_roles')::text[]));

CREATE POLICY governance_view_all_allocations ON agreements.member_allocations
  FOR SELECT
  USING ('governance' = ANY(current_setting('app.current_member_roles')::text[]));

-- Policy: Admin role bypasses RLS (set in session)
ALTER TABLE people.members FORCE ROW LEVEL SECURITY;
ALTER TABLE people.contributions FORCE ROW LEVEL SECURITY;
ALTER TABLE agreements.member_allocations FORCE ROW LEVEL SECURITY;

EOF

echo "RLS policies deployed successfully!"
```

**Setting Session Context (API Server):**

```sql
-- Set current member context at start of each request
SET LOCAL app.current_member_id = 'uuid-of-authenticated-member';
SET LOCAL app.current_member_roles = ARRAY['member', 'bookkeeper'];

-- For admin operations, bypass RLS
SET LOCAL row_security = off;
```

---

## Seed Data Loading

Seed data is for **development and testing only**. Never load seed data in production.

### Load Seed Data

```bash
# Development only
psql -h localhost -U habitat_admin -d habitat_dev -f schema/03_treasury_seed_data.sql
```

**Seed data includes:**
- Sample member profiles
- Test contribution records
- Sample transactions (revenue, expenses)
- Historical period closes
- Mock allocation calculations

### Verify Seed Data

```sql
-- Count records per table
SELECT 'members' AS table_name, COUNT(*) FROM people.members
UNION ALL
SELECT 'contributions', COUNT(*) FROM people.contributions
UNION ALL
SELECT 'treasury_events', COUNT(*) FROM treasury.events
UNION ALL
SELECT 'transactions', COUNT(*) FROM treasury.transactions
UNION ALL
SELECT 'allocations', COUNT(*) FROM agreements.member_allocations;
```

Expected output (approximate):
```
      table_name      | count 
----------------------+-------
 members              |    10
 contributions        |    50
 treasury_events      |   100
 transactions         |    75
 allocations          |    30
```

---

## Verification Procedures

### 1. Schema Verification

```sql
-- List all schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name IN ('treasury', 'people', 'agreements');

-- Expected output:
-- treasury
-- people
-- agreements
```

### 2. Table Verification

```sql
-- Count tables per schema
SELECT 
  schemaname,
  COUNT(*) AS table_count
FROM pg_tables 
WHERE schemaname IN ('treasury', 'people', 'agreements')
GROUP BY schemaname
ORDER BY schemaname;

-- Expected output:
--   schemaname   | table_count 
-- ---------------+-------------
--  agreements    |          10
--  people        |           9
--  treasury      |          12
```

### 3. Function Verification

```sql
-- List custom functions
SELECT 
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema IN ('treasury', 'people', 'agreements')
ORDER BY routine_schema, routine_name;
```

### 4. Trigger Verification

```sql
-- List triggers
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema IN ('treasury', 'people', 'agreements')
ORDER BY trigger_schema, event_object_table;
```

### 5. Materialized View Verification

```sql
-- List materialized views
SELECT 
  schemaname,
  matviewname,
  ispopulated
FROM pg_matviews
WHERE schemaname IN ('treasury', 'people', 'agreements');

-- Refresh if not populated
REFRESH MATERIALIZED VIEW treasury.account_balances;
REFRESH MATERIALIZED VIEW people.member_patronage_summary;
REFRESH MATERIALIZED VIEW agreements.period_allocations;
```

### 6. Constraint Verification

```sql
-- Verify double-entry accounting constraint
INSERT INTO treasury.transactions (transaction_id, description, transaction_date)
VALUES (gen_random_uuid(), 'Test unbalanced transaction', CURRENT_DATE);

INSERT INTO treasury.entries (entry_id, transaction_id, account_id, amount)
VALUES 
  (gen_random_uuid(), (SELECT transaction_id FROM treasury.transactions WHERE description = 'Test unbalanced transaction'), (SELECT account_id FROM treasury.accounts LIMIT 1), 100.00);

-- This should fail with: "Transaction entries must sum to zero"
-- If it succeeds, the constraint is not working

-- Clean up
DELETE FROM treasury.transactions WHERE description = 'Test unbalanced transaction';
```

### 7. RLS Policy Verification

```sql
-- Set member context
SET LOCAL app.current_member_id = 'uuid-of-member-1';
SET LOCAL app.current_member_roles = ARRAY['member'];

-- Should only return member-1's data
SELECT * FROM people.contributions;

-- Set governance role
SET LOCAL app.current_member_roles = ARRAY['member', 'governance'];

-- Should return all data
SELECT COUNT(*) FROM people.contributions;
```

---

## Migration Tracking

Habitat uses a simple migration tracking table to record deployed schema versions.

### Create Migration Tracker

```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployed_by TEXT DEFAULT CURRENT_USER,
  description TEXT
);

-- Record initial deployment
INSERT INTO public.schema_migrations (version, description)
VALUES 
  ('01_treasury_core', 'Treasury bounded context core schema'),
  ('02_treasury_migrations', 'Treasury 704(b) compliance extensions'),
  ('04_people_core', 'People bounded context core schema'),
  ('05_agreements_core', 'Agreements bounded context core schema');
```

### Query Migration History

```sql
SELECT * FROM public.schema_migrations ORDER BY deployed_at;
```

---

## Backup and Restore

### Automated Backup Script

**File:** `scripts/backup-database.sh`

```bash
#!/bin/bash
set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-habitat}"
DB_USER="${DB_USER:-habitat_admin}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.dump"

echo "Backing up database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create dump (custom format for flexibility)
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -F c -b -v -f "$BACKUP_FILE" $DB_NAME

# Compress
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup complete: $BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump.gz" -mtime +$RETENTION_DAYS -delete
echo "Removed backups older than $RETENTION_DAYS days"
```

### Restore from Backup

```bash
#!/bin/bash
set -e

BACKUP_FILE="$1"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-habitat}"
DB_USER="${DB_USER:-habitat_admin}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.dump.gz>"
    exit 1
fi

echo "Restoring database: $DB_NAME"
echo "From backup: $BACKUP_FILE"
echo ""
echo "WARNING: This will drop and recreate the database."
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" > /tmp/restore.dump
    RESTORE_FILE="/tmp/restore.dump"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# Restore
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v "$RESTORE_FILE"

# Clean up temp file
if [ "$RESTORE_FILE" = "/tmp/restore.dump" ]; then
    rm /tmp/restore.dump
fi

echo "Restore complete!"
```

---

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql -h localhost -U habitat_admin -d habitat -c "SELECT version();"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Schema Deployment Failures

```bash
# Check for existing objects
psql -U habitat_admin -d habitat -c "\dt treasury.*"

# Drop schema if needed (dev only)
psql -U habitat_admin -d habitat -c "DROP SCHEMA IF EXISTS treasury CASCADE;"

# Re-deploy
psql -U habitat_admin -d habitat -f schema/01_treasury_core.sql
```

### Permission Issues

```bash
# Verify role permissions
psql -U habitat_admin -d habitat -c "\du"

# Grant missing permissions
psql -U habitat_admin -d habitat -c "GRANT USAGE ON SCHEMA treasury TO habitat_write;"
```

### RLS Policy Issues

```bash
# Disable RLS temporarily (debugging only)
ALTER TABLE people.members DISABLE ROW LEVEL SECURITY;

# Check active policies
SELECT * FROM pg_policies WHERE schemaname = 'people';

# Drop and recreate policy
DROP POLICY IF EXISTS member_view_own_profile ON people.members;
```

---

## Production Deployment Checklist

- [ ] PostgreSQL 14+ installed and configured
- [ ] Strong passwords generated for all roles
- [ ] Database created with correct ownership
- [ ] Extensions enabled (pgcrypto, uuid-ossp)
- [ ] Schemas deployed in correct order
- [ ] Application roles created (read, write, audit)
- [ ] RLS policies enabled and tested
- [ ] Materialized views refreshed
- [ ] Migration tracker populated
- [ ] Backup script configured and tested
- [ ] Connection strings stored securely (Doppler, Vault)
- [ ] Read replica configured (if using)
- [ ] Monitoring and alerting enabled
- [ ] Database firewall rules configured

---

## Next Steps (Sprint 53+)

1. **Sprint 53:** API Server Core (queries) — GraphQL resolvers for Treasury, People, Agreements
2. **Sprint 54:** API Server Mutations — Create/submit/approve workflows
3. **Sprint 55:** Event Bus Implementation — RabbitMQ setup, event handlers

---

*Sprint 52 complete. Database deployment procedures specified.*

**Repository:** github.com/nou-techne/habitat  
**Deployment Guide:** habitat/infrastructure/database-deployment.md
