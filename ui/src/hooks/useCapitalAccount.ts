/**
 * Capital Account data hooks
 * 
 * Uses generated GraphQL hooks with Apollo Client
 */

import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

// Queries
export const GET_CAPITAL_ACCOUNT = gql`
  query GetCapitalAccount($memberId: ID!) {
    capitalAccount(memberId: $memberId) {
      memberId
      bookBalance
      taxBalance
      contributedCapital
      retainedPatronage
      distributedPatronage
      updatedAt
    }
  }
`

export const GET_CAPITAL_ACCOUNT_HISTORY = gql`
  query GetCapitalAccountHistory($memberId: ID!, $startDate: String, $endDate: String) {
    capitalAccountHistory(memberId: $memberId, startDate: $startDate, endDate: $endDate) {
      date
      type
      description
      debit
      credit
      balance
    }
  }
`

// Hook: Get capital account
export function useCapitalAccount(memberId: string) {
  const { data, loading, error, refetch } = useQuery(GET_CAPITAL_ACCOUNT, {
    variables: { memberId },
    skip: !memberId,
  })

  return {
    capitalAccount: data?.capitalAccount,
    loading,
    error,
    refetch,
  }
}

// Hook: Get capital account history
export function useCapitalAccountHistory(
  memberId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, loading, error, refetch } = useQuery(GET_CAPITAL_ACCOUNT_HISTORY, {
    variables: { memberId, startDate, endDate },
    skip: !memberId,
  })

  return {
    history: data?.capitalAccountHistory || [],
    loading,
    error,
    refetch,
  }
}
