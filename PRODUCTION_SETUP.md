# Production Environment Setup

**Version:** 1.0.0  
**Target:** Production deployment for Techne/RegenHub Q1 2026 allocation (by March 31)  
**Environment:** habitat.eth (production domain)

---

## Overview

This guide covers provisioning the production infrastructure for the Habitat patronage accounting system, including:

- VPS provisioning and hardening
- DNS configuration
- TLS certificate setup (automatic via Caddy + Let's Encrypt)
- Database backup automation
- Monitoring and alerting
- Security hardening

**Production Architecture:**
```
Internet
  ↓ (HTTPS)
Caddy (reverse proxy, TLS termination)
  ↓
Next.js UI (port 3000)
Apollo Server API (port 4000)
  ↓
PostgreSQL (port 5432)
RabbitMQ (port 5672)
  ↓
Worker (event processor)
```

---

## Prerequisites

### Domain Requirements

**Production Domain:** `habitat.eth` (or `the-habitat.org`)

**DNS Records Required:**
```
A     habitat.eth              → <SERVER_IP>
A     www.habitat.eth          → <SERVER_IP>
AAAA  habitat.eth              → <SERVER_IPv6> (if available)
MX    habitat.eth              → mail.habitat.eth (if email needed)
TXT   habitat.eth              → (SPF/DKIM records if email needed)
```

**Verification:**
```bash
# Verify DNS propagation
dig habitat.eth +short
nslookup habitat.eth

# Should return server IP
```

### VPS Requirements

**Minimum Specifications:**
- **CPU:** 4 vCPU
- **RAM:** 8 GB
- **Storage:** 100 GB SSD
- **Network:** 5 TB transfer/month
- **OS:** Ubuntu 22.04 LTS

**Recommended Providers:**
- DigitalOcean (Droplet $48/month)
- Hetzner Cloud (CX31 €11.90/month)
- Linode (Dedicated 8GB $48/month)
- AWS EC2 (t3.large ~$60/month)

### Required Access

- Root or sudo access to server
- DNS management access
- Domain registrar access (for DNS changes)
- SSH key pair for secure access

---

## Step 1: VPS Provisioning

### 1.1 Create VPS

**DigitalOcean Example:**
```bash
# Via web UI or API
doctl compute droplet create habitat-prod \
  --size s-4vcpu-8gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --ssh-keys <YOUR_SSH_KEY_ID> \
  --enable-monitoring \
  --enable-private-networking
```

**Hetzner Example:**
```bash
# Via web UI or API
hcloud server create \
  --name habitat-prod \
  --type cx31 \
  --image ubuntu-22.04 \
  --location nbg1 \
  --ssh-key <YOUR_SSH_KEY>
```

### 1.2 Initial Server Setup

```bash
# SSH into server
ssh root@<SERVER_IP>

# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y \
  curl \
  git \
  vim \
  htop \
  ufw \
  fail2ban \
  unattended-upgrades

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades
```

### 1.3 Create Non-Root User

```bash
# Create habitat user
adduser habitat
usermod -aG sudo habitat

# Setup SSH for habitat user
mkdir -p /home/habitat/.ssh
cp /root/.ssh/authorized_keys /home/habitat/.ssh/
chown -R habitat:habitat /home/habitat/.ssh
chmod 700 /home/habitat/.ssh
chmod 600 /home/habitat/.ssh/authorized_keys

# Test SSH as habitat user (from local machine)
ssh habitat@<SERVER_IP>
```

---

## Step 2: Security Hardening

### 2.1 Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Verify status
ufw status
```

### 2.2 Configure SSH

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# X11Forwarding no
# AllowUsers habitat

# Restart SSH
sudo systemctl restart sshd
```

### 2.3 Configure Fail2Ban

```bash
# Create jail.local
sudo nano /etc/fail2ban/jail.local

# Add configuration:
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# Restart fail2ban
sudo systemctl restart fail2ban

# Check status
sudo fail2ban-client status sshd
```

### 2.4 Install and Configure Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add habitat user to docker group
sudo usermod -aG docker habitat

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker
```

---

## Step 3: DNS Configuration

### 3.1 Configure A Records

**In your DNS provider dashboard:**

```
Type: A
Name: @
Value: <SERVER_IP>
TTL: 3600

Type: A
Name: www
Value: <SERVER_IP>
TTL: 3600
```

### 3.2 Configure AAAA Records (IPv6, optional)

```
Type: AAAA
Name: @
Value: <SERVER_IPv6>
TTL: 3600
```

### 3.3 Verify DNS Propagation

```bash
# Check from multiple locations
dig habitat.eth @8.8.8.8 +short
dig habitat.eth @1.1.1.1 +short

# Check propagation globally
# https://www.whatsmydns.net/#A/habitat.eth

# Wait for full propagation (up to 48 hours, usually faster)
```

---

## Step 4: Application Deployment

### 4.1 Clone Repository

```bash
# As habitat user
cd /home/habitat
git clone https://github.com/nou-techne/habitat.git
cd habitat
```

### 4.2 Configure Environment

```bash
# Copy environment files
cp .env.example .env
cp packages/api/.env.example packages/api/.env
cp packages/worker/.env.example packages/worker/.env
cp ui/.env.example ui/.env

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
RABBITMQ_PASSWORD=$(openssl rand -hex 16)

# Update .env files with generated secrets
# Update DOMAIN to habitat.eth
# Update EMAIL to admin@habitat.eth (or your admin email)
```

### 4.3 Build and Start Services

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4.4 Run Database Migrations

```bash
# Wait for PostgreSQL to be ready
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U habitat

# Run migrations
docker compose -f docker-compose.prod.yml exec api pnpm db:migrate

# Verify migrations
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "\dt"
```

---

## Step 5: TLS Certificate Setup

### 5.1 Let's Encrypt via Caddy

**TLS is automatic with Caddy!**

Caddy automatically:
- Obtains certificates from Let's Encrypt
- Renews certificates before expiration
- Redirects HTTP to HTTPS

**Caddyfile configuration (already in repo):**
```
{DOMAIN} {
  reverse_proxy ui:3000
  
  handle /api/* {
    reverse_proxy api:4000
  }
  
  handle /graphql {
    reverse_proxy api:4000
  }
  
  handle /health {
    reverse_proxy api:4000
  }
  
  handle /metrics {
    reverse_proxy api:4000
  }
}
```

### 5.2 Verify TLS

```bash
# Wait for Caddy to obtain certificate (1-2 minutes)
sleep 120

# Check certificate
echo | openssl s_client -connect habitat.eth:443 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# Expected output:
# notBefore=... notAfter=...
# subject=CN=habitat.eth
# issuer=C=US, O=Let's Encrypt, CN=...

# Check HTTPS redirect
curl -I http://habitat.eth
# Expected: 301 Moved Permanently, Location: https://...

# Check HTTPS response
curl -I https://habitat.eth
# Expected: 200 OK
```

### 5.3 Test Security Headers

```bash
# Check security headers
curl -I https://habitat.eth

# Should include:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

---

## Step 6: Database Backup Automation

### 6.1 Create Backup Script

```bash
# Create backup directory
sudo mkdir -p /var/backups/habitat
sudo chown habitat:habitat /var/backups/habitat

# Create backup script
sudo nano /usr/local/bin/habitat-backup.sh
```

**Backup script:**
```bash
#!/bin/bash
#
# Habitat Database Backup Script
#
# Usage: /usr/local/bin/habitat-backup.sh
#

set -e

BACKUP_DIR="/var/backups/habitat"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/habitat_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Create backup
cd /home/habitat/habitat
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -d habitat | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ]; then
  SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "Backup created: ${BACKUP_FILE} (${SIZE})"
else
  echo "Error: Backup failed"
  exit 1
fi

# Delete old backups
find "${BACKUP_DIR}" -name "habitat_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
COUNT=$(find "${BACKUP_DIR}" -name "habitat_*.sql.gz" | wc -l)
echo "Total backups: ${COUNT}"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/habitat-backup.sh

# Test backup
sudo -u habitat /usr/local/bin/habitat-backup.sh

# Verify backup
ls -lh /var/backups/habitat/
```

### 6.2 Schedule Daily Backups

```bash
# Add cron job
sudo crontab -u habitat -e

# Add line (daily at 2 AM):
0 2 * * * /usr/local/bin/habitat-backup.sh >> /var/log/habitat-backup.log 2>&1
```

### 6.3 Test Backup Restoration

```bash
# Restore test (dry run)
cd /home/habitat/habitat

# Stop services
docker compose -f docker-compose.prod.yml stop api worker

# Restore
gunzip < /var/backups/habitat/habitat_20260210_020000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat -d habitat

# Verify restoration
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM members;"

# Restart services
docker compose -f docker-compose.prod.yml start api worker
```

---

## Step 7: Monitoring Setup

### 7.1 Prometheus Configuration

**Already configured in repo:**
- `monitoring/prometheus.yml`
- Scrapes API metrics (port 4000)
- Scrapes worker metrics (port 9091)

### 7.2 Grafana Setup (Optional)

```bash
# Add Grafana to docker-compose.prod.yml
version: '3.8'
services:
  # ... existing services ...
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    restart: unless-stopped

volumes:
  grafana-data:
```

```bash
# Start Grafana
docker compose -f docker-compose.prod.yml up -d grafana

# Access Grafana
# https://habitat.eth:3001
# Username: admin
# Password: (from GRAFANA_ADMIN_PASSWORD)
```

### 7.3 Configure Alerts

**Already configured in repo:**
- `monitoring/alerts/*.yml`
- API response time alerts (P95 > 500ms)
- Error rate alerts (> 1%)
- Event processing alerts

### 7.4 Uptime Monitoring

**External Services (optional):**
- UptimeRobot (free)
- Pingdom
- StatusCake

**Configuration:**
- URL: https://habitat.eth/health
- Interval: 5 minutes
- Alert contact: admin@habitat.eth

---

## Step 8: Health Checks

### 8.1 Service Health

```bash
# API health
curl https://habitat.eth/health
# Expected: {"status":"ok","timestamp":"..."}

# GraphQL endpoint
curl -X POST https://habitat.eth/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
# Expected: {"data":{"__typename":"Query"}}

# UI homepage
curl -I https://habitat.eth
# Expected: 200 OK
```

### 8.2 Database Health

```bash
# Connection test
docker compose -f docker-compose.prod.yml exec postgres \
  pg_isready -U habitat

# Table count
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "\dt" | wc -l
# Expected: ~15 tables
```

### 8.3 Event Processing Health

```bash
# RabbitMQ status
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl status

# Check worker logs
docker compose -f docker-compose.prod.yml logs worker | \
  grep "Event processed"

# Should see event processing activity
```

### 8.4 TLS Health

```bash
# Certificate validity
echo | openssl s_client -connect habitat.eth:443 2>/dev/null | \
  openssl x509 -noout -dates

# SSL Labs test (manual)
# https://www.ssllabs.com/ssltest/analyze.html?d=habitat.eth
# Target: A+ rating
```

### 8.5 Performance Health

```bash
# Response time test
time curl -s https://habitat.eth/health

# Expected: < 500ms

# Load test (optional)
ab -n 100 -c 10 https://habitat.eth/health
# Check median and 95th percentile response times
```

---

## Step 9: Production Checklist

### Pre-Launch Checklist

- [ ] VPS provisioned and hardened
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] SSH key-based auth only
- [ ] Fail2ban configured
- [ ] DNS records configured and propagated
- [ ] TLS certificate obtained (automatic)
- [ ] HTTPS redirect working
- [ ] All services running (docker ps shows 6 healthy containers)
- [ ] Database migrations applied
- [ ] Database backups scheduled (daily 2 AM cron)
- [ ] Backup restoration tested
- [ ] Monitoring connected (Prometheus)
- [ ] Health checks passing (API, DB, RabbitMQ, TLS)
- [ ] Logs being collected
- [ ] Uptime monitoring configured (optional)
- [ ] Admin users created
- [ ] Test users removed
- [ ] Environment secrets secured (not in git)
- [ ] Documentation updated with production URLs

### Post-Launch Monitoring

**First 24 Hours:**
- [ ] Monitor logs for errors
- [ ] Check health endpoint every hour
- [ ] Verify backups running
- [ ] Test login from multiple locations
- [ ] Monitor resource usage (CPU, RAM, disk)
- [ ] Verify TLS certificate auto-renewal setup

**First Week:**
- [ ] Review access logs
- [ ] Check backup integrity
- [ ] Monitor performance metrics
- [ ] Verify alert notifications working
- [ ] Test disaster recovery procedure
- [ ] Review and tune resource allocation

---

## Step 10: Disaster Recovery Setup

### 10.1 Off-Site Backup

```bash
# Sync to S3 (or similar)
# Install AWS CLI
sudo apt install awscli

# Configure AWS credentials
aws configure

# Sync backups
aws s3 sync /var/backups/habitat/ s3://habitat-backups/

# Schedule daily sync (add to cron after local backup)
30 2 * * * aws s3 sync /var/backups/habitat/ s3://habitat-backups/ >> /var/log/habitat-s3-sync.log 2>&1
```

### 10.2 Disaster Recovery Plan

**Scenario: Complete server failure**

1. Provision new VPS (same specs)
2. Follow Steps 1-4 (setup, security, DNS, deployment)
3. Stop services
4. Restore from latest backup:
   ```bash
   aws s3 cp s3://habitat-backups/habitat_latest.sql.gz .
   gunzip < habitat_latest.sql.gz | docker compose exec -T postgres psql -U habitat -d habitat
   ```
5. Start services
6. Verify health checks
7. Update DNS if IP changed (wait for propagation)

**RTO (Recovery Time Objective):** 2 hours  
**RPO (Recovery Point Objective):** 24 hours (daily backups)

See `docs/operations/disaster-recovery.md` for detailed procedures.

---

## Troubleshooting

### TLS Certificate Issues

**Problem:** Certificate not obtained

**Solutions:**
1. Check DNS propagation: `dig habitat.eth +short`
2. Check port 80 open: `nc -zv <SERVER_IP> 80`
3. Check Caddy logs: `docker compose logs caddy`
4. Verify domain in .env file: `cat .env | grep DOMAIN`

### Service Not Starting

**Problem:** Container exits immediately

**Solutions:**
1. Check logs: `docker compose logs <service>`
2. Check environment: `docker compose config`
3. Check disk space: `df -h`
4. Check memory: `free -h`

### Database Connection Errors

**Problem:** "Connection refused" or "Connection timeout"

**Solutions:**
1. Check PostgreSQL running: `docker ps | grep postgres`
2. Check logs: `docker compose logs postgres`
3. Verify DATABASE_URL in .env files
4. Test connection: `docker compose exec postgres pg_isready`

---

## Maintenance

### Regular Tasks

**Daily (automated):**
- Database backup (2 AM cron)
- S3 sync (2:30 AM cron)

**Weekly:**
- Review logs for errors
- Check disk space
- Review resource usage
- Check backup integrity

**Monthly:**
- Security updates: `sudo apt update && sudo apt upgrade`
- Review access logs
- Test disaster recovery
- Review and rotate secrets

**Quarterly:**
- Full security audit
- Performance review
- Capacity planning
- Documentation review

---

## Support and Monitoring

### Key URLs

- **Production:** https://habitat.eth
- **API Health:** https://habitat.eth/health
- **GraphQL:** https://habitat.eth/graphql
- **Metrics:** https://habitat.eth/metrics (internal only)

### Logs

```bash
# All logs
cd /home/habitat/habitat
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api

# Errors only
docker compose -f docker-compose.prod.yml logs | grep ERROR
```

### Metrics

```bash
# Prometheus metrics
curl https://habitat.eth/metrics

# Key metrics to monitor:
# - http_request_duration_seconds (P95 < 500ms)
# - http_requests_total (track traffic)
# - http_errors_total (< 1% error rate)
# - db_pool_active_connections (< 80% of pool size)
# - events_processed_total (steady increase)
```

---

**Production Setup Version:** 1.0.0  
**Last Updated:** 2026-02-10  
**Next Review:** After production launch (Sprint 116)
