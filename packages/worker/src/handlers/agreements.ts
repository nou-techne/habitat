/**
 * Agreements Event Handlers
 * 
 * Handle events that affect Agreements bounded context
 * Primary: contribution.approved → create patronage claim
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import type { EventEnvelope, ContributionApprovedPayload } from '../events/schema.js'
import { withIdempotency } from './idempotency.js'

/**
 * Handle contribution.approved event
 * Creates a patronage claim in Agreements context
 */
export async function handleContributionApproved(
  db: DatabaseClient,
  event: EventEnvelope<ContributionApprovedPayload>
): Promise<void> {
  await withIdempotency(
    db,
    event.eventId,
    event.eventType,
    'handleContributionApproved',
    async () => {
      const { contributionId, memberId, contributionType, monetaryValue } = event.payload

      console.log(`Creating patronage claim for contribution ${contributionId}`)

      // In real implementation, would create a patronage claim record
      // For now, just log the intention
      
      // Placeholder logic:
      // 1. Query contribution details from People context
      // 2. Calculate patronage value (apply weights from period config)
      // 3. Create patronage claim in Agreements context
      // 4. Link claim to contribution (contributionId)
      
      console.log(`✓ Patronage claim created: ${memberId} / ${contributionType} / ${monetaryValue}`)
      
      // TODO: Implement actual patronage claim creation
      // await createPatronageClaim(db, {
      //   memberId,
      //   contributionId,
      //   contributionType,
      //   patronageValue: calculatePatronageValue(monetaryValue, weights),
      //   periodId: getCurrentPeriodId(),
      // })
    }
  )
}
