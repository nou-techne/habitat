# Habitat Deployment Guide

## Quick Start

### Prerequisites

- Docker 24+ with Compose V2
- 2GB+ RAM available
- Ports 80, 443, 3000, 4000, 5432, 5672, 15672 available

### Local Development

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env

# Start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop services
docker compose -f docker-compose.prod.yml down
```

### Production Deployment

```bash
# Set production environment variables
export DOMAIN=habitat.example.com
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export RABBITMQ_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Check health
docker compose -f docker-compose.prod.yml ps
```

## Architecture

```
┌─────────────┐
│   Caddy     │  :80, :443 (reverse proxy + TLS)
└──────┬──────┘
       │
   ┌───┴────┬──────────┐
   │        │          │
┌──▼──┐  ┌─▼───┐  ┌───▼────┐
│ UI  │  │ API │  │RabbitMQ│
│:3000│  │:4000│  │:5672   │
└─────┘  └──┬──┘  └───┬────┘
            │         │
         ┌──▼─────────▼──┐
         │   PostgreSQL  │
         │     :5432     │
         └───────────────┘
            │
         ┌──▼──────┐
         │ Worker  │
         └─────────┘
```

## Services

### PostgreSQL
- **Image:** postgres:15-alpine
- **Port:** 5432
- **Volume:** postgres-data
- **Health check:** pg_isready

### RabbitMQ
- **Image:** rabbitmq:3.12-management-alpine
- **Ports:** 5672 (AMQP), 15672 (Management UI)
- **Volume:** rabbitmq-data
- **Health check:** rabbitmq-diagnostics ping

### API Server
- **Build:** Dockerfile.api
- **Port:** 4000
- **Health check:** GET /health
- **Depends on:** postgres, rabbitmq

### Event Worker
- **Build:** Dockerfile.worker
- **Health check:** Node process check
- **Depends on:** postgres, rabbitmq

### UI (Next.js)
- **Build:** Dockerfile.ui
- **Port:** 3000
- **Health check:** GET /
- **Depends on:** api

### Caddy
- **Image:** caddy:2-alpine
- **Ports:** 80, 443
- **Volumes:** caddy-data, caddy-config
- **Config:** Caddyfile

## Environment Variables

### Required

- `POSTGRES_PASSWORD` - PostgreSQL password
- `RABBITMQ_PASSWORD` - RabbitMQ password
- `JWT_SECRET` - JWT signing secret

### Optional

- `DOMAIN` - Domain name (default: localhost)
- `POSTGRES_DB` - Database name (default: habitat)
- `POSTGRES_USER` - Database user (default: habitat)
- `RABBITMQ_USER` - RabbitMQ user (default: habitat)
- `RABBITMQ_VHOST` - RabbitMQ vhost (default: habitat)
- `JWT_EXPIRY` - JWT expiry time (default: 15m)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` - GraphQL endpoint for frontend

## Health Checks

All services include health checks:

```bash
# Check all service health
docker compose -f docker-compose.prod.yml ps

# View specific service logs
docker compose -f docker-compose.prod.yml logs api
docker compose -f docker-compose.prod.yml logs worker
docker compose -f docker-compose.prod.yml logs ui
```

## Database Migrations

```bash
# Run migrations
docker compose -f docker-compose.prod.yml exec api npm run migrate

# Rollback migration
docker compose -f docker-compose.prod.yml exec api npm run migrate:rollback

# Seed database
docker compose -f docker-compose.prod.yml exec api npm run seed
```

## Backups

### PostgreSQL Backup

```bash
# Backup database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U habitat habitat > backup-$(date +%Y%m%d).sql

# Restore database
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U habitat habitat < backup-20260210.sql
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm -v habitat_postgres-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data

docker run --rm -v habitat_rabbitmq-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/rabbitmq-backup-$(date +%Y%m%d).tar.gz /data
```

## Monitoring

### Service Status

```bash
# View all services
docker compose -f docker-compose.prod.yml ps

# View resource usage
docker stats
```

### Logs

```bash
# Follow all logs
docker compose -f docker-compose.prod.yml logs -f

# View last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Filter by service
docker compose -f docker-compose.prod.yml logs -f api worker
```

### RabbitMQ Management

Access at: http://localhost:15672
- Username: habitat (or $RABBITMQ_USER)
- Password: (from $RABBITMQ_PASSWORD)

## Scaling

### Scale Worker Instances

```bash
# Scale to 3 workers
docker compose -f docker-compose.prod.yml up -d --scale worker=3

# Scale back to 1
docker compose -f docker-compose.prod.yml up -d --scale worker=1
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service>

# Rebuild service
docker compose -f docker-compose.prod.yml up -d --build <service>

# Restart service
docker compose -f docker-compose.prod.yml restart <service>
```

### Database Connection Issues

```bash
# Check PostgreSQL is ready
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection string
docker compose -f docker-compose.prod.yml exec api env | grep DATABASE_URL
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ status
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl status

# List queues
docker compose -f docker-compose.prod.yml exec rabbitmq rabbitmqctl list_queues
```

## Security

### TLS/SSL

Caddy automatically obtains Let's Encrypt certificates when:
1. `DOMAIN` is set to a real domain
2. Port 443 is accessible from internet
3. DNS points to your server

For development, Caddy generates self-signed certificates.

### Secrets Management

**Never commit secrets to git!**

Use `.env` file (git-ignored) or environment variables:

```bash
# Generate secure passwords
openssl rand -base64 32

# Use Docker secrets (Swarm mode)
echo "my-secret-password" | docker secret create db_password -
```

### Network Security

- All services on private `habitat-network`
- Only Caddy exposes ports 80/443
- Use firewall to restrict other ports
- Enable fail2ban for SSH protection

## Production Checklist

- [ ] Set strong passwords for all services
- [ ] Configure real domain in `DOMAIN`
- [ ] Enable HTTPS with Let's Encrypt
- [ ] Set up automated backups
- [ ] Configure monitoring (Sentry, DataDog, etc.)
- [ ] Set up log aggregation
- [ ] Enable firewall (UFW, iptables)
- [ ] Configure email service for notifications
- [ ] Set up CI/CD pipeline
- [ ] Document incident response procedures

## Updates

### Update Service

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Rebuild custom images
docker compose -f docker-compose.prod.yml build

# Restart with new images
docker compose -f docker-compose.prod.yml up -d
```

### Zero-Downtime Update

```bash
# Scale up new version
docker compose -f docker-compose.prod.yml up -d --scale api=2

# Health check passes, scale down old
docker compose -f docker-compose.prod.yml up -d --scale api=1
```

## Support

- Documentation: https://docs.habitat.eth
- Issues: https://github.com/habitat/habitat/issues
- Discord: https://discord.gg/habitat
