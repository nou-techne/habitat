# Backup and Restore Runbook

## Overview

Comprehensive procedures for backing up and restoring Habitat data, including database, volumes, and configuration.

## Prerequisites

- SSH access to server
- Docker and Docker Compose installed
- Sufficient disk space (2x database size + volume sizes)
- Write access to backup location

## Database Backup

### Manual Backup

```bash
# SSH to server
ssh user@habitat-server

# Navigate to deployment directory
cd /path/to/habitat

# Create timestamped backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > backups/db-$(date +%Y%m%d-%H%M%S).dump

# Verify backup
ls -lh backups/db-*.dump
```

### Automated Daily Backup

Add to crontab:

```cron
# Daily database backup at 2 AM
0 2 * * * cd /path/to/habitat && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U habitat -Fc habitat > backups/db-$(date +\%Y\%m\%d).dump
```

### Backup to S3

```bash
# Install AWS CLI
apt-get install awscli

# Configure credentials
aws configure

# Backup and upload
BACKUP_FILE="db-$(date +%Y%m%d-%H%M%S).dump"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > /tmp/$BACKUP_FILE
aws s3 cp /tmp/$BACKUP_FILE s3://habitat-backups/db/
rm /tmp/$BACKUP_FILE
```

## Database Restore

### From Local Backup

```bash
# List available backups
ls -lh backups/db-*.dump

# Stop services (optional, for clean restore)
docker compose -f docker-compose.prod.yml stop api worker ui

# Restore database
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean --if-exists < backups/db-20260210-020000.dump

# Restart services
docker compose -f docker-compose.prod.yml start api worker ui

# Verify restoration
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM members;"
```

### From S3 Backup

```bash
# Download backup
aws s3 cp s3://habitat-backups/db/db-20260210-020000.dump /tmp/

# Restore
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean --if-exists < /tmp/db-20260210-020000.dump

# Cleanup
rm /tmp/db-20260210-020000.dump
```

### Point-in-Time Recovery

```bash
# Restore from most recent backup
LATEST_BACKUP=$(ls -t backups/db-*.dump | head -1)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean --if-exists < $LATEST_BACKUP

# Apply WAL logs (if WAL archiving enabled)
# This requires PostgreSQL WAL archiving to be configured
docker compose -f docker-compose.prod.yml exec postgres \
  pg_waldump /var/lib/postgresql/data/pg_wal/000000010000000000000001
```

## Volume Backup

### Backup All Volumes

```bash
# Create backup directory
mkdir -p backups/volumes

# Backup postgres data
docker run --rm \
  -v habitat_postgres-data:/data \
  -v $(pwd)/backups/volumes:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz /data

# Backup RabbitMQ data
docker run --rm \
  -v habitat_rabbitmq-data:/data \
  -v $(pwd)/backups/volumes:/backup \
  alpine tar czf /backup/rabbitmq-$(date +%Y%m%d).tar.gz /data

# Backup Caddy data (TLS certificates)
docker run --rm \
  -v habitat_caddy-data:/data \
  -v $(pwd)/backups/volumes:/backup \
  alpine tar czf /backup/caddy-$(date +%Y%m%d).tar.gz /data
```

### Restore Volumes

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Restore postgres volume
docker run --rm \
  -v habitat_postgres-data:/data \
  -v $(pwd)/backups/volumes:/backup \
  alpine tar xzf /backup/postgres-20260210.tar.gz -C /

# Restore RabbitMQ volume
docker run --rm \
  -v habitat_rabbitmq-data:/data \
  -v $(pwd)/backups/volumes:/backup \
  alpine tar xzf /backup/rabbitmq-20260210.tar.gz -C /

# Restore Caddy volume
docker run --rm \
  -v habitat_caddy-data:/data \
  -v $(pwd)/backups/volumes:/backup \
  alpine tar xzf /backup/caddy-20260210.tar.gz -C /

# Start services
docker compose -f docker-compose.prod.yml up -d
```

## Configuration Backup

### Backup Environment and Config

```bash
# Create config backup
mkdir -p backups/config/$(date +%Y%m%d)

# Backup .env file (encrypted)
gpg --symmetric --cipher-algo AES256 .env
mv .env.gpg backups/config/$(date +%Y%m%d)/

# Backup docker-compose
cp docker-compose.prod.yml backups/config/$(date +%Y%m%d)/

# Backup Caddyfile
cp Caddyfile backups/config/$(date +%Y%m%d)/

# Backup schema
cp -r schema/ backups/config/$(date +%Y%m%d)/
```

### Restore Configuration

```bash
# Decrypt .env
gpg --decrypt backups/config/20260210/.env.gpg > .env

# Restore other files
cp backups/config/20260210/docker-compose.prod.yml .
cp backups/config/20260210/Caddyfile .
cp -r backups/config/20260210/schema/ .
```

## Full System Backup

### Complete Backup Script

```bash
#!/bin/bash
# full-backup.sh - Complete Habitat backup

set -e

BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/$BACKUP_DATE"

mkdir -p $BACKUP_DIR/{db,volumes,config}

echo "Starting full backup: $BACKUP_DATE"

# Database
echo "Backing up database..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U habitat -Fc habitat > $BACKUP_DIR/db/habitat.dump

# Volumes
echo "Backing up volumes..."
docker run --rm \
  -v habitat_postgres-data:/data \
  -v $(pwd)/$BACKUP_DIR/volumes:/backup \
  alpine tar czf /backup/postgres-data.tar.gz /data

docker run --rm \
  -v habitat_rabbitmq-data:/data \
  -v $(pwd)/$BACKUP_DIR/volumes:/backup \
  alpine tar czf /backup/rabbitmq-data.tar.gz /data

docker run --rm \
  -v habitat_caddy-data:/data \
  -v $(pwd)/$BACKUP_DIR/volumes:/backup \
  alpine tar czf /backup/caddy-data.tar.gz /data

# Configuration
echo "Backing up configuration..."
gpg --symmetric --cipher-algo AES256 --batch --passphrase-file backup-passphrase.txt .env
mv .env.gpg $BACKUP_DIR/config/
cp docker-compose.prod.yml $BACKUP_DIR/config/
cp Caddyfile $BACKUP_DIR/config/
cp -r schema/ $BACKUP_DIR/config/

# Create manifest
echo "Creating manifest..."
cat > $BACKUP_DIR/manifest.txt <<EOF
Habitat Backup Manifest
Date: $BACKUP_DATE
Database: habitat.dump
Volumes: postgres-data.tar.gz, rabbitmq-data.tar.gz, caddy-data.tar.gz
Config: .env.gpg, docker-compose.prod.yml, Caddyfile, schema/
EOF

# Calculate checksums
cd $BACKUP_DIR
find . -type f -exec sha256sum {} \; > checksums.txt
cd -

# Compress entire backup
tar czf backups/habitat-full-$BACKUP_DATE.tar.gz -C backups $BACKUP_DATE

# Upload to S3 (optional)
# aws s3 cp backups/habitat-full-$BACKUP_DATE.tar.gz s3://habitat-backups/full/

echo "Backup complete: backups/habitat-full-$BACKUP_DATE.tar.gz"
```

Make executable:

```bash
chmod +x full-backup.sh
```

### Automated Full Backup

Add to crontab:

```cron
# Weekly full backup on Sunday at 3 AM
0 3 * * 0 cd /path/to/habitat && ./full-backup.sh
```

## Backup Retention

### Retention Policy

- **Database:** Daily for 30 days, weekly for 90 days, monthly for 1 year
- **Volumes:** Weekly for 90 days
- **Full backups:** Weekly for 90 days, monthly for 1 year

### Cleanup Script

```bash
#!/bin/bash
# cleanup-backups.sh - Remove old backups per retention policy

# Remove database backups older than 30 days
find backups/db-*.dump -mtime +30 -delete

# Remove volume backups older than 90 days
find backups/volumes/*.tar.gz -mtime +90 -delete

# Remove full backups older than 90 days
find backups/habitat-full-*.tar.gz -mtime +90 -delete

echo "Backup cleanup complete"
```

## Verification

### Test Backup Integrity

```bash
# Test database backup
pg_restore --list backups/db-20260210-020000.dump

# Test volume backup
tar tzf backups/volumes/postgres-20260210.tar.gz | head

# Verify checksums
cd backups/20260210
sha256sum -c checksums.txt
```

### Test Restore (Staging)

```bash
# On staging server
rsync -avz production:/path/to/habitat/backups/latest.dump /tmp/

# Restore to staging
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U habitat -d habitat --clean --if-exists < /tmp/latest.dump

# Verify data
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -d habitat -c "SELECT COUNT(*) FROM members;"
```

## Troubleshooting

### Backup Fails

**Symptom:** pg_dump fails with error

**Solution:**
1. Check disk space: `df -h`
2. Verify database is running: `docker compose ps postgres`
3. Check PostgreSQL logs: `docker compose logs postgres`
4. Verify credentials in .env file

### Restore Fails

**Symptom:** pg_restore fails with errors

**Solution:**
1. Check backup file integrity: `pg_restore --list backup.dump`
2. Verify target database is empty or use `--clean --if-exists`
3. Check PostgreSQL version compatibility
4. Review error messages for specific table/constraint issues

### Insufficient Disk Space

**Symptom:** "No space left on device"

**Solution:**
1. Check available space: `df -h`
2. Clean up old backups: `./cleanup-backups.sh`
3. Remove old Docker images: `docker system prune -a`
4. Expand disk or mount additional storage

## Best Practices

- **Test restores regularly** (monthly at minimum)
- **Store backups off-site** (S3, rsync to remote server)
- **Encrypt backups** containing sensitive data
- **Monitor backup jobs** with alerts on failure
- **Document backup locations** and access credentials
- **Maintain multiple backup generations**
- **Verify backup integrity** with checksums
- **Time backups** during low-traffic periods

## Emergency Contacts

- **DevOps Lead:** [contact info]
- **Database Admin:** [contact info]
- **Backup Service:** [S3 account, access info]
