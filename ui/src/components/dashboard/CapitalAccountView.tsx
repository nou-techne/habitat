/**
 * Capital Account View
 * 
 * Displays member's capital account balances:
 * - Book balance (GAAP)
 * - Tax balance (704(b))
 * - Contributed capital
 * - Retained patronage
 * - Distributed patronage
 */

import React from 'react'
import { DollarSign, TrendingUp, ArrowDownCircle, Info } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'

interface CapitalAccountViewProps {
  bookBalance: number
  taxBalance: number
  contributedCapital: number
  retainedPatronage: number
  distributedPatronage: number
  lastUpdatedAt: string
}

export function CapitalAccountView({
  bookBalance,
  taxBalance,
  contributedCapital,
  retainedPatronage,
  distributedPatronage,
  lastUpdatedAt
}: CapitalAccountViewProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-action-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Capital Account</h2>
          </div>
          <span className="text-xs text-gray-500">
            Updated {formatDate(lastUpdatedAt)}
          </span>
        </div>
      </div>
      
      <div className="card-body">
        {/* Primary balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center mb-1">
              <p className="text-sm font-medium text-gray-500">Book Balance</p>
              <button 
                className="ml-1 text-gray-400 hover:text-gray-600"
                title="GAAP accounting balance"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(bookBalance)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center mb-1">
              <p className="text-sm font-medium text-gray-500">Tax Balance</p>
              <button 
                className="ml-1 text-gray-400 hover:text-gray-600"
                title="IRC 704(b) tax basis"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(taxBalance)}
            </p>
          </div>
        </div>
        
        {/* Breakdown */}
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700">
              <TrendingUp className="h-4 w-4 mr-2 text-primary-600" />
              Contributed Capital
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(contributedCapital)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700">
              <TrendingUp className="h-4 w-4 mr-2 text-infrastructure-600" />
              Retained Patronage
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(retainedPatronage)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700">
              <ArrowDownCircle className="h-4 w-4 mr-2 text-action-600" />
              Distributed Patronage
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(distributedPatronage)}
            </span>
          </div>
        </div>
        
        {/* Explanation */}
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600">
            Your capital account tracks your ownership stake in the cooperative. 
            Book balance reflects GAAP accounting, while tax balance reflects your 
            IRC 704(b) capital account for tax reporting.
          </p>
        </div>
      </div>
    </div>
  )
}
