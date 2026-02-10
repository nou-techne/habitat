/**
 * Real-time contribution status updates
 * 
 * Polls for contribution status changes and shows notifications
 */

import { useEffect, useRef } from 'react'
import { gql } from '@apollo/client'
import { usePolling } from './usePolling'
import { useToast } from '../components/Toast'

const GET_CONTRIBUTION_STATUS = gql`
  query GetContributionStatus($contributionIds: [ID!]!) {
    contributionStatuses(contributionIds: $contributionIds) {
      contributionId
      status
      updatedAt
    }
  }
`

export interface ContributionStatus {
  contributionId: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  updatedAt: string
}

/**
 * Monitor contribution status changes
 * Shows toast notifications when status changes
 */
export function useContributionStatus(contributionIds: string[]) {
  const toast = useToast()
  const previousStatusesRef = useRef<Map<string, ContributionStatus>>(new Map())

  const { data, loading, error } = usePolling<{ contributionStatuses: ContributionStatus[] }>({
    query: GET_CONTRIBUTION_STATUS,
    variables: { contributionIds },
    pollInterval: 5000,
    skip: contributionIds.length === 0,
    onData: (newData) => {
      // Check for status changes
      newData.contributionStatuses.forEach(contribution => {
        const previous = previousStatusesRef.current.get(contribution.contributionId)
        
        if (previous && previous.status !== contribution.status) {
          // Status changed!
          switch (contribution.status) {
            case 'approved':
              toast.success(
                'Contribution Approved',
                `Your contribution has been approved.`
              )
              break
            case 'rejected':
              toast.error(
                'Contribution Rejected',
                `Your contribution was not approved. Please review and resubmit.`
              )
              break
            case 'pending':
              toast.info(
                'Contribution Pending',
                `Your contribution is awaiting approval.`
              )
              break
          }
        }

        // Update previous status
        previousStatusesRef.current.set(contribution.contributionId, contribution)
      })
    },
    onError: (err) => {
      console.error('Contribution status polling error:', err)
    },
  })

  return {
    statuses: data?.contributionStatuses || [],
    loading,
    error,
  }
}
