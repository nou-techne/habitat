/**
 * Periods data hooks
 * 
 * Uses generated GraphQL hooks with Apollo Client
 */

import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

// Queries
export const GET_PERIODS = gql`
  query GetPeriods {
    periods {
      periodId
      name
      startDate
      endDate
      status
      surplusAmount
      createdAt
    }
  }
`

export const GET_CURRENT_PERIOD = gql`
  query GetCurrentPeriod {
    currentPeriod {
      periodId
      name
      startDate
      endDate
      status
      surplusAmount
    }
  }
`

export const GET_PERIOD_DETAILS = gql`
  query GetPeriodDetails($periodId: ID!) {
    period(periodId: $periodId) {
      periodId
      name
      startDate
      endDate
      status
      surplusAmount
      contributionCount
      memberCount
      allocationCount
      createdAt
    }
  }
`

// Hook: Get all periods
export function usePeriods() {
  const { data, loading, error, refetch } = useQuery(GET_PERIODS)

  return {
    periods: data?.periods || [],
    loading,
    error,
    refetch,
  }
}

// Hook: Get current period
export function useCurrentPeriod() {
  const { data, loading, error, refetch } = useQuery(GET_CURRENT_PERIOD)

  return {
    period: data?.currentPeriod,
    loading,
    error,
    refetch,
  }
}

// Hook: Get period details
export function usePeriodDetails(periodId: string) {
  const { data, loading, error, refetch } = useQuery(GET_PERIOD_DETAILS, {
    variables: { periodId },
    skip: !periodId,
  })

  return {
    period: data?.period,
    loading,
    error,
    refetch,
  }
}
