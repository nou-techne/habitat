/**
 * New Contribution Page
 * 
 * Form for submitting a new contribution for approval
 */

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ContributionForm } from '@/components/contributions/ContributionForm'

export default function NewContribution() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link 
        href="/contributions"
        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Contributions
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Submit Contribution</h1>
        <p className="mt-2 text-sm text-gray-700">
          Document your work to earn patronage and build your stake in the cooperative
        </p>
      </div>

      {/* Form */}
      <ContributionForm />
    </div>
  )
}
