/**
 * People bounded context types
 * 
 * Corresponds to schema/04_people_core.sql
 */

import type { UUID, Timestamp, Decimal, JSONObject, EventMetadata } from './common.js'

// ============================================================================
// Enums
// ============================================================================

export enum MemberStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Inactive = 'inactive',
  Withdrawn = 'withdrawn',
  Expelled = 'expelled',
}

export enum MemberTier {
  Community = 'community',
  Coworking = 'coworking',
  Cooperative = 'cooperative',
}

export enum ContributionType {
  Labor = 'labor',
  Expertise = 'expertise',
  Capital = 'capital',
  Relationship = 'relationship',
}

export enum ContributionStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  UnderReview = 'under_review',
  Approved = 'approved',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
}

export enum ApprovalDecision {
  Approved = 'approved',
  Rejected = 'rejected',
}

// ============================================================================
// Events
// ============================================================================

export interface PeopleEvent {
  eventId: number
  eventType: string
  aggregateType: 'Member' | 'Contribution' | 'Approval'
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

export interface Member {
  memberId: UUID
  memberNumber: string
  ensName?: string
  displayName?: string
  email?: string
  status: MemberStatus
  tier: MemberTier
  joinedAt: Timestamp
  approvedAt?: Timestamp
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Contribution {
  contributionId: UUID
  contributionNumber: string
  memberId: UUID
  contributionType: ContributionType
  status: ContributionStatus
  description: string
  
  // Type-specific fields
  hours?: Decimal
  monetaryValue?: Decimal
  expertise?: string
  capitalType?: 'cash' | 'equipment' | 'space' | 'intellectual_property'
  relationshipType?: 'partnership' | 'customer_referral' | 'network_access' | 'reputation'
  
  evidence: Array<{
    type: string
    url: string
    description?: string
  }>
  
  submittedAt?: Timestamp
  reviewStartedAt?: Timestamp
  reviewedAt?: Timestamp
  
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Approval {
  approvalId: UUID
  contributionId: UUID
  approverId: UUID
  decision: ApprovalDecision
  comment?: string
  reason?: string
  decidedAt: Timestamp
  metadata: JSONObject
}

export interface PatronageClaim {
  claimId: UUID
  contributionId: UUID
  memberId: UUID
  periodId: UUID
  contributionType: ContributionType
  rawValue: Decimal
  weight: Decimal
  weightedValue: Decimal
  claimedAt: Timestamp
  metadata: JSONObject
}

// ============================================================================
// Computed views
// ============================================================================

export interface PatronageSummary {
  memberId: UUID
  periodId?: UUID
  totalPatronage: Decimal
  currentPeriodPatronage: Decimal
  lifetimePatronage: Decimal
  byType: Array<{
    type: ContributionType
    amount: Decimal
    count: number
  }>
  byPeriod: Array<{
    periodId: UUID
    periodName: string
    amount: Decimal
  }>
}

export interface ApprovalHistory {
  contributionId: UUID
  memberId: UUID
  memberName: string
  contributionType: ContributionType
  description: string
  approverId: UUID
  approverName: string
  decision: ApprovalDecision
  comment?: string
  decidedAt: Timestamp
}
