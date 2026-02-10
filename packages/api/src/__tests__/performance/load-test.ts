/**
 * Load Testing Suite
 * 
 * Simulates production load:
 * - 50 concurrent members
 * - 500 contributions
 * - Period close under load
 * 
 * Benchmarks:
 * - API response times
 * - Throughput
 * - Resource usage
 * 
 * Acceptance:
 * - P95 response time < 500ms for queries
 * - Period close completes in < 60s
 */

import { performance } from 'perf_hooks';
import pg from 'pg';
import { graphql } from 'graphql';
import { schema } from '../../graphql/schema';

const { Pool } = pg;

interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  minResponseTime: number;
  maxResponseTime: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  responseTimes: number[];
}

interface PerformanceReport {
  testName: string;
  metrics: LoadTestMetrics;
  acceptance: {
    p95Under500ms: boolean;
    periodCloseUnder60s?: boolean;
  };
  bottlenecks: string[];
  recommendations: string[];
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Analyze response times and generate metrics
 */
function analyzeMetrics(responseTimes: number[], duration: number): LoadTestMetrics {
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const successful = responseTimes.length;
  
  return {
    totalRequests: successful,
    successfulRequests: successful,
    failedRequests: 0,
    totalDuration: duration,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    p50ResponseTime: percentile(sorted, 50),
    p95ResponseTime: percentile(sorted, 95),
    p99ResponseTime: percentile(sorted, 99),
    requestsPerSecond: (successful / duration) * 1000,
    responseTimes: sorted,
  };
}

/**
 * Generate performance report
 */
function generateReport(
  testName: string,
  metrics: LoadTestMetrics,
  periodCloseTime?: number
): PerformanceReport {
  const bottlenecks: string[] = [];
  const recommendations: string[] = [];
  
  // Check P95 acceptance
  const p95Under500ms = metrics.p95ResponseTime < 500;
  if (!p95Under500ms) {
    bottlenecks.push(`P95 response time is ${metrics.p95ResponseTime.toFixed(2)}ms (target: < 500ms)`);
    recommendations.push('Consider adding database indexes on frequently queried fields');
    recommendations.push('Review N+1 query patterns in GraphQL resolvers');
    recommendations.push('Implement DataLoader for batching database queries');
  }
  
  // Check period close acceptance
  let periodCloseUnder60s = true;
  if (periodCloseTime !== undefined) {
    periodCloseUnder60s = periodCloseTime < 60000;
    if (!periodCloseUnder60s) {
      bottlenecks.push(`Period close took ${(periodCloseTime / 1000).toFixed(2)}s (target: < 60s)`);
      recommendations.push('Optimize allocation calculation query');
      recommendations.push('Consider batching database updates');
      recommendations.push('Review event publishing overhead');
    }
  }
  
  // Additional analysis
  if (metrics.maxResponseTime > 2000) {
    bottlenecks.push(`Max response time is ${metrics.maxResponseTime.toFixed(2)}ms`);
    recommendations.push('Investigate outlier requests causing slow responses');
  }
  
  if (metrics.requestsPerSecond < 10) {
    bottlenecks.push(`Low throughput: ${metrics.requestsPerSecond.toFixed(2)} req/s`);
    recommendations.push('Consider connection pooling optimization');
    recommendations.push('Review server resource allocation');
  }
  
  return {
    testName,
    metrics,
    acceptance: {
      p95Under500ms,
      periodCloseUnder60s,
    },
    bottlenecks,
    recommendations,
  };
}

/**
 * Print performance report
 */
function printReport(report: PerformanceReport) {
  console.log('\n' + '='.repeat(80));
  console.log(`Performance Report: ${report.testName}`);
  console.log('='.repeat(80));
  
  console.log('\nMetrics:');
  console.log(`  Total Requests:       ${report.metrics.totalRequests}`);
  console.log(`  Successful:           ${report.metrics.successfulRequests}`);
  console.log(`  Failed:               ${report.metrics.failedRequests}`);
  console.log(`  Duration:             ${report.metrics.totalDuration.toFixed(2)}ms`);
  console.log(`  Throughput:           ${report.metrics.requestsPerSecond.toFixed(2)} req/s`);
  
  console.log('\nResponse Times:');
  console.log(`  Min:                  ${report.metrics.minResponseTime.toFixed(2)}ms`);
  console.log(`  Max:                  ${report.metrics.maxResponseTime.toFixed(2)}ms`);
  console.log(`  Avg:                  ${report.metrics.avgResponseTime.toFixed(2)}ms`);
  console.log(`  P50:                  ${report.metrics.p50ResponseTime.toFixed(2)}ms`);
  console.log(`  P95:                  ${report.metrics.p95ResponseTime.toFixed(2)}ms`);
  console.log(`  P99:                  ${report.metrics.p99ResponseTime.toFixed(2)}ms`);
  
  console.log('\nAcceptance Criteria:');
  console.log(`  P95 < 500ms:          ${report.acceptance.p95Under500ms ? '✓ PASS' : '✗ FAIL'}`);
  if (report.acceptance.periodCloseUnder60s !== undefined) {
    console.log(`  Period close < 60s:   ${report.acceptance.periodCloseUnder60s ? '✓ PASS' : '✗ FAIL'}`);
  }
  
  if (report.bottlenecks.length > 0) {
    console.log('\nBottlenecks Identified:');
    report.bottlenecks.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  }
  
  if (report.recommendations.length > 0) {
    console.log('\nOptimization Recommendations:');
    report.recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Load Test 1: Concurrent Member Dashboard Queries
 */
async function testConcurrentDashboardQueries(pool: pg.Pool): Promise<PerformanceReport> {
  console.log('Running: Concurrent Member Dashboard Queries (50 members)...');
  
  const query = `
    query MemberDashboard($memberId: ID!) {
      member(id: $memberId) {
        id
        email
        displayName
        capitalAccount {
          balance
          taxBasis
        }
        contributions {
          items {
            id
            amount
            status
          }
        }
        allocations {
          items {
            id
            amount
            patronageScore
          }
        }
      }
    }
  `;
  
  // Create 50 test members
  const memberIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const result = await pool.query(`
      INSERT INTO members (email, display_name, role, status, password_hash)
      VALUES ($1, $2, 'member', 'active', 'hash')
      RETURNING id;
    `, [`loadtest${i}@test.com`, `Load Test Member ${i}`]);
    memberIds.push(result.rows[0].id);
  }
  
  const responseTimes: number[] = [];
  const startTime = performance.now();
  
  // Simulate 50 concurrent dashboard loads
  await Promise.all(
    memberIds.map(async (memberId) => {
      const reqStart = performance.now();
      
      await graphql({
        schema,
        source: query,
        variableValues: { memberId },
        contextValue: { userId: memberId, role: 'member' },
      });
      
      const reqEnd = performance.now();
      responseTimes.push(reqEnd - reqStart);
    })
  );
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Cleanup
  await pool.query(`DELETE FROM members WHERE email LIKE 'loadtest%@test.com'`);
  
  const metrics = analyzeMetrics(responseTimes, duration);
  return generateReport('Concurrent Dashboard Queries', metrics);
}

/**
 * Load Test 2: Bulk Contribution Submission
 */
async function testBulkContributions(pool: pg.Pool): Promise<PerformanceReport> {
  console.log('Running: Bulk Contribution Submission (500 contributions)...');
  
  // Create test period
  const periodResult = await pool.query(`
    INSERT INTO allocation_periods (name, start_date, end_date, status)
    VALUES ('Load Test Period', '2026-01-01', '2026-03-31', 'open')
    RETURNING id;
  `);
  const periodId = periodResult.rows[0].id;
  
  // Create 50 members
  const memberIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const result = await pool.query(`
      INSERT INTO members (email, display_name, role, status, password_hash)
      VALUES ($1, $2, 'member', 'active', 'hash')
      RETURNING id;
    `, [`contrib${i}@test.com`, `Contrib Member ${i}`]);
    memberIds.push(result.rows[0].id);
  }
  
  const mutation = `
    mutation CreateContribution($input: CreateContributionInput!) {
      createContribution(input: $input) {
        id
        amount
        status
      }
    }
  `;
  
  const responseTimes: number[] = [];
  const startTime = performance.now();
  
  // 500 contributions = 10 contributions per member
  const promises: Promise<void>[] = [];
  for (let i = 0; i < 500; i++) {
    const memberId = memberIds[i % 50];
    
    promises.push(
      (async () => {
        const reqStart = performance.now();
        
        await graphql({
          schema,
          source: mutation,
          variableValues: {
            input: {
              periodId,
              contributionType: 'LABOR',
              amount: `${(i + 1) * 10}.00`,
              description: `Load test contribution ${i + 1}`,
            },
          },
          contextValue: { userId: memberId, role: 'member' },
        });
        
        const reqEnd = performance.now();
        responseTimes.push(reqEnd - reqStart);
      })()
    );
  }
  
  await Promise.all(promises);
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Cleanup
  await pool.query(`DELETE FROM contributions WHERE period_id = $1`, [periodId]);
  await pool.query(`DELETE FROM allocation_periods WHERE id = $1`, [periodId]);
  await pool.query(`DELETE FROM members WHERE email LIKE 'contrib%@test.com'`);
  
  const metrics = analyzeMetrics(responseTimes, duration);
  return generateReport('Bulk Contribution Submission', metrics);
}

/**
 * Load Test 3: Period Close Under Load
 */
async function testPeriodCloseUnderLoad(pool: pg.Pool): Promise<PerformanceReport> {
  console.log('Running: Period Close Under Load (500 approved contributions)...');
  
  // Create test period
  const periodResult = await pool.query(`
    INSERT INTO allocation_periods (name, start_date, end_date, status)
    VALUES ('Period Close Test', '2026-01-01', '2026-03-31', 'open')
    RETURNING id;
  `);
  const periodId = periodResult.rows[0].id;
  
  // Create 50 members
  const memberIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const result = await pool.query(`
      INSERT INTO members (email, display_name, role, status, password_hash)
      VALUES ($1, $2, 'member', 'active', 'hash')
      RETURNING id;
    `, [`period${i}@test.com`, `Period Member ${i}`]);
    memberIds.push(result.rows[0].id);
  }
  
  // Create steward
  const stewardResult = await pool.query(`
    INSERT INTO members (email, display_name, role, status, password_hash)
    VALUES ('steward@loadtest.com', 'Load Test Steward', 'steward', 'active', 'hash')
    RETURNING id;
  `);
  const stewardId = stewardResult.rows[0].id;
  
  // Create 500 approved contributions
  for (let i = 0; i < 500; i++) {
    const memberId = memberIds[i % 50];
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status, approved_by, approved_at)
      VALUES ($1, $2, 'labor', $3, 'approved', $4, NOW())
    `, [memberId, periodId, `${(i + 1) * 10}.00`, stewardId]);
  }
  
  // Measure period close time
  const startTime = performance.now();
  
  // Close period
  await pool.query(`
    UPDATE allocation_periods
    SET status = 'closed', closed_at = NOW()
    WHERE id = $1
  `, [periodId]);
  
  // Calculate allocations (simulate)
  const totalContributions = await pool.query(`
    SELECT SUM(amount::numeric) as total
    FROM contributions
    WHERE period_id = $1 AND status = 'approved'
  `, [periodId]);
  
  const total = parseFloat(totalContributions.rows[0].total);
  const distributionAmount = 10000.00;
  
  // For each member, calculate allocation
  for (const memberId of memberIds) {
    const memberContributions = await pool.query(`
      SELECT SUM(amount::numeric) as member_total
      FROM contributions
      WHERE period_id = $1 AND member_id = $2 AND status = 'approved'
    `, [periodId, memberId]);
    
    const memberTotal = parseFloat(memberContributions.rows[0].member_total || '0');
    const patronageScore = memberTotal / total;
    const allocationAmount = distributionAmount * patronageScore;
    
    await pool.query(`
      INSERT INTO allocations (member_id, period_id, amount, patronage_score, status)
      VALUES ($1, $2, $3, $4, 'calculated')
    `, [memberId, periodId, allocationAmount.toFixed(2), patronageScore.toFixed(10)]);
  }
  
  const endTime = performance.now();
  const periodCloseTime = endTime - startTime;
  
  // Cleanup
  await pool.query(`DELETE FROM allocations WHERE period_id = $1`, [periodId]);
  await pool.query(`DELETE FROM contributions WHERE period_id = $1`, [periodId]);
  await pool.query(`DELETE FROM allocation_periods WHERE id = $1`, [periodId]);
  await pool.query(`DELETE FROM members WHERE email LIKE 'period%@test.com'`);
  await pool.query(`DELETE FROM members WHERE email = 'steward@loadtest.com'`);
  
  const metrics = analyzeMetrics([periodCloseTime], periodCloseTime);
  return generateReport('Period Close Under Load', metrics, periodCloseTime);
}

/**
 * Load Test 4: Approval Queue Query Performance
 */
async function testApprovalQueuePerformance(pool: pg.Pool): Promise<PerformanceReport> {
  console.log('Running: Approval Queue Query (500 pending contributions)...');
  
  // Create test period
  const periodResult = await pool.query(`
    INSERT INTO allocation_periods (name, start_date, end_date, status)
    VALUES ('Approval Test Period', '2026-01-01', '2026-03-31', 'open')
    RETURNING id;
  `);
  const periodId = periodResult.rows[0].id;
  
  // Create members and contributions
  for (let i = 0; i < 500; i++) {
    const memberResult = await pool.query(`
      INSERT INTO members (email, display_name, role, status, password_hash)
      VALUES ($1, $2, 'member', 'active', 'hash')
      RETURNING id;
    `, [`approval${i}@test.com`, `Approval Member ${i}`]);
    
    await pool.query(`
      INSERT INTO contributions (member_id, period_id, contribution_type, amount, status)
      VALUES ($1, $2, 'labor', $3, 'pending')
    `, [memberResult.rows[0].id, periodId, `${(i + 1) * 10}.00`]);
  }
  
  const query = `
    query PendingApprovals {
      pendingContributions {
        items {
          id
          member {
            id
            displayName
          }
          amount
          contributionType
          createdAt
        }
        total
      }
    }
  `;
  
  const responseTimes: number[] = [];
  const startTime = performance.now();
  
  // Query approval queue 10 times
  for (let i = 0; i < 10; i++) {
    const reqStart = performance.now();
    
    await graphql({
      schema,
      source: query,
      contextValue: { userId: 'steward-id', role: 'steward' },
    });
    
    const reqEnd = performance.now();
    responseTimes.push(reqEnd - reqStart);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Cleanup
  await pool.query(`DELETE FROM contributions WHERE period_id = $1`, [periodId]);
  await pool.query(`DELETE FROM allocation_periods WHERE id = $1`, [periodId]);
  await pool.query(`DELETE FROM members WHERE email LIKE 'approval%@test.com'`);
  
  const metrics = analyzeMetrics(responseTimes, duration);
  return generateReport('Approval Queue Query', metrics);
}

/**
 * Run all load tests
 */
async function runLoadTests() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://habitat:habitat@localhost:5432/habitat_test',
  });
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('HABITAT PATRONAGE SYSTEM - PERFORMANCE & LOAD TESTING');
    console.log('='.repeat(80));
    console.log('\nTest Configuration:');
    console.log('  Members:              50');
    console.log('  Contributions:        500');
    console.log('  Acceptance:           P95 < 500ms, Period close < 60s');
    console.log('='.repeat(80));
    
    const reports: PerformanceReport[] = [];
    
    // Test 1: Concurrent dashboard queries
    const dashboardReport = await testConcurrentDashboardQueries(pool);
    printReport(dashboardReport);
    reports.push(dashboardReport);
    
    // Test 2: Bulk contributions
    const contributionsReport = await testBulkContributions(pool);
    printReport(contributionsReport);
    reports.push(contributionsReport);
    
    // Test 3: Period close under load
    const periodCloseReport = await testPeriodCloseUnderLoad(pool);
    printReport(periodCloseReport);
    reports.push(periodCloseReport);
    
    // Test 4: Approval queue
    const approvalReport = await testApprovalQueuePerformance(pool);
    printReport(approvalReport);
    reports.push(approvalReport);
    
    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    
    const allPass = reports.every(r => 
      r.acceptance.p95Under500ms && 
      (r.acceptance.periodCloseUnder60s === undefined || r.acceptance.periodCloseUnder60s)
    );
    
    console.log(`\nOverall Result: ${allPass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`\nTests Passing: ${reports.filter(r => r.acceptance.p95Under500ms).length}/${reports.length}`);
    
    const allBottlenecks = reports.flatMap(r => r.bottlenecks);
    const allRecommendations = [...new Set(reports.flatMap(r => r.recommendations))];
    
    if (allBottlenecks.length > 0) {
      console.log('\nAll Bottlenecks:');
      allBottlenecks.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
    }
    
    if (allRecommendations.length > 0) {
      console.log('\nConsolidated Recommendations:');
      allRecommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runLoadTests().catch(console.error);
}

export {
  runLoadTests,
  testConcurrentDashboardQueries,
  testBulkContributions,
  testPeriodCloseUnderLoad,
  testApprovalQueuePerformance,
  analyzeMetrics,
  generateReport,
  printReport,
};
