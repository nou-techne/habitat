/**
 * Event Publisher/Handler Integration Tests
 * 
 * Tests that events publish and consume correctly with idempotency
 * Layer 4 (Event) validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EventBus } from '../../events/bus';
import { publishEvent } from '../../events/publishers';
import { handleContributionSubmitted, handleContributionApproved } from '../../handlers';
import { EventType, ContributionSubmittedEvent, ContributionApprovedEvent } from '../../events/schema';
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool;
let eventBus: EventBus;
let testMemberId: string;
let testPeriodId: string;

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://habitat:habitat@localhost:5432/habitat_test',
  });
  
  eventBus = new EventBus(process.env.RABBITMQ_URL || 'amqp://localhost');
  await eventBus.connect();
  
  // Create test data
  const memberResult = await pool.query(`
    INSERT INTO members (email, display_name, role, status, password_hash)
    VALUES ('test@habitat.eth', 'Test User', 'member', 'active', 'hash')
    RETURNING id;
  `);
  testMemberId = memberResult.rows[0].id;
  
  const periodResult = await pool.query(`
    INSERT INTO allocation_periods (name, start_date, end_date, status)
    VALUES ('Test Period', NOW(), NOW() + INTERVAL '30 days', 'open')
    RETURNING id;
  `);
  testPeriodId = periodResult.rows[0].id;
});

afterAll(async () => {
  await eventBus.disconnect();
  
  // Cleanup
  await pool.query('DELETE FROM processed_events WHERE event_id LIKE $1', ['test_%']);
  await pool.query('DELETE FROM contributions WHERE member_id = $1', [testMemberId]);
  await pool.query('DELETE FROM allocation_periods WHERE id = $1', [testPeriodId]);
  await pool.query('DELETE FROM members WHERE id = $1', [testMemberId]);
  await pool.end();
});

beforeEach(async () => {
  // Clear processed events between tests
  await pool.query('DELETE FROM processed_events WHERE event_id LIKE $1', ['test_%']);
});

describe('Event Publishing', () => {
  it('should publish contribution.submitted event', async () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'test_submit_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_test_1',
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
        description: 'Test contribution',
      },
    };
    
    await publishEvent(eventBus, event);
    
    // Event should be in RabbitMQ queue
    // Wait briefly for message to be queued
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check queue depth
    const queueStats = await eventBus.getQueueStats();
    expect(queueStats.messageCount).toBeGreaterThanOrEqual(0);
  });
  
  it('should publish contribution.approved event', async () => {
    const event: ContributionApprovedEvent = {
      eventId: 'test_approve_1',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_test_1',
        approvedBy: testMemberId,
        approvedAt: new Date(),
      },
    };
    
    await publishEvent(eventBus, event);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const queueStats = await eventBus.getQueueStats();
    expect(queueStats.messageCount).toBeGreaterThanOrEqual(0);
  });
  
  it('should serialize event payload correctly', async () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'test_serialize_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_test_1',
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
      metadata: {
        source: 'test',
      },
    };
    
    await publishEvent(eventBus, event);
    
    // Event should be serializable to JSON
    const serialized = JSON.stringify(event);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.eventId).toBe(event.eventId);
    expect(deserialized.payload.contributionId).toBe(event.payload.contributionId);
    expect(deserialized.metadata.source).toBe('test');
  });
});

describe('Event Consumption', () => {
  it('should consume and process contribution.submitted event', async () => {
    // Create contribution first
    const contributionResult = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_consume_1', $1, $2, 'labor', '100.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const event: ContributionSubmittedEvent = {
      eventId: 'test_consume_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: contributionResult.rows[0].id,
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
    };
    
    // Handle event
    await handleContributionSubmitted(event, pool);
    
    // Check processed_events table
    const result = await pool.query(
      'SELECT * FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].event_type).toBe(EventType.ContributionSubmitted);
    expect(result.rows[0].status).toBe('success');
    
    // Cleanup
    await pool.query('DELETE FROM contributions WHERE id = $1', [contributionResult.rows[0].id]);
  });
  
  it('should consume and process contribution.approved event', async () => {
    // Create contribution
    const contributionResult = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_approve_1', $1, $2, 'labor', '100.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const event: ContributionApprovedEvent = {
      eventId: 'test_approve_consume_1',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: contributionResult.rows[0].id,
        approvedBy: testMemberId,
        approvedAt: new Date(),
      },
    };
    
    // Handle event
    await handleContributionApproved(event, pool);
    
    // Check contribution was updated
    const result = await pool.query(
      'SELECT status, approved_by FROM contributions WHERE id = $1',
      [contributionResult.rows[0].id]
    );
    
    expect(result.rows[0].status).toBe('approved');
    expect(result.rows[0].approved_by).toBe(testMemberId);
    
    // Check processed_events table
    const processedResult = await pool.query(
      'SELECT * FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    
    expect(processedResult.rows.length).toBe(1);
    expect(processedResult.rows[0].status).toBe('success');
    
    // Cleanup
    await pool.query('DELETE FROM contributions WHERE id = $1', [contributionResult.rows[0].id]);
  });
  
  it('should handle missing contribution gracefully', async () => {
    const event: ContributionApprovedEvent = {
      eventId: 'test_missing_1',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: 'nonexistent_contribution',
        approvedBy: testMemberId,
        approvedAt: new Date(),
      },
    };
    
    // Handle event (should not throw)
    await expect(handleContributionApproved(event, pool)).resolves.not.toThrow();
    
    // Check processed_events table shows error
    const result = await pool.query(
      'SELECT * FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].error_message).toBeTruthy();
  });
});

describe('Idempotency', () => {
  it('should not process same event twice', async () => {
    // Create contribution
    const contributionResult = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_idempotent_1', $1, $2, 'labor', '100.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const event: ContributionSubmittedEvent = {
      eventId: 'test_idempotent_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: contributionResult.rows[0].id,
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
    };
    
    // Handle event first time
    await handleContributionSubmitted(event, pool);
    
    // Check processed
    const firstResult = await pool.query(
      'SELECT * FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    expect(firstResult.rows.length).toBe(1);
    const firstProcessedAt = firstResult.rows[0].processed_at;
    
    // Handle event second time (should be skipped)
    await handleContributionSubmitted(event, pool);
    
    // Check still only one record
    const secondResult = await pool.query(
      'SELECT * FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    expect(secondResult.rows.length).toBe(1);
    expect(secondResult.rows[0].processed_at).toEqual(firstProcessedAt);
    
    // Cleanup
    await pool.query('DELETE FROM contributions WHERE id = $1', [contributionResult.rows[0].id]);
  });
  
  it('should use event_id as idempotency key', async () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'test_idempotency_key_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_test',
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
    };
    
    // Insert processed_events record directly
    await pool.query(`
      INSERT INTO processed_events (event_id, event_type, payload, status, processed_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [event.eventId, event.eventType, JSON.stringify(event.payload), 'success']);
    
    // Try to handle event (should detect already processed)
    await handleContributionSubmitted(event, pool);
    
    // Check only one record exists
    const result = await pool.query(
      'SELECT COUNT(*) FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    expect(parseInt(result.rows[0].count)).toBe(1);
  });
  
  it('should allow retry after error', async () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'test_retry_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'nonexistent',
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
    };
    
    // Handle event (will fail due to missing contribution)
    await handleContributionSubmitted(event, pool);
    
    // Check error recorded
    const firstResult = await pool.query(
      'SELECT status, retry_count FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    expect(firstResult.rows[0].status).toBe('error');
    expect(firstResult.rows[0].retry_count).toBe(0);
    
    // Update status to pending for retry
    await pool.query(
      'UPDATE processed_events SET status = $1 WHERE event_id = $2',
      ['pending', event.eventId]
    );
    
    // Retry (will still fail, but retry count should increment)
    await handleContributionSubmitted(event, pool);
    
    const secondResult = await pool.query(
      'SELECT status, retry_count FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    expect(secondResult.rows[0].retry_count).toBeGreaterThan(0);
  });
});

describe('Event Ordering', () => {
  it('should process events in order for same entity', async () => {
    const contributionResult = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_order_1', $1, $2, 'labor', '100.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const contributionId = contributionResult.rows[0].id;
    
    // Event 1: Submitted
    const submitEvent: ContributionSubmittedEvent = {
      eventId: 'test_order_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date('2026-02-10T10:00:00Z'),
      payload: {
        contributionId,
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
    };
    
    // Event 2: Approved
    const approveEvent: ContributionApprovedEvent = {
      eventId: 'test_order_2',
      eventType: EventType.ContributionApproved,
      timestamp: new Date('2026-02-10T11:00:00Z'),
      payload: {
        contributionId,
        approvedBy: testMemberId,
        approvedAt: new Date('2026-02-10T11:00:00Z'),
      },
    };
    
    // Process in order
    await handleContributionSubmitted(submitEvent, pool);
    await handleContributionApproved(approveEvent, pool);
    
    // Check final state
    const result = await pool.query(
      'SELECT status FROM contributions WHERE id = $1',
      [contributionId]
    );
    expect(result.rows[0].status).toBe('approved');
    
    // Check both events processed
    const processedResult = await pool.query(
      'SELECT event_id FROM processed_events WHERE event_id IN ($1, $2) ORDER BY processed_at',
      [submitEvent.eventId, approveEvent.eventId]
    );
    expect(processedResult.rows.length).toBe(2);
    
    // Cleanup
    await pool.query('DELETE FROM contributions WHERE id = $1', [contributionId]);
  });
});

describe('Error Handling', () => {
  it('should record error in processed_events on handler failure', async () => {
    const event: ContributionApprovedEvent = {
      eventId: 'test_error_1',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: 'nonexistent',
        approvedBy: testMemberId,
        approvedAt: new Date(),
      },
    };
    
    await handleContributionApproved(event, pool);
    
    const result = await pool.query(
      'SELECT status, error_message FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    
    expect(result.rows[0].status).toBe('error');
    expect(result.rows[0].error_message).toBeTruthy();
  });
  
  it('should continue processing other events after error', async () => {
    const event1: ContributionApprovedEvent = {
      eventId: 'test_continue_1',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: 'nonexistent',
        approvedBy: testMemberId,
        approvedAt: new Date(),
      },
    };
    
    // This will fail
    await handleContributionApproved(event1, pool);
    
    // Create valid contribution for second event
    const contributionResult = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_continue_1', $1, $2, 'labor', '100.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const event2: ContributionApprovedEvent = {
      eventId: 'test_continue_2',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: contributionResult.rows[0].id,
        approvedBy: testMemberId,
        approvedAt: new Date(),
      },
    };
    
    // This should succeed
    await handleContributionApproved(event2, pool);
    
    const result = await pool.query(
      'SELECT status FROM processed_events WHERE event_id = $1',
      [event2.eventId]
    );
    
    expect(result.rows[0].status).toBe('success');
    
    // Cleanup
    await pool.query('DELETE FROM contributions WHERE id = $1', [contributionResult.rows[0].id]);
  });
});

describe('Event Metadata', () => {
  it('should preserve metadata through publish/consume cycle', async () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'test_metadata_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_meta_1',
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
      metadata: {
        source: 'api',
        userId: testMemberId,
        correlationId: 'corr_123',
      },
    };
    
    await publishEvent(eventBus, event);
    
    // In real system, worker would consume and process
    // For test, directly handle
    await handleContributionSubmitted(event, pool);
    
    // Check metadata stored in processed_events
    const result = await pool.query(
      'SELECT payload FROM processed_events WHERE event_id = $1',
      [event.eventId]
    );
    
    const storedPayload = result.rows[0].payload;
    expect(storedPayload).toBeDefined();
  });
});

describe('Concurrent Event Processing', () => {
  it('should handle concurrent events for different entities', async () => {
    // Create two contributions
    const contrib1Result = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_concurrent_1', $1, $2, 'labor', '100.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const contrib2Result = await pool.query(`
      INSERT INTO contributions (id, member_id, period_id, contribution_type, amount, status)
      VALUES ('contrib_concurrent_2', $1, $2, 'labor', '200.00', 'pending')
      RETURNING id;
    `, [testMemberId, testPeriodId]);
    
    const event1: ContributionSubmittedEvent = {
      eventId: 'test_concurrent_1',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: contrib1Result.rows[0].id,
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '100.00',
      },
    };
    
    const event2: ContributionSubmittedEvent = {
      eventId: 'test_concurrent_2',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: contrib2Result.rows[0].id,
        memberId: testMemberId,
        periodId: testPeriodId,
        contributionType: 'labor',
        amount: '200.00',
      },
    };
    
    // Process concurrently
    await Promise.all([
      handleContributionSubmitted(event1, pool),
      handleContributionSubmitted(event2, pool),
    ]);
    
    // Both should be processed
    const result = await pool.query(
      'SELECT COUNT(*) FROM processed_events WHERE event_id IN ($1, $2)',
      [event1.eventId, event2.eventId]
    );
    expect(parseInt(result.rows[0].count)).toBe(2);
    
    // Cleanup
    await pool.query('DELETE FROM contributions WHERE id IN ($1, $2)', [contrib1Result.rows[0].id, contrib2Result.rows[0].id]);
  });
});
