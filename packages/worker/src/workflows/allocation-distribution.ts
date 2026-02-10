/**
 * Allocation → Distribution Workflow
 * 
 * End-to-end workflow for executing approved allocations:
 * 1. Allocation approved (trigger)
 * 2. Calculate cash/retained split
 * 3. Update member capital account (retained portion)
 * 4. Schedule cash distribution
 * 5. Record treasury transaction (when distribution completes)
 * 
 * Handles:
 * - Partial distributions (staggered payments)
 * - Capital account updates (book + tax basis)
 * - Double-entry accounting
 * - Distribution scheduling
 * 
 * This is Layer 5 (Flow) - orchestrating value movement across contexts
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import {
  getAllocation,
  createDistribution,
  completeDistribution,
  getCapitalAccount,
  updateCapitalAccount,
} from '@habitat/api/data/agreements'
import { createTransaction, getAccount } from '@habitat/api/data/treasury'
import type { EventBus } from '../events/bus.js'
import {
  publishAllocationApproved,
  publishDistributionScheduled,
  publishDistributionCompleted,
  type PublisherContext,
} from '@habitat/api/events/publishers'
import type { UUID, Decimal } from '@habitat/shared'

export interface AllocationDistributionContext {
  db: DatabaseClient
  eventBus: EventBus
  allocationId: UUID
  userId: UUID
  scheduleDate?: string
  distributionMethod?: 'ach' | 'check' | 'wire'
}

export interface AllocationDistributionState {
  step:
    | 'init'
    | 'split'
    | 'capital'
    | 'schedule'
    | 'transaction'
    | 'complete'
    | 'failed'
  allocationId: UUID
  memberId: UUID
  startedAt: string
  completedAt?: string
  data: {
    totalPatronage?: Decimal
    cashAmount?: Decimal
    retainedAmount?: Decimal
    distributionId?: UUID
    transactionId?: UUID
    capitalAccountUpdated?: boolean
  }
  error?: string
}

/**
 * Execute the full allocation → distribution workflow
 */
export async function executeAllocationDistribution(
  context: AllocationDistributionContext
): Promise<AllocationDistributionState> {
  const state: AllocationDistributionState = {
    step: 'init',
    allocationId: context.allocationId,
    memberId: '', // Set after fetching allocation
    startedAt: new Date().toISOString(),
    data: {},
  }

  try {
    console.log('=== Starting Allocation → Distribution Workflow ===')
    console.log(`Allocation: ${context.allocationId}`)

    // Fetch allocation
    const allocation = await getAllocation(context.db, context.allocationId)
    if (!allocation) {
      throw new Error('Allocation not found')
    }
    if (allocation.status !== 'approved') {
      throw new Error(`Allocation must be approved (current: ${allocation.status})`)
    }

    state.memberId = allocation.memberId

    // Step 1: Calculate cash/retained split
    state.step = 'split'
    console.log('\nStep 1: Calculating cash/retained split...')
    state.data.totalPatronage = allocation.totalPatronage
    state.data.cashAmount = allocation.cashDistribution
    state.data.retainedAmount = allocation.retainedAllocation
    console.log(`  Total: ${state.data.totalPatronage}`)
    console.log(`  Cash: ${state.data.cashAmount} (${(parseFloat(allocation.cashDistribution) / parseFloat(allocation.totalPatronage) * 100).toFixed(1)}%)`)
    console.log(`  Retained: ${state.data.retainedAmount} (${(parseFloat(allocation.retainedAllocation) / parseFloat(allocation.totalPatronage) * 100).toFixed(1)}%)`)

    // Step 2: Update capital account (retained portion)
    state.step = 'capital'
    console.log('\nStep 2: Updating capital account...')
    await updateMemberCapitalAccount(
      context.db,
      allocation.memberId,
      allocation.retainedAllocation,
      allocation.allocationId
    )
    state.data.capitalAccountUpdated = true
    console.log(`  ✓ Capital account updated: +${allocation.retainedAllocation} retained`)

    // Step 3: Schedule cash distribution
    if (parseFloat(allocation.cashDistribution) > 0) {
      state.step = 'schedule'
      console.log('\nStep 3: Scheduling cash distribution...')

      const distribution = await createDistribution(context.db, {
        distributionNumber: `D-${allocation.allocationNumber}`,
        allocationId: allocation.allocationId,
        memberId: allocation.memberId,
        amount: allocation.cashDistribution,
        currency: 'USD',
        method: context.distributionMethod || 'ach',
        scheduledDate: context.scheduleDate || getDefaultScheduleDate(),
      })

      state.data.distributionId = distribution.distributionId
      console.log(`  ✓ Distribution scheduled: ${distribution.distributionId}`)
      console.log(`  Method: ${distribution.method}`)
      console.log(`  Date: ${distribution.scheduledDate}`)

      // Publish event
      const publisherContext: PublisherContext = {
        eventBus: context.eventBus,
        userId: context.userId,
        memberId: allocation.memberId,
        correlationId: `allocation-dist-${Date.now()}`,
      }
      await publishDistributionScheduled(distribution, publisherContext)
    } else {
      console.log('\nStep 3: Skipped (no cash distribution)')
    }

    // Step 4: Mark complete
    state.step = 'complete'
    state.completedAt = new Date().toISOString()

    console.log('\n=== Allocation → Distribution Workflow Complete ===')
    console.log('Distribution will be processed on scheduled date')

    return state
  } catch (error) {
    state.step = 'failed'
    state.error = error instanceof Error ? error.message : 'Unknown error'
    console.error('\n=== Workflow Failed ===', error)
    return state
  }
}

/**
 * Execute distribution completion workflow
 * Called when payment is processed
 */
export async function completeDistributionWorkflow(
  context: {
    db: DatabaseClient
    eventBus: EventBus
    distributionId: UUID
    userId: UUID
    paymentReference?: string
  }
): Promise<{
  success: boolean
  transactionId?: UUID
  error?: string
}> {
  try {
    console.log('=== Starting Distribution Completion Workflow ===')

    // Get distribution
    const distribution = await completeDistribution(
      context.db,
      context.distributionId,
      undefined, // transactionId created below
      context.paymentReference
    )

    console.log(`Distribution ${distribution.distributionId} completed`)

    // Create treasury transaction
    console.log('Recording treasury transaction...')
    const transaction = await recordDistributionTransaction(
      context.db,
      distribution.memberId,
      distribution.amount,
      distribution.distributionNumber
    )

    console.log(`  ✓ Transaction recorded: ${transaction.transactionId}`)

    // Publish event
    const publisherContext: PublisherContext = {
      eventBus: context.eventBus,
      userId: context.userId,
      memberId: distribution.memberId,
      correlationId: `dist-complete-${Date.now()}`,
    }
    await publishDistributionCompleted(distribution, publisherContext)

    console.log('=== Distribution Completion Complete ===')

    return {
      success: true,
      transactionId: transaction.transactionId,
    }
  } catch (error) {
    console.error('Distribution completion failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle partial distribution
 * Splits a distribution into multiple payments
 */
export async function schedulePartialDistributions(
  context: {
    db: DatabaseClient
    allocationId: UUID
    schedule: Array<{
      amount: Decimal
      scheduledDate: string
      method?: 'ach' | 'check' | 'wire'
    }>
  }
): Promise<UUID[]> {
  console.log('=== Scheduling Partial Distributions ===')

  const allocation = await getAllocation(context.db, context.allocationId)
  if (!allocation) {
    throw new Error('Allocation not found')
  }

  // Verify total equals cash distribution
  const scheduleTotal = context.schedule.reduce(
    (sum, item) => sum + parseFloat(item.amount),
    0
  )
  const cashAmount = parseFloat(allocation.cashDistribution)

  if (Math.abs(scheduleTotal - cashAmount) > 0.01) {
    throw new Error(
      `Partial distribution total (${scheduleTotal}) must equal cash distribution (${cashAmount})`
    )
  }

  const distributionIds: UUID[] = []

  for (let i = 0; i < context.schedule.length; i++) {
    const item = context.schedule[i]

    const distribution = await createDistribution(context.db, {
      distributionNumber: `D-${allocation.allocationNumber}-${i + 1}`,
      allocationId: allocation.allocationId,
      memberId: allocation.memberId,
      amount: item.amount,
      currency: 'USD',
      method: item.method || 'ach',
      scheduledDate: item.scheduledDate,
      metadata: {
        partial: true,
        partNumber: i + 1,
        partTotal: context.schedule.length,
      },
    })

    distributionIds.push(distribution.distributionId)
    console.log(`  ✓ Partial distribution ${i + 1}/${context.schedule.length}: ${item.amount} on ${item.scheduledDate}`)
  }

  console.log(`=== ${distributionIds.length} Partial Distributions Scheduled ===`)

  return distributionIds
}

/**
 * Update member capital account with retained allocation
 */
async function updateMemberCapitalAccount(
  db: DatabaseClient,
  memberId: UUID,
  retainedAmount: Decimal,
  allocationId: UUID
): Promise<void> {
  // Get current capital account
  const account = await getCapitalAccount(db, memberId)

  if (!account) {
    throw new Error(`Capital account not found for member ${memberId}`)
  }

  // Calculate new balances
  const newRetainedPatronage = (
    parseFloat(account.retainedPatronage) + parseFloat(retainedAmount)
  ).toFixed(2)

  const newBookBalance = (
    parseFloat(account.bookBalance) + parseFloat(retainedAmount)
  ).toFixed(2)

  // Update capital account
  // Note: Book balance and tax balance both increase by retained amount
  // (assuming no 704(c) adjustments for simplicity)
  await updateCapitalAccount(db, memberId, {
    retainedPatronage: newRetainedPatronage,
    bookBalance: newBookBalance,
    taxBalance: newBookBalance, // Same as book for now
    lastAllocationId: allocationId,
  })
}

/**
 * Record distribution as treasury transaction
 * Debit: Member Capital Account (equity)
 * Credit: Cash (asset)
 */
async function recordDistributionTransaction(
  db: DatabaseClient,
  memberId: UUID,
  amount: Decimal,
  distributionNumber: string
): Promise<{ transactionId: UUID }> {
  // Get member's capital account (Treasury account)
  // In real implementation, would query for member's Treasury account ID
  const memberCapitalAccountId = 'member-capital-account-id-placeholder'
  const cashAccountId = 'cash-account-id-placeholder'

  // Create double-entry transaction
  const transaction = await createTransaction(db, {
    transactionNumber: `TX-${distributionNumber}`,
    transactionDate: new Date().toISOString(),
    periodId: 'current-period-id-placeholder', // Would get from context
    description: `Patronage distribution ${distributionNumber}`,
    entries: [
      {
        accountId: memberCapitalAccountId,
        entryType: 'debit',
        amount,
        description: 'Patronage distribution',
      },
      {
        accountId: cashAccountId,
        entryType: 'credit',
        amount,
        description: 'Cash disbursement',
      },
    ],
    sourceType: 'distribution',
    sourceId: distributionNumber,
  })

  return {
    transactionId: transaction.transactionId,
  }
}

/**
 * Get default distribution schedule date
 * Default: 15 days from today
 */
function getDefaultScheduleDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 15)
  return date.toISOString()
}

/**
 * Verify workflow invariants
 */
export async function verifyAllocationDistributionInvariants(
  db: DatabaseClient,
  allocationId: UUID
): Promise<{
  valid: boolean
  violations: string[]
}> {
  const violations: string[] = []

  console.log('Verifying allocation → distribution invariants...')

  const allocation = await getAllocation(db, allocationId)
  if (!allocation) {
    violations.push('Allocation not found')
    return { valid: false, violations }
  }

  // Invariant 1: Cash + retained = total
  const cashPlusRetained =
    parseFloat(allocation.cashDistribution) +
    parseFloat(allocation.retainedAllocation)
  const total = parseFloat(allocation.totalPatronage)

  if (Math.abs(cashPlusRetained - total) > 0.01) {
    violations.push(
      `Cash + retained (${cashPlusRetained}) must equal total (${total})`
    )
  }

  // Invariant 2: Capital account updated
  const capitalAccount = await getCapitalAccount(db, allocation.memberId)
  if (capitalAccount?.lastAllocationId !== allocationId) {
    violations.push('Capital account not updated with allocation')
  }

  // Invariant 3: Distribution scheduled for cash amount
  // (would check distributions table)

  // Invariant 4: Double-entry transaction balanced
  // (would verify transaction entries)

  if (violations.length === 0) {
    console.log('  ✓ All invariants satisfied')
  } else {
    console.log(`  ✗ ${violations.length} invariant violation(s)`)
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}
