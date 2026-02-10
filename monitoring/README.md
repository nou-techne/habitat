# Habitat Monitoring & Observability

Comprehensive monitoring setup with Prometheus metrics, Grafana dashboards, and structured logging.

## Architecture

```
┌─────────────┐
│   Grafana   │  :3001 (dashboards & visualization)
└──────┬──────┘
       │
┌──────▼──────┐
│ Prometheus  │  :9090 (metrics collection & alerting)
└──────┬──────┘
       │
   ┌───┴────┬──────────┬─────────┐
   │        │          │         │
┌──▼──┐  ┌─▼───┐  ┌───▼────┐  ┌─▼─────┐
│ API │  │Worker│  │Postgres│  │RabbitMQ│
│:4000│  │:4001 │  │Exporter│  │:15692  │
└─────┘  └──────┘  └────────┘  └────────┘
```

## Metrics

### API Metrics

**HTTP Requests:**
- `http_requests_total` - Total number of requests
- `http_request_duration_seconds` - Request latency (histogram)
- `http_request_errors_total` - Error count by type

**GraphQL Operations:**
- `graphql_operations_total` - Operation count
- `graphql_operation_duration_seconds` - Operation latency
- `graphql_errors_total` - GraphQL errors

**Database:**
- `db_query_duration_seconds` - Query latency
- `db_connection_pool_size` - Connection pool state
- `db_query_errors_total` - Database errors

**Authentication:**
- `auth_attempts_total` - Login attempts
- `auth_tokens_issued_total` - Tokens issued
- `auth_tokens_revoked_total` - Tokens revoked

**Rate Limiting:**
- `rate_limit_hits_total` - Rate limit violations
- `rate_limit_remaining` - Remaining quota

**Business Metrics:**
- `contributions_submitted_total` - Contributions submitted
- `contributions_approved_total` - Contributions approved
- `contributions_rejected_total` - Contributions rejected
- `contributions_pending` - Pending contributions (gauge)
- `contribution_amount_usd` - Contribution amounts (histogram)
- `members_active` - Active members (gauge)
- `members_total` - Total members (gauge)
- `allocations_calculated_total` - Allocations calculated
- `allocations_distributed_total` - Allocations distributed
- `allocation_amount_usd` - Allocation amounts (histogram)
- `periods_active` - Active periods (gauge)
- `periods_closed_total` - Periods closed

### Worker Metrics

**Event Processing:**
- `events_processed_total` - Events processed
- `event_processing_duration_seconds` - Processing latency
- `event_processing_errors_total` - Processing errors

**Queue:**
- `queue_depth` - Messages in queue (gauge)
- `queue_processing_rate` - Messages/second (gauge)
- `dead_letter_queue_total` - DLQ messages

**Workflows:**
- `workflows_started_total` - Workflows started
- `workflows_completed_total` - Workflows completed
- `workflow_duration_seconds` - Workflow latency

**Retries:**
- `event_retries_total` - Retry attempts
- `event_retries_exhausted_total` - Max retries reached

**Idempotency:**
- `idempotency_hits_total` - Cache hits
- `idempotency_misses_total` - Cache misses

**RabbitMQ:**
- `rabbitmq_connected` - Connection status (1/0)
- `rabbitmq_reconnections_total` - Reconnection count

## Alerts

### API Alerts

- **APIHighErrorRate** - Error rate >10% for 5min (warning)
- **APIVeryHighErrorRate** - Error rate >25% for 2min (critical)
- **APISlowResponseTime** - p95 >1s for 5min (warning)
- **APIVerySlowResponseTime** - p95 >5s for 2min (critical)
- **GraphQLHighErrorRate** - GraphQL errors >10% (warning)
- **DBConnectionPoolLow** - <2 idle connections (warning)
- **HighAuthFailureRate** - >10 failures/sec (warning)

### Worker Alerts

- **WorkerHighErrorRate** - Processing errors >10% (warning)
- **QueueDepthHigh** - >1000 messages for 10min (warning)
- **QueueDepthCritical** - >10000 messages for 5min (critical)
- **DeadLetterQueueAccumulation** - >0.01 msg/sec to DLQ (warning)
- **WorkflowHighFailureRate** - Workflow failures >10% (warning)
- **RetriesExhausted** - >0.01 events/sec exhausting retries (critical)
- **RabbitMQDisconnected** - Disconnected for 1min (critical)
- **LowProcessingRate** - <1 msg/sec for 10min (warning)

### Business Alerts

- **NoContributionsSubmitted** - 0 contributions in 24h (warning)
- **HighContributionRejectionRate** - >50% rejected (warning)
- **ManyPendingContributions** - >50 pending for 6h (warning)
- **CriticalPendingContributions** - >100 pending for 12h (critical)
- **NoActiveMembers** - 0 active for 1h (critical)
- **PeriodNotClosedOnTime** - Period not closed by 1st (warning)

## Dashboards

### API Overview
- Request rate (per route, method, status)
- Error rate (by type)
- Response time (p50, p95, p99)
- GraphQL operations
- Database query duration
- Active database connections

### Business Metrics
- Contributions per day
- Contribution approval rate
- Pending contributions
- Active members
- Total members
- Allocations distributed (30d)
- Average allocation amount
- Active periods

### Worker Overview
- Event processing rate
- Queue depth
- Processing errors
- Workflow completion rate
- Dead letter queue
- RabbitMQ connection status

### System Overview
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Container health

## Structured Logging

**Format:** JSON (production), human-readable (development)

**Log Levels:** error, warn, info, http, debug

**Context Fields:**
- `service` - Service name (habitat-api, habitat-worker)
- `environment` - Environment (production, staging, development)
- `timestamp` - ISO 8601 timestamp
- `user_id` - User ID (when available)
- `operation_name` - GraphQL operation (when applicable)
- `duration_ms` - Operation duration
- `error` - Error details (message, stack)

**Log Functions:**
- `logRequest()` - HTTP requests
- `logGraphQLOperation()` - GraphQL operations
- `logDbQuery()` - Database queries
- `logAuth()` - Authentication events
- `logBusinessEvent()` - Business events
- `logError()` - Errors with context

**Example Log:**
```json
{
  "level": "info",
  "message": "GraphQL operation",
  "timestamp": "2026-02-10 11:23:45",
  "service": "habitat-api",
  "environment": "production",
  "operation_name": "SubmitContribution",
  "operation_type": "mutation",
  "duration_ms": 142,
  "success": true,
  "user_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Setup

### Local Development

```bash
# Start Prometheus
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d \
  -p 3001:3000 \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana
```

### Production Deployment

Add to `docker-compose.prod.yml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    - ./monitoring/alerts:/etc/prometheus/alerts
    - prometheus-data:/prometheus
  ports:
    - "9090:9090"
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'

grafana:
  image: grafana/grafana:latest
  volumes:
    - grafana-data:/var/lib/grafana
    - ./monitoring/grafana:/etc/grafana/provisioning
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    - GF_INSTALL_PLUGINS=grafana-piechart-panel
```

## Usage

### View Metrics

**Prometheus:**
http://localhost:9090/targets

**API Metrics:**
http://localhost:4000/metrics

**Grafana:**
http://localhost:3001 (admin/admin)

### Query Examples

**Request rate:**
```promql
rate(http_requests_total[5m])
```

**95th percentile latency:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Error rate:**
```promql
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m])
```

**Pending contributions:**
```promql
contributions_pending
```

## Best Practices

### Metrics
- Use counters for things that only go up (requests, errors)
- Use gauges for things that go up and down (queue depth, connections)
- Use histograms for latency and amounts
- Keep cardinality low (avoid user IDs in labels)
- Use consistent naming (service_component_unit_suffix)

### Logging
- Log at appropriate levels (debug < info < warn < error)
- Include context (user ID, operation, duration)
- Log structured data (JSON in production)
- Don't log sensitive data (passwords, tokens, PII)
- Log slow queries (>1s)

### Alerts
- Alert on symptoms, not causes
- Use multiple severity levels
- Include actionable information
- Test alerts regularly
- Document runbooks for each alert

### Dashboards
- Start with overview, drill down to detail
- Use consistent time ranges
- Add thresholds to graphs
- Include both technical and business metrics
- Keep dashboards focused (one dashboard = one concern)

## Troubleshooting

### High Error Rate

1. Check error logs for patterns
2. View affected routes in Grafana
3. Check database connection pool
4. Review recent deployments

### Slow Response Time

1. Check database query duration
2. Identify slow operations in logs
3. Review active connections
4. Check system resources (CPU, memory)

### Queue Depth Growing

1. Check worker processing rate
2. Review worker logs for errors
3. Verify RabbitMQ connection
4. Scale worker instances if needed

### No Metrics Appearing

1. Verify Prometheus is scraping targets
2. Check `/metrics` endpoint is accessible
3. Review Prometheus logs
4. Verify network connectivity

## Support

- Documentation: https://docs.habitat.eth/monitoring
- Prometheus: https://prometheus.io/docs
- Grafana: https://grafana.com/docs
