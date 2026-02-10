/**
 * Allocation Approval Panel
 * 
 * Governance approval interface for period allocations:
 * - Current approval status
 * - Required approvals count
 * - Approve/reject actions
 * - Comment/reason field
 */

import React, { useState } from 'react'
import { CheckCircle, XCircle, Users, MessageSquare, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface Approval {
  actorId: string
  actorName: string
  approvedAt: string
  comment?: string
}

interface ApprovalPanelProps {
  approvals: Approval[]
  requiredApprovals: number
  canApprove: boolean
  onApprove: (comment?: string) => void
  onReject: (reason: string) => void
  loading?: boolean
}

export function ApprovalPanel({
  approvals,
  requiredApprovals,
  canApprove,
  onApprove,
  onReject,
  loading = false,
}: ApprovalPanelProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const approvalCount = approvals.length
  const isApproved = approvalCount >= requiredApprovals

  const handleSubmit = () => {
    if (action === 'reject' && !text.trim()) {
      setError('Reason is required for rejection')
      return
    }

    if (action === 'approve') {
      onApprove(text.trim() || undefined)
    } else if (action === 'reject') {
      onReject(text.trim())
    }

    setText('')
    setError('')
    setAction(null)
  }

  const handleCancel = () => {
    setText('')
    setError('')
    setAction(null)
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-action-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Governance Approval</h2>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isApproved
                ? 'bg-primary-100 text-primary-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {approvalCount} of {requiredApprovals} required
          </span>
        </div>
      </div>

      <div className="card-body">
        {/* Existing approvals */}
        {approvals.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Approved by:</p>
            <div className="space-y-2">
              {approvals.map((approval) => (
                <div
                  key={approval.actorId}
                  className="flex items-start p-3 bg-primary-50 rounded-lg"
                >
                  <CheckCircle className="h-5 w-5 text-primary-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{approval.actorName}</p>
                      <span className="text-xs text-gray-500">
                        {formatDate(approval.approvedAt)}
                      </span>
                    </div>
                    {approval.comment && (
                      <p className="text-sm text-gray-700">{approval.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval form */}
        {canApprove && !action && (
          <div className="flex space-x-3">
            <button
              onClick={() => setAction('reject')}
              disabled={loading}
              className="flex-1 btn-secondary text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </button>
            <button
              onClick={() => setAction('approve')}
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </button>
          </div>
        )}

        {/* Comment/reason form */}
        {action && (
          <div className="space-y-4">
            <div>
              <label className="form-label">
                {action === 'approve' ? 'Comment (optional)' : 'Reason for rejection'}
                {action === 'reject' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  if (error) setError('')
                }}
                rows={3}
                className="form-input"
                placeholder={
                  action === 'approve'
                    ? 'Add a comment about this allocation...'
                    : 'Explain why these allocations should be rejected...'
                }
              />
              {error && (
                <div className="mt-2 flex items-start text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            {action === 'reject' && (
              <div className="p-3 bg-red-50 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium mb-1">This will reject the entire allocation</p>
                  <p>
                    The period close workflow will need to be rerun after corrections are made.
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-1 ${
                  action === 'approve' ? 'btn-primary' : 'btn-action'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}

        {!canApprove && approvals.length === 0 && (
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              You don't have permission to approve allocations.
            </p>
          </div>
        )}

        {isApproved && (
          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary-900 mb-1">
                  Allocations approved
                </p>
                <p className="text-sm text-primary-700">
                  This period's allocations have received the required approvals and will proceed to
                  distribution.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
