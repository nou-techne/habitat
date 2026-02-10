/**
 * Contribution History Component
 * 
 * Displays recent contributions with:
 * - Type, description, value
 * - Status (pending, approved, rejected)
 * - Submission and approval dates
 */

import React from 'react'
import { FileText, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'

interface Contribution {
  id: string
  type: string
  description: string
  monetaryValue?: number
  hours?: number
  submittedAt: string
  approvedAt?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  evidence?: Array<{
    type: string
    url: string
    description?: string
  }>
}

interface ContributionHistoryProps {
  contributions: Contribution[]
  hasMore: boolean
  onLoadMore?: () => void
}

export function ContributionHistory({ 
  contributions, 
  hasMore, 
  onLoadMore 
}: ContributionHistoryProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-infrastructure-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Recent Contributions</h2>
          </div>
          <a href="/contributions" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all
          </a>
        </div>
      </div>
      
      <div className="card-body">
        {contributions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No contributions yet. Submit your first contribution to start tracking your patronage.
          </p>
        ) : (
          <div className="space-y-4">
            {contributions.map((contribution) => (
              <div 
                key={contribution.id} 
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-infrastructure-50 text-infrastructure-700">
                        {contribution.type}
                      </span>
                      {getStatusBadge(contribution.status)}
                    </div>
                    
                    <p className="text-sm text-gray-900 mb-2">
                      {contribution.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Submitted {formatDate(contribution.submittedAt)}</span>
                      {contribution.approvedAt && (
                        <span>Approved {formatDate(contribution.approvedAt)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 text-right">
                    {contribution.monetaryValue && (
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(contribution.monetaryValue)}
                      </p>
                    )}
                    {contribution.hours && (
                      <p className="text-xs text-gray-500">
                        {contribution.hours}h
                      </p>
                    )}
                  </div>
                </div>
                
                {contribution.evidence && contribution.evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {contribution.evidence.length} {contribution.evidence.length === 1 ? 'attachment' : 'attachments'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {hasMore && onLoadMore && (
              <button 
                onClick={onLoadMore}
                className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center text-xs text-primary-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </span>
      )
    case 'REJECTED':
      return (
        <span className="inline-flex items-center text-xs text-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </span>
      )
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center text-xs text-gray-700">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      )
  }
}
