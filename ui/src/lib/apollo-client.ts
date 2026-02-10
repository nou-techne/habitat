/**
 * Apollo Client configuration for GraphQL API
 * 
 * Handles:
 * - Authentication headers
 * - Error handling
 * - Cache configuration
 */

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { getAuthHeaders, clearAuthToken } from './auth'

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql',
})

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      ...getAuthHeaders(),
    }
  }
})

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
      
      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        clearAuthToken()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    })
  }
  
  if (networkError) {
    console.error(`[Network error]: ${networkError}`)
  }
})

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Cache configuration for Habitat entities
      Member: {
        keyFields: ['id'],
      },
      Contribution: {
        keyFields: ['id'],
      },
      Allocation: {
        keyFields: ['id'],
      },
      Distribution: {
        keyFields: ['id'],
      },
      Account: {
        keyFields: ['id'],
      },
      PatronagePeriod: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
})
