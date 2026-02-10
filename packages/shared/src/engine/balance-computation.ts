/**
 * Balance Computation Engine
 * 
 * Real-time balance computation from event stream
 * Computes capital account balances by replaying events:
 * - Book balance (GAAP accounting)
 * - Tax balance (IRC 704(b) basis)
 * - Contributed capital (initial member contributions)
 * - Retained patronage (undistributed allocations)
 * - Distributed patronage (cash distributions)
 * 
 * This is Layer 5 (Flow) - computing derived state from event flows
 */

import type { UUID, Decimal } from '../types/index.js'

export interface CapitalAccountBalance {
  memberId: UUID
  bookBalance: Decimal
  taxBalance: Decimal
  contributedCapital: Decimal
  retainedPatronage: Decimal
  distributedPatronage: Decimal
  asOfDate: string
}

export interface BalanceEvent {
  eventId: UUID
  eventType: string
  timestamp: string
  memberId: UUID
  amount: Decimal
  metadata?: Record<string, unknown>
}

export type BalanceEventType =
  | 'capital_contribution'
  | 'allocation_approved'
  | 'distribution_completed'
  | 'capital_withdrawal'

/**
 * Balance Computation Engine
 * Replays events to compute current balances
 */
export class BalanceComputationEngine {
  /**
   * Compute balance for a member at a specific point in time
   */
  async computeBalance(
    memberId: UUID,
    events: BalanceEvent[],
    asOfDate?: string
  ): Promise<CapitalAccountBalance> {
    const balance: CapitalAccountBalance = {
      memberId,
      bookBalance: '0',
      taxBalance: '0',
      contributedCapital: '0',
      retainedPatronage: '0',
      distributedPatronage: '0',
      asOfDate: asOfDate || new Date().toISOString(),
    }

    // Filter events up to asOfDate
    const cutoffDate = asOfDate || new Date().toISOString()
    const relevantEvents = events.filter((e) => e.timestamp <= cutoffDate)

    // Sort by timestamp
    relevantEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Replay events
    for (const event of relevantEvents) {
      this.applyEvent(balance, event)
    }

    return balance
  }

  /**
   * Compute balances for all members
   */
  async computeAllBalances(
    events: BalanceEvent[],
    asOfDate?: string
  ): Promise<Map<UUID, CapitalAccountBalance>> {
    const balances = new Map<UUID, CapitalAccountBalance>()

    // Group events by member
    const eventsByMember = new Map<UUID, BalanceEvent[]>()

    for (const event of events) {
      if (!eventsByMember.has(event.memberId)) {
        eventsByMember.set(event.memberId, [])
      }
      eventsByMember.get(event.memberId)!.push(event)
    }

    // Compute balance for each member
    for (const [memberId, memberEvents] of eventsByMember.entries()) {
      const balance = await this.computeBalance(memberId, memberEvents, asOfDate)
      balances.set(memberId, balance)
    }

    return balances
  }

  /**
   * Apply an event to update balance
   */
  private applyEvent(balance: CapitalAccountBalance, event: BalanceEvent): void {
    switch (event.eventType) {
      case 'capital_contribution':
        this.applyCapitalContribution(balance, event)
        break

      case 'allocation_approved':
        this.applyAllocationApproved(balance, event)
        break

      case 'distribution_completed':
        this.applyDistributionCompleted(balance, event)
        break

      case 'capital_withdrawal':
        this.applyCapitalWithdrawal(balance, event)
        break

      default:
        console.warn(`Unknown event type: ${event.eventType}`)
    }
  }

  /**
   * Apply capital contribution event
   * Increases contributed capital and balances
   */
  private applyCapitalContribution(
    balance: CapitalAccountBalance,
    event: BalanceEvent
  ): void {
    const amount = parseFloat(event.amount)

    balance.contributedCapital = (
      parseFloat(balance.contributedCapital) + amount
    ).toFixed(2)

    balance.bookBalance = (parseFloat(balance.bookBalance) + amount).toFixed(2)

    // Tax basis equals book basis for cash contributions
    balance.taxBalance = (parseFloat(balance.taxBalance) + amount).toFixed(2)
  }

  /**
   * Apply allocation approved event
   * Increases retained patronage and book balance
   * Tax basis may differ due to 704(c) adjustments
   */
  private applyAllocationApproved(
    balance: CapitalAccountBalance,
    event: BalanceEvent
  ): void {
    const amount = parseFloat(event.amount)

    // Allocation increases retained patronage
    balance.retainedPatronage = (
      parseFloat(balance.retainedPatronage) + amount
    ).toFixed(2)

    // Book balance increases by full allocation
    balance.bookBalance = (parseFloat(balance.bookBalance) + amount).toFixed(2)

    // Tax basis also increases (simplified - no 704(c) adjustments)
    balance.taxBalance = (parseFloat(balance.taxBalance) + amount).toFixed(2)
  }

  /**
   * Apply distribution completed event
   * Decreases book balance and increases distributed patronage
   * Distribution pays out retained earnings
   */
  private applyDistributionCompleted(
    balance: CapitalAccountBalance,
    event: BalanceEvent
  ): void {
    const amount = parseFloat(event.amount)

    // Distribution decreases book balance
    balance.bookBalance = (parseFloat(balance.bookBalance) - amount).toFixed(2)

    // Tax basis also decreases
    balance.taxBalance = (parseFloat(balance.taxBalance) - amount).toFixed(2)

    // Track distributed patronage (cumulative)
    balance.distributedPatronage = (
      parseFloat(balance.distributedPatronage) + amount
    ).toFixed(2)
  }

  /**
   * Apply capital withdrawal event
   * Member withdrawing contributed capital
   */
  private applyCapitalWithdrawal(
    balance: CapitalAccountBalance,
    event: BalanceEvent
  ): void {
    const amount = parseFloat(event.amount)

    balance.contributedCapital = (
      parseFloat(balance.contributedCapital) - amount
    ).toFixed(2)

    balance.bookBalance = (parseFloat(balance.bookBalance) - amount).toFixed(2)

    balance.taxBalance = (parseFloat(balance.taxBalance) - amount).toFixed(2)
  }
}

/**
 * Materialized View Updater
 * Refreshes materialized views from event stream
 */
export class MaterializedViewUpdater {
  private engine: BalanceComputationEngine

  constructor() {
    this.engine = new BalanceComputationEngine()
  }

  /**
   * Refresh balance materialized view
   * Updates capital_accounts table from events
   */
  async refreshBalances(
    events: BalanceEvent[]
  ): Promise<Map<UUID, CapitalAccountBalance>> {
    console.log('Refreshing balance materialized view...')

    const balances = await this.engine.computeAllBalances(events)

    console.log(`  ✓ Computed balances for ${balances.size} members`)

    // In real implementation, would:
    // 1. Compute balances from events
    // 2. Update capital_accounts table
    // 3. Record refresh timestamp

    return balances
  }

  /**
   * Incremental refresh - only process new events
   */
  async incrementalRefresh(
    currentBalances: Map<UUID, CapitalAccountBalance>,
    newEvents: BalanceEvent[]
  ): Promise<Map<UUID, CapitalAccountBalance>> {
    console.log(`Incremental refresh: ${newEvents.length} new events`)

    // Group new events by member
    const eventsByMember = new Map<UUID, BalanceEvent[]>()
    for (const event of newEvents) {
      if (!eventsByMember.has(event.memberId)) {
        eventsByMember.set(event.memberId, [])
      }
      eventsByMember.get(event.memberId)!.push(event)
    }

    // Update only affected members
    for (const [memberId, memberEvents] of eventsByMember.entries()) {
      const currentBalance =
        currentBalances.get(memberId) ||
        this.createEmptyBalance(memberId)

      // Apply new events
      for (const event of memberEvents) {
        this.engine['applyEvent'](currentBalance, event)
      }

      currentBalances.set(memberId, currentBalance)
    }

    console.log(`  ✓ Updated ${eventsByMember.size} member balances`)

    return currentBalances
  }

  private createEmptyBalance(memberId: UUID): CapitalAccountBalance {
    return {
      memberId,
      bookBalance: '0',
      taxBalance: '0',
      contributedCapital: '0',
      retainedPatronage: '0',
      distributedPatronage: '0',
      asOfDate: new Date().toISOString(),
    }
  }
}

/**
 * Temporal balance query
 * Query balance at any point in time
 */
export class TemporalBalanceQuery {
  private engine: BalanceComputationEngine

  constructor() {
    this.engine = new BalanceComputationEngine()
  }

  /**
   * Query balance at specific date
   */
  async getBalanceAt(
    memberId: UUID,
    events: BalanceEvent[],
    date: string
  ): Promise<CapitalAccountBalance> {
    return this.engine.computeBalance(memberId, events, date)
  }

  /**
   * Query balance changes over time period
   */
  async getBalanceHistory(
    memberId: UUID,
    events: BalanceEvent[],
    startDate: string,
    endDate: string,
    intervalDays: number = 30
  ): Promise<CapitalAccountBalance[]> {
    const history: CapitalAccountBalance[] = []

    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    while (current <= end) {
      const balance = await this.getBalanceAt(
        memberId,
        events,
        current.toISOString()
      )
      history.push(balance)

      current.setDate(current.getDate() + intervalDays)
    }

    return history
  }

  /**
   * Compute balance delta between two dates
   */
  async getBalanceDelta(
    memberId: UUID,
    events: BalanceEvent[],
    startDate: string,
    endDate: string
  ): Promise<{
    startBalance: CapitalAccountBalance
    endBalance: CapitalAccountBalance
    delta: {
      bookBalance: Decimal
      taxBalance: Decimal
      contributedCapital: Decimal
      retainedPatronage: Decimal
      distributedPatronage: Decimal
    }
  }> {
    const startBalance = await this.getBalanceAt(memberId, events, startDate)
    const endBalance = await this.getBalanceAt(memberId, events, endDate)

    const delta = {
      bookBalance: (
        parseFloat(endBalance.bookBalance) -
        parseFloat(startBalance.bookBalance)
      ).toFixed(2),
      taxBalance: (
        parseFloat(endBalance.taxBalance) - parseFloat(startBalance.taxBalance)
      ).toFixed(2),
      contributedCapital: (
        parseFloat(endBalance.contributedCapital) -
        parseFloat(startBalance.contributedCapital)
      ).toFixed(2),
      retainedPatronage: (
        parseFloat(endBalance.retainedPatronage) -
        parseFloat(startBalance.retainedPatronage)
      ).toFixed(2),
      distributedPatronage: (
        parseFloat(endBalance.distributedPatronage) -
        parseFloat(startBalance.distributedPatronage)
      ).toFixed(2),
    }

    return {
      startBalance,
      endBalance,
      delta,
    }
  }
}

/**
 * Verify balance integrity
 * Ensures computed balances match invariants
 */
export async function verifyBalanceIntegrity(
  balance: CapitalAccountBalance
): Promise<{
  valid: boolean
  violations: string[]
}> {
  const violations: string[] = []

  // Invariant 1: Book balance = contributed capital + retained patronage - distributed patronage
  const expectedBookBalance =
    parseFloat(balance.contributedCapital) +
    parseFloat(balance.retainedPatronage) -
    parseFloat(balance.distributedPatronage)

  const actualBookBalance = parseFloat(balance.bookBalance)

  if (Math.abs(expectedBookBalance - actualBookBalance) > 0.01) {
    violations.push(
      `Book balance mismatch: expected ${expectedBookBalance.toFixed(2)}, actual ${actualBookBalance.toFixed(2)}`
    )
  }

  // Invariant 2: Tax balance >= 0
  if (parseFloat(balance.taxBalance) < 0) {
    violations.push(`Tax balance cannot be negative: ${balance.taxBalance}`)
  }

  // Invariant 3: Distributed patronage <= retained patronage (cumulative)
  // Note: This is only true if all distributions come from retained earnings
  // (not from contributed capital withdrawals)

  return {
    valid: violations.length === 0,
    violations,
  }
}
