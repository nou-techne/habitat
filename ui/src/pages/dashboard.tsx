/**
 * Member Dashboard - main landing page after login
 * 
 * Displays:
 * - Patronage summary
 * - Recent contributions
 * - Capital account balance
 * - Upcoming distributions
 */

import React from 'react'
import { LayoutDashboard, TrendingUp, DollarSign, FileText } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-700">
          Your patronage summary and recent activity
        </p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Total Patronage</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  $0.00
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-infrastructure-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Contributions</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  0
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-action-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Capital Account</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  $0.00
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LayoutDashboard className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">Active Period</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  Q1 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent activity placeholder */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-500">
            No recent activity. Connect to the Habitat API to see your contributions and allocations.
          </p>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="flex space-x-4">
        <button className="btn-primary">
          Submit Contribution
        </button>
        <button className="btn-secondary">
          View Allocations
        </button>
      </div>
    </div>
  )
}
