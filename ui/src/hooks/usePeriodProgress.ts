/**
 * Real-time period close progress updates
 * 
 * Polls for period close progress and shows notifications
 */

import { useEffect } from 'react'
import { gql } from '@apollo/client'
import { usePolling } from './usePolling'
import { useToast } from '../components/Toast'

const GET_PERIOD_PROGRESS = gql`
  query GetPeriodProgress($periodId: ID!) {
    periodProgress(periodId: $periodId) {
      periodId
      status
      step
      progress
      totalSteps
      message
      updatedAt
    }
  }
`

export interface PeriodProgress {
  periodId: string
  status: 'open' | 'closing' | 'closed'
  step: string
  progress: number
  totalSteps: number
  message: string
  updatedAt: string
}

/**
 * Monitor period close progress
 * Shows toast notifications for progress updates
 */
export function usePeriodProgress(periodId: string, enabled = true) {
  const toast = useToast()

  const { data, loading, error, stopPolling } = usePolling<{ periodProgress: PeriodProgress }>({
    query: GET_PERIOD_PROGRESS,
    variables: { periodId },
    pollInterval: 3000, // Poll every 3 seconds during period close
    skip: !enabled || !periodId,
    onData: (newData) => {
      const progress = newData.periodProgress

      // Show notification for status changes
      if (progress.status === 'closed') {
        toast.success(
          'Period Closed',
          'All allocations have been calculated and finalized.'
        )
        stopPolling() // Stop polling once closed
      }
    },
    onError: (err) => {
      console.error('Period progress polling error:', err)
    },
  })

  return {
    progress: data?.periodProgress,
    loading,
    error,
  }
}
