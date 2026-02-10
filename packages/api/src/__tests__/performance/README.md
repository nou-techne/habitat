# Performance & Load Testing

Comprehensive load testing suite to identify bottlenecks and ensure system performance under realistic production load.

## Overview

Tests simulate production scenarios:
- **50 concurrent members** accessing dashboards
- **500 contributions** submitted and processed
- **Period close** with full allocation calculation
- **Approval queue** queries with large datasets

**Acceptance Criteria:**
- P95 response time < 500ms for queries
- Period close completes in < 60s

## Test Files

### `load-test.ts`

Complete load testing suite with 4 test scenarios.

**Test Scenarios:**

1. **Concurrent Dashboard Queries**
   - 50 members load dashboard simultaneously
   - Queries: member, capital account, contributions, allocations
   - Measures: concurrent query performance

2. **Bulk Contribution Submission**
   - 500 contributions submitted
   - 10 contributions per member (50 members)
   - Measures: mutation throughput

3. **Period Close Under Load**
   - 500 approved contributions
   - Close period + calculate allocations
   - Measures: transaction processing time

4. **Approval Queue Query**
   - 500 pending contributions
   - Query approval queue 10 times
   - Measures: large dataset query performance

## Running Tests

```bash
# Run all load tests
pnpm test:load

# Or directly
tsx packages/api/src/__tests__/performance/load-test.ts

# With custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx load-test.ts
```

## Metrics Collected

### Response Times
- **Min:** Fastest request
- **Max:** Slowest request
- **Avg:** Average request time
- **P50:** Median (50th percentile)
- **P95:** 95th percentile (acceptance threshold)
- **P99:** 99th percentile

### Throughput
- **Requests per second:** Total requests / duration

### Acceptance
- **P95 < 500ms:** For queries
- **Period close < 60s:** For allocation calculation

## Sample Output

```
================================================================================
Performance Report: Concurrent Dashboard Queries
================================================================================

Metrics:
  Total Requests:       50
  Successful:           50
  Failed:               0
  Duration:             1234.56ms
  Throughput:           40.52 req/s

Response Times:
  Min:                  45.23ms
  Max:                  312.45ms
  Avg:                  156.78ms
  P50:                  145.32ms
  P95:                  287.91ms
  P99:                  305.12ms

Acceptance Criteria:
  P95 < 500ms:          ✓ PASS

================================================================================
```

## Interpreting Results

### P95 Response Time

**What it means:**
- 95% of requests complete faster than this time
- Outliers (5%) may be slower

**Target: < 500ms**

**If failing:**
- Add database indexes
- Optimize N+1 queries
- Implement DataLoader for batching
- Review query complexity

### Period Close Time

**What it means:**
- Total time to close period and calculate allocations
- Includes database transactions and event publishing

**Target: < 60s**

**If failing:**
- Batch database updates
- Optimize allocation formula
- Consider async processing
- Review transaction isolation levels

### Throughput

**What it means:**
- Number of requests handled per second
- System capacity under load

**Good: > 10 req/s**

**If low:**
- Check connection pool size
- Review server resources (CPU, memory)
- Optimize database queries
- Consider horizontal scaling

## Bottleneck Identification

### Database Queries

**Symptoms:**
- High P95/P99 response times
- Long period close time
- Low throughput

**Solutions:**
- Add indexes on frequently queried columns
- Use `EXPLAIN ANALYZE` to identify slow queries
- Optimize JOIN operations
- Consider materialized views

### N+1 Query Problem

**Symptoms:**
- Response time increases with data size
- Many sequential queries

**Solutions:**
- Implement DataLoader for batching
- Use SQL JOINs instead of multiple queries
- Add `include` clauses to eager load relations

### Event Publishing Overhead

**Symptoms:**
- Period close time high
- Many event.published entries

**Solutions:**
- Batch event publishing
- Use fire-and-forget for non-critical events
- Consider async event processing

### Connection Pool Exhaustion

**Symptoms:**
- Requests timeout
- "Too many connections" errors
- Requests queue up

**Solutions:**
- Increase pool size
- Set connection limits
- Implement connection retry logic
- Monitor active connections

## Optimization Recommendations

### 1. Database Indexing

Add indexes on frequently queried columns:

```sql
-- Members
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);

-- Contributions
CREATE INDEX idx_contributions_member_period ON contributions(member_id, period_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_contributions_approved_at ON contributions(approved_at);

-- Allocations
CREATE INDEX idx_allocations_member_period ON allocations(member_id, period_id);
CREATE INDEX idx_allocations_status ON allocations(status);

-- Capital Accounts
CREATE INDEX idx_capital_accounts_member ON capital_accounts(member_id);
```

### 2. DataLoader Implementation

Batch and cache database queries:

```typescript
import DataLoader from 'dataloader';

const memberLoader = new DataLoader(async (ids: string[]) => {
  const members = await pool.query(
    'SELECT * FROM members WHERE id = ANY($1)',
    [ids]
  );
  return ids.map(id => members.rows.find(m => m.id === id));
});

// Use in resolver
const member = await memberLoader.load(memberId);
```

### 3. Query Optimization

Use efficient queries:

```typescript
// ❌ N+1 Query
for (const contrib of contributions) {
  const member = await getMember(contrib.member_id);
}

// ✅ Single Query with JOIN
const contributions = await pool.query(`
  SELECT c.*, m.display_name, m.email
  FROM contributions c
  JOIN members m ON c.member_id = m.id
  WHERE c.period_id = $1
`, [periodId]);
```

### 4. Connection Pooling

Configure pool properly:

```typescript
const pool = new Pool({
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 5. Caching

Cache expensive calculations:

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 });

async function getAllocationSummary(periodId: string) {
  const cached = cache.get(periodId);
  if (cached) return cached;
  
  const summary = await calculateSummary(periodId);
  cache.set(periodId, summary);
  return summary;
}
```

### 6. Pagination

Limit large result sets:

```typescript
// ❌ Return all 500 contributions
SELECT * FROM contributions WHERE period_id = $1;

// ✅ Paginate
SELECT * FROM contributions
WHERE period_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

### 7. Async Processing

Offload heavy work to background jobs:

```typescript
// Instead of calculating allocations synchronously
await calculateAllocations(periodId); // Blocks for 60s

// Use background job
await queue.add('calculate-allocations', { periodId });
return { status: 'processing' };
```

## Monitoring in Production

### Key Metrics to Track

1. **Response Times**
   - P50, P95, P99
   - Track trends over time
   - Alert on degradation

2. **Throughput**
   - Requests per second
   - Compare to capacity
   - Plan for scaling

3. **Error Rate**
   - Failed requests
   - Database errors
   - Timeout errors

4. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Database connections
   - Disk I/O

### Prometheus Metrics

Already implemented in `packages/api/src/monitoring/metrics.ts`:

```typescript
// Response time histogram
http_request_duration_seconds

// Request count
http_requests_total

// Error count
http_errors_total

// Database pool
db_pool_active_connections
db_pool_idle_connections
```

### Grafana Dashboards

Already implemented in `monitoring/grafana/dashboards/`:

- API Overview: Response times, throughput, errors
- Business Metrics: Contributions, allocations, periods

## Load Testing Strategy

### Development
- Run load tests locally before merge
- Target: All tests pass

### Staging
- Run load tests on staging before production deploy
- Target: All tests pass
- Verify with production-like data volume

### Production
- Monitor key metrics continuously
- Run load tests periodically (off-peak hours)
- Alert on degradation

### Before Release
- [ ] All load tests pass
- [ ] P95 < 500ms for queries
- [ ] Period close < 60s
- [ ] No bottlenecks identified
- [ ] Optimization recommendations addressed
- [ ] Monitoring dashboards configured
- [ ] Alerts configured

## Troubleshooting

### Test Failures

**P95 > 500ms:**
1. Check database indexes
2. Review query plans with EXPLAIN
3. Look for N+1 queries
4. Check database server resources

**Period close > 60s:**
1. Profile allocation calculation
2. Check transaction overhead
3. Review event publishing
4. Consider batching updates

**Low throughput:**
1. Check connection pool size
2. Review server resources
3. Look for blocking operations
4. Check for lock contention

### Test Environment

Ensure test environment is representative:
- Similar database size
- Similar server resources
- Similar network latency
- Isolated from other loads

## References

- [Prometheus Monitoring](../../monitoring/README.md)
- [Database Indexes](../../../schema/README.md)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
