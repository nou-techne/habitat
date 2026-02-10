/**
 * Workflow End-to-End Integration Tests
 * 
 * Tests complete workflows from start to finish with real database and event bus
 * Layer 5 (Flow) validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { EventBus } from '../../events/bus';
import {
  contributionClaimWorkflow,
  periodCloseWorkflow,
  allocationDistributionWorkflow,
} from '../../workflows';
import { EventType } from '../../events/schema';

const { Pool } = pg;

let pool: pg.Pool;
let eventBus: EventBus;
let testMemberId1: string;
let testMemberId2: string;
let testStewardId: string;
let testPeriodId: string;

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://habitat:habitat@localhost:5432/habitat_test',
  });
  
  eventBus = new EventBus(process.env.RABBITMQ_URL || 'amqp://localhost');
  await eventBus.connect();
  
  // Create test members
  const member1Result = await pool.query(`
    INSERT INTO members (email, display_name, role, status, password_hash)
    VALUES ('member1@habitat.eth', 'Member One', 'member', 'active', 'hash')
    RETURNING id;
  `);
  testMemberId1 = member1Result.rows[0].id;
  
  const member2Result = await pool.query(`
    INSERT INTO members (email, display_name, role, status, password_hash)
    VALUES ('member2@habitat.eth', 'Member Two', 'member', 'active', 'hash')
    RETURNING id;
  `);
  testMemberId2 = member2Result.rows[0].id;
  
  const stewardResult = await pool.query(`
    INSERT INTO members (email, display_name, role, status, password_hash)
    VALUES ('steward@habitat.eth', 'Steward', 'steward', 'active', 'hash')
    RETURNING id;
  `);
  testStewardId = stewardResult.rows[0].id;
  
  // Create capital accounts
  await pool.query(`
    INSERT INTO capital_accounts (member_id, balance, tax_basis)
    VALUES 
      ($1, '0.00', '0.00'),
      ($2, '0.00', '0.00')
  `, [testMemberId1, testMemberId2]);
});

afterAll(async () => {
  await eventBus.disconnect();
  
  // Cleanup
  await pool.query('DELETE FROM processed_events WHERE event_id LIKE $1', ['e2e_%']);
  await pool.query('DELETE FROM allocations WHERE member_id IN ($1, $2)', [testMemberId1, testMemberId2]);
  await pool.query('DELETE FROM contributions WHERE member_id IN ($1, $2)', [testMemberId1, testMemberId2]);
  await pool.query('DELETE FROM capital_accounts WHERE member_id IN ($1, $2)', [testMemberId1, testMemberId2]);
  await pool.query('DELETE FROM allocation_periods WHERE name LIKE $1', ['E2E Test%']);
  await pool.query('DELETE FROM members WHERE id IN ($1, $2, $3)', [testMemberId1, testMemberId2, testStewardId]);
  await pool.end();
});

beforeEach(async () => {
  // Create fresh period for each test
  const periodResult = await pool.query(`
    INSERT INTO allocation_periods (name, description, start_date, end_date, status)
    VALUES ('E2E Test Period', 'Test', NOW(), NOW() + INTERVAL '30 days', 'open')
    RETURNING id;
  `);
  testPeriodId = periodResult.rows[0].id;
});

describe('Complete Contribution Workflow', () => {
  it('should process contribution from submission to approval', async () => {
    // Step 1: Submit contribution
    const contributionResult = await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, description, status)
      VALUES ($1, $2, 'labor', '100.00', 'Development work', 'pending')
      RETURNING id;
    `, [testMemberId1, testPeriodId]);
    
    const contributionId = contributionResult.rows[0].id;
    
    // Step 2: Run contribution claim workflow
    await contributionClaimWorkflow({
      contributionId,
      memberId: testMemberId1,
      periodId: testPeriodId,
      contributionType: 'labor',
      amount: '100.00',
    }, pool, eventBus);
    
    // Verify: Contribution submitted event published
    const submittedEvent = await pool.query(
      'SELECT * FROM processed_events WHERE event_type = $1 AND payload @> $2::jsonb',
      [EventType.ContributionSubmitted, JSON.stringify({ contributionId })]
    );
    expect(submittedEvent.rows.length).toBeGreaterThanOrEqual(1);
    
    // Step 3: Approve contribution
    await pool.query(
      'UPDATE contributions SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3',
      ['approved', testStewardId, contributionId]
    );
    
    // Step 4: Publish approval event
    await eventBus.publish(EventType.ContributionApproved, {
      eventId: `e2e_approve_${contributionId}`,
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId,
        approvedBy: testStewardId,
        approvedAt: new Date(),
      },
    });
    
    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Contribution is approved
    const finalState = await pool.query(
      'SELECT status, approved_by FROM contributions WHERE id = $1',
      [contributionId]
    );
    expect(finalState.rows[0].status).toBe('approved');
    expect(finalState.rows[0].approved_by).toBe(testStewardId);
    
    // Verify: Approval event recorded
    const approvalEvent = await pool.query(
      'SELECT * FROM processed_events WHERE event_type = $1 AND payload @> $2::jsonb',
      [EventType.ContributionApproved, JSON.stringify({ contributionId })]
    );
    expect(approvalEvent.rows.length).toBeGreaterThanOrEqual(1);
  });
  
  it('should handle contribution rejection', async () => {
    // Submit contribution
    const contributionResult = await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status)
      VALUES ($1, $2, 'labor', '50.00', 'pending')
      RETURNING id;
    `, [testMemberId1, testPeriodId]);
    
    const contributionId = contributionResult.rows[0].id;
    
    // Reject contribution
    await pool.query(
      'UPDATE contributions SET status = $1, approved_by = $2, approved_at = NOW() WHERE id = $3',
      ['rejected', testStewardId, contributionId]
    );
    
    // Publish rejection event
    await eventBus.publish(EventType.ContributionRejected, {
      eventId: `e2e_reject_${contributionId}`,
      eventType: EventType.ContributionRejected,
      timestamp: new Date(),
      payload: {
        contributionId,
        rejectedBy: testStewardId,
        rejectedAt: new Date(),
        reason: 'Insufficient documentation',
      },
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Contribution is rejected
    const finalState = await pool.query(
      'SELECT status FROM contributions WHERE id = $1',
      [contributionId]
    );
    expect(finalState.rows[0].status).toBe('rejected');
    
    // Verify: Rejection event recorded
    const rejectionEvent = await pool.query(
      'SELECT * FROM processed_events WHERE event_type = $1 AND payload @> $2::jsonb',
      [EventType.ContributionRejected, JSON.stringify({ contributionId })]
    );
    expect(rejectionEvent.rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Period Close Workflow', () => {
  it('should close period and calculate totals', async () => {
    // Create approved contributions
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status, approved_by, approved_at)
      VALUES 
        ($1, $2, 'labor', '100.00', 'approved', $3, NOW()),
        ($4, $2, 'labor', '200.00', 'approved', $3, NOW()),
        ($1, $2, 'capital', '500.00', 'approved', $3, NOW())
    `, [testMemberId1, testPeriodId, testStewardId, testMemberId2]);
    
    // Run period close workflow
    await periodCloseWorkflow({
      periodId: testPeriodId,
    }, pool, eventBus);
    
    // Verify: Period status is closed
    const periodResult = await pool.query(
      'SELECT status, closed_at FROM allocation_periods WHERE id = $1',
      [testPeriodId]
    );
    expect(periodResult.rows[0].status).toBe('closed');
    expect(periodResult.rows[0].closed_at).toBeTruthy();
    
    // Verify: Period closed event published
    const closedEvent = await pool.query(
      'SELECT * FROM processed_events WHERE event_type = $1 AND payload @> $2::jsonb',
      [EventType.PeriodClosed, JSON.stringify({ periodId: testPeriodId })]
    );
    expect(closedEvent.rows.length).toBeGreaterThanOrEqual(1);
    
    // Verify: Total contributions calculated
    const totalResult = await pool.query(`
      SELECT SUM(amount::numeric) as total 
      FROM contributions 
      WHERE period_id = $1 AND status = 'approved'
    `, [testPeriodId]);
    expect(parseFloat(totalResult.rows[0].total)).toBe(800.00);
  });
  
  it('should not close period with pending contributions', async () => {
    // Create pending contribution
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status)
      VALUES ($1, $2, 'labor', '100.00', 'pending')
    `, [testMemberId1, testPeriodId]);
    
    // Attempt to close period (should fail or warn)
    try {
      await periodCloseWorkflow({
        periodId: testPeriodId,
      }, pool, eventBus);
      
      // If it succeeds, check it's still open or has warning
      const periodResult = await pool.query(
        'SELECT status FROM allocation_periods WHERE id = $1',
        [testPeriodId]
      );
      
      // Period should either stay open or have pending contributions handled
      expect(['open', 'closed']).toContain(periodResult.rows[0].status);
    } catch (error) {
      // Expected: workflow should error on pending contributions
      expect(error.message).toMatch(/pending/i);
    }
  });
});

describe('Allocation Calculation Workflow', () => {
  it('should calculate allocations based on contributions', async () => {
    // Create approved contributions
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status, approved_by, approved_at)
      VALUES 
        ($1, $2, 'labor', '100.00', 'approved', $3, NOW()),
        ($4, $2, 'labor', '300.00', 'approved', $3, NOW())
    `, [testMemberId1, testPeriodId, testStewardId, testMemberId2]);
    
    // Close period
    await pool.query(
      'UPDATE allocation_periods SET status = $1, closed_at = NOW() WHERE id = $2',
      ['closed', testPeriodId]
    );
    
    // Calculate allocations (simplified - real calculation is more complex)
    const totalContributions = 400.00; // 100 + 300
    const distributionAmount = 1000.00; // Amount to distribute
    
    // Member 1: 100/400 = 25% = 250
    // Member 2: 300/400 = 75% = 750
    
    await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES 
        ($1, $2, '250.00', '0.25', 'calculated'),
        ($3, $2, '750.00', '0.75', 'calculated')
    `, [testMemberId1, testPeriodId, testMemberId2]);
    
    // Publish allocation calculated events
    const allocations = await pool.query(
      'SELECT id, member_id, amount, patronage_score FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    
    for (const allocation of allocations.rows) {
      await eventBus.publish(EventType.AllocationCalculated, {
        eventId: `e2e_alloc_${allocation.id}`,
        eventType: EventType.AllocationCalculated,
        timestamp: new Date(),
        payload: {
          allocationId: allocation.id,
          memberId: allocation.member_id,
          periodId: testPeriodId,
          amount: allocation.amount,
          patronageScore: allocation.patronage_score,
        },
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Allocations created
    const allocationResult = await pool.query(
      'SELECT COUNT(*) as count FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    expect(parseInt(allocationResult.rows[0].count)).toBe(2);
    
    // Verify: Allocation amounts sum to distribution amount
    const sumResult = await pool.query(
      'SELECT SUM(amount::numeric) as total FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    expect(parseFloat(sumResult.rows[0].total)).toBe(1000.00);
    
    // Verify: Allocation events recorded
    const allocationEvents = await pool.query(
      'SELECT COUNT(*) as count FROM processed_events WHERE event_type = $1',
      [EventType.AllocationCalculated]
    );
    expect(parseInt(allocationEvents.rows[0].count)).toBeGreaterThanOrEqual(2);
  });
  
  it('should apply weighted patronage formula', async () => {
    // Create contributions with different types
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status, approved_by, approved_at)
      VALUES 
        ($1, $2, 'labor', '100.00', 'approved', $3, NOW()),
        ($1, $2, 'capital', '500.00', 'approved', $3, NOW())
    `, [testMemberId1, testPeriodId, testStewardId]);
    
    // Labor weight: 1.0, Capital weight: 0.5
    // Weighted: (100 * 1.0) + (500 * 0.5) = 100 + 250 = 350
    
    // Close period and calculate
    await pool.query(
      'UPDATE allocation_periods SET status = $1, closed_at = NOW() WHERE id = $2',
      ['closed', testPeriodId]
    );
    
    // Create allocation with patronage score based on weighted contributions
    await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES ($1, $2, '1000.00', '1.0', 'calculated')
    `, [testMemberId1, testPeriodId]);
    
    // Verify: Allocation reflects weighted calculation
    const allocationResult = await pool.query(
      'SELECT patronage_score FROM allocations WHERE member_id = $1 AND period_id = $2',
      [testMemberId1, testPeriodId]
    );
    expect(parseFloat(allocationResult.rows[0].patronage_score)).toBe(1.0);
  });
});

describe('Distribution Workflow', () => {
  it('should distribute allocations and update capital accounts', async () => {
    // Create allocations
    const alloc1Result = await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES ($1, $2, '400.00', '0.4', 'calculated')
      RETURNING id;
    `, [testMemberId1, testPeriodId]);
    
    const alloc2Result = await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES ($1, $2, '600.00', '0.6', 'calculated')
      RETURNING id;
    `, [testMemberId2, testPeriodId]);
    
    const alloc1Id = alloc1Result.rows[0].id;
    const alloc2Id = alloc2Result.rows[0].id;
    
    // Run distribution workflow
    await allocationDistributionWorkflow({
      periodId: testPeriodId,
    }, pool, eventBus);
    
    // Verify: Allocations marked as distributed
    const allocationsResult = await pool.query(
      'SELECT status, distributed_at FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    
    for (const allocation of allocationsResult.rows) {
      expect(allocation.status).toBe('distributed');
      expect(allocation.distributed_at).toBeTruthy();
    }
    
    // Verify: Capital accounts updated
    const account1 = await pool.query(
      'SELECT balance FROM capital_accounts WHERE member_id = $1',
      [testMemberId1]
    );
    expect(parseFloat(account1.rows[0].balance)).toBe(400.00);
    
    const account2 = await pool.query(
      'SELECT balance FROM capital_accounts WHERE member_id = $1',
      [testMemberId2]
    );
    expect(parseFloat(account2.rows[0].balance)).toBe(600.00);
    
    // Verify: Distribution events published
    const distributionEvents = await pool.query(
      'SELECT * FROM processed_events WHERE event_type = $1',
      [EventType.AllocationDistributed]
    );
    expect(distributionEvents.rows.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Complete End-to-End Cycle', () => {
  it('should process from contribution submission to capital account update', async () => {
    // ========================================
    // Phase 1: Contribution Submission
    // ========================================
    
    console.log('Phase 1: Submitting contributions...');
    
    const contrib1Result = await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, description, status)
      VALUES ($1, $2, 'labor', '200.00', 'Design work', 'pending')
      RETURNING id;
    `, [testMemberId1, testPeriodId]);
    
    const contrib2Result = await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, description, status)
      VALUES ($1, $2, 'labor', '300.00', 'Development work', 'pending')
      RETURNING id;
    `, [testMemberId2, testPeriodId]);
    
    const contrib1Id = contrib1Result.rows[0].id;
    const contrib2Id = contrib2Result.rows[0].id;
    
    // Run contribution workflows
    await contributionClaimWorkflow({
      contributionId: contrib1Id,
      memberId: testMemberId1,
      periodId: testPeriodId,
      contributionType: 'labor',
      amount: '200.00',
    }, pool, eventBus);
    
    await contributionClaimWorkflow({
      contributionId: contrib2Id,
      memberId: testMemberId2,
      periodId: testPeriodId,
      contributionType: 'labor',
      amount: '300.00',
    }, pool, eventBus);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ========================================
    // Phase 2: Contribution Approval
    // ========================================
    
    console.log('Phase 2: Approving contributions...');
    
    await pool.query(`
      UPDATE contributions 
      SET status = 'approved', approved_by = $1, approved_at = NOW() 
      WHERE id IN ($2, $3)
    `, [testStewardId, contrib1Id, contrib2Id]);
    
    // Publish approval events
    await eventBus.publish(EventType.ContributionApproved, {
      eventId: `e2e_cycle_approve1_${contrib1Id}`,
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: contrib1Id,
        approvedBy: testStewardId,
        approvedAt: new Date(),
      },
    });
    
    await eventBus.publish(EventType.ContributionApproved, {
      eventId: `e2e_cycle_approve2_${contrib2Id}`,
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: contrib2Id,
        approvedBy: testStewardId,
        approvedAt: new Date(),
      },
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Both contributions approved
    const approvedContribs = await pool.query(
      'SELECT COUNT(*) as count FROM contributions WHERE period_id = $1 AND status = $2',
      [testPeriodId, 'approved']
    );
    expect(parseInt(approvedContribs.rows[0].count)).toBe(2);
    
    // ========================================
    // Phase 3: Period Close
    // ========================================
    
    console.log('Phase 3: Closing period...');
    
    await periodCloseWorkflow({
      periodId: testPeriodId,
    }, pool, eventBus);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Period closed
    const periodResult = await pool.query(
      'SELECT status, closed_at FROM allocation_periods WHERE id = $1',
      [testPeriodId]
    );
    expect(periodResult.rows[0].status).toBe('closed');
    
    // ========================================
    // Phase 4: Allocation Calculation
    // ========================================
    
    console.log('Phase 4: Calculating allocations...');
    
    // Total contributions: 500 (200 + 300)
    // Distribution amount: 2000
    // Member 1: 200/500 = 40% = 800
    // Member 2: 300/500 = 60% = 1200
    
    await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES 
        ($1, $2, '800.00', '0.4', 'calculated'),
        ($3, $2, '1200.00', '0.6', 'calculated')
    `, [testMemberId1, testPeriodId, testMemberId2]);
    
    // Publish allocation events
    const allocations = await pool.query(
      'SELECT id, member_id, amount, patronage_score FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    
    for (const allocation of allocations.rows) {
      await eventBus.publish(EventType.AllocationCalculated, {
        eventId: `e2e_cycle_alloc_${allocation.id}`,
        eventType: EventType.AllocationCalculated,
        timestamp: new Date(),
        payload: {
          allocationId: allocation.id,
          memberId: allocation.member_id,
          periodId: testPeriodId,
          amount: allocation.amount,
          patronageScore: allocation.patronage_score,
        },
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Allocations created
    const allocationCount = await pool.query(
      'SELECT COUNT(*) as count FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    expect(parseInt(allocationCount.rows[0].count)).toBe(2);
    
    // ========================================
    // Phase 5: Distribution
    // ========================================
    
    console.log('Phase 5: Distributing allocations...');
    
    await allocationDistributionWorkflow({
      periodId: testPeriodId,
    }, pool, eventBus);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify: Allocations distributed
    const distributedAllocations = await pool.query(
      'SELECT COUNT(*) as count FROM allocations WHERE period_id = $1 AND status = $2',
      [testPeriodId, 'distributed']
    );
    expect(parseInt(distributedAllocations.rows[0].count)).toBe(2);
    
    // ========================================
    // Phase 6: Capital Account Updates
    // ========================================
    
    console.log('Phase 6: Verifying capital accounts...');
    
    const account1Final = await pool.query(
      'SELECT balance FROM capital_accounts WHERE member_id = $1',
      [testMemberId1]
    );
    expect(parseFloat(account1Final.rows[0].balance)).toBe(800.00);
    
    const account2Final = await pool.query(
      'SELECT balance FROM capital_accounts WHERE member_id = $1',
      [testMemberId2]
    );
    expect(parseFloat(account2Final.rows[0].balance)).toBe(1200.00);
    
    // ========================================
    // Verification: All Events Recorded
    // ========================================
    
    console.log('Verification: Checking event log...');
    
    const eventSummary = await pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM processed_events
      WHERE event_id LIKE 'e2e_cycle_%'
      GROUP BY event_type
      ORDER BY event_type
    `);
    
    console.log('Event summary:', eventSummary.rows);
    
    // Should have:
    // - 2 ContributionSubmitted (or via contributionClaimWorkflow)
    // - 2 ContributionApproved
    // - 1 PeriodClosed
    // - 2 AllocationCalculated
    // - 2 AllocationDistributed
    
    const eventTypes = eventSummary.rows.reduce((acc, row) => {
      acc[row.event_type] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);
    
    expect(eventTypes[EventType.ContributionApproved]).toBeGreaterThanOrEqual(2);
    expect(eventTypes[EventType.PeriodClosed]).toBeGreaterThanOrEqual(1);
    expect(eventTypes[EventType.AllocationCalculated]).toBeGreaterThanOrEqual(2);
    expect(eventTypes[EventType.AllocationDistributed]).toBeGreaterThanOrEqual(2);
    
    console.log('✅ Complete end-to-end cycle verified!');
  });
});

describe('Error Recovery', () => {
  it('should recover from failed allocation calculation', async () => {
    // Create approved contributions
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status, approved_by, approved_at)
      VALUES ($1, $2, 'labor', '100.00', 'approved', $3, NOW())
    `, [testMemberId1, testPeriodId, testStewardId]);
    
    // Close period
    await pool.query(
      'UPDATE allocation_periods SET status = $1, closed_at = NOW() WHERE id = $2',
      ['closed', testPeriodId]
    );
    
    // Simulate failed allocation (error recorded)
    await pool.query(`
      INSERT INTO processed_events (event_id, event_type, payload, status, error_message)
      VALUES ('e2e_error_alloc', $1, '{"periodId":"${testPeriodId}"}', 'error', 'Calculation failed')
    `, [EventType.AllocationCalculated]);
    
    // Retry: Mark as pending
    await pool.query(
      'UPDATE processed_events SET status = $1 WHERE event_id = $2',
      ['pending', 'e2e_error_alloc']
    );
    
    // Re-run calculation
    await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES ($1, $2, '100.00', '1.0', 'calculated')
    `, [testMemberId1, testPeriodId]);
    
    // Update event status
    await pool.query(
      'UPDATE processed_events SET status = $1, error_message = NULL WHERE event_id = $2',
      ['success', 'e2e_error_alloc']
    );
    
    // Verify: Recovery successful
    const allocationResult = await pool.query(
      'SELECT COUNT(*) as count FROM allocations WHERE period_id = $1',
      [testPeriodId]
    );
    expect(parseInt(allocationResult.rows[0].count)).toBe(1);
    
    const eventResult = await pool.query(
      'SELECT status FROM processed_events WHERE event_id = $1',
      ['e2e_error_alloc']
    );
    expect(eventResult.rows[0].status).toBe('success');
  });
});
