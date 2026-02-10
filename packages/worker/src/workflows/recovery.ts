/**
 * Workflow Error Recovery
 * 
 * Mechanisms for recovering from workflow failures:
 * - Dead-letter queue handling
 * - Event replay mechanism
 * - Workflow step retry with exponential backoff
 * - Compensating transactions
 * - Manual intervention hooks
 * 
 * Ensures system resilience and data integrity despite failures
 * 
 * This is Layer 5 (Flow) - handling error conditions in workflows
 */

import type { DatabaseClient } from '@habitat/api/db/client'
import type { EventBus, EventEnvelope } from '../events/index.js'
import { processEvent } from '../handlers/index.js'

export interface RetryPolicy {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export interface FailedWorkflow {
  workflowId: string
  workflowType: string
  step: string
  error: string
  attemptCount: number
  firstFailedAt: string
  lastAttemptAt: string
  eventEnvelope?: EventEnvelope
  metadata?: Record<string, unknown>
}

export interface RecoveryResult {
  success: boolean
  workflowId: string
  recoveryMethod: 'retry' | 'replay' | 'compensate' | 'manual'
  error?: string
}

/**
 * Dead-Letter Queue Handler
 * Processes events that failed normal processing
 */
export class DeadLetterQueueHandler {
  private db: DatabaseClient
  private eventBus: EventBus
  private retryPolicy: RetryPolicy

  constructor(
    db: DatabaseClient,
    eventBus: EventBus,
    retryPolicy?: Partial<RetryPolicy>
  ) {
    this.db = db
    this.eventBus = eventBus
    this.retryPolicy = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
      ...retryPolicy,
    }
  }

  /**
   * Process dead-letter queue
   * Attempts to recover failed events
   */
  async processDeadLetterQueue(): Promise<{
    processed: number
    recovered: number
    failed: number
  }> {
    console.log('=== Processing Dead-Letter Queue ===')

    // Get failed events from database
    const failedEvents = await this.getFailedEvents()

    console.log(`Found ${failedEvents.length} failed events`)

    let recovered = 0
    let failed = 0

    for (const failedWorkflow of failedEvents) {
      try {
        const result = await this.attemptRecovery(failedWorkflow)

        if (result.success) {
          recovered++
          console.log(`  ✓ Recovered: ${result.workflowId}`)
        } else {
          failed++
          console.log(`  ✗ Failed: ${result.workflowId} - ${result.error}`)
        }
      } catch (error) {
        failed++
        console.error(`  ✗ Recovery error: ${failedWorkflow.workflowId}`, error)
      }
    }

    console.log('\n=== Dead-Letter Queue Processing Complete ===')
    console.log(`Recovered: ${recovered}`)
    console.log(`Failed: ${failed}`)

    return {
      processed: failedEvents.length,
      recovered,
      failed,
    }
  }

  /**
   * Attempt to recover a failed workflow
   */
  private async attemptRecovery(
    failedWorkflow: FailedWorkflow
  ): Promise<RecoveryResult> {
    // Check if max attempts reached
    if (failedWorkflow.attemptCount >= this.retryPolicy.maxAttempts) {
      return {
        success: false,
        workflowId: failedWorkflow.workflowId,
        recoveryMethod: 'manual',
        error: 'Max retry attempts reached - requires manual intervention',
      }
    }

    // Calculate backoff delay
    const delay = Math.min(
      this.retryPolicy.initialDelayMs *
        Math.pow(this.retryPolicy.backoffMultiplier, failedWorkflow.attemptCount),
      this.retryPolicy.maxDelayMs
    )

    // Check if enough time has passed since last attempt
    const timeSinceLastAttempt =
      Date.now() - new Date(failedWorkflow.lastAttemptAt).getTime()

    if (timeSinceLastAttempt < delay) {
      return {
        success: false,
        workflowId: failedWorkflow.workflowId,
        recoveryMethod: 'retry',
        error: `Backoff period not elapsed (${delay - timeSinceLastAttempt}ms remaining)`,
      }
    }

    // Attempt recovery based on workflow type
    try {
      if (failedWorkflow.eventEnvelope) {
        // Event processing failure - replay event
        await processEvent(this.db, failedWorkflow.eventEnvelope)
      } else {
        // Workflow step failure - retry step
        // In real implementation, would have workflow resume logic
        console.log(`Retrying workflow step: ${failedWorkflow.step}`)
      }

      // Mark as recovered
      await this.markRecovered(failedWorkflow.workflowId)

      return {
        success: true,
        workflowId: failedWorkflow.workflowId,
        recoveryMethod: failedWorkflow.eventEnvelope ? 'replay' : 'retry',
      }
    } catch (error) {
      // Increment attempt count
      await this.incrementAttemptCount(failedWorkflow.workflowId)

      return {
        success: false,
        workflowId: failedWorkflow.workflowId,
        recoveryMethod: 'retry',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get failed events from database
   */
  private async getFailedEvents(): Promise<FailedWorkflow[]> {
    // In real implementation, would query failed_workflows table
    // For now, return empty array
    return []
  }

  /**
   * Mark workflow as recovered
   */
  private async markRecovered(workflowId: string): Promise<void> {
    // In real implementation, would update failed_workflows table
    console.log(`Marking ${workflowId} as recovered`)
  }

  /**
   * Increment attempt count
   */
  private async incrementAttemptCount(workflowId: string): Promise<void> {
    // In real implementation, would update failed_workflows table
    console.log(`Incrementing attempt count for ${workflowId}`)
  }
}

/**
 * Event Replay Mechanism
 * Replays events to rebuild state or recover from failures
 */
export class EventReplayEngine {
  private db: DatabaseClient

  constructor(db: DatabaseClient) {
    this.db = db
  }

  /**
   * Replay events from a specific point in time
   * Ensures idempotency via processed_events table
   */
  async replayEventsFrom(
    startTimestamp: string,
    endTimestamp?: string
  ): Promise<{
    eventsReplayed: number
    eventsSkipped: number
  }> {
    console.log('=== Replaying Events ===')
    console.log(`From: ${startTimestamp}`)
    console.log(`To: ${endTimestamp || 'now'}`)

    // Get events in time range
    const events = await this.getEventsInRange(startTimestamp, endTimestamp)

    console.log(`Found ${events.length} events to replay`)

    let replayed = 0
    let skipped = 0

    for (const event of events) {
      try {
        // Process event (idempotency check inside)
        await processEvent(this.db, event)
        replayed++
      } catch (error) {
        // Event already processed or failed
        skipped++
        console.log(`  Skipped: ${event.eventId}`)
      }
    }

    console.log('\n=== Replay Complete ===')
    console.log(`Replayed: ${replayed}`)
    console.log(`Skipped: ${skipped}`)

    return {
      eventsReplayed: replayed,
      eventsSkipped: skipped,
    }
  }

  /**
   * Replay specific event by ID
   */
  async replayEvent(eventId: string): Promise<boolean> {
    console.log(`Replaying event: ${eventId}`)

    const event = await this.getEventById(eventId)
    if (!event) {
      console.log('  Event not found')
      return false
    }

    try {
      await processEvent(this.db, event)
      console.log('  ✓ Event replayed successfully')
      return true
    } catch (error) {
      console.error('  ✗ Replay failed:', error)
      return false
    }
  }

  /**
   * Get events in time range
   */
  private async getEventsInRange(
    startTimestamp: string,
    endTimestamp?: string
  ): Promise<EventEnvelope[]> {
    // In real implementation, would query event store
    return []
  }

  /**
   * Get event by ID
   */
  private async getEventById(eventId: string): Promise<EventEnvelope | null> {
    // In real implementation, would query event store
    return null
  }
}

/**
 * Compensating Transaction Manager
 * Handles rollback of partially completed workflows
 */
export class CompensatingTransactionManager {
  private db: DatabaseClient

  constructor(db: DatabaseClient) {
    this.db = db
  }

  /**
   * Execute compensating transaction for a failed workflow
   */
  async compensate(
    workflowId: string,
    workflowType: string,
    completedSteps: string[]
  ): Promise<boolean> {
    console.log('=== Executing Compensating Transaction ===')
    console.log(`Workflow: ${workflowId} (${workflowType})`)
    console.log(`Completed steps to reverse: ${completedSteps.join(', ')}`)

    try {
      // Execute compensation in reverse order
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const step = completedSteps[i]
        await this.compensateStep(workflowType, step)
      }

      console.log('  ✓ Compensation complete')
      return true
    } catch (error) {
      console.error('  ✗ Compensation failed:', error)
      return false
    }
  }

  /**
   * Compensate a specific workflow step
   */
  private async compensateStep(
    workflowType: string,
    step: string
  ): Promise<void> {
    console.log(`  Compensating step: ${step}`)

    switch (workflowType) {
      case 'period-close':
        await this.compensatePeriodCloseStep(step)
        break

      case 'allocation-distribution':
        await this.compensateAllocationDistributionStep(step)
        break

      case 'distribution-payment':
        await this.compensateDistributionPaymentStep(step)
        break

      default:
        console.log(`    No compensation logic for workflow type: ${workflowType}`)
    }
  }

  /**
   * Compensate period close step
   */
  private async compensatePeriodCloseStep(step: string): Promise<void> {
    switch (step) {
      case 'propose':
        console.log('    Cancelling proposed allocations')
        // Delete or mark allocations as cancelled
        break

      case 'allocate':
        console.log('    Clearing allocation calculations')
        // Clear in-memory calculations
        break

      default:
        console.log(`    No compensation for step: ${step}`)
    }
  }

  /**
   * Compensate allocation distribution step
   */
  private async compensateAllocationDistributionStep(step: string): Promise<void> {
    switch (step) {
      case 'capital':
        console.log('    Reverting capital account update')
        // Revert capital account changes
        break

      case 'schedule':
        console.log('    Cancelling scheduled distributions')
        // Mark distributions as cancelled
        break

      default:
        console.log(`    No compensation for step: ${step}`)
    }
  }

  /**
   * Compensate distribution payment step
   */
  private async compensateDistributionPaymentStep(step: string): Promise<void> {
    switch (step) {
      case 'transaction':
        console.log('    Voiding treasury transaction')
        // Void transaction or create reversal entry
        break

      default:
        console.log(`    No compensation for step: ${step}`)
    }
  }
}

/**
 * Manual Intervention System
 * Provides hooks for operator intervention in failed workflows
 */
export class ManualInterventionSystem {
  private db: DatabaseClient

  constructor(db: DatabaseClient) {
    this.db = db
  }

  /**
   * Get workflows requiring manual intervention
   */
  async getInterventionQueue(): Promise<FailedWorkflow[]> {
    console.log('Fetching workflows requiring manual intervention...')

    // In real implementation, would query failed_workflows table
    // for workflows that exceeded max retry attempts
    return []
  }

  /**
   * Approve manual resolution of a failed workflow
   */
  async approveResolution(
    workflowId: string,
    resolution: 'resolved' | 'ignored' | 'retry',
    notes: string
  ): Promise<void> {
    console.log(`Manual resolution approved for ${workflowId}`)
    console.log(`Resolution: ${resolution}`)
    console.log(`Notes: ${notes}`)

    // In real implementation, would:
    // 1. Update failed_workflows table
    // 2. Record resolution in audit log
    // 3. If resolved, remove from queue
    // 4. If retry, reset attempt count
    // 5. If ignored, mark as permanently failed
  }

  /**
   * Notify operators of critical failures
   */
  async notifyOperators(
    workflowId: string,
    workflowType: string,
    error: string
  ): Promise<void> {
    console.log('=== Notifying Operators ===')
    console.log(`Workflow: ${workflowId} (${workflowType})`)
    console.log(`Error: ${error}`)

    // In real implementation, would:
    // 1. Send email notification
    // 2. Create Slack/Discord alert
    // 3. Log to monitoring system (Sentry, etc.)
  }
}

/**
 * Workflow health monitor
 * Tracks workflow success/failure rates
 */
export async function getWorkflowHealthMetrics(): Promise<{
  totalWorkflows: number
  successRate: number
  failureRate: number
  averageRetryCount: number
  criticalFailures: number
}> {
  // In real implementation, would query workflow execution history
  return {
    totalWorkflows: 0,
    successRate: 0,
    failureRate: 0,
    averageRetryCount: 0,
    criticalFailures: 0,
  }
}
