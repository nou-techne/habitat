/**
 * Member Dashboard - main landing page after login
 * 
 * Displays:
 * - Patronage summary (by period, by type)
 * - Recent contributions
 * - Capital account balance (book + tax)
 * - Allocation statements
 */

import React from 'react'
import { useQuery } from '@apollo/client'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { PatronageSummary } from '@/components/dashboard/PatronageSummary'
import { ContributionHistory } from '@/components/dashboard/ContributionHistory'
import { CapitalAccountView } from '@/components/dashboard/CapitalAccountView'
import { AllocationStatements } from '@/components/dashboard/AllocationStatements'
import { GET_MEMBER_DASHBOARD } from '@/graphql/queries/dashboard.graphql'

export default function Dashboard() {
  const user = getCurrentUser()
  
  const { data, loading, error, refetch } = useQuery(GET_MEMBER_DASHBOARD, {
    variables: { memberId: user?.id },
    skip: !user,
  })
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <p className="text-sm text-red-600">
            Error loading dashboard: {error.message}
          </p>
          <button onClick={() => refetch()} className="mt-4 btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  const member = data?.member
  const contributions = data?.contributions?.edges?.map((edge: any) => edge.node) || []
  const allocations = data?.allocations?.edges?.map((edge: any) => edge.node) || []
  const distributions = data?.distributions?.edges?.map((edge: any) => edge.node) || []
  const currentPeriod = data?.currentPeriod
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            {member?.displayName || member?.ensName || 'Your'} patronage summary and activity
          </p>
        </div>
        <Link href="/contributions/new" className="btn-action">
          <Plus className="h-4 w-4 mr-2" />
          Submit Contribution
        </Link>
      </div>
      
      {/* Patronage Summary */}
      <PatronageSummary
        currentPeriodPatronage={member?.patronageSummary?.currentPeriodPatronage || 0}
        lifetimePatronage={member?.patronageSummary?.lifetimePatronage || 0}
        byType={member?.patronageSummary?.byType || []}
        currentPeriodName={currentPeriod?.name}
      />
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capital Account */}
        <CapitalAccountView
          bookBalance={member?.capitalAccount?.bookBalance || 0}
          taxBalance={member?.capitalAccount?.taxBalance || 0}
          contributedCapital={member?.capitalAccount?.contributedCapital || 0}
          retainedPatronage={member?.capitalAccount?.retainedPatronage || 0}
          distributedPatronage={member?.capitalAccount?.distributedPatronage || 0}
          lastUpdatedAt={member?.capitalAccount?.lastUpdatedAt || new Date().toISOString()}
        />
        
        {/* Upcoming Distributions */}
        {distributions.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Distributions</h2>
            </div>
            <div className="card-body">
              <div className="space-y-2">
                {distributions.map((dist: any) => (
                  <div key={dist.id} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{dist.scheduledDate}</span>
                    <span className="text-sm font-medium text-gray-900">{dist.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Contribution History */}
      <ContributionHistory
        contributions={contributions}
        hasMore={data?.contributions?.pageInfo?.hasNextPage || false}
      />
      
      {/* Allocation Statements */}
      <AllocationStatements
        allocations={allocations}
        hasMore={data?.allocations?.pageInfo?.hasNextPage || false}
      />
    </div>
  )
}
