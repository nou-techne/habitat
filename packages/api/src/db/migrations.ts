/**
 * Database migration runner
 * 
 * For self-hosted path: runs SQL migrations from schema/ directory.
 * For Supabase path: migrations run via Supabase CLI or dashboard.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Pool } from 'pg'

export interface Migration {
  version: number
  name: string
  sql: string
  appliedAt?: Date
}

/**
 * Get all migration files from schema directory
 */
export async function getMigrations(schemaDir: string): Promise<Migration[]> {
  const files = await readdir(schemaDir)
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()
  
  const migrations: Migration[] = []
  
  for (const file of sqlFiles) {
    // Extract version number from filename (e.g., "01_treasury_core.sql" -> 1)
    const match = file.match(/^(\d+)_/)
    const version = match ? parseInt(match[1], 10) : 0
    
    const sql = await readFile(join(schemaDir, file), 'utf-8')
    
    migrations.push({
      version,
      name: file.replace(/^\d+_/, '').replace('.sql', ''),
      sql,
    })
  }
  
  return migrations
}

/**
 * Create migrations table if it doesn't exist
 */
async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

/**
 * Get applied migrations
 */
async function getAppliedMigrations(pool: Pool): Promise<Set<number>> {
  const result = await pool.query<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version'
  )
  return new Set(result.rows.map(row => row.version))
}

/**
 * Apply a single migration
 */
async function applyMigration(pool: Pool, migration: Migration): Promise<void> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Run migration SQL
    await client.query(migration.sql)
    
    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    )
    
    await client.query('COMMIT')
    
    console.log(`Applied migration ${migration.version}: ${migration.name}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw new Error(`Migration ${migration.version} failed: ${error}`)
  } finally {
    client.release()
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(pool: Pool, schemaDir: string): Promise<number> {
  await ensureMigrationsTable(pool)
  
  const allMigrations = await getMigrations(schemaDir)
  const appliedVersions = await getAppliedMigrations(pool)
  
  const pending = allMigrations.filter(m => !appliedVersions.has(m.version))
  
  if (pending.length === 0) {
    console.log('No pending migrations')
    return 0
  }
  
  console.log(`Found ${pending.length} pending migrations`)
  
  for (const migration of pending) {
    await applyMigration(pool, migration)
  }
  
  return pending.length
}
