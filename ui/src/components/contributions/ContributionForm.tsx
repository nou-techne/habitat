/**
 * Contribution Form Component
 * 
 * Multi-step form for submitting contributions:
 * 1. Select contribution type
 * 2. Fill type-specific fields
 * 3. Add evidence (optional)
 * 4. Review and submit
 */

import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useRouter } from 'next/router'
import { 
  Briefcase, 
  Award, 
  DollarSign, 
  Users, 
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
} from 'lucide-react'
import { CREATE_CONTRIBUTION, SUBMIT_CONTRIBUTION } from '@/graphql/mutations/contributions.graphql'
import { getCurrentUser } from '@/lib/auth'

type ContributionType = 'LABOR' | 'EXPERTISE' | 'CAPITAL' | 'RELATIONSHIP'

interface FormData {
  type: ContributionType | null
  description: string
  monetaryValue?: number
  hours?: number
  expertise?: string
  capitalType?: string
  relationshipType?: string
  evidence: Array<{
    type: string
    url: string
    description?: string
  }>
}

const contributionTypes = [
  {
    value: 'LABOR' as ContributionType,
    label: 'Labor',
    icon: Briefcase,
    description: 'Time spent working on cooperative activities',
    color: 'primary',
  },
  {
    value: 'EXPERTISE' as ContributionType,
    label: 'Expertise',
    icon: Award,
    description: 'Specialized knowledge, skills, or professional services',
    color: 'infrastructure',
  },
  {
    value: 'CAPITAL' as ContributionType,
    label: 'Capital',
    icon: DollarSign,
    description: 'Financial investment or tangible assets',
    color: 'action',
  },
  {
    value: 'RELATIONSHIP' as ContributionType,
    label: 'Relationship',
    icon: Users,
    description: 'Network access, partnerships, or reputation',
    color: 'primary',
  },
]

export function ContributionForm() {
  const router = useRouter()
  const user = getCurrentUser()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    type: null,
    description: '',
    evidence: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [createContribution, { loading: creating }] = useMutation(CREATE_CONTRIBUTION)
  const [submitContribution, { loading: submitting }] = useMutation(SUBMIT_CONTRIBUTION)

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.type) {
        newErrors.type = 'Please select a contribution type'
      }
    }

    if (currentStep === 2) {
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required'
      }

      // Type-specific validation
      if (formData.type === 'LABOR') {
        if (!formData.hours || formData.hours <= 0) {
          newErrors.hours = 'Hours must be greater than 0'
        }
      }

      if (formData.type === 'EXPERTISE') {
        if (!formData.expertise?.trim()) {
          newErrors.expertise = 'Please describe your expertise'
        }
      }

      if (formData.type === 'CAPITAL') {
        if (!formData.capitalType) {
          newErrors.capitalType = 'Please select capital type'
        }
        if (!formData.monetaryValue || formData.monetaryValue <= 0) {
          newErrors.monetaryValue = 'Value must be greater than 0'
        }
      }

      if (formData.type === 'RELATIONSHIP') {
        if (!formData.relationshipType) {
          newErrors.relationshipType = 'Please select relationship type'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

    try {
      // Create contribution
      const { data: createData } = await createContribution({
        variables: {
          input: {
            memberId: user?.id,
            type: formData.type,
            description: formData.description,
            monetaryValue: formData.monetaryValue,
            hours: formData.hours,
            expertise: formData.expertise,
            capitalType: formData.capitalType,
            relationshipType: formData.relationshipType,
            evidence: formData.evidence,
          },
        },
      })

      if (createData?.createContribution?.errors?.length > 0) {
        const apiErrors: Record<string, string> = {}
        createData.createContribution.errors.forEach((err: any) => {
          apiErrors[err.field] = err.message
        })
        setErrors(apiErrors)
        return
      }

      const contributionId = createData?.createContribution?.contribution?.id

      // Submit for approval
      await submitContribution({
        variables: { id: contributionId },
      })

      // Navigate to contributions list
      router.push('/contributions')
    } catch (error) {
      setErrors({ submit: 'Failed to submit contribution. Please try again.' })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  s < step
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : s === step
                    ? 'border-primary-600 text-primary-600'
                    : 'border-gray-300 text-gray-300'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-full h-0.5 mx-2 ${
                    s < step ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                  style={{ minWidth: '60px' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Type</span>
          <span>Details</span>
          <span>Evidence</span>
          <span>Review</span>
        </div>
      </div>

      {/* Step content */}
      <div className="card">
        <div className="card-body">
          {step === 1 && (
            <TypeSelectionStep
              selectedType={formData.type}
              onSelect={(type) => updateField('type', type)}
              error={errors.type}
            />
          )}

          {step === 2 && formData.type && (
            <DetailsStep
              type={formData.type}
              formData={formData}
              updateField={updateField}
              errors={errors}
            />
          )}

          {step === 3 && (
            <EvidenceStep
              evidence={formData.evidence}
              onAdd={(evidence) => updateField('evidence', [...formData.evidence, evidence])}
              onRemove={(index) =>
                updateField(
                  'evidence',
                  formData.evidence.filter((_, i) => i !== index)
                )
              }
            />
          )}

          {step === 4 && (
            <ReviewStep formData={formData} />
          )}

          {/* Error message */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </button>

            {step < 4 ? (
              <button onClick={handleNext} className="btn-primary">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={creating || submitting}
                className="btn-action disabled:opacity-50"
              >
                {creating || submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 1: Type Selection
function TypeSelectionStep({
  selectedType,
  onSelect,
  error,
}: {
  selectedType: ContributionType | null
  onSelect: (type: ContributionType) => void
  error?: string
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Contribution Type</h2>
      <p className="text-sm text-gray-600 mb-6">
        Choose the type that best describes your contribution
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contributionTypes.map((type) => {
          const Icon = type.icon
          const isSelected = selectedType === type.value

          return (
            <button
              key={type.value}
              onClick={() => onSelect(type.value)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                isSelected
                  ? `border-${type.color}-600 bg-${type.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon
                className={`h-8 w-8 mb-3 ${
                  isSelected ? `text-${type.color}-600` : 'text-gray-400'
                }`}
              />
              <h3 className="font-medium text-gray-900 mb-1">{type.label}</h3>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          )
        })}
      </div>

      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  )
}

// Step 2: Details (type-specific fields)
function DetailsStep({
  type,
  formData,
  updateField,
  errors,
}: {
  type: ContributionType
  formData: FormData
  updateField: (field: keyof FormData, value: any) => void
  errors: Record<string, string>
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Contribution Details</h2>
      <p className="text-sm text-gray-600 mb-6">
        Provide details about your {type.toLowerCase()} contribution
      </p>

      {/* Description (all types) */}
      <div className="mb-4">
        <label className="form-label">
          Description <span className="text-red-600">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={4}
          className="form-input"
          placeholder="Describe what you contributed and its impact on the cooperative..."
        />
        {errors.description && <p className="form-error">{errors.description}</p>}
      </div>

      {/* Labor-specific fields */}
      {type === 'LABOR' && (
        <div className="mb-4">
          <label className="form-label">
            Hours <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={formData.hours || ''}
            onChange={(e) => updateField('hours', parseFloat(e.target.value))}
            className="form-input"
            placeholder="8.5"
          />
          {errors.hours && <p className="form-error">{errors.hours}</p>}
        </div>
      )}

      {/* Expertise-specific fields */}
      {type === 'EXPERTISE' && (
        <div className="mb-4">
          <label className="form-label">
            Expertise Area <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.expertise || ''}
            onChange={(e) => updateField('expertise', e.target.value)}
            className="form-input"
            placeholder="e.g., Legal counsel, Design work, Technical architecture"
          />
          {errors.expertise && <p className="form-error">{errors.expertise}</p>}
        </div>
      )}

      {/* Capital-specific fields */}
      {type === 'CAPITAL' && (
        <>
          <div className="mb-4">
            <label className="form-label">
              Capital Type <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.capitalType || ''}
              onChange={(e) => updateField('capitalType', e.target.value)}
              className="form-input"
            >
              <option value="">Select type...</option>
              <option value="CASH">Cash</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="SPACE">Space</option>
              <option value="INTELLECTUAL_PROPERTY">Intellectual Property</option>
            </select>
            {errors.capitalType && <p className="form-error">{errors.capitalType}</p>}
          </div>

          <div className="mb-4">
            <label className="form-label">
              Monetary Value (USD) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.monetaryValue || ''}
              onChange={(e) => updateField('monetaryValue', parseFloat(e.target.value))}
              className="form-input"
              placeholder="1000.00"
            />
            {errors.monetaryValue && <p className="form-error">{errors.monetaryValue}</p>}
          </div>
        </>
      )}

      {/* Relationship-specific fields */}
      {type === 'RELATIONSHIP' && (
        <div className="mb-4">
          <label className="form-label">
            Relationship Type <span className="text-red-600">*</span>
          </label>
          <select
            value={formData.relationshipType || ''}
            onChange={(e) => updateField('relationshipType', e.target.value)}
            className="form-input"
          >
            <option value="">Select type...</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="CUSTOMER_REFERRAL">Customer Referral</option>
            <option value="NETWORK_ACCESS">Network Access</option>
            <option value="REPUTATION">Reputation</option>
          </select>
          {errors.relationshipType && <p className="form-error">{errors.relationshipType}</p>}
        </div>
      )}
    </div>
  )
}

// Step 3: Evidence
function EvidenceStep({
  evidence,
  onAdd,
  onRemove,
}: {
  evidence: Array<{ type: string; url: string; description?: string }>
  onAdd: (evidence: { type: string; url: string; description?: string }) => void
  onRemove: (index: number) => void
}) {
  const [newEvidence, setNewEvidence] = useState({ type: 'LINK', url: '', description: '' })

  const handleAdd = () => {
    if (newEvidence.url.trim()) {
      onAdd(newEvidence)
      setNewEvidence({ type: 'LINK', url: '', description: '' })
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Evidence (Optional)</h2>
      <p className="text-sm text-gray-600 mb-6">
        Attach links, documents, or images that support your contribution
      </p>

      {/* Existing evidence */}
      {evidence.length > 0 && (
        <div className="mb-6 space-y-2">
          {evidence.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.url}</p>
                {item.description && (
                  <p className="text-xs text-gray-500">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => onRemove(index)}
                className="ml-4 text-sm text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new evidence */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="mb-4">
          <label className="form-label">Type</label>
          <select
            value={newEvidence.type}
            onChange={(e) => setNewEvidence({ ...newEvidence, type: e.target.value })}
            className="form-input"
          >
            <option value="LINK">Link</option>
            <option value="FILE">File</option>
            <option value="IMAGE">Image</option>
            <option value="DOCUMENT">Document</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label">URL</label>
          <input
            type="url"
            value={newEvidence.url}
            onChange={(e) => setNewEvidence({ ...newEvidence, url: e.target.value })}
            className="form-input"
            placeholder="https://..."
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Description (optional)</label>
          <input
            type="text"
            value={newEvidence.description}
            onChange={(e) => setNewEvidence({ ...newEvidence, description: e.target.value })}
            className="form-input"
            placeholder="Brief description of this evidence"
          />
        </div>

        <button onClick={handleAdd} className="btn-secondary">
          Add Evidence
        </button>
      </div>
    </div>
  )
}

// Step 4: Review
function ReviewStep({ formData }: { formData: FormData }) {
  const typeLabel = contributionTypes.find((t) => t.value === formData.type)?.label

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
      <p className="text-sm text-gray-600 mb-6">
        Please review your contribution before submitting for approval
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Type</p>
          <p className="text-base text-gray-900">{typeLabel}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">Description</p>
          <p className="text-base text-gray-900">{formData.description}</p>
        </div>

        {formData.hours && (
          <div>
            <p className="text-sm font-medium text-gray-500">Hours</p>
            <p className="text-base text-gray-900">{formData.hours}</p>
          </div>
        )}

        {formData.expertise && (
          <div>
            <p className="text-sm font-medium text-gray-500">Expertise</p>
            <p className="text-base text-gray-900">{formData.expertise}</p>
          </div>
        )}

        {formData.capitalType && (
          <div>
            <p className="text-sm font-medium text-gray-500">Capital Type</p>
            <p className="text-base text-gray-900">{formData.capitalType.replace(/_/g, ' ')}</p>
          </div>
        )}

        {formData.monetaryValue && (
          <div>
            <p className="text-sm font-medium text-gray-500">Value</p>
            <p className="text-base text-gray-900">${formData.monetaryValue.toFixed(2)}</p>
          </div>
        )}

        {formData.relationshipType && (
          <div>
            <p className="text-sm font-medium text-gray-500">Relationship Type</p>
            <p className="text-base text-gray-900">
              {formData.relationshipType.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        {formData.evidence.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Evidence</p>
            <ul className="space-y-1">
              {formData.evidence.map((item, index) => (
                <li key={index} className="text-sm text-gray-900">
                  • {item.url}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
