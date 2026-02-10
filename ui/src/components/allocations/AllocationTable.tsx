/**
 * Allocation Table Component
 * 
 * Displays proposed allocations for all members with:
 * - Member name
 * - Total patronage by type
 * - Cash vs. retained split
 * - Expandable type breakdown
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface AllocationsByType {
  type: string
  patronageValue: number
  weight: number
  weightedValue: number
  allocation: number
}

interface Allocation {
  id: string
  memberId: string
  member: {
    id: string
    displayName?: string
    ensName?: string
  }
  totalPatronage: number
  cashDistribution: number
  retainedAllocation: number
  allocationsByType: AllocationsByType[]
}

interface AllocationTableProps {
  allocations: Allocation[]
  summary: {
    totalAllocated: number
    totalCash: number
    totalRetained: number
    averageAllocation: number
    memberCount: number
    byType: Array<{
      type: string
      totalPatronage: number
      totalAllocation: number
      memberCount: number
    }>
  }
}

export function AllocationTable({ allocations, summary }: AllocationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'patronage' | 'allocation'>('allocation')
  const [sortDesc, setSortDesc] = useState(true)

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedRows(next)
  }

  const sortedAllocations = [...allocations].sort((a, b) => {
    let aVal: number | string
    let bVal: number | string

    switch (sortBy) {
      case 'name':
        aVal = a.member.displayName || a.member.ensName || ''
        bVal = b.member.displayName || b.member.ensName || ''
        return sortDesc
          ? bVal.toString().localeCompare(aVal.toString())
          : aVal.toString().localeCompare(bVal.toString())
      case 'patronage':
        aVal = a.totalPatronage
        bVal = b.totalPatronage
        break
      case 'allocation':
      default:
        aVal = a.cashDistribution + a.retainedAllocation
        bVal = b.cashDistribution + b.retainedAllocation
        break
    }

    return sortDesc ? bVal - aVal : aVal - bVal
  })

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(column)
      setSortDesc(true)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Member Allocations</h2>
          </div>
          <span className="text-sm text-gray-500">{summary.memberCount} members</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Allocated</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(summary.totalAllocated)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Cash</p>
            <p className="text-lg font-semibold text-primary-600">
              {formatCurrency(summary.totalCash)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Retained</p>
            <p className="text-lg font-semibold text-infrastructure-600">
              {formatCurrency(summary.totalRetained)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Average</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(summary.averageAllocation)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8"></th>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Member {sortBy === 'name' && (sortDesc ? '↓' : '↑')}
              </th>
              <th
                onClick={() => handleSort('patronage')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Patronage {sortBy === 'patronage' && (sortDesc ? '↓' : '↑')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cash
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Retained
              </th>
              <th
                onClick={() => handleSort('allocation')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Total {sortBy === 'allocation' && (sortDesc ? '↓' : '↑')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAllocations.map((allocation) => {
              const isExpanded = expandedRows.has(allocation.id)
              const totalAllocation = allocation.cashDistribution + allocation.retainedAllocation

              return (
                <React.Fragment key={allocation.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 py-4">
                      <button
                        onClick={() => toggleRow(allocation.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.member.displayName || allocation.member.ensName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(allocation.totalPatronage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-primary-600 font-medium">
                      {formatCurrency(allocation.cashDistribution)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-infrastructure-600 font-medium">
                      {formatCurrency(allocation.retainedAllocation)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-semibold">
                      {formatCurrency(totalAllocation)}
                    </td>
                  </tr>

                  {/* Expanded row - breakdown by type */}
                  {isExpanded && (
                    <tr>
                      <td></td>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="text-xs text-gray-700 space-y-2">
                          <p className="font-medium mb-2">Breakdown by Contribution Type:</p>
                          {allocation.allocationsByType.map((item) => (
                            <div key={item.type} className="flex justify-between items-center">
                              <span className="capitalize">{item.type.toLowerCase()}</span>
                              <div className="flex items-center space-x-4 text-right">
                                <span className="text-gray-500">
                                  Patronage: {formatCurrency(item.patronageValue)}
                                </span>
                                <span className="text-gray-500">
                                  Weight: {item.weight.toFixed(2)}
                                </span>
                                <span className="text-gray-500">
                                  Weighted: {formatCurrency(item.weightedValue)}
                                </span>
                                <span className="font-medium">
                                  Allocated: {formatCurrency(item.allocation)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
