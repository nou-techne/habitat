/**
 * Event Publishers
 * 
 * Publish domain events from mutation resolvers
 * Events are published to RabbitMQ event bus after successful database operations
 */

import {
  EventBus,
  EventTypes,
  createEvent,
  type TransactionPostedPayload,
  type PeriodOpenedPayload,
  type PeriodClosedPayload,
  type ContributionSubmittedPayload,
  type ContributionApprovedPayload,
  type ContributionRejectedPayload,
  type AllocationProposedPayload,
  type AllocationApprovedPayload,
  type DistributionScheduledPayload,
  type DistributionCompletedPayload,
} from '@habitat/worker/events'
import type {
  Transaction,
  Period,
  Contribution,
  Allocation,
  Distribution,
} from '@habitat/shared'

/**
 * Event publisher context (injected from resolver context)
 */
export interface PublisherContext {
  eventBus: EventBus
  userId?: string
  memberId?: string
  correlationId?: string
}

// ============================================================================
// Treasury Event Publishers
// ============================================================================

/**
 * Publish transaction.posted event
 */
export async function publishTransactionPosted(
  transaction: Transaction,
  context: PublisherContext
): Promise<void> {
  const payload: TransactionPostedPayload = {
    transactionId: transaction.transactionId,
    transactionNumber: transaction.transactionNumber,
    transactionDate: transaction.transactionDate,
    periodId: transaction.periodId,
    description: transaction.description,
    totalDebit: transaction.totalDebit,
    totalCredit: transaction.totalCredit,
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
  }

  const event = createEvent(
    EventTypes.TRANSACTION_POSTED,
    transaction.transactionId,
    'transaction',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.TRANSACTION_POSTED} (${transaction.transactionId})`)
}

/**
 * Publish period.opened event
 */
export async function publishPeriodOpened(
  period: Period,
  context: PublisherContext
): Promise<void> {
  const payload: PeriodOpenedPayload = {
    periodId: period.periodId,
    periodName: period.periodName,
    periodType: period.periodType,
    startDate: period.startDate,
    endDate: period.endDate,
    fiscalYear: period.fiscalYear,
  }

  const event = createEvent(
    EventTypes.PERIOD_OPENED,
    period.periodId,
    'period',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.PERIOD_OPENED} (${period.periodId})`)
}

/**
 * Publish period.closed event
 */
export async function publishPeriodClosed(
  period: Period,
  context: PublisherContext
): Promise<void> {
  const payload: PeriodClosedPayload = {
    periodId: period.periodId,
    periodName: period.periodName,
    closedBy: context.userId!,
    closedAt: period.closedAt!,
  }

  const event = createEvent(
    EventTypes.PERIOD_CLOSED,
    period.periodId,
    'period',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.PERIOD_CLOSED} (${period.periodId})`)
}

// ============================================================================
// People Event Publishers
// ============================================================================

/**
 * Publish contribution.submitted event
 */
export async function publishContributionSubmitted(
  contribution: Contribution,
  context: PublisherContext
): Promise<void> {
  const payload: ContributionSubmittedPayload = {
    contributionId: contribution.contributionId,
    contributionNumber: contribution.contributionNumber,
    memberId: contribution.memberId,
    contributionType: contribution.contributionType,
    submittedAt: contribution.submittedAt!,
  }

  const event = createEvent(
    EventTypes.CONTRIBUTION_SUBMITTED,
    contribution.contributionId,
    'contribution',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.CONTRIBUTION_SUBMITTED} (${contribution.contributionId})`)
}

/**
 * Publish contribution.approved event
 */
export async function publishContributionApproved(
  contribution: Contribution,
  approvedBy: string,
  context: PublisherContext
): Promise<void> {
  const payload: ContributionApprovedPayload = {
    contributionId: contribution.contributionId,
    contributionNumber: contribution.contributionNumber,
    memberId: contribution.memberId,
    contributionType: contribution.contributionType,
    approvedBy,
    approvedAt: contribution.reviewedAt!,
    monetaryValue: contribution.monetaryValue,
  }

  const event = createEvent(
    EventTypes.CONTRIBUTION_APPROVED,
    contribution.contributionId,
    'contribution',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.CONTRIBUTION_APPROVED} (${contribution.contributionId})`)
}

/**
 * Publish contribution.rejected event
 */
export async function publishContributionRejected(
  contribution: Contribution,
  rejectedBy: string,
  reason: string,
  context: PublisherContext
): Promise<void> {
  const payload: ContributionRejectedPayload = {
    contributionId: contribution.contributionId,
    contributionNumber: contribution.contributionNumber,
    memberId: contribution.memberId,
    contributionType: contribution.contributionType,
    rejectedBy,
    rejectedAt: contribution.reviewedAt!,
    reason,
  }

  const event = createEvent(
    EventTypes.CONTRIBUTION_REJECTED,
    contribution.contributionId,
    'contribution',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.CONTRIBUTION_REJECTED} (${contribution.contributionId})`)
}

// ============================================================================
// Agreements Event Publishers
// ============================================================================

/**
 * Publish allocation.proposed event
 */
export async function publishAllocationProposed(
  allocation: Allocation,
  context: PublisherContext
): Promise<void> {
  const payload: AllocationProposedPayload = {
    allocationId: allocation.allocationId,
    allocationNumber: allocation.allocationNumber,
    memberId: allocation.memberId,
    periodId: allocation.periodId,
    proposedAt: allocation.proposedAt!,
    totalPatronage: allocation.totalPatronage,
  }

  const event = createEvent(
    EventTypes.ALLOCATION_PROPOSED,
    allocation.allocationId,
    'allocation',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.ALLOCATION_PROPOSED} (${allocation.allocationId})`)
}

/**
 * Publish allocation.approved event
 */
export async function publishAllocationApproved(
  allocation: Allocation,
  approvedBy: string,
  context: PublisherContext
): Promise<void> {
  const payload: AllocationApprovedPayload = {
    allocationId: allocation.allocationId,
    allocationNumber: allocation.allocationNumber,
    memberId: allocation.memberId,
    periodId: allocation.periodId,
    approvedBy,
    approvedAt: allocation.approvedAt!,
    totalPatronage: allocation.totalPatronage,
    cashDistribution: allocation.cashDistribution,
    retainedAllocation: allocation.retainedAllocation,
  }

  const event = createEvent(
    EventTypes.ALLOCATION_APPROVED,
    allocation.allocationId,
    'allocation',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.ALLOCATION_APPROVED} (${allocation.allocationId})`)
}

/**
 * Publish distribution.scheduled event
 */
export async function publishDistributionScheduled(
  distribution: Distribution,
  context: PublisherContext
): Promise<void> {
  const payload: DistributionScheduledPayload = {
    distributionId: distribution.distributionId,
    distributionNumber: distribution.distributionNumber,
    allocationId: distribution.allocationId,
    memberId: distribution.memberId,
    amount: distribution.amount,
    currency: distribution.currency,
    method: distribution.method,
    scheduledDate: distribution.scheduledDate,
  }

  const event = createEvent(
    EventTypes.DISTRIBUTION_SCHEDULED,
    distribution.distributionId,
    'distribution',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.DISTRIBUTION_SCHEDULED} (${distribution.distributionId})`)
}

/**
 * Publish distribution.completed event
 */
export async function publishDistributionCompleted(
  distribution: Distribution,
  context: PublisherContext
): Promise<void> {
  const payload: DistributionCompletedPayload = {
    distributionId: distribution.distributionId,
    distributionNumber: distribution.distributionNumber,
    allocationId: distribution.allocationId,
    memberId: distribution.memberId,
    amount: distribution.amount,
    completedAt: distribution.completedAt!,
    transactionId: distribution.transactionId,
    paymentReference: distribution.paymentReference,
  }

  const event = createEvent(
    EventTypes.DISTRIBUTION_COMPLETED,
    distribution.distributionId,
    'distribution',
    payload,
    {
      userId: context.userId,
      memberId: context.memberId,
      correlationId: context.correlationId,
    }
  )

  await context.eventBus.publish(event)
  console.log(`Published: ${EventTypes.DISTRIBUTION_COMPLETED} (${distribution.distributionId})`)
}

// ============================================================================
// Publisher Integration Helpers
// ============================================================================

/**
 * Wrap mutation with event publishing
 * Ensures event is published after successful database operation
 */
export async function withEventPublishing<T>(
  operation: () => Promise<T>,
  publisher: (result: T) => Promise<void>
): Promise<T> {
  const result = await operation()
  
  try {
    await publisher(result)
  } catch (error) {
    console.error('Failed to publish event (operation succeeded):', error)
    // Don't fail the mutation if event publishing fails
    // Events can be replayed from database state if needed
  }
  
  return result
}
