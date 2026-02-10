/**
 * Audit Logging
 * 
 * Records privileged operations for compliance and security
 * Tracks who did what, when, and why
 */

import type { AuthContext } from './context.js'
import type { DatabaseClient } from '../db/client.js'

export interface AuditLog {
  auditId: string
  timestamp: string
  userId: string
  memberId: string
  role: string
  action: string
  resource: string
  resourceId?: string
  changes?: Record<string, any>
  reason?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log privileged operation
 */
export async function logAudit(
  db: DatabaseClient,
  context: AuthContext,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: Record<string, any>,
  reason?: string
): Promise<void> {
  const auditLog: Partial<AuditLog> = {
    timestamp: new Date().toISOString(),
    userId: context.userId,
    memberId: context.memberId,
    role: context.role,
    action,
    resource,
    resourceId,
    changes,
    reason,
  }

  // In real implementation, would insert into audit_log table
  console.log('[AUDIT]', JSON.stringify(auditLog, null, 2))

  // TODO: Insert into database
  // await db.query(
  //   `INSERT INTO audit_log (timestamp, user_id, member_id, role, action, resource, resource_id, changes, reason)
  //    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
  //   [auditLog.timestamp, auditLog.userId, auditLog.memberId, auditLog.role, auditLog.action, auditLog.resource, auditLog.resourceId, JSON.stringify(auditLog.changes), auditLog.reason]
  // )
}

/**
 * Audit decorator for functions
 */
export function auditOperation(
  action: string,
  resource: string,
  getResourceId?: (args: any) => string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const context = args.find((arg: any) => arg?.isAuthenticated !== undefined) as AuthContext
      const db = args.find((arg: any) => arg?.query !== undefined) as DatabaseClient

      const resourceId = getResourceId ? getResourceId(args) : undefined

      // Log before operation
      if (db && context) {
        await logAudit(db, context, action, resource, resourceId)
      }

      // Execute operation
      const result = await originalMethod.apply(this, args)

      return result
    }

    return descriptor
  }
}

/**
 * Actions that should always be audited
 */
export const AUDIT_ACTIONS = {
  // Member management
  MEMBER_CREATE: 'member.create',
  MEMBER_UPDATE: 'member.update',
  MEMBER_DELETE: 'member.delete',
  MEMBER_ROLE_CHANGE: 'member.role.change',

  // Contribution approval
  CONTRIBUTION_APPROVE: 'contribution.approve',
  CONTRIBUTION_REJECT: 'contribution.reject',
  CONTRIBUTION_DELETE: 'contribution.delete',

  // Allocation operations
  ALLOCATION_PROPOSE: 'allocation.propose',
  ALLOCATION_APPROVE: 'allocation.approve',
  ALLOCATION_REJECT: 'allocation.reject',
  ALLOCATION_OVERRIDE: 'allocation.override',

  // Period operations
  PERIOD_CREATE: 'period.create',
  PERIOD_CLOSE: 'period.close',
  PERIOD_REOPEN: 'period.reopen',

  // Distribution operations
  DISTRIBUTION_CREATE: 'distribution.create',
  DISTRIBUTION_EXECUTE: 'distribution.execute',
  DISTRIBUTION_CANCEL: 'distribution.cancel',

  // System operations
  SYSTEM_CONFIG_UPDATE: 'system.config.update',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_RESTORE: 'system.restore',
}

/**
 * Check if action requires audit
 */
export function requiresAudit(action: string): boolean {
  return Object.values(AUDIT_ACTIONS).includes(action)
}

/**
 * Get recent audit logs
 */
export async function getAuditLogs(
  db: DatabaseClient,
  filters: {
    userId?: string
    memberId?: string
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
    limit?: number
  } = {}
): Promise<AuditLog[]> {
  // In real implementation, would query audit_log table with filters
  console.log('[AUDIT] Query audit logs:', filters)

  // TODO: Implement database query
  return []
}
