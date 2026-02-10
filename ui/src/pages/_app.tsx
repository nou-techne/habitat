/**
 * Next.js App component with Apollo Provider
 */

import type { AppProps } from 'next/app'
import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '@/lib/apollo-client'
import { Layout } from '@/components/Layout'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Check if page has custom layout
  const getLayout = (Component as any).getLayout || ((page: React.ReactNode) => (
    <Layout>{page}</Layout>
  ))
  
  return (
    <ApolloProvider client={apolloClient}>
      {getLayout(<Component {...pageProps} />)}
    </ApolloProvider>
  )
}
