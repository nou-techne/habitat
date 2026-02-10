/**
 * Allocation Statements Component
 * 
 * Displays recent patronage allocations by period:
 * - Total patronage for period
 * - Cash vs. retained split
 * - Breakdown by contribution type
 * - Period details
 */

import React from 'react'
import { PieChart, Calendar, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'

interface AllocationsByType {
  type: string
  patronageValue: number
  weight: number
  weightedValue: number
  allocation: number
}

interface Allocation {
  id: string
  totalPatronage: number
  cashDistribution: number
  retainedAllocation: number
  allocationsByType: AllocationsByType[]
  approvedAt?: string
  status: 'PROPOSED' | 'APPROVED' | 'DISTRIBUTED'
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
    status: string
  }
}

interface AllocationStatementsProps {
  allocations: Allocation[]
  hasMore: boolean
}

export function AllocationStatements({ allocations, hasMore }: AllocationStatementsProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <PieChart className="h-5 w-5 text-action-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Allocation Statements</h2>
          </div>
          {hasMore && (
            <a href="/patronage" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all
            </a>
          )}
        </div>
      </div>
      
      <div className="card-body">
        {allocations.length === 0 ? (
          <p className="text-sm text-gray-500">
            No allocations yet. Allocations are calculated at the end of each patronage period.
          </p>
        ) : (
          <div className="space-y-4">
            {allocations.map((allocation) => (
              <div 
                key={allocation.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
              >
                {/* Period header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-infrastructure-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {allocation.period.name}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    allocation.status === 'DISTRIBUTED' 
                      ? 'bg-primary-50 text-primary-700'
                      : allocation.status === 'APPROVED'
                      ? 'bg-infrastructure-50 text-infrastructure-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {allocation.status}
                  </span>
                </div>
                
                {/* Total allocation */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Total Patronage Allocation</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(allocation.totalPatronage)}
                  </p>
                </div>
                
                {/* Cash vs. retained */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-primary-50 rounded p-2">
                    <p className="text-xs text-gray-600 mb-1">Cash Distribution</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(allocation.cashDistribution)}
                    </p>
                  </div>
                  <div className="bg-infrastructure-50 rounded p-2">
                    <p className="text-xs text-gray-600 mb-1">Retained</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(allocation.retainedAllocation)}
                    </p>
                  </div>
                </div>
                
                {/* By type (collapsed) */}
                {allocation.allocationsByType.length > 0 && (
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-600 hover:text-gray-900">
                      <span>View breakdown by contribution type</span>
                      <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="mt-2 space-y-1 text-xs">
                      {allocation.allocationsByType.map((item) => (
                        <div key={item.type} className="flex justify-between py-1">
                          <span className="text-gray-600 capitalize">{item.type.toLowerCase()}</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(item.allocation)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                
                {/* Period dates */}
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  {formatDate(allocation.period.startDate)} – {formatDate(allocation.period.endDate)}
                  {allocation.approvedAt && (
                    <span className="ml-2">• Approved {formatDate(allocation.approvedAt)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
