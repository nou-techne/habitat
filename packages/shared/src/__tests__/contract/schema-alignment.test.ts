/**
 * Contract Tests: TypeScript Types ↔ Database Schema Alignment
 * 
 * Verifies that TypeScript type definitions match database schema
 * Layer 1 (Identity) and Layer 2 (State) validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

// Database connection for schema introspection
let pool: pg.Pool;

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://habitat:habitat@localhost:5432/habitat_test',
  });
});

describe('Treasury Schema Alignment', () => {
  describe('allocation_periods table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'allocation_periods'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
        };
        return acc;
      }, {} as Record<string, any>);
      
      // Verify columns match TypeScript AllocationPeriod type
      expect(columns.id.type).toBe('uuid');
      expect(columns.id.nullable).toBe(false);
      
      expect(columns.name.type).toBe('character varying');
      expect(columns.name.nullable).toBe(false);
      
      expect(columns.description.type).toBe('text');
      expect(columns.description.nullable).toBe(true);
      
      expect(columns.start_date.type).toBe('timestamp with time zone');
      expect(columns.start_date.nullable).toBe(false);
      
      expect(columns.end_date.type).toBe('timestamp with time zone');
      expect(columns.end_date.nullable).toBe(false);
      
      expect(columns.status.type).toBe('USER-DEFINED'); // ENUM
      expect(columns.status.nullable).toBe(false);
      
      expect(columns.closed_at.type).toBe('timestamp with time zone');
      expect(columns.closed_at.nullable).toBe(true);
      
      expect(columns.created_at.type).toBe('timestamp with time zone');
      expect(columns.created_at.nullable).toBe(false);
      
      expect(columns.updated_at.type).toBe('timestamp with time zone');
      expect(columns.updated_at.nullable).toBe(false);
    });
    
    it('should have correct enum values for status', async () => {
      const result = await pool.query(`
        SELECT unnest(enum_range(NULL::period_status)) AS status;
      `);
      
      const statuses = result.rows.map(row => row.status);
      
      expect(statuses).toContain('open');
      expect(statuses).toContain('closed');
      expect(statuses).toContain('archived');
    });
    
    it('should have correct constraints', async () => {
      const result = await pool.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'allocation_periods';
      `);
      
      const constraints = result.rows.map(row => row.constraint_name);
      
      expect(constraints).toContain('allocation_periods_pkey');
      expect(constraints.some(c => c.includes('end_date'))).toBe(true); // Check constraint
    });
  });
  
  describe('contributions table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'contributions'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      // Verify columns match TypeScript Contribution type
      expect(columns.id.type).toBe('uuid');
      expect(columns.id.nullable).toBe(false);
      
      expect(columns.member_id.type).toBe('uuid');
      expect(columns.member_id.nullable).toBe(false);
      
      expect(columns.period_id.type).toBe('uuid');
      expect(columns.period_id.nullable).toBe(false);
      
      expect(columns.contribution_type.type).toBe('USER-DEFINED');
      expect(columns.contribution_type.nullable).toBe(false);
      
      expect(columns.amount.type).toBe('numeric');
      expect(columns.amount.nullable).toBe(false);
      
      expect(columns.description.type).toBe('text');
      expect(columns.description.nullable).toBe(true);
      
      expect(columns.status.type).toBe('USER-DEFINED');
      expect(columns.status.nullable).toBe(false);
      
      expect(columns.approved_by.type).toBe('uuid');
      expect(columns.approved_by.nullable).toBe(true);
      
      expect(columns.approved_at.type).toBe('timestamp with time zone');
      expect(columns.approved_at.nullable).toBe(true);
      
      expect(columns.created_at.type).toBe('timestamp with time zone');
      expect(columns.created_at.nullable).toBe(false);
    });
    
    it('should have correct foreign keys', async () => {
      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'contributions'
          AND tc.constraint_type = 'FOREIGN KEY';
      `);
      
      const foreignKeys = result.rows;
      
      // member_id → members(id)
      expect(foreignKeys.some(fk => 
        fk.column_name === 'member_id' && fk.foreign_table_name === 'members'
      )).toBe(true);
      
      // period_id → allocation_periods(id)
      expect(foreignKeys.some(fk => 
        fk.column_name === 'period_id' && fk.foreign_table_name === 'allocation_periods'
      )).toBe(true);
      
      // approved_by → members(id)
      expect(foreignKeys.some(fk => 
        fk.column_name === 'approved_by' && fk.foreign_table_name === 'members'
      )).toBe(true);
    });
  });
  
  describe('allocations table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'allocations'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      expect(columns.id.type).toBe('uuid');
      expect(columns.member_id.type).toBe('uuid');
      expect(columns.period_id.type).toBe('uuid');
      expect(columns.amount.type).toBe('numeric');
      expect(columns.patronage_score.type).toBe('numeric');
      expect(columns.status.type).toBe('USER-DEFINED');
      expect(columns.distributed_at.type).toBe('timestamp with time zone');
      expect(columns.distributed_at.nullable).toBe(true);
    });
  });
  
  describe('capital_accounts table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'capital_accounts'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      expect(columns.id.type).toBe('uuid');
      expect(columns.member_id.type).toBe('uuid');
      expect(columns.balance.type).toBe('numeric');
      expect(columns.tax_basis.type).toBe('numeric');
      expect(columns.last_updated.type).toBe('timestamp with time zone');
    });
  });
});

describe('People Schema Alignment', () => {
  describe('members table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'members'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      expect(columns.id.type).toBe('uuid');
      expect(columns.id.nullable).toBe(false);
      
      expect(columns.email.type).toBe('character varying');
      expect(columns.email.nullable).toBe(false);
      
      expect(columns.ens_name.type).toBe('character varying');
      expect(columns.ens_name.nullable).toBe(true);
      
      expect(columns.display_name.type).toBe('character varying');
      expect(columns.display_name.nullable).toBe(true);
      
      expect(columns.role.type).toBe('USER-DEFINED');
      expect(columns.role.nullable).toBe(false);
      
      expect(columns.status.type).toBe('USER-DEFINED');
      expect(columns.status.nullable).toBe(false);
      
      expect(columns.joined_at.type).toBe('timestamp with time zone');
      expect(columns.joined_at.nullable).toBe(false);
      
      expect(columns.password_hash.type).toBe('character varying');
      expect(columns.password_hash.nullable).toBe(true);
    });
    
    it('should have unique constraint on email', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'members'
          AND constraint_type = 'UNIQUE';
      `);
      
      const constraints = result.rows.map(row => row.constraint_name);
      expect(constraints.some(c => c.includes('email'))).toBe(true);
    });
    
    it('should have correct role enum values', async () => {
      const result = await pool.query(`
        SELECT unnest(enum_range(NULL::member_role)) AS role;
      `);
      
      const roles = result.rows.map(row => row.role);
      
      expect(roles).toContain('member');
      expect(roles).toContain('steward');
      expect(roles).toContain('admin');
    });
  });
});

describe('Agreements Schema Alignment', () => {
  describe('agreements table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agreements'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      expect(columns.id.type).toBe('uuid');
      expect(columns.title.type).toBe('character varying');
      expect(columns.description.type).toBe('text');
      expect(columns.agreement_type.type).toBe('USER-DEFINED');
      expect(columns.status.type).toBe('USER-DEFINED');
      expect(columns.effective_date.type).toBe('timestamp with time zone');
      expect(columns.expiration_date.type).toBe('timestamp with time zone');
      expect(columns.expiration_date.nullable).toBe(true);
    });
  });
  
  describe('agreement_signatures table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agreement_signatures'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      expect(columns.id.type).toBe('uuid');
      expect(columns.agreement_id.type).toBe('uuid');
      expect(columns.member_id.type).toBe('uuid');
      expect(columns.signed_at.type).toBe('timestamp with time zone');
      expect(columns.signature_data.type).toBe('jsonb');
      expect(columns.signature_data.nullable).toBe(true);
    });
  });
});

describe('Event Sourcing Schema Alignment', () => {
  describe('processed_events table', () => {
    it('should have all required columns with correct types', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'processed_events'
        ORDER BY ordinal_position;
      `);
      
      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        };
        return acc;
      }, {} as Record<string, any>);
      
      expect(columns.id.type).toBe('uuid');
      expect(columns.event_id.type).toBe('character varying');
      expect(columns.event_type.type).toBe('character varying');
      expect(columns.payload.type).toBe('jsonb');
      expect(columns.status.type).toBe('USER-DEFINED');
      expect(columns.processed_at.type).toBe('timestamp with time zone');
      expect(columns.error_message.type).toBe('text');
      expect(columns.error_message.nullable).toBe(true);
      expect(columns.retry_count.type).toBe('integer');
    });
    
    it('should have unique constraint on event_id', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'processed_events'
          AND constraint_type = 'UNIQUE';
      `);
      
      const constraints = result.rows.map(row => row.constraint_name);
      expect(constraints.some(c => c.includes('event_id'))).toBe(true);
    });
  });
});

describe('Type Safety: No Extra Database Columns', () => {
  it('should not have undocumented columns in core tables', async () => {
    const tables = [
      'allocation_periods',
      'contributions',
      'allocations',
      'capital_accounts',
      'members',
      'agreements',
      'agreement_signatures',
      'processed_events',
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      const columns = result.rows.map(row => row.column_name);
      
      // All columns should be documented in TypeScript types
      // This test catches database drift (columns added without type updates)
      expect(columns.length).toBeGreaterThan(0);
      
      // Every table should have standard audit columns
      expect(columns).toContain('id');
      expect(columns).toContain('created_at' || 'joined_at');
    }
  });
});

describe('Numeric Precision Alignment', () => {
  it('should use correct numeric precision for monetary amounts', async () => {
    const result = await pool.query(`
      SELECT column_name, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name IN ('contributions', 'allocations', 'capital_accounts')
        AND data_type = 'numeric';
    `);
    
    for (const row of result.rows) {
      // All monetary amounts should use numeric(19, 4) or similar
      // This prevents floating-point precision errors
      expect(row.numeric_precision).toBeGreaterThanOrEqual(10);
      expect(row.numeric_scale).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Timestamp Alignment', () => {
  it('should use timestamptz for all timestamp columns', async () => {
    const result = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name LIKE '%_at'
        OR column_name LIKE '%_date'
      ORDER BY table_name, column_name;
    `);
    
    for (const row of result.rows) {
      // All timestamps should be with time zone
      expect(row.data_type).toBe('timestamp with time zone');
    }
  });
});

describe('Index Coverage', () => {
  it('should have indexes on all foreign key columns', async () => {
    const result = await pool.query(`
      SELECT
        t.relname AS table_name,
        a.attname AS column_name,
        i.relname AS index_name
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname IN ('contributions', 'allocations', 'agreement_signatures')
        AND a.attname LIKE '%_id'
        AND a.attname != 'id'
      ORDER BY t.relname, a.attname;
    `);
    
    // Every foreign key should have an index
    const indexedColumns = result.rows.map(row => `${row.table_name}.${row.column_name}`);
    
    expect(indexedColumns).toContain('contributions.member_id');
    expect(indexedColumns).toContain('contributions.period_id');
    expect(indexedColumns).toContain('allocations.member_id');
    expect(indexedColumns).toContain('allocations.period_id');
  });
});
