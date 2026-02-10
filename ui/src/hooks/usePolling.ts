/**
 * Polling Hook
 * 
 * Generic polling hook for real-time updates
 * Polls GraphQL queries at specified interval
 */

import { useEffect, useRef } from 'react'
import type { DocumentNode } from 'graphql'
import { useQuery, ApolloError } from '@apollo/client'

export interface UsePollingOptions<TData, TVariables> {
  query: DocumentNode
  variables?: TVariables
  pollInterval?: number // milliseconds (default: 5000)
  skip?: boolean
  onData?: (data: TData) => void
  onError?: (error: ApolloError) => void
}

/**
 * Hook for polling queries at regular intervals
 * Automatically stops polling when component unmounts
 */
export function usePolling<TData = any, TVariables = any>({
  query,
  variables,
  pollInterval = 5000,
  skip = false,
  onData,
  onError,
}: UsePollingOptions<TData, TVariables>) {
  const previousDataRef = useRef<TData>()

  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<TData, TVariables>(
    query,
    {
      variables,
      skip,
      pollInterval,
      notifyOnNetworkStatusChange: true,
    }
  )

  // Call onData when data changes
  useEffect(() => {
    if (data && JSON.stringify(data) !== JSON.stringify(previousDataRef.current)) {
      previousDataRef.current = data
      onData?.(data)
    }
  }, [data, onData])

  // Call onError when error occurs
  useEffect(() => {
    if (error) {
      onError?.(error)
    }
  }, [error, onError])

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    data,
    loading,
    error,
    refetch,
    startPolling,
    stopPolling,
  }
}
