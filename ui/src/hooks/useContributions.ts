/**
 * Contributions data hooks
 * 
 * Uses generated GraphQL hooks with Apollo Client
 */

import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'

// Queries
export const GET_MEMBER_CONTRIBUTIONS = gql`
  query GetMemberContributions($memberId: ID!) {
    contributions(memberId: $memberId) {
      contributionId
      contributionNumber
      date
      type
      description
      monetaryValue
      status
      createdAt
    }
  }
`

export const GET_PENDING_CONTRIBUTIONS = gql`
  query GetPendingContributions {
    pendingContributions {
      contributionId
      contributionNumber
      date
      type
      description
      monetaryValue
      member {
        memberId
        name
      }
      status
      createdAt
    }
  }
`

// Mutations
export const CREATE_CONTRIBUTION = gql`
  mutation CreateContribution($input: ContributionInput!) {
    createContribution(input: $input) {
      contributionId
      contributionNumber
      status
    }
  }
`

export const APPROVE_CONTRIBUTION = gql`
  mutation ApproveContribution($contributionId: ID!, $approvalNote: String) {
    approveContribution(contributionId: $contributionId, approvalNote: $approvalNote) {
      contributionId
      status
      approvedAt
      approvedBy {
        memberId
        name
      }
    }
  }
`

// Hook: Get member contributions
export function useMemberContributions(memberId: string) {
  const { data, loading, error, refetch } = useQuery(GET_MEMBER_CONTRIBUTIONS, {
    variables: { memberId },
    skip: !memberId,
  })

  return {
    contributions: data?.contributions || [],
    loading,
    error,
    refetch,
  }
}

// Hook: Get pending contributions (for approvers)
export function usePendingContributions() {
  const { data, loading, error, refetch } = useQuery(GET_PENDING_CONTRIBUTIONS)

  return {
    contributions: data?.pendingContributions || [],
    loading,
    error,
    refetch,
  }
}

// Hook: Create contribution
export function useCreateContribution() {
  const [createContribution, { loading, error }] = useMutation(CREATE_CONTRIBUTION, {
    refetchQueries: [{ query: GET_MEMBER_CONTRIBUTIONS }],
  })

  return {
    createContribution: async (input: any) => {
      const result = await createContribution({ variables: { input } })
      return result.data?.createContribution
    },
    loading,
    error,
  }
}

// Hook: Approve contribution
export function useApproveContribution() {
  const [approveContribution, { loading, error }] = useMutation(APPROVE_CONTRIBUTION, {
    refetchQueries: [{ query: GET_PENDING_CONTRIBUTIONS }],
  })

  return {
    approve: async (contributionId: string, approvalNote?: string) => {
      const result = await approveContribution({
        variables: { contributionId, approvalNote },
      })
      return result.data?.approveContribution
    },
    loading,
    error,
  }
}
