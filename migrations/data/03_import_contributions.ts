/**
 * Contribution Import Script
 * 
 * Imports historical contributions from CSV file with validation
 * 
 * Usage:
 *   tsx 03_import_contributions.ts --source contributions.csv --dry-run
 *   tsx 03_import_contributions.ts --source contributions.csv
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Pool } = pg;

interface ContributionRow {
  member_email: string;
  period_name: string;
  contribution_type: 'labor' | 'capital' | 'property';
  amount: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateContribution(contribution: ContributionRow, index: number): ValidationResult {
  const errors: string[] = [];
  
  // Email validation
  if (!contribution.member_email) {
    errors.push(`Row ${index + 1}: Missing member_email`);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contribution.member_email)) {
    errors.push(`Row ${index + 1}: Invalid email format: ${contribution.member_email}`);
  }
  
  // Period validation
  if (!contribution.period_name) {
    errors.push(`Row ${index + 1}: Missing period_name`);
  }
  
  // Type validation
  if (!['labor', 'capital', 'property'].includes(contribution.contribution_type)) {
    errors.push(`Row ${index + 1}: Invalid contribution_type: ${contribution.contribution_type} (must be labor, capital, or property)`);
  }
  
  // Amount validation
  const amount = parseFloat(contribution.amount);
  if (!contribution.amount || isNaN(amount)) {
    errors.push(`Row ${index + 1}: Invalid amount: ${contribution.amount}`);
  } else if (amount <= 0) {
    errors.push(`Row ${index + 1}: Amount must be positive: ${contribution.amount}`);
  }
  
  // Description validation
  if (!contribution.description || contribution.description.trim().length === 0) {
    errors.push(`Row ${index + 1}: Missing description`);
  }
  
  // Status validation
  if (!['pending', 'approved', 'rejected'].includes(contribution.status)) {
    errors.push(`Row ${index + 1}: Invalid status: ${contribution.status} (must be pending, approved, or rejected)`);
  }
  
  // Approved timestamp validation
  if (contribution.status === 'approved' && !contribution.approved_at) {
    errors.push(`Row ${index + 1}: Approved contributions must have approved_at timestamp`);
  }
  
  if (contribution.approved_at && !/^\d{4}-\d{2}-\d{2}/.test(contribution.approved_at)) {
    errors.push(`Row ${index + 1}: Invalid approved_at format: ${contribution.approved_at} (expected YYYY-MM-DD or ISO 8601)`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function importContributions(sourceFile: string, dryRun: boolean = false) {
  console.log('='.repeat(60));
  console.log('Contribution Import');
  console.log('='.repeat(60));
  console.log();
  
  // Check source file exists
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }
  
  // Parse CSV
  console.log(`Reading ${sourceFile}...`);
  const fileContent = fs.readFileSync(sourceFile, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as ContributionRow[];
  
  console.log(`✓ Parsed ${records.length} records\n`);
  
  // Validate format
  console.log('Validating records...');
  const allErrors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const result = validateContribution(records[i], i);
    if (!result.valid) {
      allErrors.push(...result.errors);
    }
  }
  
  if (allErrors.length > 0) {
    console.error('✗ Validation failed:\n');
    allErrors.forEach(error => console.error(`  ${error}`));
    throw new Error('Validation failed');
  }
  
  console.log('✓ All records valid\n');
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Validate member references
    console.log('Validating member references...');
    for (let i = 0; i < records.length; i++) {
      const memberCheck = await pool.query(
        'SELECT id FROM members WHERE email = $1',
        [records[i].member_email]
      );
      if (memberCheck.rows.length === 0) {
        allErrors.push(`Row ${i + 1}: Member not found: ${records[i].member_email}`);
      }
    }
    
    if (allErrors.length > 0) {
      console.error('✗ Member validation failed:\n');
      allErrors.forEach(error => console.error(`  ${error}`));
      throw new Error('Member validation failed - import members first');
    }
    
    console.log('✓ All member references valid\n');
    
    // Validate period references
    console.log('Validating period references...');
    const uniquePeriods = [...new Set(records.map(r => r.period_name))];
    const periodMap = new Map<string, string>();
    
    for (const periodName of uniquePeriods) {
      const periodCheck = await pool.query(
        'SELECT id FROM allocation_periods WHERE name = $1',
        [periodName]
      );
      if (periodCheck.rows.length === 0) {
        allErrors.push(`Period not found: ${periodName} (create period first)`);
      } else {
        periodMap.set(periodName, periodCheck.rows[0].id);
      }
    }
    
    if (allErrors.length > 0) {
      console.error('✗ Period validation failed:\n');
      allErrors.forEach(error => console.error(`  ${error}`));
      throw new Error('Period validation failed - create periods first');
    }
    
    console.log('✓ All period references valid\n');
    
    // Show summary
    const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const byType = {
      labor: records.filter(r => r.contribution_type === 'labor').length,
      capital: records.filter(r => r.contribution_type === 'capital').length,
      property: records.filter(r => r.contribution_type === 'property').length,
    };
    const byStatus = {
      pending: records.filter(r => r.status === 'pending').length,
      approved: records.filter(r => r.status === 'approved').length,
      rejected: records.filter(r => r.status === 'rejected').length,
    };
    
    console.log('Summary:');
    console.log(`  Total records: ${records.length}`);
    console.log(`  Total amount: $${totalAmount.toFixed(2)}`);
    console.log(`  By type: ${byType.labor} labor, ${byType.capital} capital, ${byType.property} property`);
    console.log(`  By status: ${byStatus.approved} approved, ${byStatus.pending} pending, ${byStatus.rejected} rejected`);
    console.log();
    
    if (dryRun) {
      console.log('Dry run - no data imported');
      console.log('\nSample records:');
      console.table(records.slice(0, Math.min(5, records.length)));
      return;
    }
    
    // Import
    console.log('Importing to database...');
    let imported = 0;
    
    for (const contribution of records) {
      // Get member ID
      const memberResult = await pool.query(
        'SELECT id FROM members WHERE email = $1',
        [contribution.member_email]
      );
      const memberId = memberResult.rows[0].id;
      
      // Get period ID
      const periodId = periodMap.get(contribution.period_name);
      
      await pool.query(`
        INSERT INTO contributions (
          member_id, period_id, contribution_type, amount, description, status, approved_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        memberId,
        periodId,
        contribution.contribution_type,
        contribution.amount,
        contribution.description,
        contribution.status,
        contribution.approved_at || null,
      ]);
      
      imported++;
    }
    
    console.log(`✓ Imported ${imported} contributions`);
    console.log();
    
    // Verify
    console.log('Verifying import...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM contributions');
    const sumResult = await pool.query('SELECT SUM(amount::numeric) as total FROM contributions WHERE status = $1', ['approved']);
    console.log(`✓ Total contributions in database: ${countResult.rows[0].count}`);
    console.log(`✓ Total approved amount: $${parseFloat(sumResult.rows[0].total || 0).toFixed(2)}`);
    
  } finally {
    await pool.end();
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('Import complete');
  console.log('='.repeat(60));
}

// CLI
const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source');
const dryRun = args.includes('--dry-run');

if (sourceIndex === -1 || !args[sourceIndex + 1]) {
  console.error('Usage: tsx 03_import_contributions.ts --source <file.csv> [--dry-run]');
  process.exit(1);
}

const sourceFile = args[sourceIndex + 1];

importContributions(sourceFile, dryRun).catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
