/**
 * Authorization Roles & Permissions
 * 
 * Role-based access control for Habitat
 * Three tiers: Member → Steward → Admin
 */

export type Role = 'member' | 'steward' | 'admin'

export interface Permission {
  resource: string
  action: 'read' | 'create' | 'update' | 'delete' | 'approve'
  scope: 'own' | 'all'
}

/**
 * Role definitions with permissions
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  /**
   * Member: Basic cooperative member
   * - View own data
   * - Create own contributions
   * - View approved allocations
   */
  member: [
    // Own contributions
    { resource: 'contribution', action: 'read', scope: 'own' },
    { resource: 'contribution', action: 'create', scope: 'own' },
    { resource: 'contribution', action: 'update', scope: 'own' },

    // Own capital accounts
    { resource: 'capital_account', action: 'read', scope: 'own' },

    // Own allocations (approved only)
    { resource: 'allocation', action: 'read', scope: 'own' },

    // Own distributions
    { resource: 'distribution', action: 'read', scope: 'own' },

    // Period information (read-only, all)
    { resource: 'period', action: 'read', scope: 'all' },
  ],

  /**
   * Steward: Operations/governance steward
   * - All member permissions
   * - Approve contributions
   * - View all member data
   * - Propose allocations
   * - Cannot modify system configuration
   */
  steward: [
    // All member permissions
    ...ROLE_PERMISSIONS.member,

    // View all contributions
    { resource: 'contribution', action: 'read', scope: 'all' },
    { resource: 'contribution', action: 'approve', scope: 'all' },

    // View all capital accounts
    { resource: 'capital_account', action: 'read', scope: 'all' },

    // View and propose allocations
    { resource: 'allocation', action: 'read', scope: 'all' },
    { resource: 'allocation', action: 'create', scope: 'all' },
    { resource: 'allocation', action: 'approve', scope: 'all' },

    // View all distributions
    { resource: 'distribution', action: 'read', scope: 'all' },

    // Manage periods
    { resource: 'period', action: 'create', scope: 'all' },
    { resource: 'period', action: 'update', scope: 'all' },

    // View members
    { resource: 'member', action: 'read', scope: 'all' },
  ],

  /**
   * Admin: System administrator
   * - All steward permissions
   * - Manage members
   * - System configuration
   * - Override any operation
   */
  admin: [
    // All steward permissions
    ...ROLE_PERMISSIONS.steward,

    // Full member management
    { resource: 'member', action: 'create', scope: 'all' },
    { resource: 'member', action: 'update', scope: 'all' },
    { resource: 'member', action: 'delete', scope: 'all' },

    // Override contributions
    { resource: 'contribution', action: 'delete', scope: 'all' },

    // Override allocations
    { resource: 'allocation', action: 'update', scope: 'all' },
    { resource: 'allocation', action: 'delete', scope: 'all' },

    // Override distributions
    { resource: 'distribution', action: 'create', scope: 'all' },
    { resource: 'distribution', action: 'update', scope: 'all' },
    { resource: 'distribution', action: 'delete', scope: 'all' },

    // Period override
    { resource: 'period', action: 'delete', scope: 'all' },

    // System configuration
    { resource: 'system', action: 'read', scope: 'all' },
    { resource: 'system', action: 'update', scope: 'all' },
  ],
}

/**
 * Check if role has permission
 */
export function hasPermission(
  role: Role,
  resource: string,
  action: Permission['action'],
  scope: Permission['scope']
): boolean {
  const permissions = ROLE_PERMISSIONS[role]

  return permissions.some(
    p =>
      p.resource === resource &&
      p.action === action &&
      (p.scope === scope || p.scope === 'all')
  )
}

/**
 * Check if user can access resource
 */
export function canAccess(
  userRole: Role,
  userId: string,
  resource: string,
  action: Permission['action'],
  ownerId?: string
): boolean {
  // Check for 'all' scope permission
  if (hasPermission(userRole, resource, action, 'all')) {
    return true
  }

  // Check for 'own' scope permission
  if (ownerId && userId === ownerId && hasPermission(userRole, resource, action, 'own')) {
    return true
  }

  return false
}

/**
 * Get effective role (highest role assigned)
 */
export function getEffectiveRole(roles: Role[]): Role {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('steward')) return 'steward'
  return 'member'
}
