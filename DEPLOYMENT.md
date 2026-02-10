# Habitat Patronage System - Deployment Guide

**Version:** 1.0.0-rc1  
**Target Environment:** Staging (staging.habitat.eth)  
**Production Target:** March 31, 2026 (Techne/RegenHub Q1 2026 allocation)

---

## Overview

This guide covers deploying Habitat to staging and production environments using Docker Compose with health checks, monitoring, and TLS.

**Architecture:**
- PostgreSQL (database)
- RabbitMQ (event bus)
- API (GraphQL server)
- Worker (event processor)
- UI (Next.js frontend)
- Caddy (reverse proxy with automatic TLS)

---

## Prerequisites

### Server Requirements

**Minimum (Staging):**
- 2 vCPU
- 4 GB RAM
- 40 GB storage
- Ubuntu 22.04 LTS

**Recommended (Production):**
- 4 vCPU
- 8 GB RAM
- 100 GB storage
- Ubuntu 22.04 LTS

### Software Requirements

- Docker Engine 24.0+
- Docker Compose 2.20+
- Git

### Domain Setup

**Staging:** `staging.habitat.eth` (or subdomain)
- DNS A record pointing to server IP
- Port 80 (HTTP) open for Let's Encrypt verification
- Port 443 (HTTPS) open for application traffic

**Production:** `habitat.eth` (or production domain)

---

## Quick Start (Staging)

```bash
# 1. Clone repository
git clone https://github.com/nou-techne/habitat.git
cd habitat

# 2. Copy environment files
cp packages/api/.env.example packages/api/.env
cp packages/worker/.env.example packages/worker/.env
cp ui/.env.example ui/.env

# 3. Configure environment variables (see below)
nano packages/api/.env
nano packages/worker/.env
nano ui/.env

# 4. Start services
docker-compose -f docker-compose.prod.yml up -d

# 5. Run database migrations
docker-compose -f docker-compose.prod.yml exec api pnpm db:migrate

# 6. Seed test data
docker-compose -f docker-compose.prod.yml exec api pnpm db:seed

# 7. Check health
curl https://staging.habitat.eth/health
```

---

## Environment Configuration

### API Environment (packages/api/.env)

```env
# Database
DATABASE_URL=postgres://habitat:CHANGE_ME@postgres:5432/habitat

# RabbitMQ
RABBITMQ_URL=amqp://habitat:CHANGE_ME@rabbitmq:5672

# Server
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# JWT
JWT_SECRET=CHANGE_ME_LONG_RANDOM_STRING
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://staging.habitat.eth

# Monitoring
PROMETHEUS_PORT=9090
```

### Worker Environment (packages/worker/.env)

```env
# Database
DATABASE_URL=postgres://habitat:CHANGE_ME@postgres:5432/habitat

# RabbitMQ
RABBITMQ_URL=amqp://habitat:CHANGE_ME@rabbitmq:5672

# Worker
NODE_ENV=production
WORKER_CONCURRENCY=5

# Monitoring
PROMETHEUS_PORT=9091
```

### UI Environment (ui/.env)

```env
# API
NEXT_PUBLIC_API_URL=https://staging.habitat.eth/api
NEXT_PUBLIC_GRAPHQL_URL=https://staging.habitat.eth/graphql

# Environment
NODE_ENV=production
```

### Docker Compose Environment (.env)

```env
# PostgreSQL
POSTGRES_USER=habitat
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=habitat

# RabbitMQ
RABBITMQ_DEFAULT_USER=habitat
RABBITMQ_DEFAULT_PASS=CHANGE_ME

# Domain
DOMAIN=staging.habitat.eth
EMAIL=admin@habitat.eth
```

---

## Deployment Steps

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/nou-techne/habitat.git
cd habitat

# Create .env files from examples
cp packages/api/.env.example packages/api/.env
cp packages/worker/.env.example packages/worker/.env
cp ui/.env.example ui/.env
cp .env.example .env

# Generate secrets
# JWT_SECRET (64 characters)
openssl rand -hex 32

# POSTGRES_PASSWORD (32 characters)
openssl rand -hex 16

# RABBITMQ_DEFAULT_PASS (32 characters)
openssl rand -hex 16

# Edit environment files with generated secrets
nano .env
nano packages/api/.env
nano packages/worker/.env
nano ui/.env
```

### Step 3: Build Images

```bash
# Build all images
docker compose -f docker-compose.prod.yml build

# Verify images
docker images | grep habitat
```

### Step 4: Start Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 5: Database Setup

```bash
# Wait for PostgreSQL to be ready
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U habitat

# Run migrations
docker compose -f docker-compose.prod.yml exec api pnpm db:migrate

# Verify schema
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "\dt"
```

### Step 6: Seed Data (Staging Only)

```bash
# Seed test data
docker compose -f docker-compose.prod.yml exec api pnpm db:seed

# Verify seed data
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "SELECT COUNT(*) FROM members;"
```

### Step 7: Health Checks

```bash
# Check API health
curl https://staging.habitat.eth/health

# Check GraphQL endpoint
curl -X POST https://staging.habitat.eth/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Check UI
curl -I https://staging.habitat.eth

# Check Prometheus metrics
curl https://staging.habitat.eth/metrics

# Check all services
docker compose -f docker-compose.prod.yml exec api node -e "console.log('API OK')"
docker compose -f docker-compose.prod.yml exec worker node -e "console.log('Worker OK')"
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U habitat
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status
```

---

## Service Health Verification

### PostgreSQL

```bash
# Check connection
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "SELECT 1;"

# Check table count
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "\dt" | wc -l

# Expected: ~15 tables
```

### RabbitMQ

```bash
# Check status
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status

# Check queues
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl list_queues

# Web UI (if enabled)
# http://SERVER_IP:15672
# Username: habitat
# Password: (from RABBITMQ_DEFAULT_PASS)
```

### API

```bash
# Health endpoint
curl https://staging.habitat.eth/health
# Expected: {"status":"ok","timestamp":"..."}

# GraphQL introspection
curl -X POST https://staging.habitat.eth/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'

# Check metrics
curl https://staging.habitat.eth/metrics | grep http_requests_total
```

### Worker

```bash
# Check logs for event processing
docker compose -f docker-compose.prod.yml logs worker | grep "Event processed"

# Check Prometheus metrics
docker compose -f docker-compose.prod.yml exec worker curl localhost:9091/metrics | grep events_processed_total
```

### UI

```bash
# Check homepage
curl -I https://staging.habitat.eth
# Expected: 200 OK

# Check login page
curl -I https://staging.habitat.eth/login
# Expected: 200 OK

# Check static assets
curl -I https://staging.habitat.eth/_next/static/...
```

### Caddy

```bash
# Check TLS certificate
echo | openssl s_client -connect staging.habitat.eth:443 2>/dev/null | openssl x509 -noout -dates

# Check reverse proxy
curl -v https://staging.habitat.eth 2>&1 | grep "< HTTP"
# Expected: HTTP/2 200
```

---

## Monitoring

### Prometheus

Metrics available at:
- API: `https://staging.habitat.eth/metrics`
- Worker: Exposed on internal port 9091

**Key Metrics:**
- `http_request_duration_seconds` - API response times
- `http_requests_total` - Request count
- `http_errors_total` - Error count
- `db_pool_active_connections` - Database connections
- `events_processed_total` - Event processing count
- `events_failed_total` - Event failures

### Grafana

If Grafana is deployed:
- URL: `https://grafana.staging.habitat.eth`
- Dashboards: `monitoring/grafana/dashboards/`
- Alerts: `monitoring/alerts/`

### Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api

# Filter by level
docker compose -f docker-compose.prod.yml logs api | grep ERROR

# Tail last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

---

## Backup & Restore

### Database Backup

```bash
# Manual backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U habitat -d habitat > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (cron)
0 2 * * * cd /opt/habitat && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U habitat -d habitat | gzip > /var/backups/habitat/backup_$(date +\%Y\%m\%d).sql.gz
```

### Database Restore

```bash
# Restore from backup
cat backup_20260210_120000.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U habitat -d habitat
```

See `docs/operations/backup-restore.md` for detailed procedures.

---

## Updating

### Rolling Update

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker compose -f docker-compose.prod.yml build

# Restart services one by one (zero-downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps api
docker compose -f docker-compose.prod.yml up -d --no-deps worker
docker compose -f docker-compose.prod.yml up -d --no-deps ui

# Check health after each service
curl https://staging.habitat.eth/health
```

### Database Migration

```bash
# Run migrations
docker compose -f docker-compose.prod.yml exec api pnpm db:migrate

# Verify migration
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "\dt"
```

See `docs/operations/database-migration.md` for detailed procedures.

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
sudo systemctl status docker

# Check compose file syntax
docker compose -f docker-compose.prod.yml config

# Check port conflicts
sudo netstat -tlnp | grep -E ':(80|443|5432|5672|4000|3000)'

# Check disk space
df -h
```

### Database Connection Errors

```bash
# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres

# Check connection string
docker compose -f docker-compose.prod.yml exec api printenv DATABASE_URL

# Test connection
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "SELECT 1;"
```

### API Not Responding

```bash
# Check API logs
docker compose -f docker-compose.prod.yml logs api

# Check API container
docker compose -f docker-compose.prod.yml exec api node -v

# Check health endpoint directly
docker compose -f docker-compose.prod.yml exec api curl localhost:4000/health

# Check from host through Caddy
curl https://staging.habitat.eth/health
```

### TLS Certificate Issues

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy

# Check certificate
echo | openssl s_client -connect staging.habitat.eth:443 2>/dev/null | openssl x509 -noout -text

# Force certificate renewal
docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### Event Processing Stuck

```bash
# Check worker logs
docker compose -f docker-compose.prod.yml logs worker

# Check RabbitMQ queues
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl list_queues

# Check for dead letters
docker compose -f docker-compose.prod.yml exec postgres psql -U habitat -d habitat -c "SELECT * FROM processed_events WHERE status = 'error' ORDER BY processed_at DESC LIMIT 10;"

# Restart worker
docker compose -f docker-compose.prod.yml restart worker
```

See `docs/operations/troubleshooting.md` for complete guide.

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets generated with `openssl rand`
- [ ] `.env` files not committed to Git
- [ ] JWT_SECRET is unique and complex (64+ characters)
- [ ] Database password is strong (32+ characters)
- [ ] RabbitMQ password is strong (32+ characters)
- [ ] CORS_ORIGIN set to actual domain (not `*`)
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] SSH key-based auth enabled
- [ ] SSH password auth disabled
- [ ] Fail2ban installed and configured

### Post-Deployment

- [ ] TLS certificate obtained and valid
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Health endpoints responding
- [ ] Monitoring active
- [ ] Backups configured and tested
- [ ] Logs being collected
- [ ] Rate limiting active
- [ ] Database connections pooled
- [ ] Admin users created with strong passwords
- [ ] Test users removed (staging only)

---

## Staging Seed Data

### Test Users

**Member:**
- Email: `member@habitat.test`
- Password: `test123`
- Role: member

**Steward:**
- Email: `steward@habitat.test`
- Password: `test123`
- Role: steward

**Admin:**
- Email: `admin@habitat.test`
- Password: `test123`
- Role: admin

### Test Data

- 3 allocation periods (1 open, 1 closed, 1 calculated)
- 50 contributions (mix of pending, approved, rejected)
- 20 allocations (for closed period)
- 3 capital accounts (one per test user)

**Note:** Test users and data should be removed before production deployment.

---

## Production Deployment

### Pre-Production Checklist

- [ ] All staging tests pass
- [ ] Performance tests meet acceptance criteria
- [ ] Security audit complete
- [ ] Backup/restore procedures tested
- [ ] Disaster recovery plan documented
- [ ] Monitoring dashboards configured
- [ ] Alert rules configured
- [ ] Runbooks created for common issues
- [ ] Team trained on operations
- [ ] Rollback plan documented

### Production Differences from Staging

1. **Domain:** `habitat.eth` (not `staging.habitat.eth`)
2. **Seed Data:** Import real Techne/RegenHub data (see Sprint 110)
3. **Resources:** Higher CPU/RAM allocation
4. **Backups:** Automated daily backups with off-site storage
5. **Monitoring:** 24/7 alerting enabled
6. **Logging:** Long-term log retention (90 days)
7. **Rate Limiting:** Stricter limits
8. **Test Users:** Removed

### Production Migration

```bash
# 1. Export data from staging (if needed)
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U habitat -d habitat > staging_export.sql

# 2. Deploy to production
# (follow same steps as staging with production .env values)

# 3. Import real data (Sprint 110)
# Use data migration scripts (see MIGRATION.md)

# 4. Verify production deployment
# (run smoke tests)

# 5. Monitor for 24 hours before announcing
# (watch logs, metrics, alerts)
```

---

## Support

### Documentation

- Deployment: `DEPLOYMENT.md` (this file)
- Operations: `docs/operations/`
- Troubleshooting: `docs/operations/troubleshooting.md`
- Architecture: `README.md`

### Logs

```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f <service>
```

### Health Endpoints

- API: `https://staging.habitat.eth/health`
- Metrics: `https://staging.habitat.eth/metrics`
- GraphQL: `https://staging.habitat.eth/graphql`

### Emergency Procedures

See `docs/operations/disaster-recovery.md` for:
- Service failure recovery
- Database corruption recovery
- Data loss recovery
- Security breach response

---

**Deployment Guide Version:** 1.0.0-rc1  
**Last Updated:** 2026-02-10  
**Next Review:** After production deployment (Sprint 116)
