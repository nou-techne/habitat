/**
 * Patronage Summary Card
 * 
 * Displays member's patronage totals:
 * - Current period patronage
 * - Lifetime patronage
 * - Breakdown by contribution type
 */

import React from 'react'
import { TrendingUp, Calendar, Award } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface PatronageSummaryProps {
  currentPeriodPatronage: number
  lifetimePatronage: number
  byType: Array<{
    type: string
    amount: number
    count: number
  }>
  currentPeriodName?: string
}

export function PatronageSummary({
  currentPeriodPatronage,
  lifetimePatronage,
  byType,
  currentPeriodName = 'Current Period'
}: PatronageSummaryProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center">
          <TrendingUp className="h-5 w-5 text-primary-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Patronage Summary</h2>
        </div>
      </div>
      
      <div className="card-body">
        {/* Period and lifetime totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start">
            <Calendar className="h-5 w-5 text-infrastructure-600 mt-1 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">{currentPeriodName}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(currentPeriodPatronage)}
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Award className="h-5 w-5 text-action-600 mt-1 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-500">Lifetime Total</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(lifetimePatronage)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Breakdown by type */}
        {byType.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">By Contribution Type</h3>
            <div className="space-y-2">
              {byType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 capitalize">
                      {item.type.toLowerCase()}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({item.count} {item.count === 1 ? 'contribution' : 'contributions'})
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {byType.length === 0 && (
          <p className="text-sm text-gray-500">
            No contributions yet. Submit your first contribution to start earning patronage.
          </p>
        )}
      </div>
    </div>
  )
}
