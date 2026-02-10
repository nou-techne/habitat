/**
 * Allocations data hooks
 * 
 * Uses generated GraphQL hooks with Apollo Client
 */

import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

// Queries
export const GET_MEMBER_ALLOCATIONS = gql`
  query GetMemberAllocations($memberId: ID!, $periodId: ID) {
    allocations(memberId: $memberId, periodId: $periodId) {
      allocationId
      period {
        periodId
        name
        startDate
        endDate
        status
      }
      totalAllocation
      cashDistribution
      retainedAllocation
      patronageShare
      status
      createdAt
    }
  }
`

export const GET_PERIOD_ALLOCATIONS = gql`
  query GetPeriodAllocations($periodId: ID!) {
    periodAllocations(periodId: $periodId) {
      allocationId
      member {
        memberId
        name
      }
      totalAllocation
      cashDistribution
      retainedAllocation
      patronageShare
      status
    }
  }
`

export const GET_ALLOCATION_STATEMENT = gql`
  query GetAllocationStatement($memberId: ID!, $periodId: ID!) {
    allocationStatement(memberId: $memberId, periodId: $periodId) {
      member {
        memberId
        name
      }
      period {
        periodId
        name
        startDate
        endDate
      }
      contributions {
        contributionId
        date
        type
        description
        monetaryValue
      }
      allocation {
        totalAllocation
        cashDistribution
        retainedAllocation
      }
      capitalAccount {
        beginningBalance
        endingBalance
      }
    }
  }
`

// Hook: Get member allocations
export function useMemberAllocations(memberId: string, periodId?: string) {
  const { data, loading, error, refetch } = useQuery(GET_MEMBER_ALLOCATIONS, {
    variables: { memberId, periodId },
    skip: !memberId,
  })

  return {
    allocations: data?.allocations || [],
    loading,
    error,
    refetch,
  }
}

// Hook: Get period allocations (for reviewers)
export function usePeriodAllocations(periodId: string) {
  const { data, loading, error, refetch } = useQuery(GET_PERIOD_ALLOCATIONS, {
    variables: { periodId },
    skip: !periodId,
  })

  return {
    allocations: data?.periodAllocations || [],
    loading,
    error,
    refetch,
  }
}

// Hook: Get allocation statement
export function useAllocationStatement(memberId: string, periodId: string) {
  const { data, loading, error, refetch } = useQuery(GET_ALLOCATION_STATEMENT, {
    variables: { memberId, periodId },
    skip: !memberId || !periodId,
  })

  return {
    statement: data?.allocationStatement,
    loading,
    error,
    refetch,
  }
}
