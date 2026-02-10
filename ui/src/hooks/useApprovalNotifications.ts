/**
 * Real-time approval notifications
 * 
 * Polls for pending approvals (for stewards/admins)
 */

import { useRef } from 'react'
import { gql } from '@apollo/client'
import { usePolling } from './usePolling'
import { useToast } from '../components/Toast'

const GET_PENDING_COUNT = gql`
  query GetPendingCount {
    pendingApprovals {
      contributionCount
      allocationCount
      updatedAt
    }
  }
`

export interface PendingCount {
  contributionCount: number
  allocationCount: number
  updatedAt: string
}

/**
 * Monitor pending approval count
 * Shows toast notifications when new items need approval
 */
export function useApprovalNotifications(enabled = true) {
  const toast = useToast()
  const previousCountRef = useRef<PendingCount | null>(null)

  const { data, loading, error } = usePolling<{ pendingApprovals: PendingCount }>({
    query: GET_PENDING_COUNT,
    variables: {},
    pollInterval: 15000, // Poll every 15 seconds
    skip: !enabled,
    onData: (newData) => {
      const newCount = newData.pendingApprovals
      const previous = previousCountRef.current

      if (previous !== null) {
        // Check for new contributions
        if (newCount.contributionCount > previous.contributionCount) {
          const diff = newCount.contributionCount - previous.contributionCount
          toast.info(
            'New Contributions',
            `${diff} new contribution${diff > 1 ? 's' : ''} awaiting approval`
          )
        }

        // Check for new allocations
        if (newCount.allocationCount > previous.allocationCount) {
          const diff = newCount.allocationCount - previous.allocationCount
          toast.info(
            'New Allocations',
            `${diff} new allocation${diff > 1 ? 's' : ''} awaiting review`
          )
        }
      }

      previousCountRef.current = newCount
    },
    onError: (err) => {
      console.error('Approval notification polling error:', err)
    },
  })

  return {
    pendingCount: data?.pendingApprovals,
    loading,
    error,
  }
}
