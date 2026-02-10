# Scaling Guide

## Overview

Procedures for scaling Habitat infrastructure horizontally and vertically to handle increased load, including API servers, workers, database, and queue.

## Current Architecture

```
Caddy (1) → API (1) → PostgreSQL (1)
              ↓
         Worker (1) → RabbitMQ (1)
              ↓
          UI (1)
```

## Scaling Strategies

### Horizontal Scaling (Scale Out)

Add more instances of services:
- **API servers:** Load balance across multiple instances
- **Workers:** Process events in parallel
- **UI servers:** Serve more concurrent users

### Vertical Scaling (Scale Up)

Increase resources per instance:
- **CPU:** More cores for compute-intensive tasks
- **Memory:** Larger buffers and caches
- **Disk:** Faster I/O, more storage

## When to Scale

### Indicators

Monitor these metrics to determine when scaling is needed:

**API Servers:**
- CPU usage >70% sustained
- Response time p95 >500ms
- Error rate >5%
- Queue depth growing
- Memory usage >80%

**Workers:**
- Queue depth >1000 messages
- Processing lag >5 minutes
- CPU usage >70% sustained
- Events timing out

**Database:**
- Connection pool exhaustion
- Query latency >100ms p95
- Replication lag >10 seconds
- Disk I/O >80%

**RabbitMQ:**
- Queue depth growing continuously
- Memory usage >80%
- Message rate >1000/sec

## Scale API Servers

### Horizontal Scaling

```bash
# Scale to 3 API instances
docker compose -f docker-compose.prod.yml up -d --scale api=3

# Verify scaling
docker compose -f docker-compose.prod.yml ps api

# Check load distribution
for i in {1..10}; do
  curl -s https://habitat.example.com/api/health | jq '.hostname'
done
```

### Load Balancing

Caddy automatically load balances across multiple API instances:

```caddyfile
# Caddyfile - automatic load balancing
{$DOMAIN} {
  reverse_proxy api:4000 {
    lb_policy round_robin
    health_uri /health
    health_interval 10s
    health_timeout 5s
  }
}
```

### Verify Load Distribution

```bash
# Monitor request distribution
docker compose -f docker-compose.prod.yml logs api | grep "HTTP request" | awk '{print $1}' | sort | uniq -c

# Check Prometheus metrics
curl -s http://localhost:9090/api/v1/query?query=up{job="habitat-api"}
```

## Scale Workers

### Horizontal Scaling

```bash
# Scale to 5 worker instances
docker compose -f docker-compose.prod.yml up -d --scale worker=5

# Verify scaling
docker compose -f docker-compose.prod.yml ps worker

# Monitor queue processing
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues name messages consumers
```

### Worker Concurrency

Each worker can process multiple events concurrently:

```typescript
// worker/src/config.ts
export const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '10');

// Increase concurrency per worker
WORKER_CONCURRENCY=20 docker compose -f docker-compose.prod.yml up -d worker
```

### Auto-Scaling Workers

Based on queue depth:

```bash
#!/bin/bash
# auto-scale-workers.sh

QUEUE_NAME="habitat-events"
TARGET_PER_WORKER=100
MIN_WORKERS=1
MAX_WORKERS=10

# Get current queue depth
QUEUE_DEPTH=$(docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues name messages -q | grep $QUEUE_NAME | awk '{print $2}')

# Calculate desired workers
DESIRED_WORKERS=$(( $QUEUE_DEPTH / $TARGET_PER_WORKER + 1 ))

# Clamp to min/max
if [ $DESIRED_WORKERS -lt $MIN_WORKERS ]; then
  DESIRED_WORKERS=$MIN_WORKERS
elif [ $DESIRED_WORKERS -gt $MAX_WORKERS ]; then
  DESIRED_WORKERS=$MAX_WORKERS
fi

echo "Queue depth: $QUEUE_DEPTH, Desired workers: $DESIRED_WORKERS"

# Scale workers
docker compose -f docker-compose.prod.yml up -d --scale worker=$DESIRED_WORKERS
```

Add to cron:

```cron
# Auto-scale workers every 5 minutes
*/5 * * * * /opt/habitat/auto-scale-workers.sh
```

## Scale Database

### Read Replicas

For read-heavy workloads, add PostgreSQL read replicas:

```yaml
# docker-compose.prod.yml
services:
  postgres-primary:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
  
  postgres-replica:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: postgres-primary
      POSTGRES_MASTER_PORT: 5432
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${REPLICATION_PASSWORD}
```

### Connection Pooling

Use PgBouncer for connection pooling:

```yaml
# docker-compose.prod.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES: habitat=host=postgres dbname=habitat
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
```

Update API to connect through PgBouncer:

```bash
# .env
DATABASE_URL=postgres://habitat:password@pgbouncer:5432/habitat
```

### Vertical Scaling

Increase PostgreSQL resources:

```yaml
# docker-compose.prod.yml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
```

### PostgreSQL Tuning

```sql
-- Increase connection limit
ALTER SYSTEM SET max_connections = 200;

-- Increase shared buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '2GB';

-- Increase work memory
ALTER SYSTEM SET work_mem = '64MB';

-- Increase maintenance work memory
ALTER SYSTEM SET maintenance_work_mem = '256MB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;

-- Reload configuration
SELECT pg_reload_conf();
```

## Scale RabbitMQ

### Cluster Setup

For high availability, use RabbitMQ cluster:

```yaml
# docker-compose.prod.yml
services:
  rabbitmq-1:
    image: rabbitmq:3.12-management-alpine
    hostname: rabbitmq-1
    environment:
      RABBITMQ_ERLANG_COOKIE: ${RABBITMQ_COOKIE}
  
  rabbitmq-2:
    image: rabbitmq:3.12-management-alpine
    hostname: rabbitmq-2
    environment:
      RABBITMQ_ERLANG_COOKIE: ${RABBITMQ_COOKIE}
    depends_on:
      - rabbitmq-1
    command: >
      bash -c "
        rabbitmq-server &
        sleep 10
        rabbitmqctl stop_app
        rabbitmqctl join_cluster rabbit@rabbitmq-1
        rabbitmqctl start_app
        wait
      "
```

### Queue Mirroring

Enable queue mirroring for high availability:

```bash
# Enable mirroring for all queues
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all","ha-sync-mode":"automatic"}'
```

### Vertical Scaling

Increase RabbitMQ resources:

```yaml
# docker-compose.prod.yml
services:
  rabbitmq:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Scale UI

### Horizontal Scaling

```bash
# Scale to 3 UI instances
docker compose -f docker-compose.prod.yml up -d --scale ui=3

# Caddy will automatically load balance
```

### CDN Integration

Serve static assets from CDN:

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || '',
  images: {
    loader: 'custom',
    loaderFile: './cdn-loader.js',
  },
};
```

## Infrastructure Scaling

### Upgrade Server

When single-server resources are exhausted:

**Current:** 2 CPU, 4GB RAM, 50GB disk

**Recommended Tiers:**

```
Small:   2 CPU,   4GB RAM,  50GB disk  (< 100 users)
Medium:  4 CPU,   8GB RAM, 100GB disk  (< 500 users)
Large:   8 CPU,  16GB RAM, 200GB disk  (< 2000 users)
X-Large: 16 CPU, 32GB RAM, 500GB disk  (> 2000 users)
```

### Multi-Server Architecture

Separate concerns across multiple servers:

```
┌─────────────────────────────────────────┐
│ Load Balancer (Caddy)                   │
└────┬────────────────────────────────────┘
     │
     ├──────────┬──────────┬──────────────┐
     │          │          │              │
┌────▼────┐ ┌──▼────┐ ┌───▼─────┐  ┌────▼────┐
│API Srv 1│ │API  2 │ │API  3   │  │UI Srv   │
└────┬────┘ └───┬───┘ └───┬─────┘  └─────────┘
     │          │         │
     └──────────┴─────────┼──────────────┐
                          │              │
                    ┌─────▼────┐   ┌────▼─────┐
                    │PostgreSQL│   │RabbitMQ  │
                    └──────────┘   └──────────┘
                          │
                    ┌─────▼────┐
                    │Worker 1-5│
                    └──────────┘
```

## Monitoring Scaled System

### Check Service Distribution

```bash
# API instance distribution
curl -s http://localhost:9090/api/v1/query?query='sum(up{job="habitat-api"}) by (instance)'

# Worker count
docker compose -f docker-compose.prod.yml ps worker | grep -c "Up"

# Queue consumers
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues name consumers
```

### Load Testing

```bash
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

# Run load test
k6 run loadtest.js

# loadtest.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  let res = http.get('https://habitat.example.com/api/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

## Scaling Checklist

Before scaling:

- [ ] Identify bottleneck (CPU, memory, I/O, network)
- [ ] Review current metrics
- [ ] Test scaling in staging
- [ ] Backup current configuration
- [ ] Plan rollback procedure
- [ ] Schedule during low traffic
- [ ] Notify team

After scaling:

- [ ] Verify all instances running
- [ ] Check load distribution
- [ ] Monitor resource usage
- [ ] Check application functionality
- [ ] Review error rates
- [ ] Update monitoring thresholds
- [ ] Document changes

## Cost Optimization

### Right-Sizing

Avoid over-provisioning:

```bash
# Monitor actual usage
docker stats

# Scale down during off-hours
0 22 * * * docker compose -f docker-compose.prod.yml scale api=1 worker=2
0 6 * * * docker compose -f docker-compose.prod.yml scale api=3 worker=5
```

### Spot Instances

For non-critical workers, use spot instances (AWS, GCP):

```yaml
# docker-compose.prod.yml
services:
  worker-spot:
    image: habitat-worker:latest
    deploy:
      placement:
        constraints:
          - node.labels.type == spot
```

## Troubleshooting Scaled Systems

### Uneven Load Distribution

**Symptom:** One API instance gets all traffic

**Solution:**
```bash
# Check Caddy load balancing
docker compose -f docker-compose.prod.yml logs caddy | grep "upstream"

# Restart Caddy
docker compose -f docker-compose.prod.yml restart caddy
```

### Workers Not Consuming

**Symptom:** Queue depth grows despite multiple workers

**Solution:**
```bash
# Check worker health
docker compose -f docker-compose.prod.yml ps worker

# Check RabbitMQ connection
docker compose -f docker-compose.prod.yml logs worker | grep "Connected"

# Check queue configuration
docker compose -f docker-compose.prod.yml exec rabbitmq \
  rabbitmqctl list_queues name consumers messages
```

### Database Connection Pool Exhaustion

**Symptom:** "Too many connections" errors

**Solution:**
```bash
# Increase max connections (requires restart)
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U habitat -c "ALTER SYSTEM SET max_connections = 200;"

docker compose -f docker-compose.prod.yml restart postgres

# Or add PgBouncer for connection pooling
```

## Best Practices

1. **Scale gradually** - Add instances incrementally
2. **Monitor metrics** - Watch for improvements
3. **Test thoroughly** - Verify functionality after scaling
4. **Document changes** - Record instance counts and configs
5. **Automate scaling** - Use scripts for consistent scaling
6. **Plan for peak load** - Scale before Black Friday, not during
7. **Keep buffers** - Don't run at 100% capacity
8. **Regular reviews** - Monthly capacity planning meetings
