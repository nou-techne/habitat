/**
 * Patronage / Allocation Review Page
 * 
 * Governance interface for reviewing and approving period allocations:
 * - Current period status
 * - Period close workflow
 * - Proposed allocation table
 * - Approval panel
 */

import React from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { RefreshCw, Calendar } from 'lucide-react'
import { PeriodCloseStatus } from '@/components/allocations/PeriodCloseStatus'
import { AllocationTable } from '@/components/allocations/AllocationTable'
import { ApprovalPanel } from '@/components/allocations/ApprovalPanel'
import {
  GET_CURRENT_PERIOD,
  GET_PROPOSED_ALLOCATIONS,
  GET_PERIOD_CLOSE_WORKFLOW,
  INITIATE_PERIOD_CLOSE,
  APPROVE_ALLOCATIONS,
  REJECT_ALLOCATIONS,
} from '@/graphql/queries/allocations.graphql'
import { getCurrentUser } from '@/lib/auth'
import { formatDate } from '@/lib/format'

export default function PatronagePage() {
  const user = getCurrentUser()

  const { data: periodData, loading: periodLoading } = useQuery(GET_CURRENT_PERIOD)
  const { data: allocationsData, loading: allocationsLoading } = useQuery(
    GET_PROPOSED_ALLOCATIONS,
    {
      variables: { periodId: periodData?.currentPeriod?.id },
      skip: !periodData?.currentPeriod?.id,
    }
  )
  const { data: workflowData, loading: workflowLoading } = useQuery(GET_PERIOD_CLOSE_WORKFLOW, {
    variables: { periodId: periodData?.currentPeriod?.id },
    skip: !periodData?.currentPeriod?.id,
  })

  const [initiatePeriodClose, { loading: initiating }] = useMutation(INITIATE_PERIOD_CLOSE)
  const [approveAllocations, { loading: approving }] = useMutation(APPROVE_ALLOCATIONS)
  const [rejectAllocations, { loading: rejecting }] = useMutation(REJECT_ALLOCATIONS)

  const period = periodData?.currentPeriod
  const allocations = allocationsData?.proposedAllocations?.edges?.map((e: any) => e.node) || []
  const summary = allocationsData?.allocationSummary
  const workflow = workflowData?.periodCloseWorkflow

  const handleInitiate = async () => {
    if (!period?.id) return
    try {
      await initiatePeriodClose({ variables: { periodId: period.id } })
    } catch (error) {
      console.error('Failed to initiate period close:', error)
    }
  }

  const handleApprove = async (comment?: string) => {
    if (!period?.id) return
    try {
      await approveAllocations({
        variables: { periodId: period.id, comment },
      })
    } catch (error) {
      console.error('Failed to approve allocations:', error)
    }
  }

  const handleReject = async (reason: string) => {
    if (!period?.id) return
    try {
      await rejectAllocations({
        variables: { periodId: period.id, reason },
      })
    } catch (error) {
      console.error('Failed to reject allocations:', error)
    }
  }

  if (periodLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!period) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active period</h3>
          <p className="text-sm text-gray-500">
            There is no patronage period currently open or in close.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patronage & Allocations</h1>
        <p className="mt-2 text-sm text-gray-700">
          Review and approve period allocations for cooperative members
        </p>
      </div>

      {/* Period info */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{period.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(period.startDate)} – {formatDate(period.endDate)}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium ${
                period.status === 'CLOSED'
                  ? 'bg-primary-50 text-primary-700'
                  : period.status === 'CLOSING'
                  ? 'bg-infrastructure-50 text-infrastructure-700'
                  : 'bg-action-50 text-action-700'
              }`}
            >
              {period.status}
            </span>
          </div>

          {period.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Members</p>
                <p className="text-lg font-semibold text-gray-900">{period.stats.totalMembers}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contributions</p>
                <p className="text-lg font-semibold text-gray-900">
                  {period.stats.totalContributions}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Patronage</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${period.stats.totalPatronage?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Proposed Allocations</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${period.stats.proposedAllocations?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Period close workflow */}
      {workflow && (
        <PeriodCloseStatus
          currentStep={workflow.currentStep}
          steps={workflow.steps}
          canApprove={workflow.canApprove}
          onInitiate={period.status === 'OPEN' ? handleInitiate : undefined}
          loading={initiating}
        />
      )}

      {/* Allocation table */}
      {allocations.length > 0 && summary && (
        <AllocationTable allocations={allocations} summary={summary} />
      )}

      {/* Approval panel */}
      {workflow && workflow.status === 'AWAITING_APPROVAL' && (
        <ApprovalPanel
          approvals={workflow.approvals || []}
          requiredApprovals={workflow.requiredApprovals}
          canApprove={workflow.canApprove}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={approving || rejecting}
        />
      )}
    </div>
  )
}
