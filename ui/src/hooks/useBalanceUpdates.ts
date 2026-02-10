/**
 * Real-time balance updates
 * 
 * Polls for capital account balance changes
 */

import { useRef } from 'react'
import { gql } from '@apollo/client'
import { usePolling } from './usePolling'
import { useToast } from '../components/Toast'

const GET_BALANCE = gql`
  query GetBalance($memberId: ID!) {
    capitalAccount(memberId: $memberId) {
      memberId
      bookBalance
      updatedAt
    }
  }
`

export interface BalanceData {
  memberId: string
  bookBalance: string
  updatedAt: string
}

/**
 * Monitor capital account balance changes
 * Shows toast notifications when balance changes
 */
export function useBalanceUpdates(memberId: string, enabled = true) {
  const toast = useToast()
  const previousBalanceRef = useRef<string | null>(null)

  const { data, loading, error } = usePolling<{ capitalAccount: BalanceData }>({
    query: GET_BALANCE,
    variables: { memberId },
    pollInterval: 10000, // Poll every 10 seconds
    skip: !enabled || !memberId,
    onData: (newData) => {
      const newBalance = newData.capitalAccount.bookBalance
      const previous = previousBalanceRef.current

      if (previous !== null && previous !== newBalance) {
        const diff = parseFloat(newBalance) - parseFloat(previous)
        const formattedDiff = Math.abs(diff).toFixed(2)

        if (diff > 0) {
          toast.success(
            'Balance Updated',
            `Your balance increased by $${formattedDiff}`
          )
        } else if (diff < 0) {
          toast.info(
            'Balance Updated',
            `Your balance decreased by $${formattedDiff}`
          )
        }
      }

      previousBalanceRef.current = newBalance
    },
    onError: (err) => {
      console.error('Balance update polling error:', err)
    },
  })

  return {
    balance: data?.capitalAccount,
    loading,
    error,
  }
}
