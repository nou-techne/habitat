# Troubleshooting Decision Tree

## Overview

Systematic approach to diagnosing and resolving issues in Habitat production environment.

## Quick Health Check

```bash
# Run full health check
./scripts/health-check.sh

# Or manually:
docker compose -f docker-compose.prod.yml ps
curl -f https://habitat.example.com/api/health
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -c "SELECT 1;"
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status
```

## Decision Tree

```
START: Is the site accessible?
│
├─ NO → [Site Down](#site-completely-down)
│
└─ YES → Is the site slow?
    │
    ├─ YES → [Performance Issues](#site-slow-or-degraded)
    │
    └─ NO → Are there errors?
        │
        ├─ YES → [Application Errors](#application-errors)
        │
        └─ NO → [Specific Feature Issues](#feature-specific-issues)
```

---

## Site Completely Down

### Symptom

- Browser shows "Site can't be reached"
- curl times out
- No response from server

### Diagnosis Steps

1. **Check if server is reachable**
   ```bash
   ping habitat.example.com
   ```
   
   **If ping fails:**
   - Server is down or network issue
   - Check with hosting provider
   - Check DNS: `dig habitat.example.com`

2. **Check if services are running**
   ```bash
   ssh user@habitat-server
   docker compose -f docker-compose.prod.yml ps
   ```
   
   **If services are down:**
   - Check Docker daemon: `systemctl status docker`
   - Check disk space: `df -h`
   - Check logs: `docker compose logs --tail=100`

3. **Check Caddy (reverse proxy)**
   ```bash
   docker compose -f docker-compose.prod.yml ps caddy
   docker compose -f docker-compose.prod.yml logs caddy --tail=50
   ```
   
   **If Caddy is down:**
   ```bash
   docker compose -f docker-compose.prod.yml restart caddy
   ```

4. **Check SSL certificate**
   ```bash
   echo | openssl s_client -servername habitat.example.com -connect habitat.example.com:443 2>/dev/null | openssl x509 -noout -dates
   ```
   
   **If certificate expired:**
   - See [SSL Certificate Renewal](./ssl-certificate-renewal.md)

### Resolution

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# If that doesn't work, full restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Verify health
curl -f https://habitat.example.com/api/health
```

---

## Site Slow or Degraded

### Symptom

- Pages load slowly (>5 seconds)
- API requests timeout
- Intermittent errors

### Diagnosis Steps

1. **Check system resources**
   ```bash
   # CPU usage
   top -bn1 | grep "Cpu(s)"
   
   # Memory usage
   free -h
   
   # Disk usage
   df -h
   
   # Docker resources
   docker stats --no-stream
   ```
   
   **High CPU/Memory:**
   - Identify resource-hungry container
   - Scale horizontally or vertically
   - See [Scaling Guide](./scaling.md)

2. **Check database performance**
   ```bash
   # Active connections
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U habitat -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
   
   # Long-running queries
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U habitat -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%' ORDER BY duration DESC LIMIT 5;"
   ```
   
   **Slow queries identified:**
   ```bash
   # Kill long-running query
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U habitat -c "SELECT pg_terminate_backend(PID);"
   
   # Add missing indexes
   # Review query plan: EXPLAIN ANALYZE <query>
   ```

3. **Check queue depth**
   ```bash
   docker compose -f docker-compose.prod.yml exec rabbitmq \
     rabbitmqctl list_queues name messages consumers
   ```
   
   **Queue depth growing:**
   - Scale workers: `docker compose up -d --scale worker=5`
   - Check worker health: `docker compose logs worker`
   - See [Event Replay](./event-replay.md) if workers stuck

4. **Check API latency**
   ```bash
   # Prometheus query
   curl 'http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))'
   ```
   
   **High latency identified:**
   - Check logs for specific slow endpoints
   - Scale API servers if needed
   - Review database query performance

### Resolution

```bash
# Quick fixes

# 1. Restart slow service
docker compose -f docker-compose.prod.yml restart api

# 2. Scale workers to handle backlog
docker compose -f docker-compose.prod.yml up -d --scale worker=5

# 3. Clear connection pool (if database connections maxed)
docker compose -f docker-compose.prod.yml restart api

# 4. Free up resources
docker system prune -a  # Removes unused images/containers
```

---

## Application Errors

### Symptom

- 500 Internal Server Error
- GraphQL errors
- Database connection errors
- Authentication failures

### Diagnosis Steps

1. **Check application logs**
   ```bash
   # API logs
   docker compose -f docker-compose.prod.yml logs api --tail=100 | grep -i error
   
   # Worker logs
   docker compose -f docker-compose.prod.yml logs worker --tail=100 | grep -i error
   
   # Follow live errors
   docker compose -f docker-compose.prod.yml logs -f api worker | grep -i error
   ```

2. **Check error rate metrics**
   ```bash
   # Prometheus query
   curl 'http://localhost:9090/api/v1/query?query=rate(http_request_errors_total[5m])'
   ```

3. **Identify error pattern**
   - All requests failing? → Database/RabbitMQ connection issue
   - Specific endpoint failing? → Code bug or missing data
   - Random errors? → Resource exhaustion or race condition

### Common Errors

#### Database Connection Error

```
Error: connect ECONNREFUSED postgres:5432
```

**Solution:**
```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check connection from API
docker compose -f docker-compose.prod.yml exec api \
  nc -zv postgres 5432

# Restart PostgreSQL if needed
docker compose -f docker-compose.prod.yml restart postgres

# Restart API to reconnect
docker compose -f docker-compose.prod.yml restart api
```

#### RabbitMQ Connection Error

```
Error: Channel closed by server: 406 (PRECONDITION-FAILED)
```

**Solution:**
```bash
# Check RabbitMQ status
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status

# Check queue configuration
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues

# Restart RabbitMQ if needed
docker compose -f docker-compose.prod.yml restart rabbitmq

# Restart worker to reconnect
docker compose -f docker-compose.prod.yml restart worker
```

#### JWT Verification Failed

```
Error: JsonWebTokenError: invalid signature
```

**Solution:**
```bash
# Check JWT_SECRET is set correctly
docker compose -f docker-compose.prod.yml exec api env | grep JWT_SECRET

# If changed, update .env and restart
docker compose -f docker-compose.prod.yml restart api

# All users will need to log in again
```

#### Out of Memory

```
Error: JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
# Edit docker-compose.prod.yml:
services:
  api:
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096

# Restart service
docker compose -f docker-compose.prod.yml up -d api
```

---

## Feature-Specific Issues

### Contributions Not Submitting

**Diagnosis:**
```bash
# Check API logs
docker compose -f docker-compose.prod.yml logs api | grep "SubmitContribution"

# Check database
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT status, COUNT(*) FROM contributions GROUP BY status;"

# Check recent contributions
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT id, status, created_at FROM contributions ORDER BY created_at DESC LIMIT 10;"
```

**Resolution:**
```bash
# If validation error, check schema constraints
# If database error, check logs
# If network error, check API connectivity
```

### Approvals Not Working

**Diagnosis:**
```bash
# Check approver role
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT id, email, role FROM members WHERE role IN ('steward', 'admin');"

# Check approval workflow
docker compose -f docker-compose.prod.yml logs worker | grep "approval"
```

### Allocations Not Calculating

**Diagnosis:**
```bash
# Check period status
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT id, status, start_date, end_date FROM allocation_periods ORDER BY start_date DESC LIMIT 5;"

# Check worker processing
docker compose -f docker-compose.prod.yml logs worker | grep "allocation"

# Check event queue
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues name messages
```

**Resolution:**
```bash
# If period not closed, close manually
# See Event Replay runbook

# If workflow failed, replay events
# See Event Replay runbook
```

### Emails Not Sending

**Diagnosis:**
```bash
# Check SMTP configuration
docker compose -f docker-compose.prod.yml exec api env | grep SMTP

# Check email logs
docker compose -f docker-compose.prod.yml logs api | grep -i email
```

**Resolution:**
```bash
# Verify SMTP credentials
# Test with manual send
# Check spam folders
```

---

## Emergency Procedures

### Total System Failure

```bash
# 1. Assess situation
docker compose -f docker-compose.prod.yml ps
df -h
docker logs $(docker ps -aq) --tail=50

# 2. Attempt restart
docker compose -f docker-compose.prod.yml restart

# 3. If restart fails, restore from backup
# See Disaster Recovery runbook

# 4. Notify stakeholders
# Post status update

# 5. Investigate root cause
# Review logs, metrics, recent changes
```

### Data Corruption Detected

```bash
# 1. STOP WRITES IMMEDIATELY
docker compose -f docker-compose.prod.yml stop api worker

# 2. Backup current state
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > backups/corrupted-$(date +%Y%m%d-%H%M%S).dump

# 3. Assess extent of corruption
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT * FROM <table> WHERE <corruption_check>;"

# 4. Restore from last known good backup
# See Disaster Recovery runbook

# 5. Document incident
# Write post-mortem
```

### Security Breach Suspected

```bash
# 1. ISOLATE IMMEDIATELY
docker compose -f docker-compose.prod.yml down

# 2. Preserve evidence
# Snapshot volumes
# Save logs

# 3. Rotate ALL credentials
# Database passwords
# API keys
# JWT secrets
# SSH keys

# 4. Investigate breach
# Review access logs
# Check for unauthorized access
# Scan for malware

# 5. Rebuild from clean backup
# See Disaster Recovery runbook

# 6. Report if required
# Notify affected users
# Report to authorities if PII compromised
```

---

## Diagnostic Commands Cheat Sheet

```bash
# System Health
docker compose -f docker-compose.prod.yml ps
docker stats --no-stream
df -h
free -h
top -bn1

# Service Logs
docker compose -f docker-compose.prod.yml logs api --tail=100
docker compose -f docker-compose.prod.yml logs worker --tail=100
docker compose -f docker-compose.prod.yml logs postgres --tail=100
docker compose -f docker-compose.prod.yml logs rabbitmq --tail=100

# Database
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -c "SELECT COUNT(*) FROM pg_stat_activity;"
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -c "SELECT * FROM pg_stat_database WHERE datname='habitat';"

# Queue
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl list_queues name messages consumers
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status

# Network
curl -I https://habitat.example.com
curl -f https://habitat.example.com/api/health
nc -zv habitat.example.com 443

# Metrics
curl http://localhost:9090/api/v1/query?query=up
curl http://localhost:4000/metrics
```

---

## Getting Help

When filing issues or asking for help, include:

1. **Symptom description**
   - What's broken?
   - When did it start?
   - What changed recently?

2. **Diagnostic output**
   ```bash
   docker compose ps
   docker compose logs --tail=100 api
   curl -v https://habitat.example.com/api/health
   ```

3. **System information**
   - Habitat version
   - Docker version
   - Operating system
   - Resource allocation

4. **Steps to reproduce**
   - Exact sequence to trigger issue
   - Expected vs actual behavior

5. **Attempted solutions**
   - What have you tried?
   - What was the result?

**Support Channels:**
- Documentation: https://docs.habitat.eth
- GitHub Issues: https://github.com/habitat/habitat/issues
- Discord: https://discord.gg/habitat
- Emergency: [on-call contact]
