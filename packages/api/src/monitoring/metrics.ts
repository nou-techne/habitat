/**
 * Prometheus Metrics for API Server
 * 
 * Tracks API performance, errors, and business metrics
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// Create registry
export const register = new Registry();

// HTTP Request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// GraphQL metrics
export const graphqlOperationDuration = new Histogram({
  name: 'graphql_operation_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation_name', 'operation_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const graphqlOperationTotal = new Counter({
  name: 'graphql_operations_total',
  help: 'Total number of GraphQL operations',
  labelNames: ['operation_name', 'operation_type', 'status'],
  registers: [register],
});

export const graphqlErrors = new Counter({
  name: 'graphql_errors_total',
  help: 'Total number of GraphQL errors',
  labelNames: ['operation_name', 'error_type'],
  registers: [register],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current size of database connection pool',
  labelNames: ['state'], // 'idle' or 'active'
  registers: [register],
});

export const dbQueryErrors = new Counter({
  name: 'db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['query_type', 'error_type'],
  registers: [register],
});

// Authentication metrics
export const authAttempts = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result'], // 'success' or 'failure'
  registers: [register],
});

export const authTokensIssued = new Counter({
  name: 'auth_tokens_issued_total',
  help: 'Total number of authentication tokens issued',
  labelNames: ['token_type'], // 'access' or 'refresh'
  registers: [register],
});

export const authTokensRevoked = new Counter({
  name: 'auth_tokens_revoked_total',
  help: 'Total number of authentication tokens revoked',
  registers: [register],
});

// Rate limiting metrics
export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limit_type', 'user_id'],
  registers: [register],
});

export const rateLimitRemaining = new Gauge({
  name: 'rate_limit_remaining',
  help: 'Remaining rate limit quota',
  labelNames: ['limit_type', 'user_id'],
  registers: [register],
});

// Business metrics - Contributions
export const contributionsSubmitted = new Counter({
  name: 'contributions_submitted_total',
  help: 'Total number of contributions submitted',
  labelNames: ['contribution_type'],
  registers: [register],
});

export const contributionsApproved = new Counter({
  name: 'contributions_approved_total',
  help: 'Total number of contributions approved',
  labelNames: ['contribution_type'],
  registers: [register],
});

export const contributionsRejected = new Counter({
  name: 'contributions_rejected_total',
  help: 'Total number of contributions rejected',
  labelNames: ['contribution_type'],
  registers: [register],
});

export const contributionsPending = new Gauge({
  name: 'contributions_pending',
  help: 'Current number of pending contributions',
  labelNames: ['contribution_type'],
  registers: [register],
});

export const contributionAmount = new Histogram({
  name: 'contribution_amount_usd',
  help: 'Contribution amount in USD',
  labelNames: ['contribution_type'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  registers: [register],
});

// Business metrics - Members
export const membersActive = new Gauge({
  name: 'members_active',
  help: 'Current number of active members',
  registers: [register],
});

export const membersTotal = new Gauge({
  name: 'members_total',
  help: 'Total number of members',
  registers: [register],
});

export const membersRegistered = new Counter({
  name: 'members_registered_total',
  help: 'Total number of members registered',
  registers: [register],
});

// Business metrics - Allocations
export const allocationsCalculated = new Counter({
  name: 'allocations_calculated_total',
  help: 'Total number of allocations calculated',
  registers: [register],
});

export const allocationsDistributed = new Counter({
  name: 'allocations_distributed_total',
  help: 'Total number of allocations distributed',
  registers: [register],
});

export const allocationAmount = new Histogram({
  name: 'allocation_amount_usd',
  help: 'Allocation amount in USD',
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  registers: [register],
});

// Business metrics - Periods
export const periodsActive = new Gauge({
  name: 'periods_active',
  help: 'Current number of active allocation periods',
  registers: [register],
});

export const periodsClosed = new Counter({
  name: 'periods_closed_total',
  help: 'Total number of allocation periods closed',
  registers: [register],
});

export const periodDuration = new Histogram({
  name: 'period_duration_days',
  help: 'Duration of allocation periods in days',
  buckets: [7, 14, 30, 60, 90, 180, 365],
  registers: [register],
});

// System metrics
export const systemUptime = new Gauge({
  name: 'system_uptime_seconds',
  help: 'System uptime in seconds',
  registers: [register],
});

export const systemMemoryUsage = new Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type'], // 'rss', 'heapTotal', 'heapUsed', 'external'
  registers: [register],
});

// Default metrics (CPU, memory, event loop, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register, prefix: 'habitat_' });

// Update system metrics
const startTime = Date.now();
setInterval(() => {
  systemUptime.set((Date.now() - startTime) / 1000);
  
  const mem = process.memoryUsage();
  systemMemoryUsage.labels('rss').set(mem.rss);
  systemMemoryUsage.labels('heapTotal').set(mem.heapTotal);
  systemMemoryUsage.labels('heapUsed').set(mem.heapUsed);
  systemMemoryUsage.labels('external').set(mem.external);
}, 10000); // Update every 10 seconds
