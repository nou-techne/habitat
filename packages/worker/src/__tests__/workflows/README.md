# Workflow End-to-End Tests

End-to-end integration tests for complete workflows (Layer 5 - Flow), verifying the entire contribution → allocation → distribution cycle with real database and event bus.

## Overview

These tests verify that complete business workflows work correctly from start to finish, including:
- State transitions at each step
- Event publication and consumption
- Database updates
- Error handling and recovery
- Cross-workflow integration

## Test File

### `end-to-end.test.ts`

Comprehensive workflow integration tests.

**Test Suites:**

1. **Complete Contribution Workflow**
   - Submission → Approval cycle
   - Rejection handling
   - Event publication verification
   - State transition validation

2. **Period Close Workflow**
   - Close period and calculate totals
   - Handle pending contributions
   - Event publication
   - Status validation

3. **Allocation Calculation Workflow**
   - Calculate based on contributions
   - Apply weighted patronage formula
   - Distribution proportional to contribution
   - Event publication

4. **Distribution Workflow**
   - Distribute allocations
   - Update capital accounts
   - Mark as distributed
   - Event publication

5. **Complete End-to-End Cycle**
   - Full 6-phase workflow
   - Contribution submission
   - Approval
   - Period close
   - Allocation calculation
   - Distribution
   - Capital account update
   - All events recorded

6. **Error Recovery**
   - Failed allocation recovery
   - Retry mechanism
   - State consistency after error

**Example:**
```typescript
it('should process from contribution submission to capital account update', async () => {
  // Phase 1: Submit contributions
  const contrib1 = await submitContribution(member1, 200);
  const contrib2 = await submitContribution(member2, 300);
  
  // Phase 2: Approve contributions
  await approveContribution(contrib1, steward);
  await approveContribution(contrib2, steward);
  
  // Phase 3: Close period
  await periodCloseWorkflow({ periodId });
  
  // Phase 4: Calculate allocations
  // Member 1: 200/500 = 40% → 800
  // Member 2: 300/500 = 60% → 1200
  
  // Phase 5: Distribute
  await allocationDistributionWorkflow({ periodId });
  
  // Phase 6: Verify capital accounts
  expect(await getBalance(member1)).toBe(800);
  expect(await getBalance(member2)).toBe(1200);
  
  // Verify all events recorded
  expect(eventLog).toContainAllExpectedEvents();
});
```

## Complete Workflow Phases

### Phase 1: Contribution Submission

```
Member → Submit Contribution → Database (status: pending)
                             → Publish contribution.submitted event
```

**Database Changes:**
- `contributions` table: New row with status = 'pending'

**Events Published:**
- `contribution.submitted`

### Phase 2: Contribution Approval

```
Steward → Approve Contribution → Database (status: approved)
                                → Publish contribution.approved event
```

**Database Changes:**
- `contributions.status` = 'approved'
- `contributions.approved_by` = steward ID
- `contributions.approved_at` = timestamp

**Events Published:**
- `contribution.approved` or `contribution.rejected`

### Phase 3: Period Close

```
Admin → Close Period → Database (status: closed)
                     → Calculate totals
                     → Publish period.closed event
```

**Database Changes:**
- `allocation_periods.status` = 'closed'
- `allocation_periods.closed_at` = timestamp

**Events Published:**
- `period.closed` with total contributions and count

**Validation:**
- No pending contributions (or handled appropriately)
- Period end date reached

### Phase 4: Allocation Calculation

```
System → Calculate Allocations → Database (allocations table)
                                → Publish allocation.calculated events
```

**Calculation:**
```typescript
// Patronage formula
const totalContributions = sum(approved_contributions);
const memberContribution = sum(member_approved_contributions);
const patronageScore = memberContribution / totalContributions;
const allocationAmount = distributionAmount * patronageScore;

// With weights
const laborWeight = 1.0;
const capitalWeight = 0.5;
const weightedContribution = 
  (laborAmount * laborWeight) + 
  (capitalAmount * capitalWeight);
```

**Database Changes:**
- `allocations` table: New rows for each member
- `allocations.status` = 'calculated'
- `allocations.patronage_score` = calculated score
- `allocations.amount` = calculated amount

**Events Published:**
- `allocation.calculated` (one per member)

### Phase 5: Distribution

```
System → Distribute Allocations → Database (allocations + capital_accounts)
                                 → Publish allocation.distributed events
```

**Database Changes:**
- `allocations.status` = 'distributed'
- `allocations.distributed_at` = timestamp
- `capital_accounts.balance` += allocation amount

**Events Published:**
- `allocation.distributed` (one per member)

### Phase 6: Payment (Future)

```
System → Initiate Payment → Payment Provider
                          → Publish payment.initiated
                          → Await confirmation
                          → Publish payment.completed
```

**Database Changes:**
- `payments` table: New row (if implemented)
- Payment status tracking

**Events Published:**
- `payment.initiated`
- `payment.completed`

## Running Tests

```bash
# Run all workflow tests
pnpm test workflows

# Run specific test
pnpm test end-to-end

# Watch mode
pnpm test workflows --watch

# With verbose output
pnpm test workflows --verbose
```

## Test Requirements

### Database

Real PostgreSQL test database:

```bash
export DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test
```

### RabbitMQ

Real RabbitMQ for event bus:

```bash
export RABBITMQ_URL=amqp://localhost
```

### Schema Applied

All schema files must be applied:

```bash
psql $DATABASE_URL < schema/01_treasury_core.sql
psql $DATABASE_URL < schema/02_people_core.sql
psql $DATABASE_URL < schema/03_agreements_core.sql
psql $DATABASE_URL < schema/04_relationships.sql
psql $DATABASE_URL < schema/05_capital_accounts.sql
psql $DATABASE_URL < schema/06_processed_events.sql
```

## Test Data

Tests create and clean up their own data:

**Members:**
- Test Member 1 (role: member)
- Test Member 2 (role: member)
- Test Steward (role: steward)

**Each Test:**
- Creates fresh allocation period
- Creates contributions as needed
- Cleans up after completion

## Assertions

### State Transitions

```typescript
// Contribution state
expect(contribution.status).toBe('pending'); // After submission
expect(contribution.status).toBe('approved'); // After approval

// Period state
expect(period.status).toBe('open'); // Initially
expect(period.status).toBe('closed'); // After close
expect(period.closed_at).toBeTruthy(); // Timestamp set

// Allocation state
expect(allocation.status).toBe('calculated'); // After calculation
expect(allocation.status).toBe('distributed'); // After distribution
expect(allocation.distributed_at).toBeTruthy(); // Timestamp set
```

### Event Recording

```typescript
// Check event recorded in processed_events
const events = await pool.query(
  'SELECT * FROM processed_events WHERE event_type = $1 AND payload @> $2::jsonb',
  [EventType.ContributionApproved, JSON.stringify({ contributionId })]
);
expect(events.rows.length).toBeGreaterThanOrEqual(1);

// Check event status
expect(events.rows[0].status).toBe('success');
```

### Calculations

```typescript
// Allocation amounts sum correctly
const total = await pool.query(
  'SELECT SUM(amount::numeric) as total FROM allocations WHERE period_id = $1',
  [periodId]
);
expect(parseFloat(total.rows[0].total)).toBe(distributionAmount);

// Patronage scores sum to 1.0
const scores = await pool.query(
  'SELECT SUM(patronage_score::numeric) as total FROM allocations WHERE period_id = $1',
  [periodId]
);
expect(parseFloat(scores.rows[0].total)).toBeCloseTo(1.0, 2);
```

### Capital Accounts

```typescript
// Balance updated correctly
const account = await pool.query(
  'SELECT balance FROM capital_accounts WHERE member_id = $1',
  [memberId]
);
expect(parseFloat(account.rows[0].balance)).toBe(expectedAmount);
```

## Error Scenarios

### Workflow Failures

```typescript
it('should handle calculation failure and retry', async () => {
  // Simulate failure
  await pool.query(`
    INSERT INTO processed_events (event_id, event_type, status, error_message)
    VALUES ('evt_fail', 'allocation.calculated', 'error', 'Calculation failed')
  `);
  
  // Retry
  await pool.query(
    'UPDATE processed_events SET status = $1 WHERE event_id = $2',
    ['pending', 'evt_fail']
  );
  
  // Re-run workflow
  await allocationCalculationWorkflow({ periodId });
  
  // Verify success
  const event = await pool.query(
    'SELECT status FROM processed_events WHERE event_id = $1',
    ['evt_fail']
  );
  expect(event.rows[0].status).toBe('success');
});
```

### Invalid State Transitions

```typescript
it('should not close period with pending contributions', async () => {
  // Create pending contribution
  await createContribution({ status: 'pending' });
  
  // Attempt to close
  await expect(
    periodCloseWorkflow({ periodId })
  ).rejects.toThrow(/pending/i);
});
```

### Concurrent Modifications

```typescript
it('should handle concurrent allocation calculations', async () => {
  // Start two calculations simultaneously
  await Promise.all([
    allocationCalculationWorkflow({ periodId }),
    allocationCalculationWorkflow({ periodId }),
  ]);
  
  // Verify only one set of allocations created (idempotency)
  const count = await pool.query(
    'SELECT COUNT(*) FROM allocations WHERE period_id = $1',
    [periodId]
  );
  expect(parseInt(count.rows[0].count)).toBe(expectedCount);
});
```

## Timing and Delays

Tests include deliberate delays for asynchronous operations:

```typescript
// Publish event
await eventBus.publish(event);

// Wait for event processing
await new Promise(resolve => setTimeout(resolve, 500));

// Check results
const result = await pool.query(...);
```

**Why?** Events are processed asynchronously by workers. Tests must wait for processing to complete.

**Alternative:** Use polling with timeout:

```typescript
async function waitForEvent(eventId: string, maxWait = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const result = await pool.query(
      'SELECT status FROM processed_events WHERE event_id = $1',
      [eventId]
    );
    if (result.rows.length > 0 && result.rows[0].status !== 'pending') {
      return result.rows[0];
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Event ${eventId} not processed within ${maxWait}ms`);
}
```

## Debugging

### Enable Verbose Logging

```bash
LOG_LEVEL=debug pnpm test workflows
```

### View Event Log

```typescript
// In test
const events = await pool.query(`
  SELECT event_id, event_type, status, processed_at, error_message
  FROM processed_events
  WHERE event_id LIKE 'e2e_%'
  ORDER BY processed_at
`);
console.table(events.rows);
```

### Check Workflow State

```typescript
// Contributions
const contribs = await pool.query(
  'SELECT id, status, amount FROM contributions WHERE period_id = $1',
  [periodId]
);
console.table(contribs.rows);

// Allocations
const allocs = await pool.query(
  'SELECT id, member_id, amount, status FROM allocations WHERE period_id = $1',
  [periodId]
);
console.table(allocs.rows);

// Capital accounts
const accounts = await pool.query(
  'SELECT member_id, balance FROM capital_accounts'
);
console.table(accounts.rows);
```

## When Tests Fail

### State Not Updated

```
Expected contribution.status to be 'approved'
Received: 'pending'
```

**Check:**
- Was approval workflow called?
- Was database update executed?
- Check transaction rollbacks
- Verify no errors in logs

### Events Not Recorded

```
Expected 2 allocation.calculated events
Received: 0
```

**Check:**
- Was event published to RabbitMQ?
- Is worker processing events?
- Check processed_events table
- Look for errors in worker logs

### Amounts Don't Match

```
Expected capital account balance to be 800
Received: 0
```

**Check:**
- Was distribution workflow run?
- Were allocations created?
- Was balance calculation correct?
- Check for rounding errors

## Best Practices

1. **Test complete flows** - Don't test individual steps in isolation
2. **Use real dependencies** - Real database, real event bus
3. **Verify state at each phase** - Check database after every step
4. **Verify all events** - Ensure events published and recorded
5. **Test error cases** - Failures, retries, invalid states
6. **Clean up thoroughly** - Delete test data after each test
7. **Make tests deterministic** - Control all inputs and timing
8. **Document assumptions** - Explain calculation formulas and expected outcomes

## References

- [Workflow Patterns](https://www.workflowpatterns.com/)
- [Integration Testing Best Practices](https://martinfowler.com/bliki/IntegrationTest.html)
- [Event-Driven Architecture Testing](https://microservices.io/patterns/testing/service-integration-contract-test.html)
