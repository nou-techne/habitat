/**
 * Contribution Detail Page (for approvers)
 * 
 * Detailed view of a single contribution with:
 * - Full description and metadata
 * - Member patronage history
 * - Evidence files
 * - Approval history
 * - Approve/reject actions
 */

import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  DollarSign,
  FileText,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import { ApprovalModal } from '@/components/approvals/ApprovalModal'
import { formatCurrency, formatDate } from '@/lib/format'

export default function ContributionDetail() {
  const router = useRouter()
  const { id } = router.query
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    action: 'approve' | 'reject'
  }>({
    isOpen: false,
    action: 'approve',
  })

  // TODO: Replace with actual query
  const contribution: any = null
  const loading = false

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!contribution) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Contribution not found</h3>
          <p className="text-sm text-gray-500 mb-4">
            This contribution may have been processed or removed.
          </p>
          <Link href="/approvals" className="btn-primary">
            Back to Approvals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/approvals"
        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Approvals
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contribution Review</h1>
          <p className="mt-2 text-sm text-gray-700">
            Submitted by {contribution.member.displayName} on {formatDate(contribution.submittedAt)}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded text-sm font-medium bg-action-50 text-action-700">
          Pending Review
        </span>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - contribution details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Contribution Details</h2>
            </div>
            <div className="card-body space-y-4">
              {/* Type */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Type</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-infrastructure-50 text-infrastructure-700">
                  {contribution.type}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                <p className="text-base text-gray-900">{contribution.description}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                {contribution.hours && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Hours</p>
                    <p className="text-lg font-semibold text-gray-900">{contribution.hours}</p>
                  </div>
                )}
                {contribution.monetaryValue && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Monetary Value</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(contribution.monetaryValue)}
                    </p>
                  </div>
                )}
              </div>

              {/* Evidence */}
              {contribution.evidence && contribution.evidence.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-500 mb-2">Evidence</p>
                  <div className="space-y-2">
                    {contribution.evidence.map((item: any, index: number) => (
                      <a
                        key={index}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {item.description || item.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setModalState({ isOpen: true, action: 'reject' })}
              className="flex-1 btn-secondary text-red-700 border-red-300 hover:bg-red-50"
            >
              Reject
            </button>
            <button
              onClick={() => setModalState({ isOpen: true, action: 'approve' })}
              className="flex-1 btn-primary"
            >
              Approve
            </button>
          </div>
        </div>

        {/* Right column - member context */}
        <div className="space-y-6">
          {/* Member card */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Member</h2>
              </div>
            </div>
            <div className="card-body">
              <p className="text-base font-medium text-gray-900 mb-2">
                {contribution.member.displayName}
              </p>
              <p className="text-sm text-gray-500 mb-4">{contribution.member.ensName}</p>

              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Patronage</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(contribution.member.patronageSummary?.totalPatronage || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Contributions</span>
                  <span className="text-sm font-medium text-gray-900">
                    {contribution.member.patronageSummary?.byType?.reduce(
                      (sum: number, t: any) => sum + t.count,
                      0
                    ) || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Patronage estimate */}
          {contribution.patronageEstimate && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
                  <h2 className="text-lg font-medium text-gray-900">Estimate</h2>
                </div>
              </div>
              <div className="card-body space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Raw Patronage</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(contribution.patronageEstimate.rawValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Weighted Value</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {formatCurrency(contribution.patronageEstimate.weightedValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Est. Allocation</p>
                  <p className="text-lg font-semibold text-primary-600">
                    {formatCurrency(contribution.patronageEstimate.estimatedAllocation)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {modalState.isOpen && (
        <ApprovalModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, action: 'approve' })}
          onConfirm={() => {
            // TODO: Implement
          }}
          action={modalState.action}
          contribution={{
            type: contribution.type,
            description: contribution.description,
            memberName: contribution.member.displayName,
          }}
        />
      )}
    </div>
  )
}
