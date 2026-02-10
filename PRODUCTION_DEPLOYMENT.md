# Production Deployment Checklist

**Version:** 1.0.0  
**Date:** 2026-02-10  
**Target:** habitat.eth (production)  
**Goal:** Techne/RegenHub Q1 2026 allocation by March 31

---

## Overview

This checklist guides the production deployment of the Habitat patronage accounting system. Follow each step in order, verifying success before proceeding.

**Deployment Phases:**
1. Pre-deployment verification
2. Service deployment
3. Database migration
4. Data loading
5. Integration verification
6. Smoke testing
7. Go-live

**Estimated Time:** 2-3 hours

---

## Phase 1: Pre-Deployment Verification

### 1.1 Infrastructure Ready

```bash
# SSH into production server
ssh habitat@<PRODUCTION_IP>

# Verify Docker running
docker --version
docker compose version

# Verify disk space
df -h
# Expected: At least 50 GB free on /

# Verify memory
free -h
# Expected: At least 8 GB total

# Verify DNS
dig habitat.eth +short
# Expected: Returns production server IP

# Verify firewall
sudo ufw status
# Expected: 22, 80, 443 open
```

**Checklist:**
- [ ] SSH access working
- [ ] Docker installed and running
- [ ] Disk space > 50 GB free
- [ ] Memory > 8 GB
- [ ] DNS points to production server
- [ ] Firewall configured (22, 80, 443)

### 1.2 Repository and Configuration

```bash
# Clone repository (if not already done)
cd /home/habitat
git clone https://github.com/nou-techne/habitat.git
cd habitat

# Pull latest
git pull origin main

# Verify branch
git branch
# Expected: * main

# Verify commit
git log -1 --oneline
# Expected: Latest commit from development
```

**Checklist:**
- [ ] Repository cloned
- [ ] On main branch
- [ ] Latest commit pulled

### 1.3 Environment Configuration

```bash
# Verify .env files exist
ls -la .env packages/api/.env packages/worker/.env ui/.env

# Check critical environment variables
grep -E "DATABASE_URL|JWT_SECRET|POSTGRES_PASSWORD|DOMAIN" .env packages/api/.env

# Verify secrets are NOT example values
grep "CHANGE_ME" .env packages/api/.env packages/worker/.env
# Expected: No matches (all secrets should be real values)

# Verify domain
grep "DOMAIN" .env
# Expected: DOMAIN=habitat.eth (or production domain)
```

**Checklist:**
- [ ] All .env files present
- [ ] Secrets generated (no CHANGE_ME placeholders)
- [ ] DATABASE_URL set
- [ ] JWT_SECRET set (64+ characters)
- [ ] POSTGRES_PASSWORD set (32+ characters)
- [ ] RABBITMQ_PASSWORD set
- [ ] DOMAIN set to habitat.eth
- [ ] CORS_ORIGIN set to production domain

---

## Phase 2: Service Deployment

### 2.1 Build Images

```bash
# Build all images
docker compose -f docker-compose.prod.yml build

# Verify images built
docker images | grep habitat
# Expected: habitat-api, habitat-worker, habitat-ui
```

**Checklist:**
- [ ] API image built
- [ ] Worker image built
- [ ] UI image built
- [ ] No build errors

### 2.2 Start Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Wait 30 seconds for services to initialize
sleep 30

# Check status
docker compose -f docker-compose.prod.yml ps
# Expected: All containers "Up" and healthy
```

**Expected output:**
```
NAME                STATUS
postgres            Up (healthy)
rabbitmq            Up (healthy)
api                 Up (healthy)
worker              Up (healthy)
ui                  Up (healthy)
caddy               Up (healthy)
```

**Checklist:**
- [ ] PostgreSQL running and healthy
- [ ] RabbitMQ running and healthy
- [ ] API running and healthy
- [ ] Worker running and healthy
- [ ] UI running and healthy
- [ ] Caddy running and healthy

### 2.3 Verify Service Logs

```bash
# Check for errors in logs
docker compose -f docker-compose.prod.yml logs | grep -i error
# Expected: No critical errors

# Check API logs
docker compose -f docker-compose.prod.yml logs api | tail -20
# Expected: "Server listening on port 4000"

# Check Worker logs
docker compose -f docker-compose.prod.yml logs worker | tail -20
# Expected: "Worker started"

# Check UI logs
docker compose -f docker-compose.prod.yml logs ui | tail -20
# Expected: "ready on *:3000"
```

**Checklist:**
- [ ] No critical errors in logs
- [ ] API started successfully
- [ ] Worker started successfully
- [ ] UI started successfully

---

## Phase 3: Database Migration

### 3.1 Wait for PostgreSQL

```bash
# Check PostgreSQL readiness
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U habitat
# Expected: accepting connections

# If not ready, wait and retry
for i in {1..30}; do
  if docker compose -f docker-compose.prod.yml exec postgres pg_isready -U habitat; then
    echo "PostgreSQL ready"
    break
  fi
  echo "Waiting for PostgreSQL... ($i/30)"
  sleep 2
done
```

**Checklist:**
- [ ] PostgreSQL accepting connections

### 3.2 Run Migrations

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml exec api pnpm db:migrate

# Expected output:
# ✓ Migration 01_treasury_core applied
# ✓ Migration 02_people_core applied
# ✓ Migration 03_agreements_core applied
# ✓ Migration 04_relationships applied
# ✓ Migration 05_capital_accounts applied
# ✓ Migration 06_processed_events applied
# All migrations applied successfully
```

**Checklist:**
- [ ] All migrations applied
- [ ] No migration errors

### 3.3 Verify Schema

```bash
# Check tables created
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "\dt"

# Expected: ~15 tables
# members, capital_accounts, contributions, allocations, allocation_periods, etc.

# Count tables
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: ~15
```

**Checklist:**
- [ ] Tables created (~15 tables)
- [ ] No schema errors

---

## Phase 4: Data Loading

### 4.1 Create Initial Period

```bash
# Create Q1 2026 allocation period
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat <<EOF
INSERT INTO allocation_periods (name, description, start_date, end_date, status)
VALUES (
  'Q1 2026',
  'Techne/RegenHub Q1 2026 allocation',
  '2026-01-01',
  '2026-03-31',
  'open'
)
RETURNING id, name, status;
EOF
```

**Checklist:**
- [ ] Q1 2026 period created
- [ ] Period status is 'open'

### 4.2 Import Members

```bash
# Prepare member data CSV (techne_members.csv)
# See MIGRATION.md for format

# Import members
docker compose -f docker-compose.prod.yml exec api \
  tsx migrations/data/01_import_members.ts --source techne_members.csv

# Verify import
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM members;"
# Expected: Number of founding members (~10-15)

# List members
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT email, display_name, role, status FROM members;"
```

**Checklist:**
- [ ] Members imported
- [ ] Member count correct
- [ ] All members have 'active' status
- [ ] Roles assigned correctly (admin, steward, member)

### 4.3 Import Capital Accounts

```bash
# Prepare capital account data CSV (techne_capital_accounts.csv)
# See MIGRATION.md for format

# Import capital accounts
docker compose -f docker-compose.prod.yml exec api \
  tsx migrations/data/02_import_capital_accounts.ts --source techne_capital_accounts.csv

# Verify import
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM capital_accounts;"
# Expected: Same as member count

# Check balances
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT SUM(balance::numeric) FROM capital_accounts;"
```

**Checklist:**
- [ ] Capital accounts imported
- [ ] One capital account per member
- [ ] Total balance correct

### 4.4 Validate Data

```bash
# Run validation script
docker compose -f docker-compose.prod.yml exec api \
  tsx migrations/data/validate_migration.ts

# Expected output:
# ✓ All validation checks passed
```

**Checklist:**
- [ ] All validation checks passed
- [ ] No orphaned records
- [ ] No negative balances
- [ ] All foreign keys valid

---

## Phase 5: Integration Verification

### 5.1 API Health Check

```bash
# Internal health check (from server)
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"..."}

# External health check (from your machine)
curl https://habitat.eth/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Checklist:**
- [ ] API health endpoint responding (internal)
- [ ] API health endpoint responding (external via HTTPS)

### 5.2 GraphQL Endpoint

```bash
# Test GraphQL endpoint
curl -X POST https://habitat.eth/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Expected: {"data":{"__typename":"Query"}}
```

**Checklist:**
- [ ] GraphQL endpoint responding
- [ ] No CORS errors

### 5.3 UI Accessibility

```bash
# Check UI homepage
curl -I https://habitat.eth
# Expected: HTTP/2 200

# Check login page
curl -I https://habitat.eth/login
# Expected: HTTP/2 200
```

**Checklist:**
- [ ] UI homepage accessible
- [ ] Login page accessible
- [ ] HTTPS working (no certificate errors)

### 5.4 TLS Certificate

```bash
# Check certificate
echo | openssl s_client -connect habitat.eth:443 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# Expected:
# notBefore and notAfter dates valid
# subject=CN=habitat.eth
# issuer contains "Let's Encrypt"
```

**Checklist:**
- [ ] TLS certificate valid
- [ ] Certificate issued by Let's Encrypt
- [ ] Certificate not expired
- [ ] HTTPS redirect working (HTTP → HTTPS)

### 5.5 Database Connectivity

```bash
# Test database connection from API
docker compose -f docker-compose.prod.yml exec api node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1').then(() => console.log('✓ Database connected')).catch(console.error).finally(() => pool.end());
"
# Expected: ✓ Database connected
```

**Checklist:**
- [ ] API can connect to database
- [ ] No connection pool errors

### 5.6 Event Bus Connectivity

```bash
# Check RabbitMQ status
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status
# Expected: Status output with "running" state

# Check queues
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl list_queues
# Expected: List of queues (may be empty initially)
```

**Checklist:**
- [ ] RabbitMQ running
- [ ] Worker can connect to RabbitMQ
- [ ] No connection errors in worker logs

---

## Phase 6: Smoke Testing

### 6.1 Test: Member Login

**Manual test from browser:**

1. Navigate to https://habitat.eth/login
2. Enter admin credentials (from imported data)
3. Click "Login"
4. Verify redirect to /dashboard

**Expected result:**
- Login successful
- Dashboard loads
- Member name displayed
- Capital account balance displayed

**Checklist:**
- [ ] Admin can log in
- [ ] Dashboard displays correctly
- [ ] Member data shows correctly

### 6.2 Test: Submit Contribution

**Manual test from browser:**

1. Log in as admin
2. Navigate to /contributions/new
3. Fill form:
   - Type: Labor
   - Amount: 100.00
   - Description: "Test contribution for production deployment"
4. Submit
5. Verify redirect to /contributions
6. Verify contribution appears with "Pending" status

**Expected result:**
- Form submission successful
- Contribution appears in list
- Status is "Pending"

**Checklist:**
- [ ] Contribution form works
- [ ] Contribution saved to database
- [ ] Contribution appears in list

### 6.3 Test: Event Processing

**Verify from server:**

```bash
# Wait 5 seconds for event processing
sleep 5

# Check worker logs for event processing
docker compose -f docker-compose.prod.yml logs worker | grep "Event processed"
# Expected: See "contribution.submitted" event processed

# Check processed_events table
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM processed_events WHERE status = 'success';"
# Expected: At least 1
```

**Checklist:**
- [ ] Worker processing events
- [ ] Events recorded in processed_events table
- [ ] No failed events

### 6.4 Test: Approval Workflow (as Steward)

**Manual test from browser:**

1. Log out
2. Log in as steward (from imported data)
3. Navigate to /approvals
4. Find test contribution
5. Click "Approve"
6. Confirm approval
7. Verify contribution status changes to "Approved"

**Expected result:**
- Approval page loads
- Test contribution appears
- Approval successful
- Status updates to "Approved"

**Checklist:**
- [ ] Steward can access approval page
- [ ] Contributions appear in queue
- [ ] Approval workflow works
- [ ] Status updates correctly

### 6.5 Test: Real-Time Updates

**Manual test from browser:**

1. Log back in as admin
2. Navigate to /contributions
3. Leave page open
4. (In another tab/browser) Log in as steward
5. Approve another contribution
6. Switch back to admin's contributions page
7. Wait 15 seconds (polling interval)
8. Verify status updates automatically

**Expected result:**
- Status updates without page refresh
- Toast notification appears (if implemented)

**Checklist:**
- [ ] Polling working
- [ ] Status updates automatically
- [ ] No JavaScript errors in console

### 6.6 Test: Member Dashboard

**Manual test from browser:**

1. Log in as regular member (not admin/steward)
2. View dashboard
3. Verify:
   - Capital account balance displayed
   - Contribution history displayed
   - Allocation history displayed (if any)

**Expected result:**
- Dashboard loads correctly
- Data accurate
- No 403 errors

**Checklist:**
- [ ] Member can view dashboard
- [ ] Capital account shows correct balance
- [ ] Contribution history shows correctly

---

## Phase 7: Go-Live

### 7.1 Final Verification

```bash
# Run all health checks
./scripts/health-check-all.sh

# Expected: All checks pass
```

**Manual checklist:**
- [ ] All services running
- [ ] All health checks passing
- [ ] Database has correct data
- [ ] Members can log in
- [ ] Contributions can be submitted
- [ ] Approvals work
- [ ] Events processing
- [ ] TLS certificate valid
- [ ] Backups scheduled
- [ ] Monitoring connected

### 7.2 Announce Deployment

**Notify team:**
- Production URL: https://habitat.eth
- Status: Live
- Test accounts removed (if any)
- Ready for real member onboarding

**Communication channels:**
- Slack/Discord: "🚀 Habitat production is live!"
- Email: Founding members with login instructions
- Documentation: Update URLs in README

### 7.3 Post-Deployment Monitoring

**First hour:**
- [ ] Monitor logs for errors every 15 minutes
- [ ] Check health endpoint every 15 minutes
- [ ] Monitor resource usage (htop, docker stats)

**First 24 hours:**
- [ ] Check logs hourly
- [ ] Monitor metrics dashboard
- [ ] Verify backups running (should run at 2 AM)
- [ ] Test disaster recovery procedure (off-peak)

**First week:**
- [ ] Daily log review
- [ ] Daily health check
- [ ] Member feedback collection
- [ ] Performance monitoring
- [ ] Capacity planning review

---

## Rollback Procedure

If critical issues occur during deployment:

### Rollback Steps

1. **Stop services:**
   ```bash
   docker compose -f docker-compose.prod.yml stop
   ```

2. **Restore database from backup:**
   ```bash
   gunzip < /var/backups/habitat/habitat_YYYYMMDD_HHMMSS.sql.gz | \
     docker compose -f docker-compose.prod.yml exec -T postgres \
     psql -U habitat -d habitat
   ```

3. **Checkout previous version:**
   ```bash
   git checkout <PREVIOUS_COMMIT>
   docker compose -f docker-compose.prod.yml build
   ```

4. **Restart services:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

5. **Verify rollback:**
   ```bash
   curl https://habitat.eth/health
   ```

---

## Troubleshooting

### Service Won't Start

**Symptoms:**
- Container exits immediately
- "Unhealthy" status

**Solutions:**
1. Check logs: `docker compose logs <service>`
2. Check environment variables: `docker compose config`
3. Check disk space: `df -h`
4. Check memory: `free -h`

### Database Migration Fails

**Symptoms:**
- Migration script errors
- "relation already exists" errors

**Solutions:**
1. Check if migrations already applied: `SELECT * FROM schema_migrations;`
2. Manually fix failed migration
3. Mark migration as applied if already done
4. Re-run migration script

### Can't Access UI

**Symptoms:**
- 502 Bad Gateway
- Connection refused

**Solutions:**
1. Check Caddy logs: `docker compose logs caddy`
2. Check UI container running: `docker ps | grep ui`
3. Check DNS resolution: `dig habitat.eth +short`
4. Check firewall: `sudo ufw status`

### TLS Certificate Not Obtained

**Symptoms:**
- "Certificate error" in browser
- "acme: error" in Caddy logs

**Solutions:**
1. Verify DNS: `dig habitat.eth +short` (must return server IP)
2. Verify port 80 open: `nc -zv <SERVER_IP> 80`
3. Check Caddy logs: `docker compose logs caddy | grep acme`
4. Manually trigger: `docker compose exec caddy caddy reload`

---

## Success Criteria

Deployment is successful when:

✅ **Services:**
- All 6 containers running and healthy
- No critical errors in logs
- Resource usage normal (<70% CPU, <80% RAM)

✅ **Database:**
- Migrations applied
- Schema correct (~15 tables)
- Data loaded (members, capital accounts, period)
- No orphaned records

✅ **Integration:**
- API health endpoint responds
- GraphQL endpoint works
- UI accessible
- TLS certificate valid
- Events processing

✅ **Functionality:**
- Admin can log in
- Member can log in
- Steward can log in
- Contributions can be submitted
- Approvals work
- Real-time updates work
- Dashboard displays correctly

✅ **Monitoring:**
- Prometheus collecting metrics
- Grafana displaying dashboards (if configured)
- Uptime monitoring active
- Backups scheduled

✅ **Documentation:**
- Production URLs updated
- Team notified
- Onboarding guide ready

---

## Post-Deployment Checklist

### Immediate (within 1 hour)

- [ ] All health checks passing
- [ ] All founding members notified
- [ ] Monitoring dashboards working
- [ ] Logs clean (no critical errors)
- [ ] Resource usage normal

### First Day

- [ ] Backup completed successfully (check at 2 AM next day)
- [ ] All members can log in
- [ ] Test contribution submitted and approved
- [ ] Performance metrics within targets (P95 < 500ms)
- [ ] No security incidents

### First Week

- [ ] All founding members onboarded
- [ ] At least one real contribution submitted per member
- [ ] Period progressing toward Q1 2026 close
- [ ] Weekly backup verified
- [ ] Disaster recovery tested (off-peak)
- [ ] Capacity planning reviewed

---

**Deployment Checklist Version:** 1.0.0  
**Last Updated:** 2026-02-10  
**Next Review:** After Sprint 116 (post-production review)
