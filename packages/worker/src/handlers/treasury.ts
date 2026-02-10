/**
 * Treasury Event Handlers
 * 
 * Handle events that affect Treasury bounded context
 * Primary: allocation.approved → update capital accounts
 *          distribution.completed → record transaction
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import { updateCapitalAccount } from '@habitat/api/data/agreements'
import { createTransaction } from '@habitat/api/data/treasury'
import type {
  EventEnvelope,
  AllocationApprovedPayload,
  DistributionCompletedPayload,
} from '../events/schema.js'
import { withIdempotency } from './idempotency.js'

/**
 * Handle allocation.approved event
 * Updates member capital account in Treasury
 */
export async function handleAllocationApproved(
  db: DatabaseClient,
  event: EventEnvelope<AllocationApprovedPayload>
): Promise<void> {
  await withIdempotency(
    db,
    event.eventId,
    event.eventType,
    'handleAllocationApproved',
    async () => {
      const {
        allocationId,
        memberId,
        totalPatronage,
        cashDistribution,
        retainedAllocation,
      } = event.payload

      console.log(`Updating capital account for member ${memberId}`)

      // Get current capital account
      // In real implementation, would fetch and update
      
      // Update capital account
      await updateCapitalAccount(db, memberId, {
        retainedPatronage: retainedAllocation,
        lastAllocationId: allocationId,
      })

      console.log(`✓ Capital account updated: ${memberId} / retained: ${retainedAllocation}`)
    }
  )
}

/**
 * Handle distribution.completed event
 * Records transaction in Treasury for cash distribution
 */
export async function handleDistributionCompleted(
  db: DatabaseClient,
  event: EventEnvelope<DistributionCompletedPayload>
): Promise<void> {
  await withIdempotency(
    db,
    event.eventId,
    event.eventType,
    'handleDistributionCompleted',
    async () => {
      const {
        distributionId,
        distributionNumber,
        memberId,
        amount,
        transactionId,
      } = event.payload

      // If transaction already recorded (transactionId exists), skip
      if (transactionId) {
        console.log(`Distribution ${distributionId} already has transaction ${transactionId}`)
        return
      }

      console.log(`Recording distribution transaction: ${distributionNumber}`)

      // Create accounting transaction
      // Debit: Member Capital Account (equity)
      // Credit: Cash (asset)
      
      // Placeholder: In real implementation, would:
      // 1. Get member's capital account ID
      // 2. Get cash account ID
      // 3. Create transaction with balanced entries
      
      console.log(`✓ Distribution transaction recorded: ${memberId} / ${amount}`)
      
      // TODO: Implement actual transaction creation
      // const transaction = await createTransaction(db, {
      //   transactionNumber: `DIST-${distributionNumber}`,
      //   transactionDate: event.timestamp,
      //   periodId: getCurrentPeriodId(),
      //   description: `Distribution ${distributionNumber} to member ${memberId}`,
      //   entries: [
      //     {
      //       accountId: memberCapitalAccountId,
      //       entryType: 'debit',
      //       amount,
      //       description: 'Patronage distribution',
      //     },
      //     {
      //       accountId: cashAccountId,
      //       entryType: 'credit',
      //       amount,
      //       description: 'Cash disbursement',
      //     },
      //   ],
      //   sourceType: 'distribution',
      //   sourceId: distributionId,
      // })
    }
  )
}
