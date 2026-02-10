/**
 * Approval/Rejection Modal
 * 
 * Confirmation dialog for approve/reject actions with:
 * - Optional comment field
 * - Reason required for rejection
 * - Contribution summary
 */

import React, { useState } from 'react'
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (comment?: string) => void
  action: 'approve' | 'reject'
  contribution: {
    type: string
    description: string
    memberName: string
  }
  loading?: boolean
}

export function ApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  contribution,
  loading = false,
}: ApprovalModalProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (action === 'reject' && !comment.trim()) {
      setError('Reason is required for rejection')
      return
    }

    onConfirm(comment.trim() || undefined)
    setComment('')
    setError('')
  }

  const handleClose = () => {
    setComment('')
    setError('')
    onClose()
  }

  const isApprove = action === 'approve'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              {isApprove ? (
                <CheckCircle className="h-6 w-6 text-primary-600 mr-2" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 mr-2" />
              )}
              <h3 className="text-lg font-medium text-gray-900">
                {isApprove ? 'Approve Contribution' : 'Reject Contribution'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {/* Contribution summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500 mb-1">
                {contribution.type} by {contribution.memberName}
              </p>
              <p className="text-sm text-gray-900">{contribution.description}</p>
            </div>

            {/* Comment field */}
            <div className="mb-4">
              <label className="form-label">
                {isApprove ? 'Comment (optional)' : 'Reason for rejection'}
                {!isApprove && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (error) setError('')
                }}
                rows={3}
                className="form-input"
                placeholder={
                  isApprove
                    ? 'Add a comment about this contribution...'
                    : 'Explain why this contribution is being rejected...'
                }
              />
              {error && (
                <div className="mt-2 flex items-start text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            {/* Warning for rejection */}
            {!isApprove && (
              <div className="mb-4 p-3 bg-red-50 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium mb-1">This action cannot be undone</p>
                  <p>
                    The member will be notified and the contribution will be marked as rejected. 
                    Please provide clear feedback.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`${
                isApprove ? 'btn-primary' : 'btn-action'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Processing...'
                : isApprove
                ? 'Approve'
                : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
