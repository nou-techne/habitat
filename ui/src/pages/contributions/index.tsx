/**
 * Contributions List Page
 * 
 * View all contributions with filtering and status
 */

import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import Link from 'next/link'
import { Plus, Filter, RefreshCw } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { ContributionHistory } from '@/components/dashboard/ContributionHistory'

export default function Contributions() {
  const user = getCurrentUser()
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  // TODO: Replace with actual query when API is ready
  const contributions: any[] = []
  const loading = false
  const error = null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contributions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Track your contributions and patronage claims
          </p>
        </div>
        <Link href="/contributions/new" className="btn-action">
          <Plus className="h-4 w-4 mr-2" />
          New Contribution
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700">Filter:</span>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 text-sm rounded-md ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-red-600">Error loading contributions</p>
          </div>
        </div>
      ) : (
        <ContributionHistory
          contributions={contributions}
          hasMore={false}
        />
      )}
    </div>
  )
}
