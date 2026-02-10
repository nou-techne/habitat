/**
 * Event Schema Definitions
 * 
 * REA-based event types for Habitat patronage system
 * Events are the source of truth for state changes
 */

import type { UUID, Timestamp, Decimal, JSONObject } from '@habitat/shared'

// ============================================================================
// Event Envelope
// ============================================================================

/**
 * Standard event envelope wrapping all domain events
 */
export interface EventEnvelope<T = JSONObject> {
  /** Unique event identifier */
  eventId: UUID
  
  /** Event type (domain.entity.action) */
  eventType: string
  
  /** Aggregate identifier (entity this event belongs to) */
  aggregateId: UUID
  
  /** Aggregate type (e.g., "contribution", "allocation") */
  aggregateType: string
  
  /** Event timestamp (ISO 8601) */
  timestamp: Timestamp
  
  /** Event payload (event-specific data) */
  payload: T
  
  /** Event metadata (correlation, causation, user context) */
  metadata: EventMetadata
  
  /** Schema version for payload (enables migration) */
  schemaVersion: string
}

/**
 * Event metadata for tracing and auditing
 */
export interface EventMetadata {
  /** User who triggered this event */
  userId?: UUID
  
  /** Member who triggered this event */
  memberId?: UUID
  
  /** Correlation ID (groups related events across services) */
  correlationId?: UUID
  
  /** Causation ID (event that caused this event) */
  causationId?: UUID
  
  /** IP address of originating request */
  ipAddress?: string
  
  /** User agent of originating request */
  userAgent?: string
  
  /** Additional context */
  [key: string]: unknown
}

// ============================================================================
// Treasury Events
// ============================================================================

export interface TransactionPostedPayload {
  transactionId: UUID
  transactionNumber: string
  transactionDate: Timestamp
  periodId: UUID
  description: string
  totalDebit: Decimal
  totalCredit: Decimal
  sourceType?: string
  sourceId?: UUID
}

export interface TransactionVoidedPayload {
  transactionId: UUID
  transactionNumber: string
  voidedBy: UUID
  reason?: string
}

export interface PeriodOpenedPayload {
  periodId: UUID
  periodName: string
  periodType: string
  startDate: Timestamp
  endDate: Timestamp
  fiscalYear: number
}

export interface PeriodClosedPayload {
  periodId: UUID
  periodName: string
  closedBy: UUID
  closedAt: Timestamp
}

export interface AccountCreatedPayload {
  accountId: UUID
  accountNumber: string
  accountName: string
  accountType: string
  ledgerType: string
}

// ============================================================================
// People Events
// ============================================================================

export interface MemberCreatedPayload {
  memberId: UUID
  memberNumber: string
  ensName?: string
  displayName: string
  tier: string
  createdBy: UUID
}

export interface ContributionCreatedPayload {
  contributionId: UUID
  contributionNumber: string
  memberId: UUID
  contributionType: string
  description: string
  monetaryValue?: Decimal
}

export interface ContributionSubmittedPayload {
  contributionId: UUID
  contributionNumber: string
  memberId: UUID
  contributionType: string
  submittedAt: Timestamp
}

export interface ContributionApprovedPayload {
  contributionId: UUID
  contributionNumber: string
  memberId: UUID
  contributionType: string
  approvedBy: UUID
  approvedAt: Timestamp
  monetaryValue?: Decimal
}

export interface ContributionRejectedPayload {
  contributionId: UUID
  contributionNumber: string
  memberId: UUID
  contributionType: string
  rejectedBy: UUID
  rejectedAt: Timestamp
  reason: string
}

// ============================================================================
// Agreements Events
// ============================================================================

export interface AllocationCreatedPayload {
  allocationId: UUID
  allocationNumber: string
  memberId: UUID
  periodId: UUID
  totalPatronage: Decimal
  cashDistribution: Decimal
  retainedAllocation: Decimal
}

export interface AllocationProposedPayload {
  allocationId: UUID
  allocationNumber: string
  memberId: UUID
  periodId: UUID
  proposedAt: Timestamp
  totalPatronage: Decimal
}

export interface AllocationApprovedPayload {
  allocationId: UUID
  allocationNumber: string
  memberId: UUID
  periodId: UUID
  approvedBy: UUID
  approvedAt: Timestamp
  totalPatronage: Decimal
  cashDistribution: Decimal
  retainedAllocation: Decimal
}

export interface DistributionScheduledPayload {
  distributionId: UUID
  distributionNumber: string
  allocationId: UUID
  memberId: UUID
  amount: Decimal
  currency: string
  method: string
  scheduledDate: Timestamp
}

export interface DistributionCompletedPayload {
  distributionId: UUID
  distributionNumber: string
  allocationId: UUID
  memberId: UUID
  amount: Decimal
  completedAt: Timestamp
  transactionId?: UUID
  paymentReference?: string
}

export interface CapitalAccountUpdatedPayload {
  accountId: UUID
  memberId: UUID
  bookBalance: Decimal
  taxBalance: Decimal
  contributedCapital: Decimal
  retainedPatronage: Decimal
  distributedPatronage: Decimal
}

// ============================================================================
// Event Type Registry
// ============================================================================

/**
 * Registry of all event types in the system
 * Format: domain.entity.action
 */
export const EventTypes = {
  // Treasury
  TRANSACTION_POSTED: 'treasury.transaction.posted',
  TRANSACTION_VOIDED: 'treasury.transaction.voided',
  PERIOD_OPENED: 'treasury.period.opened',
  PERIOD_CLOSED: 'treasury.period.closed',
  ACCOUNT_CREATED: 'treasury.account.created',
  
  // People
  MEMBER_CREATED: 'people.member.created',
  CONTRIBUTION_CREATED: 'people.contribution.created',
  CONTRIBUTION_SUBMITTED: 'people.contribution.submitted',
  CONTRIBUTION_APPROVED: 'people.contribution.approved',
  CONTRIBUTION_REJECTED: 'people.contribution.rejected',
  
  // Agreements
  ALLOCATION_CREATED: 'agreements.allocation.created',
  ALLOCATION_PROPOSED: 'agreements.allocation.proposed',
  ALLOCATION_APPROVED: 'agreements.allocation.approved',
  DISTRIBUTION_SCHEDULED: 'agreements.distribution.scheduled',
  DISTRIBUTION_COMPLETED: 'agreements.distribution.completed',
  CAPITAL_ACCOUNT_UPDATED: 'agreements.capitalAccount.updated',
} as const

export type EventType = typeof EventTypes[keyof typeof EventTypes]

// ============================================================================
// Type Guards
// ============================================================================

export function isEventEnvelope(obj: unknown): obj is EventEnvelope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'eventId' in obj &&
    'eventType' in obj &&
    'aggregateId' in obj &&
    'timestamp' in obj &&
    'payload' in obj &&
    'metadata' in obj
  )
}

// ============================================================================
// Event Factory
// ============================================================================

/**
 * Create a new event envelope
 */
export function createEvent<T = JSONObject>(
  eventType: string,
  aggregateId: UUID,
  aggregateType: string,
  payload: T,
  metadata: Partial<EventMetadata> = {}
): EventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    aggregateId,
    aggregateType,
    timestamp: new Date().toISOString(),
    payload,
    metadata: {
      correlationId: metadata.correlationId || crypto.randomUUID(),
      ...metadata,
    },
    schemaVersion: '1.0',
  }
}
