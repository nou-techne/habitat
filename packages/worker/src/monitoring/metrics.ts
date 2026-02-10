/**
 * Prometheus Metrics for Event Worker
 * 
 * Tracks event processing, queue depth, and worker performance
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

// Create registry
export const register = new Registry();

// Event processing metrics
export const eventsProcessed = new Counter({
  name: 'events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['event_type', 'status'], // 'success' or 'error'
  registers: [register],
});

export const eventProcessingDuration = new Histogram({
  name: 'event_processing_duration_seconds',
  help: 'Duration of event processing in seconds',
  labelNames: ['event_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const eventProcessingErrors = new Counter({
  name: 'event_processing_errors_total',
  help: 'Total number of event processing errors',
  labelNames: ['event_type', 'error_type'],
  registers: [register],
});

// Queue metrics
export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current depth of message queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueProcessingRate = new Gauge({
  name: 'queue_processing_rate',
  help: 'Messages processed per second',
  labelNames: ['queue_name'],
  registers: [register],
});

export const deadLetterQueue = new Counter({
  name: 'dead_letter_queue_total',
  help: 'Total number of messages sent to dead letter queue',
  labelNames: ['queue_name', 'reason'],
  registers: [register],
});

// Workflow metrics
export const workflowsStarted = new Counter({
  name: 'workflows_started_total',
  help: 'Total number of workflows started',
  labelNames: ['workflow_name'],
  registers: [register],
});

export const workflowsCompleted = new Counter({
  name: 'workflows_completed_total',
  help: 'Total number of workflows completed',
  labelNames: ['workflow_name', 'status'], // 'success' or 'error'
  registers: [register],
});

export const workflowDuration = new Histogram({
  name: 'workflow_duration_seconds',
  help: 'Duration of workflow execution in seconds',
  labelNames: ['workflow_name'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

// Retry metrics
export const eventRetries = new Counter({
  name: 'event_retries_total',
  help: 'Total number of event retries',
  labelNames: ['event_type', 'attempt'],
  registers: [register],
});

export const eventRetriesExhausted = new Counter({
  name: 'event_retries_exhausted_total',
  help: 'Total number of events that exhausted retries',
  labelNames: ['event_type'],
  registers: [register],
});

// Idempotency metrics
export const idempotencyHits = new Counter({
  name: 'idempotency_hits_total',
  help: 'Total number of idempotency cache hits',
  labelNames: ['event_type'],
  registers: [register],
});

export const idempotencyMisses = new Counter({
  name: 'idempotency_misses_total',
  help: 'Total number of idempotency cache misses',
  labelNames: ['event_type'],
  registers: [register],
});

// RabbitMQ connection metrics
export const rabbitMQConnected = new Gauge({
  name: 'rabbitmq_connected',
  help: 'RabbitMQ connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

export const rabbitMQReconnections = new Counter({
  name: 'rabbitmq_reconnections_total',
  help: 'Total number of RabbitMQ reconnections',
  registers: [register],
});

// System metrics
export const workerUptime = new Gauge({
  name: 'worker_uptime_seconds',
  help: 'Worker uptime in seconds',
  registers: [register],
});

export const workerMemoryUsage = new Gauge({
  name: 'worker_memory_usage_bytes',
  help: 'Worker memory usage in bytes',
  labelNames: ['type'], // 'rss', 'heapTotal', 'heapUsed', 'external'
  registers: [register],
});

// Default metrics
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register, prefix: 'habitat_worker_' });

// Update system metrics
const startTime = Date.now();
setInterval(() => {
  workerUptime.set((Date.now() - startTime) / 1000);
  
  const mem = process.memoryUsage();
  workerMemoryUsage.labels('rss').set(mem.rss);
  workerMemoryUsage.labels('heapTotal').set(mem.heapTotal);
  workerMemoryUsage.labels('heapUsed').set(mem.heapUsed);
  workerMemoryUsage.labels('external').set(mem.external);
}, 10000);
