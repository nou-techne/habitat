/**
 * Database client abstraction
 * 
 * Supports both Supabase client and direct PostgreSQL connection.
 * Low-code path: use Supabase client for auth, RLS, and realtime.
 * Self-hosted path: use pg pool for direct database access.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Pool, PoolConfig } from 'pg'

export type DatabaseClient = SupabaseClient | Pool

export interface DatabaseConfig {
  provider: 'supabase' | 'postgres'
  
  // Supabase config
  supabaseUrl?: string
  supabaseKey?: string
  
  // PostgreSQL config
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
  ssl?: boolean
  
  // Connection pool config
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

/**
 * Create database client based on configuration
 */
export async function createDatabaseClient(config: DatabaseConfig): Promise<DatabaseClient> {
  if (config.provider === 'supabase') {
    // Supabase client (low-code path)
    const { createClient } = await import('@supabase/supabase-js')
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL and key required for Supabase provider')
    }
    
    return createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Server-side, no persistent sessions
      },
    })
  } else {
    // PostgreSQL pool (self-hosted path)
    const { Pool } = await import('pg')
    
    const poolConfig: PoolConfig = {
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'habitat',
      user: config.user || 'postgres',
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    }
    
    const pool = new Pool(poolConfig)
    
    // Test connection
    try {
      const client = await pool.connect()
      await client.query('SELECT 1')
      client.release()
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`)
    }
    
    return pool
  }
}

/**
 * Health check query
 */
export async function healthCheck(client: DatabaseClient): Promise<boolean> {
  try {
    if ('from' in client) {
      // Supabase client
      const { error } = await client.from('accounts').select('count').limit(1)
      return !error
    } else {
      // pg Pool
      const result = await client.query('SELECT 1')
      return result.rowCount === 1
    }
  } catch {
    return false
  }
}

/**
 * Close database connection
 */
export async function closeDatabaseClient(client: DatabaseClient): Promise<void> {
  if ('end' in client) {
    // pg Pool
    await client.end()
  }
  // Supabase client doesn't need explicit closure
}
