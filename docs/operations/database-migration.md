# Database Migration Runbook

## Overview

Procedures for applying, rolling back, and managing database schema migrations in Habitat.

## Migration System

Habitat uses SQL migration files with up/down scripts for schema changes.

**Location:** `schema/*.sql`

**Tracking:** `schema_migrations` table stores applied migrations

## Prerequisites

- SSH access to server
- Database backup before migration
- Understanding of SQL and schema changes
- Tested migration in staging environment

## Migration Files

### File Naming Convention

```
01_treasury_core.sql       # Initial schema
02_people_core.sql          # Add people tables
03_rel_contributions.sql    # Add relationships
04_events.sql               # Add event sourcing
05_indexes.sql              # Add indexes
06_security.sql             # Add RLS policies
```

### Migration File Structure

```sql
-- Migration: Add email verification
-- Up migration

CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verifications_member ON email_verifications(member_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);

-- Down migration (rollback)
-- DROP TABLE email_verifications;
```

## Apply Migration (Manual)

### 1. Backup Database

```bash
# Create backup before migration
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > backups/pre-migration-$(date +%Y%m%d-%H%M%S).dump

echo "Backup created: backups/pre-migration-$(date +%Y%m%d-%H%M%S).dump"
```

### 2. Test in Staging

```bash
# On staging server
cd /path/to/habitat

# Apply migration
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat < schema/new-migration.sql

# Verify schema
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "\d+ new_table"

# Test application
curl https://staging.habitat.example.com/api/health
```

### 3. Apply to Production

```bash
# During maintenance window
cd /path/to/habitat

# Stop API (optional, for safety)
docker compose -f docker-compose.prod.yml stop api

# Apply migration
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat < schema/new-migration.sql

# Verify success
if [ $? -eq 0 ]; then
  echo "Migration successful"
else
  echo "Migration failed - check errors"
  exit 1
fi

# Restart API
docker compose -f docker-compose.prod.yml start api

# Verify application
curl https://habitat.example.com/api/health
```

## Apply Migration (Automated)

### Via GitHub Actions

```bash
# Trigger database migration workflow
gh workflow run database-migration.yml \
  -f environment=production \
  -f direction=up

# Watch workflow
gh run watch
```

### Via npm Script

```bash
# Run migrations
docker compose -f docker-compose.prod.yml run --rm api npm run migrate

# Check status
docker compose -f docker-compose.prod.yml run --rm api npm run migrate:status
```

## Rollback Migration

### Immediate Rollback

```bash
# If migration just applied and causing issues

# 1. Restore from pre-migration backup
BACKUP_FILE="backups/pre-migration-20260210-100000.dump"

# 2. Stop services
docker compose -f docker-compose.prod.yml stop api worker

# 3. Restore database
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean --if-exists < $BACKUP_FILE

# 4. Restart services
docker compose -f docker-compose.prod.yml start api worker

# 5. Verify
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT version FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;"
```

### Selective Rollback (Down Migration)

```bash
# Run down migration script
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat <<EOF
-- Rollback: Drop email verifications
DROP TABLE email_verifications;
DELETE FROM schema_migrations WHERE version = '06';
EOF

# Verify rollback
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "\d email_verifications"
# Should show: relation "email_verifications" does not exist
```

## Zero-Downtime Migration

For production systems that cannot tolerate downtime:

### Phase 1: Add New Column (Nullable)

```sql
-- Add column as nullable first
ALTER TABLE contributions
ADD COLUMN new_field VARCHAR(255);

-- Application continues using old logic
```

### Phase 2: Backfill Data

```sql
-- Backfill in batches
DO $$
DECLARE
  batch_size INT := 1000;
  offset_val INT := 0;
BEGIN
  LOOP
    UPDATE contributions
    SET new_field = old_field || '-migrated'
    WHERE id IN (
      SELECT id FROM contributions
      WHERE new_field IS NULL
      LIMIT batch_size
    );
    
    IF NOT FOUND THEN
      EXIT;
    END IF;
    
    PERFORM pg_sleep(1);  -- Rate limiting
  END LOOP;
END $$;
```

### Phase 3: Deploy Application Update

```bash
# Deploy code that uses new_field
docker compose -f docker-compose.prod.yml up -d --no-deps api worker
```

### Phase 4: Make Column Non-Nullable

```sql
-- After backfill complete and app deployed
ALTER TABLE contributions
ALTER COLUMN new_field SET NOT NULL;

-- Drop old column
ALTER TABLE contributions
DROP COLUMN old_field;
```

## Migration Best Practices

### 1. Small, Incremental Changes

❌ **Bad:** Single migration that restructures entire schema

✅ **Good:** Multiple small migrations, each with clear purpose

```sql
-- Migration 1: Add column
ALTER TABLE members ADD COLUMN phone VARCHAR(20);

-- Migration 2: Add index
CREATE INDEX idx_members_phone ON members(phone);

-- Migration 3: Add constraint
ALTER TABLE members ADD CONSTRAINT phone_format 
  CHECK (phone ~ '^\+?[1-9]\d{1,14}$');
```

### 2. Always Include Rollback

Every migration should have a down/rollback script:

```sql
-- Up
CREATE TABLE new_feature (...);

-- Down (commented or in separate file)
-- DROP TABLE new_feature;
```

### 3. Test Thoroughly

```bash
# Test sequence
1. Apply migration to local dev DB
2. Run application tests
3. Apply to staging
4. Test application in staging
5. Apply to production
6. Monitor for issues
```

### 4. Use Transactions

```sql
BEGIN;

-- Migration changes
ALTER TABLE ...;
CREATE INDEX ...;

-- Verify changes
SELECT COUNT(*) FROM ...;

-- If everything looks good:
COMMIT;
-- If not:
-- ROLLBACK;
```

### 5. Monitor Performance

```sql
-- Check for long-running queries during migration
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

## Common Migration Patterns

### Add Column

```sql
-- Add nullable column (fast)
ALTER TABLE members ADD COLUMN phone VARCHAR(20);

-- Add with default (requires table rewrite in old PostgreSQL)
ALTER TABLE members ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Better approach for large tables:
ALTER TABLE members ADD COLUMN active BOOLEAN;  -- nullable first
UPDATE members SET active = true WHERE active IS NULL;  -- backfill
ALTER TABLE members ALTER COLUMN active SET NOT NULL;  -- then make required
```

### Rename Column

```sql
-- Rename column (requires application update)
ALTER TABLE members RENAME COLUMN old_name TO new_name;

-- Or use view for gradual migration:
CREATE VIEW members_new AS 
  SELECT id, old_name AS new_name, ... FROM members;
-- Update app to use members_new, then rename table and drop view
```

### Add Index

```sql
-- Add index concurrently (no table lock)
CREATE INDEX CONCURRENTLY idx_members_email ON members(email);

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE indexname = 'idx_members_email';
```

### Add Foreign Key

```sql
-- Add FK with validation (can be slow)
ALTER TABLE contributions
ADD CONSTRAINT fk_contributions_member
FOREIGN KEY (member_id) REFERENCES members(id);

-- For large tables, add without validation first:
ALTER TABLE contributions
ADD CONSTRAINT fk_contributions_member
FOREIGN KEY (member_id) REFERENCES members(id)
NOT VALID;

-- Then validate (allows reads during validation):
ALTER TABLE contributions
VALIDATE CONSTRAINT fk_contributions_member;
```

## Troubleshooting

### Migration Fails Midway

**Symptom:** Migration script errors partway through

**Solution:**
```bash
# Check what was applied
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "\dt"

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean < backups/pre-migration-*.dump

# Fix migration script
# Re-test in staging
# Re-apply to production
```

### Migration Too Slow

**Symptom:** Migration takes >30 minutes, blocking other operations

**Solution:**
```bash
# Cancel migration
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE query LIKE '%ALTER TABLE%';"

# Break into smaller chunks
# Use concurrent index creation
# Schedule during low-traffic window
# Consider zero-downtime approach
```

### Lock Contention

**Symptom:** Migration blocked by other queries

**Solution:**
```sql
-- Find blocking queries
SELECT 
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking 
  ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.wait_event_type = 'Lock';

-- Terminate blocking queries (carefully!)
SELECT pg_terminate_backend(blocking_pid);
```

## Migration Checklist

Before applying production migration:

- [ ] Backup created and verified
- [ ] Migration tested in staging
- [ ] Application compatible with new schema
- [ ] Rollback procedure documented
- [ ] Maintenance window scheduled (if needed)
- [ ] Stakeholders notified
- [ ] Monitoring ready
- [ ] Performance impact assessed

After applying migration:

- [ ] Migration completed successfully
- [ ] Application functioning normally
- [ ] No error spikes in logs
- [ ] Database performance normal
- [ ] Backup of post-migration state
- [ ] Documentation updated
- [ ] Team notified of completion

## Emergency Rollback Decision Tree

```
Migration applied
    ↓
Is application broken?
    ↓ YES → Immediate rollback from backup
    ↓ NO
    ↓
Performance degradation?
    ↓ YES → Assess severity
    │         ↓ Critical → Rollback
    │         ↓ Minor → Monitor
    ↓ NO
    ↓
Data integrity issues?
    ↓ YES → Immediate rollback + investigate
    ↓ NO
    ↓
Migration successful ✓
```
