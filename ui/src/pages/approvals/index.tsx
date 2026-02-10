/**
 * Approvals Dashboard
 * 
 * Main page for approvers to:
 * - View pending contributions queue
 * - Approve/reject contributions
 * - View approval history
 */

import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { PendingQueue } from '@/components/approvals/PendingQueue'
import { ApprovalModal } from '@/components/approvals/ApprovalModal'
import { ApprovalHistory } from '@/components/approvals/ApprovalHistory'
import { APPROVE_CONTRIBUTION, REJECT_CONTRIBUTION } from '@/graphql/mutations/contributions.graphql'
import { CheckSquare, Clock, History } from 'lucide-react'

export default function Approvals() {
  const [activeTab, setActiveTab] = useState('pending')
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    action: 'approve' | 'reject'
    contributionId: string | null
    contribution: any
  }>({
    isOpen: false,
    action: 'approve',
    contributionId: null,
    contribution: null,
  })

  const [approveContribution, { loading: approving }] = useMutation(APPROVE_CONTRIBUTION)
  const [rejectContribution, { loading: rejecting }] = useMutation(REJECT_CONTRIBUTION)

  // TODO: Replace with actual query when API is ready
  const pendingContributions: any[] = []
  const historyEntries: any[] = []
  const pendingCount = 0

  const handleApproveClick = (id: string) => {
    const contribution = pendingContributions.find((c) => c.id === id)
    if (contribution) {
      setModalState({
        isOpen: true,
        action: 'approve',
        contributionId: id,
        contribution: {
          type: contribution.type,
          description: contribution.description,
          memberName: contribution.member.displayName || contribution.member.ensName,
        },
      })
    }
  }

  const handleRejectClick = (id: string) => {
    const contribution = pendingContributions.find((c) => c.id === id)
    if (contribution) {
      setModalState({
        isOpen: true,
        action: 'reject',
        contributionId: id,
        contribution: {
          type: contribution.type,
          description: contribution.description,
          memberName: contribution.member.displayName || contribution.member.ensName,
        },
      })
    }
  }

  const handleConfirm = async (comment?: string) => {
    if (!modalState.contributionId) return

    try {
      if (modalState.action === 'approve') {
        await approveContribution({
          variables: {
            id: modalState.contributionId,
            comment,
          },
        })
      } else {
        await rejectContribution({
          variables: {
            id: modalState.contributionId,
            reason: comment!,
          },
        })
      }

      // Close modal and refresh
      setModalState({ isOpen: false, action: 'approve', contributionId: null, contribution: null })
      // TODO: Refetch queries
    } catch (error) {
      console.error('Error processing contribution:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approvals</h1>
        <p className="mt-2 text-sm text-gray-700">
          Review and approve contributions from cooperative members
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-action-600 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <CheckSquare className="h-5 w-5 text-primary-600 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <History className="h-5 w-5 text-infrastructure-600 mr-3" />
              <div>
                <p className="text-xs text-gray-500">Total This Period</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="history">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingQueue
            contributions={pendingContributions}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
            loading={approving || rejecting}
          />
        </TabsContent>

        <TabsContent value="history">
          <ApprovalHistory entries={historyEntries} />
        </TabsContent>
      </Tabs>

      {/* Approval Modal */}
      {modalState.isOpen && (
        <ApprovalModal
          isOpen={modalState.isOpen}
          onClose={() =>
            setModalState({ isOpen: false, action: 'approve', contributionId: null, contribution: null })
          }
          onConfirm={handleConfirm}
          action={modalState.action}
          contribution={modalState.contribution}
          loading={approving || rejecting}
        />
      )}
    </div>
  )
}
