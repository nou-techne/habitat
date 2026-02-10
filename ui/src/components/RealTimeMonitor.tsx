/**
 * Real-Time Monitor Component
 * 
 * Enables real-time updates for authenticated users
 * Place in Layout or dashboard to activate polling
 */

import { useEffect } from 'react'
import { getCurrentUser, hasRole } from '../lib/auth'
import { useContributionStatus } from '../hooks/useContributionStatus'
import { useBalanceUpdates } from '../hooks/useBalanceUpdates'
import { useApprovalNotifications } from '../hooks/useApprovalNotifications'

export function RealTimeMonitor() {
  const user = getCurrentUser()
  
  // Don't monitor if not authenticated
  if (!user) {
    return null
  }

  // Monitor user's contribution statuses
  // In real app, would get contribution IDs from user's recent contributions
  useContributionStatus([])

  // Monitor user's balance updates
  useBalanceUpdates(user.memberId, true)

  // Monitor approval queue (stewards and admins only)
  useApprovalNotifications(hasRole('steward') || hasRole('admin'))

  return null // This component doesn't render anything
}
