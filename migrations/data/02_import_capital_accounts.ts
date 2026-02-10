/**
 * Capital Account Import Script
 * 
 * Imports capital accounts from CSV file with validation
 * 
 * Usage:
 *   tsx 02_import_capital_accounts.ts --source capital_accounts.csv --dry-run
 *   tsx 02_import_capital_accounts.ts --source capital_accounts.csv
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Pool } = pg;

interface CapitalAccountRow {
  member_email: string;
  balance: string;
  tax_basis: string;
  notes?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateCapitalAccount(account: CapitalAccountRow, index: number): ValidationResult {
  const errors: string[] = [];
  
  // Email validation
  if (!account.member_email) {
    errors.push(`Row ${index + 1}: Missing member_email`);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.member_email)) {
    errors.push(`Row ${index + 1}: Invalid email format: ${account.member_email}`);
  }
  
  // Balance validation
  const balance = parseFloat(account.balance);
  if (!account.balance || isNaN(balance)) {
    errors.push(`Row ${index + 1}: Invalid balance: ${account.balance}`);
  } else if (balance < 0) {
    errors.push(`Row ${index + 1}: Balance cannot be negative: ${account.balance}`);
  }
  
  // Tax basis validation
  const taxBasis = parseFloat(account.tax_basis);
  if (!account.tax_basis || isNaN(taxBasis)) {
    errors.push(`Row ${index + 1}: Invalid tax_basis: ${account.tax_basis}`);
  } else if (taxBasis < 0) {
    errors.push(`Row ${index + 1}: Tax basis cannot be negative: ${account.tax_basis}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function importCapitalAccounts(sourceFile: string, dryRun: boolean = false) {
  console.log('='.repeat(60));
  console.log('Capital Account Import');
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
  }) as CapitalAccountRow[];
  
  console.log(`✓ Parsed ${records.length} records\n`);
  
  // Validate format
  console.log('Validating records...');
  const allErrors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const result = validateCapitalAccount(records[i], i);
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
    
    // Show summary
    const totalBalance = records.reduce((sum, r) => sum + parseFloat(r.balance), 0);
    const totalTaxBasis = records.reduce((sum, r) => sum + parseFloat(r.tax_basis), 0);
    
    console.log('Summary:');
    console.log(`  Total records: ${records.length}`);
    console.log(`  Total balance: $${totalBalance.toFixed(2)}`);
    console.log(`  Total tax basis: $${totalTaxBasis.toFixed(2)}`);
    console.log(`  Average balance: $${(totalBalance / records.length).toFixed(2)}`);
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
    let updated = 0;
    
    for (const account of records) {
      // Get member ID
      const memberResult = await pool.query(
        'SELECT id FROM members WHERE email = $1',
        [account.member_email]
      );
      const memberId = memberResult.rows[0].id;
      
      const result = await pool.query(`
        INSERT INTO capital_accounts (member_id, balance, tax_basis)
        VALUES ($1, $2, $3)
        ON CONFLICT (member_id) DO UPDATE
        SET balance = EXCLUDED.balance,
            tax_basis = EXCLUDED.tax_basis,
            last_updated = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [memberId, account.balance, account.tax_basis]);
      
      if (result.rows[0].inserted) {
        imported++;
      } else {
        updated++;
      }
    }
    
    console.log(`✓ Imported ${imported} new capital accounts`);
    if (updated > 0) {
      console.log(`✓ Updated ${updated} existing capital accounts`);
    }
    console.log();
    
    // Verify
    console.log('Verifying import...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM capital_accounts');
    const sumResult = await pool.query('SELECT SUM(balance::numeric) as total FROM capital_accounts');
    console.log(`✓ Total capital accounts in database: ${countResult.rows[0].count}`);
    console.log(`✓ Total capital balance: $${parseFloat(sumResult.rows[0].total).toFixed(2)}`);
    
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
  console.error('Usage: tsx 02_import_capital_accounts.ts --source <file.csv> [--dry-run]');
  process.exit(1);
}

const sourceFile = args[sourceIndex + 1];

importCapitalAccounts(sourceFile, dryRun).catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
