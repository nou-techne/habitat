/**
 * Application configuration
 * 
 * Loads from environment variables with sensible defaults
 */

import { config as loadEnv } from 'dotenv'
import type { DatabaseConfig } from './db/client.js'

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
  loadEnv()
}

export interface Config {
  env: 'development' | 'production' | 'test'
  port: number
  database: DatabaseConfig
  jwt: {
    secret: string
    expiresIn: string
  }
}

export function getConfig(): Config {
  const provider = (process.env.DATABASE_PROVIDER || 'postgres') as 'supabase' | 'postgres'
  
  return {
    env: (process.env.NODE_ENV || 'development') as Config['env'],
    port: parseInt(process.env.PORT || '4000', 10),
    
    database: {
      provider,
      
      // Supabase config
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_KEY,
      
      // PostgreSQL config
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'habitat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      
      // Connection pool
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
    },
    
    jwt: {
      secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  }
}
