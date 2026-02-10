/**
 * Member Import Script
 * 
 * Imports members from CSV file with validation
 * 
 * Usage:
 *   tsx 01_import_members.ts --source members.csv --dry-run
 *   tsx 01_import_members.ts --source members.csv
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Pool } = pg;

interface MemberRow {
  email: string;
  display_name: string;
  ens_name?: string;
  role: 'member' | 'steward' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  joined_at: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateMember(member: MemberRow, index: number): ValidationResult {
  const errors: string[] = [];
  
  // Email validation
  if (!member.email) {
    errors.push(`Row ${index + 1}: Missing email`);
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
    errors.push(`Row ${index + 1}: Invalid email format: ${member.email}`);
  }
  
  // Display name validation
  if (!member.display_name || member.display_name.trim().length === 0) {
    errors.push(`Row ${index + 1}: Missing display_name`);
  }
  
  // Role validation
  if (!['member', 'steward', 'admin'].includes(member.role)) {
    errors.push(`Row ${index + 1}: Invalid role: ${member.role} (must be member, steward, or admin)`);
  }
  
  // Status validation
  if (!['active', 'inactive', 'pending'].includes(member.status)) {
    errors.push(`Row ${index + 1}: Invalid status: ${member.status} (must be active, inactive, or pending)`);
  }
  
  // Joined date validation
  if (!member.joined_at) {
    errors.push(`Row ${index + 1}: Missing joined_at`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(member.joined_at)) {
    errors.push(`Row ${index + 1}: Invalid joined_at format: ${member.joined_at} (expected YYYY-MM-DD)`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function importMembers(sourceFile: string, dryRun: boolean = false) {
  console.log('='.repeat(60));
  console.log('Member Import');
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
  }) as MemberRow[];
  
  console.log(`✓ Parsed ${records.length} records\n`);
  
  // Validate
  console.log('Validating records...');
  const allErrors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const result = validateMember(records[i], i);
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
  
  // Show summary
  console.log('Summary:');
  console.log(`  Total records: ${records.length}`);
  console.log(`  Roles: ${records.filter(r => r.role === 'member').length} members, ${records.filter(r => r.role === 'steward').length} stewards, ${records.filter(r => r.role === 'admin').length} admins`);
  console.log(`  Status: ${records.filter(r => r.status === 'active').length} active, ${records.filter(r => r.status === 'inactive').length} inactive, ${records.filter(r => r.status === 'pending').length} pending`);
  console.log();
  
  if (dryRun) {
    console.log('Dry run - no data imported');
    console.log('\nSample records:');
    console.table(records.slice(0, Math.min(5, records.length)));
    return;
  }
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Import
    console.log('Importing to database...');
    let imported = 0;
    let updated = 0;
    
    for (const member of records) {
      const result = await pool.query(`
        INSERT INTO members (email, display_name, ens_name, role, status, joined_at, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            ens_name = EXCLUDED.ens_name,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            joined_at = EXCLUDED.joined_at
        RETURNING (xmax = 0) AS inserted
      `, [
        member.email,
        member.display_name,
        member.ens_name || null,
        member.role,
        member.status,
        member.joined_at,
        'CHANGEME', // Temporary password hash - must be changed on first login
      ]);
      
      if (result.rows[0].inserted) {
        imported++;
      } else {
        updated++;
      }
    }
    
    console.log(`✓ Imported ${imported} new members`);
    if (updated > 0) {
      console.log(`✓ Updated ${updated} existing members`);
    }
    console.log();
    
    // Verify
    console.log('Verifying import...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM members');
    console.log(`✓ Total members in database: ${countResult.rows[0].count}`);
    
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
  console.error('Usage: tsx 01_import_members.ts --source <file.csv> [--dry-run]');
  process.exit(1);
}

const sourceFile = args[sourceIndex + 1];

importMembers(sourceFile, dryRun).catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
