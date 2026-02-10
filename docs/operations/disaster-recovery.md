# Disaster Recovery Runbook

## Overview

Procedures for recovering Habitat from catastrophic failures, including complete server loss, data corruption, and security incidents.

## Disaster Scenarios

1. Complete server failure
2. Database corruption
3. Data center outage
4. Ransomware/security breach
5. Accidental data deletion
6. Application failure

## Recovery Time Objectives (RTO)

- **Critical (Production):** 4 hours
- **High (Staging):** 24 hours
- **Low (Development):** 72 hours

## Recovery Point Objectives (RPO)

- **Database:** 24 hours (daily backup)
- **Volumes:** 7 days (weekly backup)
- **Configuration:** As of last deployment

## Pre-Disaster Preparation

### 1. Maintain Current Backups

```bash
# Verify daily backup ran
ls -lh backups/db-$(date +%Y%m%d)*.dump

# Verify off-site backup exists
aws s3 ls s3://habitat-backups/db/ --recursive | tail
```

### 2. Document Infrastructure

Keep updated documentation in secure location:
- Server IP addresses and credentials
- DNS configuration
- SSL certificate locations
- Third-party service credentials
- Database connection strings
- API keys and secrets

### 3. Test Disaster Recovery

**Quarterly DR Test:**
```bash
# 1. Provision new server
# 2. Install Docker
# 3. Clone repository
# 4. Restore from backup
# 5. Verify functionality
# 6. Document time and issues
```

## Disaster Response

### Phase 1: Assessment (0-30 minutes)

1. **Identify the disaster type**
   - Server failure?
   - Data corruption?
   - Security breach?
   - Human error?

2. **Assess impact**
   - Is production down?
   - Is data lost?
   - Are backups intact?

3. **Communicate**
   - Notify stakeholders
   - Post status update
   - Establish incident channel

4. **Activate DR plan**
   - Assign incident commander
   - Assemble response team
   - Set up war room (Slack/Discord)

### Phase 2: Containment (30-60 minutes)

**For Security Breach:**
```bash
# Immediately revoke all access
docker compose -f docker-compose.prod.yml down

# Change all passwords
# Rotate all API keys and secrets
# Review access logs for compromise
```

**For Data Corruption:**
```bash
# Stop writes to prevent further corruption
docker compose -f docker-compose.prod.yml stop api worker

# Keep database running for investigation
docker compose -f docker-compose.prod.yml ps postgres
```

### Phase 3: Recovery (1-4 hours)

#### Scenario A: Complete Server Failure

**Objective:** Rebuild on new server

```bash
# 1. Provision new server
# Ubuntu 22.04, 4GB RAM, 50GB disk

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# 3. Clone repository
git clone https://github.com/habitat/habitat.git /opt/habitat
cd /opt/habitat

# 4. Restore configuration
# Download .env from secure location
gpg --decrypt backups/config/.env.gpg > .env

# 5. Restore database backup
# Download latest backup from S3
aws s3 cp s3://habitat-backups/db/latest.dump /tmp/

# 6. Start services
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to be ready
sleep 10

# 7. Restore database
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean --if-exists < /tmp/latest.dump

# 8. Start remaining services
docker compose -f docker-compose.prod.yml up -d

# 9. Verify health
docker compose -f docker-compose.prod.yml ps
curl -f https://habitat.example.com/api/health

# 10. Update DNS (if IP changed)
# Point habitat.example.com to new IP
```

**Time Estimate:** 2-3 hours

#### Scenario B: Database Corruption

**Objective:** Restore database from backup

```bash
# 1. Stop application services
docker compose -f docker-compose.prod.yml stop api worker ui

# 2. Backup corrupted database (for investigation)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > backups/corrupted-$(date +%Y%m%d-%H%M%S).dump

# 3. Drop and recreate database
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -c "DROP DATABASE habitat;"
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -c "CREATE DATABASE habitat;"

# 4. Restore from latest good backup
LATEST_BACKUP=$(ls -t backups/db-*.dump | head -1)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat < $LATEST_BACKUP

# 5. Verify data integrity
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM members;"

# 6. Run migrations (if needed)
docker compose -f docker-compose.prod.yml run --rm api npm run migrate

# 7. Restart services
docker compose -f docker-compose.prod.yml start api worker ui

# 8. Verify application
curl -f https://habitat.example.com/api/health
```

**Time Estimate:** 1-2 hours

#### Scenario C: Ransomware Attack

**Objective:** Restore from clean backup, secure system

```bash
# 1. Immediately isolate affected systems
# Disconnect from network
# Block all external access at firewall

# 2. Do NOT pay ransom

# 3. Preserve evidence
# Take disk snapshots if possible
# Save logs for forensic analysis

# 4. Provision new clean server
# Fresh OS install, no restore of infected system

# 5. Restore from backup dated BEFORE infection
# Use backup from 1 week ago if needed
aws s3 cp s3://habitat-backups/db/db-20260203.dump /tmp/

# 6. Rebuild application from source
git clone https://github.com/habitat/habitat.git
cd habitat
docker compose -f docker-compose.prod.yml build --no-cache

# 7. Restore database
docker compose -f docker-compose.prod.yml up -d postgres
sleep 10
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat < /tmp/db-20260203.dump

# 8. Rotate ALL credentials
# New passwords for all users
# New API keys
# New JWT secrets
# New database passwords
# New SSH keys

# 9. Start services with new credentials
docker compose -f docker-compose.prod.yml up -d

# 10. Monitor for re-infection
# Check logs continuously
# Review all file modifications
# Scan with antivirus/antimalware
```

**Time Estimate:** 4-8 hours

#### Scenario D: Accidental Data Deletion

**Objective:** Restore deleted data

```bash
# 1. Immediately stop all writes
docker compose -f docker-compose.prod.yml stop api worker

# 2. Identify what was deleted and when
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT * FROM audit_log WHERE action = 'DELETE' ORDER BY created_at DESC LIMIT 100;"

# 3. Find backup from before deletion
# If deleted 2 hours ago, use backup from 6 hours ago
BACKUP_FILE="backups/db-20260210-020000.dump"

# 4. Restore to temporary database
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -c "CREATE DATABASE habitat_restore;"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat_restore < $BACKUP_FILE

# 5. Extract deleted records
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat_restore -c "COPY (SELECT * FROM contributions WHERE id IN ('...')) TO '/tmp/deleted-contributions.csv' CSV HEADER;"

# 6. Import into production
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "COPY contributions FROM '/tmp/deleted-contributions.csv' CSV HEADER;"

# 7. Verify restoration
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM contributions;"

# 8. Restart services
docker compose -f docker-compose.prod.yml start api worker
```

**Time Estimate:** 1-2 hours

### Phase 4: Verification (15-30 minutes)

**Checklist:**

```bash
# 1. All services running
docker compose -f docker-compose.prod.yml ps

# 2. Health checks passing
curl -f https://habitat.example.com/api/health

# 3. Database accessible
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT 1;"

# 4. Recent data present
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT MAX(created_at) FROM contributions;"

# 5. Authentication working
# Test login via UI

# 6. Contributions working
# Submit test contribution

# 7. Approvals working
# Approve test contribution

# 8. Monitoring operational
# Check Prometheus, Grafana

# 9. Alerts configured
# Verify alertmanager rules

# 10. Backups scheduled
crontab -l | grep backup
```

### Phase 5: Communication (ongoing)

**Status Updates:**

- **Initial:** "We are aware of an incident and investigating"
- **During recovery:** "Recovery in progress, estimated completion: [time]"
- **Completion:** "Services restored, investigating root cause"
- **Post-mortem:** "Full incident report: [link]"

**Channels:**
- Status page
- Email to stakeholders
- Discord/Slack announcement
- GitHub issue (if appropriate)

## Post-Disaster

### 1. Write Post-Mortem

**Template:**

```markdown
# Incident Post-Mortem: [Date]

## Summary
Brief description of what happened

## Timeline
- HH:MM - First indication of problem
- HH:MM - Incident declared
- HH:MM - Root cause identified
- HH:MM - Recovery started
- HH:MM - Services restored
- HH:MM - Incident closed

## Root Cause
Detailed explanation of what caused the incident

## Impact
- Downtime: X hours
- Data loss: None / X records
- Affected users: X
- Financial impact: $X

## What Went Well
- Quick detection
- Backups were current
- Team coordination

## What Went Poorly
- Delayed response
- Missing documentation
- Unclear responsibilities

## Action Items
- [ ] Update backup retention policy
- [ ] Add monitoring for [X]
- [ ] Document [Y] procedure
- [ ] Train team on [Z]

## Lessons Learned
Key takeaways for future incidents
```

### 2. Update Runbooks

Based on lessons learned, update:
- This disaster recovery runbook
- Backup procedures
- Monitoring alerts
- On-call documentation

### 3. Improve Prevention

- Add monitoring for failure indicators
- Automate backup verification
- Implement redundancy
- Schedule DR drills

## Appendix

### Emergency Contacts

- **Incident Commander:** [name, phone, email]
- **DevOps Lead:** [name, phone, email]
- **Database Admin:** [name, phone, email]
- **Security Lead:** [name, phone, email]
- **CEO/Stakeholder:** [name, phone, email]

### External Services

- **DNS Provider:** [Cloudflare login]
- **Cloud Provider:** [AWS console, support]
- **Backup Storage:** [S3 bucket, credentials]
- **SSL Certificates:** [Let's Encrypt, renewal process]

### Quick Reference Commands

```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Start only database
docker compose -f docker-compose.prod.yml up -d postgres

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check disk space
df -h

# Check memory
free -h

# Check network
netstat -tulpn

# Check processes
docker compose -f docker-compose.prod.yml ps
```
