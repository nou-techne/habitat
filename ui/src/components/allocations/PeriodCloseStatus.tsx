/**
 * Period Close Status Component
 * 
 * Displays the multi-step period close workflow:
 * 1. Aggregate patronage
 * 2. Apply weights
 * 3. Calculate allocations
 * 4. Generate distributions
 * 5. Await governance approval
 */

import React from 'react'
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertCircle,
  Loader,
} from 'lucide-react'
import { formatDate } from '@/lib/format'

interface Step {
  name: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  startedAt?: string
  completedAt?: string
  error?: string
}

interface PeriodCloseStatusProps {
  currentStep: string
  steps: Step[]
  canApprove: boolean
  onInitiate?: () => void
  loading?: boolean
}

export function PeriodCloseStatus({
  currentStep,
  steps,
  canApprove,
  onInitiate,
  loading = false,
}: PeriodCloseStatusProps) {
  const allCompleted = steps.every((s) => s.status === 'COMPLETED')
  const hasFailed = steps.some((s) => s.status === 'FAILED')

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Period Close Workflow</h2>
          {!allCompleted && onInitiate && (
            <button
              onClick={onInitiate}
              disabled={loading || steps.some((s) => s.status === 'IN_PROGRESS')}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Initiate Period Close'}
            </button>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = getStepIcon(step.status)
            const isActive = step.name === currentStep

            return (
              <div
                key={step.name}
                className={`relative flex items-start ${
                  isActive ? 'bg-primary-50 -mx-4 px-4 py-2 rounded-lg' : ''
                }`}
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <span
                    className="absolute left-5 top-10 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}

                {/* Icon */}
                <div className="relative">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                      step.status === 'COMPLETED'
                        ? 'bg-primary-100'
                        : step.status === 'FAILED'
                        ? 'bg-red-100'
                        : step.status === 'IN_PROGRESS'
                        ? 'bg-infrastructure-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        step.status === 'COMPLETED'
                          ? 'text-primary-600'
                          : step.status === 'FAILED'
                          ? 'text-red-600'
                          : step.status === 'IN_PROGRESS'
                          ? 'text-infrastructure-600'
                          : 'text-gray-400'
                      } ${step.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        isActive ? 'text-primary-900' : 'text-gray-900'
                      }`}
                    >
                      {step.name}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        step.status === 'COMPLETED'
                          ? 'bg-primary-50 text-primary-700'
                          : step.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : step.status === 'IN_PROGRESS'
                          ? 'bg-infrastructure-50 text-infrastructure-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {step.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {step.completedAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Completed {formatDate(step.completedAt)}
                    </p>
                  )}

                  {step.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 flex items-start">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall status */}
        {allCompleted && (
          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary-900 mb-1">
                  Period close complete
                </p>
                <p className="text-sm text-primary-700">
                  {canApprove
                    ? 'Allocations are ready for governance approval.'
                    : 'Awaiting governance approval from stewards.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasFailed && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">
                  Period close failed
                </p>
                <p className="text-sm text-red-700">
                  One or more steps encountered errors. Review the details above and contact support if
                  needed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getStepIcon(status: string) {
  switch (status) {
    case 'COMPLETED':
      return CheckCircle
    case 'IN_PROGRESS':
      return Loader
    case 'FAILED':
      return AlertCircle
    case 'PENDING':
    default:
      return Circle
  }
}
