/**
 * Distribution → Payment Workflow
 * 
 * Payment execution workflow for scheduled distributions:
 * 1. Scheduled distribution (trigger at scheduled date)
 * 2. Mark as processing
 * 3. Execute payment via payment method
 * 4. Mark as completed
 * 5. Record treasury transaction
 * 
 * Payment methods:
 * - Manual: operator confirms payment manually
 * - ACH: automated clearing house (stub for integration)
 * - Crypto: on-chain payment (stub for integration)
 * 
 * This is Layer 5 (Flow) - orchestrating payment execution
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import {
  getDistribution,
  completeDistribution,
  listDistributions,
} from '@habitat/api/data/agreements'
import { createTransaction } from '@habitat/api/data/treasury'
import type { EventBus } from '../events/bus.js'
import {
  publishDistributionCompleted,
  type PublisherContext,
} from '@habitat/api/events/publishers'
import type { UUID, Decimal, Distribution } from '@habitat/shared'

export interface PaymentContext {
  db: DatabaseClient
  eventBus: EventBus
  userId: UUID
}

export interface PaymentResult {
  success: boolean
  transactionId?: UUID
  paymentReference?: string
  error?: string
  method: 'manual' | 'ach' | 'crypto'
}

/**
 * Process all scheduled distributions due today
 * Called by cron job or scheduled task
 */
export async function processDueDistributions(
  context: PaymentContext
): Promise<{
  processed: number
  succeeded: number
  failed: number
  results: Array<{
    distributionId: UUID
    success: boolean
    error?: string
  }>
}> {
  console.log('=== Processing Due Distributions ===')

  const today = new Date().toISOString().split('T')[0]

  // Get all scheduled distributions due today or earlier
  const distributions = await listDistributions(context.db, {
    status: 'scheduled',
  })

  const dueDistributions = distributions.filter((d) => {
    const scheduledDate = d.scheduledDate.split('T')[0]
    return scheduledDate <= today
  })

  console.log(`Found ${dueDistributions.length} distributions due for processing`)

  const results = []
  let succeeded = 0
  let failed = 0

  for (const distribution of dueDistributions) {
    console.log(`\nProcessing distribution ${distribution.distributionNumber}...`)

    try {
      await executeDistributionPayment(context, distribution.distributionId)
      succeeded++
      results.push({
        distributionId: distribution.distributionId,
        success: true,
      })
      console.log(`  ✓ Success`)
    } catch (error) {
      failed++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      results.push({
        distributionId: distribution.distributionId,
        success: false,
        error: errorMsg,
      })
      console.error(`  ✗ Failed: ${errorMsg}`)
    }
  }

  console.log('\n=== Processing Complete ===')
  console.log(`Processed: ${dueDistributions.length}`)
  console.log(`Succeeded: ${succeeded}`)
  console.log(`Failed: ${failed}`)

  return {
    processed: dueDistributions.length,
    succeeded,
    failed,
    results,
  }
}

/**
 * Execute payment for a single distribution
 */
export async function executeDistributionPayment(
  context: PaymentContext,
  distributionId: UUID
): Promise<PaymentResult> {
  console.log(`=== Executing Payment: ${distributionId} ===`)

  // Get distribution
  const distribution = await getDistribution(context.db, distributionId)
  if (!distribution) {
    throw new Error('Distribution not found')
  }

  if (distribution.status !== 'scheduled') {
    throw new Error(
      `Distribution must be scheduled (current: ${distribution.status})`
    )
  }

  // Mark as processing
  // In real implementation, would update status to 'processing'
  console.log(`Distribution: ${distribution.distributionNumber}`)
  console.log(`Amount: ${distribution.amount} ${distribution.currency}`)
  console.log(`Method: ${distribution.method}`)

  // Execute payment via method
  const paymentResult = await executePayment(distribution)

  if (!paymentResult.success) {
    // Mark as failed
    // In real implementation, would update status and record failure reason
    throw new Error(`Payment failed: ${paymentResult.error}`)
  }

  console.log(`Payment executed: ${paymentResult.paymentReference}`)

  // Record treasury transaction
  const transactionId = await recordPaymentTransaction(
    context.db,
    distribution,
    paymentResult.paymentReference
  )

  console.log(`Treasury transaction: ${transactionId}`)

  // Mark as completed
  await completeDistribution(
    context.db,
    distributionId,
    transactionId,
    paymentResult.paymentReference
  )

  // Publish event
  const publisherContext: PublisherContext = {
    eventBus: context.eventBus,
    userId: context.userId,
    memberId: distribution.memberId,
    correlationId: `payment-${Date.now()}`,
  }

  const completedDistribution = await getDistribution(context.db, distributionId)
  if (completedDistribution) {
    await publishDistributionCompleted(completedDistribution, publisherContext)
  }

  console.log('=== Payment Complete ===')

  return {
    success: true,
    transactionId,
    paymentReference: paymentResult.paymentReference,
    method: distribution.method as 'manual' | 'ach' | 'crypto',
  }
}

/**
 * Execute payment via payment method
 * Abstraction over different payment methods
 */
async function executePayment(
  distribution: Distribution
): Promise<{
  success: boolean
  paymentReference?: string
  error?: string
}> {
  switch (distribution.method) {
    case 'manual':
      return executeManualPayment(distribution)

    case 'ach':
      return executeACHPayment(distribution)

    case 'wire':
      return executeWirePayment(distribution)

    case 'retained':
      // No actual payment - retained in cooperative
      return {
        success: true,
        paymentReference: 'RETAINED',
      }

    default:
      return {
        success: false,
        error: `Unsupported payment method: ${distribution.method}`,
      }
  }
}

/**
 * Manual payment: operator confirms payment outside system
 */
async function executeManualPayment(
  distribution: Distribution
): Promise<{
  success: boolean
  paymentReference?: string
  error?: string
}> {
  console.log('  Payment method: Manual')
  console.log('  → Operator must confirm payment externally')

  // In real implementation, would:
  // 1. Send notification to operator
  // 2. Wait for confirmation
  // 3. Record confirmation details

  // For now, assume manual confirmation
  return {
    success: true,
    paymentReference: `MANUAL-${Date.now()}`,
  }
}

/**
 * ACH payment: automated clearing house
 * Stub for ACH integration (e.g., Stripe, Plaid, Modern Treasury)
 */
async function executeACHPayment(
  distribution: Distribution
): Promise<{
  success: boolean
  paymentReference?: string
  error?: string
}> {
  console.log('  Payment method: ACH')
  console.log('  → Integration with ACH provider (stub)')

  // Stub implementation
  // In real implementation, would:
  // 1. Get member's bank account details
  // 2. Call ACH provider API (Stripe, Plaid, etc.)
  // 3. Get transaction ID from provider
  // 4. Handle async confirmation

  // For now, simulate successful ACH
  return {
    success: true,
    paymentReference: `ACH-${crypto.randomUUID().slice(0, 8)}`,
  }
}

/**
 * Wire transfer payment
 * Similar to ACH but different processing
 */
async function executeWirePayment(
  distribution: Distribution
): Promise<{
  success: boolean
  paymentReference?: string
  error?: string
}> {
  console.log('  Payment method: Wire')
  console.log('  → Integration with wire provider (stub)')

  // Stub implementation
  return {
    success: true,
    paymentReference: `WIRE-${crypto.randomUUID().slice(0, 8)}`,
  }
}

/**
 * Record payment transaction in Treasury
 * Debit: Cash (asset)
 * Credit: Distributions Payable (liability)
 */
async function recordPaymentTransaction(
  db: DatabaseClient,
  distribution: Distribution,
  paymentReference?: string
): Promise<UUID> {
  // Get account IDs
  // In real implementation, would look up actual account IDs
  const cashAccountId = 'cash-account-id-placeholder'
  const distributionsPayableAccountId = 'distributions-payable-account-id-placeholder'

  // Create double-entry transaction
  const transaction = await createTransaction(db, {
    transactionNumber: `TX-PAY-${distribution.distributionNumber}`,
    transactionDate: new Date().toISOString(),
    periodId: 'current-period-id-placeholder',
    description: `Payment: ${distribution.distributionNumber} (${distribution.method})`,
    entries: [
      {
        accountId: cashAccountId,
        entryType: 'credit',
        amount: distribution.amount,
        description: `Payment via ${distribution.method}`,
      },
      {
        accountId: distributionsPayableAccountId,
        entryType: 'debit',
        amount: distribution.amount,
        description: 'Distribution payment',
      },
    ],
    sourceType: 'distribution_payment',
    sourceId: distribution.distributionId,
    metadata: {
      paymentReference,
      paymentMethod: distribution.method,
    },
  })

  return transaction.transactionId
}

/**
 * Retry failed payment
 * Attempts to re-execute payment for a failed distribution
 */
export async function retryFailedPayment(
  context: PaymentContext,
  distributionId: UUID
): Promise<PaymentResult> {
  console.log('=== Retrying Failed Payment ===')

  const distribution = await getDistribution(context.db, distributionId)
  if (!distribution) {
    throw new Error('Distribution not found')
  }

  if (distribution.status !== 'failed') {
    throw new Error(
      `Can only retry failed distributions (current: ${distribution.status})`
    )
  }

  // Reset status to scheduled
  // In real implementation, would update distribution status
  console.log(`Resetting ${distribution.distributionNumber} to scheduled`)

  // Execute payment
  return executeDistributionPayment(context, distributionId)
}

/**
 * Cancel scheduled distribution
 * Prevents payment from executing
 */
export async function cancelDistribution(
  context: PaymentContext,
  distributionId: UUID,
  reason: string
): Promise<void> {
  console.log('=== Cancelling Distribution ===')

  const distribution = await getDistribution(context.db, distributionId)
  if (!distribution) {
    throw new Error('Distribution not found')
  }

  if (!['scheduled', 'failed'].includes(distribution.status)) {
    throw new Error(
      `Cannot cancel ${distribution.status} distribution`
    )
  }

  // Update status to cancelled
  // In real implementation, would:
  // 1. Update distribution status to 'cancelled'
  // 2. Record cancellation reason
  // 3. Publish cancellation event
  // 4. Reverse capital account update if needed

  console.log(`Distribution ${distribution.distributionNumber} cancelled`)
  console.log(`Reason: ${reason}`)
}

/**
 * Get payment status summary
 * For monitoring and reporting
 */
export async function getPaymentStatusSummary(
  db: DatabaseClient
): Promise<{
  scheduled: number
  processing: number
  completed: number
  failed: number
  cancelled: number
  totalAmount: Decimal
}> {
  const distributions = await listDistributions(db, {})

  const summary = {
    scheduled: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalAmount: '0',
  }

  let totalAmount = 0

  for (const dist of distributions) {
    switch (dist.status) {
      case 'scheduled':
        summary.scheduled++
        break
      case 'processing':
        summary.processing++
        break
      case 'completed':
        summary.completed++
        break
      case 'failed':
        summary.failed++
        break
      case 'cancelled':
        summary.cancelled++
        break
    }

    totalAmount += parseFloat(dist.amount)
  }

  summary.totalAmount = totalAmount.toFixed(2)

  return summary
}
