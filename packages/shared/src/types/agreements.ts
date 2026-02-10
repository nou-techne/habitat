/**
 * Agreements bounded context types
 * 
 * Corresponds to schema/05_agreements_core.sql
 */

import type { UUID, Timestamp, Decimal, JSONObject, EventMetadata } from './common.js'
import type { ContributionType } from './people.js'

// ============================================================================
// Enums
// ============================================================================

export enum AllocationStatus {
  Draft = 'draft',
  Proposed = 'proposed',
  UnderReview = 'under_review',
  Approved = 'approved',
  Rejected = 'rejected',
  Executed = 'executed',
}

export enum DistributionStatus {
  Scheduled = 'scheduled',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum DistributionMethod {
  ACH = 'ach',
  Check = 'check',
  Crypto = 'crypto',
  Manual = 'manual',
}

export enum PeriodCloseStatus {
  NotStarted = 'not_started',
  AggregatingPatronage = 'aggregating_patronage',
  ApplyingWeights = 'applying_weights',
  CalculatingAllocations = 'calculating_allocations',
  GeneratingDistributions = 'generating_distributions',
  AwaitingApproval = 'awaiting_approval',
  Approved = 'approved',
  Executed = 'executed',
  Failed = 'failed',
}

// ============================================================================
// Events
// ============================================================================

export interface AgreementsEvent {
  eventId: number
  eventType: string
  aggregateType: 'AllocationAgreement' | 'PeriodClose' | 'Distribution'
  aggregateId: string
  occurredAt: Timestamp
  recordedAt: Timestamp
  payload: JSONObject
  metadata: JSONObject
  sequenceNumber: number
  causationId?: string
  correlationId?: string
}

// ============================================================================
// Entities
// ============================================================================

export interface PatronageWeight {
  weightId: string
  periodId: UUID
  contributionType: ContributionType
  weight: Decimal
  notes?: string
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Allocation {
  allocationId: UUID
  allocationNumber: string
  memberId: UUID
  periodId: UUID
  status: AllocationStatus
  
  // Patronage breakdown
  totalPatronage: Decimal
  allocationsByType: Array<{
    type: ContributionType
    patronageValue: Decimal
    weight: Decimal
    weightedValue: Decimal
    allocation: Decimal
  }>
  
  // Distribution split
  cashDistribution: Decimal
  retainedAllocation: Decimal
  retainedPercentage: Decimal
  
  proposedAt?: Timestamp
  approvedAt?: Timestamp
  approvedBy?: UUID
  executedAt?: Timestamp
  
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Distribution {
  distributionId: UUID
  distributionNumber: string
  allocationId: UUID
  memberId: UUID
  amount: Decimal
  currency: string
  method: DistributionMethod
  status: DistributionStatus
  
  scheduledDate: Timestamp
  processedAt?: Timestamp
  completedAt?: Timestamp
  failedAt?: Timestamp
  failureReason?: string
  
  transactionId?: UUID
  paymentReference?: string
  
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CapitalAccount {
  accountId: UUID
  memberId: UUID
  
  // Book accounting (GAAP)
  bookBalance: Decimal
  
  // Tax accounting (IRC 704(b))
  taxBalance: Decimal
  
  // Components
  contributedCapital: Decimal
  retainedPatronage: Decimal
  distributedPatronage: Decimal
  
  // Tracking
  lastAllocationId?: UUID
  lastDistributionId?: UUID
  lastUpdatedAt: Timestamp
  
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PeriodClose {
  periodCloseId: UUID
  periodId: UUID
  status: PeriodCloseStatus
  
  currentStep: string
  steps: Array<{
    name: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    startedAt?: Timestamp
    completedAt?: Timestamp
    error?: string
  }>
  
  // Governance
  requiredApprovals: number
  approvals: Array<{
    actorId: UUID
    actorName: string
    approvedAt: Timestamp
    comment?: string
  }>
  
  initiatedAt: Timestamp
  initiatedBy: UUID
  completedAt?: Timestamp
  
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ============================================================================
// Computed views
// ============================================================================

export interface AllocationSummary {
  periodId: UUID
  totalAllocated: Decimal
  totalCash: Decimal
  totalRetained: Decimal
  averageAllocation: Decimal
  memberCount: number
  byType: Array<{
    type: ContributionType
    totalPatronage: Decimal
    totalAllocation: Decimal
    memberCount: number
  }>
}

export interface CapitalAccountStatement {
  memberId: UUID
  memberName: string
  periodId: UUID
  periodName: string
  
  openingBalance: Decimal
  contributedCapital: Decimal
  currentPeriodAllocation: Decimal
  cashDistributed: Decimal
  retainedAllocation: Decimal
  closingBalance: Decimal
  
  generatedAt: Timestamp
}
