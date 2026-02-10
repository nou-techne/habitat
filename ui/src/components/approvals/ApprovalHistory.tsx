/**
 * Approval History Component
 * 
 * Displays historical approval/rejection decisions with:
 * - Action (approved/rejected)
 * - Actor and timestamp
 * - Comments/reasons
 * - Contribution details
 */

import React from 'react'
import { CheckCircle, XCircle, User, MessageSquare, Calendar } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/format'

interface ApprovalHistoryEntry {
  id: string
  contributionId: string
  contribution: {
    type: string
    description: string
    monetaryValue?: number
    hours?: number
  }
  memberId: string
  memberName: string
  action: 'APPROVED' | 'REJECTED'
  actorId: string
  actorName: string
  comment?: string
  timestamp: string
}

interface ApprovalHistoryProps {
  entries: ApprovalHistoryEntry[]
  loading?: boolean
}

export function ApprovalHistory({ entries, loading = false }: ApprovalHistoryProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No history yet</h3>
          <p className="text-sm text-gray-500">
            Approval decisions will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flow-root">
          <ul className="-mb-8">
            {entries.map((entry, index) => {
              const isApproved = entry.action === 'APPROVED'

              return (
                <li key={entry.id}>
                  <div className="relative pb-8">
                    {/* Connector line */}
                    {index < entries.length - 1 && (
                      <span
                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}

                    <div className="relative flex items-start space-x-3">
                      {/* Icon */}
                      <div className="relative">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                            isApproved
                              ? 'bg-primary-100'
                              : 'bg-red-100'
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle className="h-5 w-5 text-primary-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {isApproved ? 'Approved' : 'Rejected'} by {entry.actorName}
                          </p>
                          <time className="text-xs text-gray-500">
                            {formatRelativeTime(entry.timestamp)}
                          </time>
                        </div>

                        {/* Contribution details */}
                        <div className="mb-2">
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            <User className="h-3 w-3 mr-1" />
                            {entry.memberName} • {entry.contribution.type}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {entry.contribution.description}
                          </p>
                        </div>

                        {/* Comment */}
                        {entry.comment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 flex items-start">
                            <MessageSquare className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <span>{entry.comment}</span>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                          {entry.contribution.hours && (
                            <span>{entry.contribution.hours}h</span>
                          )}
                          {entry.contribution.monetaryValue && (
                            <span>${entry.contribution.monetaryValue.toFixed(2)}</span>
                          )}
                          <span>ID: {entry.contributionId.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
