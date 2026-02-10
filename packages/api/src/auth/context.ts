/**
 * Authorization Context
 * 
 * Request context with user identity and permissions
 * Used throughout GraphQL resolvers for authorization
 */

import type { Role } from './roles.js'

export interface AuthContext {
  userId: string
  memberId: string
  role: Role
  isAuthenticated: boolean
}

/**
 * Create authorization context from request
 */
export function createAuthContext(req: any): AuthContext {
  // In real implementation, would:
  // 1. Extract JWT from Authorization header
  // 2. Verify signature
  // 3. Extract userId, memberId, role from claims
  // 4. Return context

  // For now, return mock context
  // TODO: Implement JWT verification
  return {
    userId: req.headers['x-user-id'] || 'anonymous',
    memberId: req.headers['x-member-id'] || '',
    role: (req.headers['x-user-role'] as Role) || 'member',
    isAuthenticated: !!req.headers['x-user-id'],
  }
}

/**
 * Require authentication
 */
export function requireAuth(context: AuthContext): void {
  if (!context.isAuthenticated) {
    throw new Error('Authentication required')
  }
}

/**
 * Require specific role
 */
export function requireRole(context: AuthContext, ...roles: Role[]): void {
  requireAuth(context)

  if (!roles.includes(context.role)) {
    throw new Error(`Insufficient permissions. Required: ${roles.join(' or ')}`)
  }
}
