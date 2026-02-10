/**
 * Row-Level Security (RLS)
 * 
 * Enforces data access restrictions at query level
 * Filters results based on user role and ownership
 */

import type { AuthContext } from './context.js'
import type { Role } from './roles.js'

export interface RLSFilter {
  memberId?: string
  [key: string]: any
}

/**
 * Apply row-level security filter
 * 
 * Returns filter to apply to database queries
 * Ensures users only see data they're authorized for
 */
export function applyRLS(
  context: AuthContext,
  resource: string,
  baseFilter: RLSFilter = {}
): RLSFilter {
  // Anonymous users see nothing
  if (!context.isAuthenticated) {
    return { ...baseFilter, _impossible: true }
  }

  // Admins see everything
  if (context.role === 'admin') {
    return baseFilter
  }

  // Stewards see everything (for most resources)
  if (context.role === 'steward') {
    // Some resources restricted even for stewards
    if (resource === 'audit_log') {
      return baseFilter // Stewards can see audit logs
    }
    return baseFilter
  }

  // Members see only their own data
  if (context.role === 'member') {
    switch (resource) {
      case 'contribution':
      case 'capital_account':
      case 'allocation':
      case 'distribution':
        return { ...baseFilter, memberId: context.memberId }

      case 'period':
        // All members can see period information
        return baseFilter

      case 'member':
        // Members can only see themselves
        return { ...baseFilter, memberId: context.memberId }

      default:
        // Deny by default
        return { ...baseFilter, _impossible: true }
    }
  }

  // Deny by default
  return { ...baseFilter, _impossible: true }
}

/**
 * Check row-level access
 * 
 * Verifies user can access specific row
 * Used after fetching data to double-check access
 */
export function checkRowAccess(
  context: AuthContext,
  resource: string,
  row: any
): boolean {
  // Admins can access anything
  if (context.role === 'admin') {
    return true
  }

  // Stewards can access most things
  if (context.role === 'steward') {
    // Some resources restricted
    if (resource === 'system_config') {
      return false
    }
    return true
  }

  // Members can only access their own data
  if (context.role === 'member') {
    if (row.memberId && row.memberId === context.memberId) {
      return true
    }

    // Periods are public to all members
    if (resource === 'period') {
      return true
    }
  }

  return false
}

/**
 * Filter array results by RLS
 * 
 * Post-fetch filtering when query-level filtering not possible
 */
export function filterByRLS<T extends { memberId?: string }>(
  context: AuthContext,
  resource: string,
  rows: T[]
): T[] {
  return rows.filter(row => checkRowAccess(context, resource, row))
}
