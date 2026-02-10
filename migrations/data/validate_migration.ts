/**
 * Migration Validation Script
 * 
 * Validates data integrity after migration
 * 
 * Usage:
 *   tsx validate_migration.ts
 */

import pg from 'pg';

const { Pool } = pg;

interface Check {
  name: string;
  query: string;
  expectedCount: number;
  errorMessage: string;
}

const checks: Check[] = [
  {
    name: 'Valid email formats',
    query: `
      SELECT COUNT(*) as count FROM members
      WHERE email !~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
    `,
    expectedCount: 0,
    errorMessage: 'Some members have invalid email formats',
  },
  {
    name: 'Orphaned capital accounts',
    query: `
      SELECT COUNT(*) as count FROM capital_accounts ca
      LEFT JOIN members m ON ca.member_id = m.id
      WHERE m.id IS NULL
    `,
    expectedCount: 0,
    errorMessage: 'Some capital accounts have no corresponding member',
  },
  {
    name: 'Orphaned contributions',
    query: `
      SELECT COUNT(*) as count FROM contributions c
      LEFT JOIN members m ON c.member_id = m.id
      LEFT JOIN allocation_periods p ON c.period_id = p.id
      WHERE m.id IS NULL OR p.id IS NULL
    `,
    expectedCount: 0,
    errorMessage: 'Some contributions have invalid member or period references',
  },
  {
    name: 'Negative capital account balances',
    query: `
      SELECT COUNT(*) as count FROM capital_accounts
      WHERE balance::numeric < 0
    `,
    expectedCount: 0,
    errorMessage: 'Some capital accounts have negative balances',
  },
  {
    name: 'Approved contributions without timestamps',
    query: `
      SELECT COUNT(*) as count FROM contributions
      WHERE status = 'approved' AND approved_at IS NULL
    `,
    expectedCount: 0,
    errorMessage: 'Some approved contributions are missing approved_at timestamps',
  },
  {
    name: 'Invalid contribution amounts',
    query: `
      SELECT COUNT(*) as count FROM contributions
      WHERE amount::numeric <= 0
    `,
    expectedCount: 0,
    errorMessage: 'Some contributions have zero or negative amounts',
  },
  {
    name: 'Invalid member roles',
    query: `
      SELECT COUNT(*) as count FROM members
      WHERE role NOT IN ('member', 'steward', 'admin')
    `,
    expectedCount: 0,
    errorMessage: 'Some members have invalid roles',
  },
  {
    name: 'Invalid member status',
    query: `
      SELECT COUNT(*) as count FROM members
      WHERE status NOT IN ('active', 'inactive', 'pending')
    `,
    expectedCount: 0,
    errorMessage: 'Some members have invalid status values',
  },
  {
    name: 'Invalid contribution types',
    query: `
      SELECT COUNT(*) as count FROM contributions
      WHERE contribution_type NOT IN ('labor', 'capital', 'property')
    `,
    expectedCount: 0,
    errorMessage: 'Some contributions have invalid types',
  },
  {
    name: 'Invalid contribution status',
    query: `
      SELECT COUNT(*) as count FROM contributions
      WHERE status NOT IN ('pending', 'approved', 'rejected')
    `,
    expectedCount: 0,
    errorMessage: 'Some contributions have invalid status values',
  },
];

async function validateMigration() {
  console.log('='.repeat(60));
  console.log('Migration Validation');
  console.log('='.repeat(60));
  console.log();
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    let allPassed = true;
    const failures: string[] = [];
    
    // Run checks
    console.log('Running validation checks...\n');
    
    for (const check of checks) {
      try {
        const result = await pool.query(check.query);
        const count = parseInt(result.rows[0].count);
        
        if (count === check.expectedCount) {
          console.log(`✓ ${check.name}`);
        } else {
          console.log(`✗ ${check.name}`);
          console.log(`  Expected: ${check.expectedCount}, Found: ${count}`);
          console.log(`  ${check.errorMessage}`);
          allPassed = false;
          failures.push(check.name);
        }
      } catch (error) {
        console.log(`✗ ${check.name}`);
        console.log(`  Error running check: ${error instanceof Error ? error.message : String(error)}`);
        allPassed = false;
        failures.push(check.name);
      }
    }
    
    console.log();
    
    // Summary statistics
    console.log('Database Statistics:');
    
    const memberCount = await pool.query('SELECT COUNT(*) as count FROM members');
    console.log(`  Members: ${memberCount.rows[0].count}`);
    
    const capitalAccountCount = await pool.query('SELECT COUNT(*) as count FROM capital_accounts');
    console.log(`  Capital Accounts: ${capitalAccountCount.rows[0].count}`);
    
    const contributionCount = await pool.query('SELECT COUNT(*) as count FROM contributions');
    console.log(`  Contributions: ${contributionCount.rows[0].count}`);
    
    const periodCount = await pool.query('SELECT COUNT(*) as count FROM allocation_periods');
    console.log(`  Allocation Periods: ${periodCount.rows[0].count}`);
    
    const totalBalance = await pool.query('SELECT COALESCE(SUM(balance::numeric), 0) as total FROM capital_accounts');
    console.log(`  Total Capital Balance: $${parseFloat(totalBalance.rows[0].total).toFixed(2)}`);
    
    const totalContributions = await pool.query(`
      SELECT COALESCE(SUM(amount::numeric), 0) as total 
      FROM contributions 
      WHERE status = 'approved'
    `);
    console.log(`  Total Approved Contributions: $${parseFloat(totalContributions.rows[0].total).toFixed(2)}`);
    
    console.log();
    console.log('='.repeat(60));
    
    if (allPassed) {
      console.log('✓ All validation checks passed');
      console.log('='.repeat(60));
      console.log();
      console.log('Migration validation complete - data is ready for use');
    } else {
      console.log('✗ Some validation checks failed');
      console.log('='.repeat(60));
      console.log();
      console.log('Failed checks:');
      failures.forEach(f => console.log(`  - ${f}`));
      console.log();
      console.log('Please review and fix data issues before proceeding');
      process.exit(1);
    }
    
  } finally {
    await pool.end();
  }
}

validateMigration().catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
