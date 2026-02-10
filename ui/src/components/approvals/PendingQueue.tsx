/**
 * Pending Contributions Queue
 * 
 * Displays contributions awaiting approval with:
 * - Member info and contribution summary
 * - Estimated patronage value
 * - Quick approve/reject actions
 * - Detailed view link
 */

import React from 'react'
import Link from 'next/link'
import { 
  Clock, 
  User, 
  TrendingUp, 
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/format'

interface Contribution {
  id: string
  type: string
  description: string
  monetaryValue?: number
  hours?: number
  submittedAt: string
  member: {
    id: string
    displayName?: string
    ensName?: string
  }
  patronageEstimate?: {
    rawValue: number
    weightedValue: number
    estimatedAllocation: number
  }
  evidence?: Array<{
    type: string
    url: string
  }>
}

interface PendingQueueProps {
  contributions: Contribution[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  loading?: boolean
}

export function PendingQueue({ 
  contributions, 
  onApprove, 
  onReject,
  loading = false,
}: PendingQueueProps) {
  if (contributions.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <CheckCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-sm text-gray-500">
            No contributions are waiting for approval
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {contributions.map((contribution) => (
        <div 
          key={contribution.id}
          className="card hover:shadow-md transition-shadow"
        >
          <div className="card-body">
            <div className="flex items-start justify-between mb-4">
              {/* Member info */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {contribution.member.displayName || contribution.member.ensName}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatRelativeTime(contribution.submittedAt)}
                  </div>
                </div>
              </div>

              {/* Type badge */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-infrastructure-50 text-infrastructure-700">
                {contribution.type}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-900 mb-3 line-clamp-2">
              {contribution.description}
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 py-3 border-t border-b border-gray-100">
              {contribution.hours && (
                <div>
                  <p className="text-xs text-gray-500">Hours</p>
                  <p className="text-sm font-medium text-gray-900">{contribution.hours}</p>
                </div>
              )}
              {contribution.monetaryValue && (
                <div>
                  <p className="text-xs text-gray-500">Value</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(contribution.monetaryValue)}
                  </p>
                </div>
              )}
              {contribution.patronageEstimate && (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Raw Patronage</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(contribution.patronageEstimate.rawValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Est. Allocation</p>
                    <p className="text-sm font-medium text-primary-600">
                      {formatCurrency(contribution.patronageEstimate.estimatedAllocation)}
                    </p>
                  </div>
                </>
              )}
              {contribution.evidence && contribution.evidence.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">Evidence</p>
                  <p className="text-sm font-medium text-gray-900">
                    {contribution.evidence.length} {contribution.evidence.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link 
                href={`/approvals/${contribution.id}`}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
              >
                View details
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>

              <div className="flex space-x-2">
                <button
                  onClick={() => onReject(contribution.id)}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </button>
                <button
                  onClick={() => onApprove(contribution.id)}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
