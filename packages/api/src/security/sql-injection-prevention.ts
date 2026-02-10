/**
 * SQL Injection Prevention
 * 
 * Audit and enforce parameterized queries
 * Prevents SQL injection vulnerabilities
 */

import type { DatabaseClient } from '../db/client.js'

/**
 * Parameterized query wrapper
 * Ensures all queries use parameters instead of string interpolation
 */
export class SafeQueryBuilder {
  private client: DatabaseClient

  constructor(client: DatabaseClient) {
    this.client = client
  }

  /**
   * Execute safe query with parameters
   * 
   * GOOD: query('SELECT * FROM users WHERE id = $1', [userId])
   * BAD:  query(`SELECT * FROM users WHERE id = '${userId}'`)
   */
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    // Validate no string interpolation in SQL
    if (this.hasUnsafeInterpolation(sql)) {
      throw new Error('Unsafe SQL detected: Use parameterized queries ($1, $2, etc.)')
    }

    return this.client.query<T>(sql, params)
  }

  /**
   * Detect potential SQL injection vectors
   */
  private hasUnsafeInterpolation(sql: string): boolean {
    // Check for ${} template literal interpolation
    if (sql.includes('${')) {
      return true
    }

    // Check for + concatenation patterns (common mistake)
    // This is a simplified check - in real implementation would be more sophisticated
    if (sql.match(/\s+\+\s+['"]/)) {
      return true
    }

    return false
  }

  /**
   * Build WHERE clause with parameters
   */
  buildWhereClause(
    conditions: Record<string, any>,
    startParam: number = 1
  ): { clause: string; params: any[] } {
    const clauses: string[] = []
    const params: any[] = []
    let paramIndex = startParam

    for (const [key, value] of Object.entries(conditions)) {
      // Skip undefined/null
      if (value === undefined || value === null) {
        continue
      }

      // Validate column name (prevent injection via column names)
      if (!this.isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`)
      }

      if (Array.isArray(value)) {
        // IN clause
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ')
        clauses.push(`${key} IN (${placeholders})`)
        params.push(...value)
      } else {
        // Equality
        clauses.push(`${key} = $${paramIndex++}`)
        params.push(value)
      }
    }

    return {
      clause: clauses.length > 0 ? 'WHERE ' + clauses.join(' AND ') : '',
      params,
    }
  }

  /**
   * Validate column name (alphanumeric + underscore only)
   */
  private isValidColumnName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  }

  /**
   * Build safe INSERT statement
   */
  buildInsert(
    table: string,
    data: Record<string, any>
  ): { sql: string; params: any[] } {
    if (!this.isValidColumnName(table)) {
      throw new Error(`Invalid table name: ${table}`)
    }

    const columns: string[] = []
    const params: any[] = []
    const placeholders: string[] = []

    let paramIndex = 1

    for (const [key, value] of Object.entries(data)) {
      if (!this.isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`)
      }

      columns.push(key)
      params.push(value)
      placeholders.push(`$${paramIndex++}`)
    }

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `

    return { sql, params }
  }

  /**
   * Build safe UPDATE statement
   */
  buildUpdate(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): { sql: string; params: any[] } {
    if (!this.isValidColumnName(table)) {
      throw new Error(`Invalid table name: ${table}`)
    }

    const setClauses: string[] = []
    const params: any[] = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(data)) {
      if (!this.isValidColumnName(key)) {
        throw new Error(`Invalid column name: ${key}`)
      }

      setClauses.push(`${key} = $${paramIndex++}`)
      params.push(value)
    }

    const whereClause = this.buildWhereClause(where, paramIndex)
    params.push(...whereClause.params)

    const sql = `
      UPDATE ${table}
      SET ${setClauses.join(', ')}
      ${whereClause.clause}
      RETURNING *
    `

    return { sql, params }
  }
}

/**
 * SQL injection test patterns
 * Used to detect potential vulnerabilities in code
 */
export const SQL_INJECTION_PATTERNS = [
  // Classic injection
  /'\s*(OR|AND)\s*'?\d*'?\s*=\s*'?\d*'?/i,
  
  // Comment injection
  /--/,
  /#/,
  /\/\*/,
  
  // Union-based
  /UNION\s+SELECT/i,
  
  // Blind injection
  /SLEEP\s*\(/i,
  /WAITFOR\s+DELAY/i,
  
  // Information schema
  /information_schema/i,
  
  // Stacked queries
  /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)/i,
]

/**
 * Check if string contains SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

/**
 * Audit query for SQL injection vulnerabilities
 */
export function auditQuery(sql: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for string interpolation
  if (sql.includes('${')) {
    issues.push('String interpolation detected - use parameterized queries')
  }

  // Check for concatenation
  if (sql.match(/\s+\+\s+['"]/)) {
    issues.push('String concatenation detected - use parameterized queries')
  }

  // Check for missing parameters
  if (!sql.includes('$1') && (sql.includes('WHERE') || sql.includes('VALUES'))) {
    issues.push('No parameters detected in WHERE/VALUES clause')
  }

  return {
    safe: issues.length === 0,
    issues,
  }
}
