/**
 * Patronage Formula Engine
 * 
 * Calculates patronage allocations based on weighted contributions
 * Implements the core formula for distributing cooperative surplus
 * 
 * Formula:
 * 1. Raw patronage = monetary value of contribution
 * 2. Weighted patronage = raw patronage × type weight
 * 3. Member share = member weighted patronage / total weighted patronage
 * 4. Member allocation = allocable surplus × member share
 * 5. Cash distribution = allocation × cash rate (min 20% per IRC 1385)
 * 6. Retained allocation = allocation × (1 - cash rate)
 * 
 * This is Layer 5 (Flow) - computing value distribution
 */

import type { UUID, Decimal, ContributionType } from '../types/index.js'

export interface PatronageWeights {
  labor: number
  expertise: number
  capital: number
  relationship: number
}

export interface ContributionInput {
  contributionId: UUID
  memberId: UUID
  contributionType: ContributionType
  monetaryValue: Decimal
}

export interface PatronageCalculation {
  memberId: UUID
  contributionsByType: Map<ContributionType, {
    rawPatronage: Decimal
    weight: number
    weightedPatronage: Decimal
    contributionCount: number
  }>
  totalRawPatronage: Decimal
  totalWeightedPatronage: Decimal
}

export interface AllocationResult {
  memberId: UUID
  memberShare: number
  totalAllocation: Decimal
  cashDistribution: Decimal
  retainedAllocation: Decimal
  allocationsByType: Array<{
    type: ContributionType
    rawPatronage: Decimal
    weight: number
    weightedPatronage: Decimal
    allocation: Decimal
  }>
}

/**
 * Patronage Formula Engine
 */
export class PatronageFormulaEngine {
  private weights: PatronageWeights

  constructor(weights?: Partial<PatronageWeights>) {
    // Default weights
    this.weights = {
      labor: 1.0,
      expertise: 1.5,
      capital: 1.0,
      relationship: 0.5,
      ...weights,
    }
  }

  /**
   * Calculate patronage for all members
   */
  calculatePatronage(
    contributions: ContributionInput[]
  ): Map<UUID, PatronageCalculation> {
    const patronageByMember = new Map<UUID, PatronageCalculation>()

    for (const contribution of contributions) {
      if (!patronageByMember.has(contribution.memberId)) {
        patronageByMember.set(contribution.memberId, {
          memberId: contribution.memberId,
          contributionsByType: new Map(),
          totalRawPatronage: '0',
          totalWeightedPatronage: '0',
        })
      }

      const memberPatronage = patronageByMember.get(contribution.memberId)!

      // Get or create type entry
      if (!memberPatronage.contributionsByType.has(contribution.contributionType)) {
        memberPatronage.contributionsByType.set(contribution.contributionType, {
          rawPatronage: '0',
          weight: this.weights[contribution.contributionType],
          weightedPatronage: '0',
          contributionCount: 0,
        })
      }

      const typeEntry = memberPatronage.contributionsByType.get(
        contribution.contributionType
      )!

      // Add to raw patronage
      const rawValue = parseFloat(contribution.monetaryValue)
      typeEntry.rawPatronage = (
        parseFloat(typeEntry.rawPatronage) + rawValue
      ).toFixed(2)
      typeEntry.contributionCount++

      // Calculate weighted patronage
      typeEntry.weightedPatronage = (
        parseFloat(typeEntry.rawPatronage) * typeEntry.weight
      ).toFixed(2)
    }

    // Calculate totals for each member
    for (const memberPatronage of patronageByMember.values()) {
      let totalRaw = 0
      let totalWeighted = 0

      for (const typeEntry of memberPatronage.contributionsByType.values()) {
        totalRaw += parseFloat(typeEntry.rawPatronage)
        totalWeighted += parseFloat(typeEntry.weightedPatronage)
      }

      memberPatronage.totalRawPatronage = totalRaw.toFixed(2)
      memberPatronage.totalWeightedPatronage = totalWeighted.toFixed(2)
    }

    return patronageByMember
  }

  /**
   * Calculate allocations from patronage
   */
  calculateAllocations(
    patronageByMember: Map<UUID, PatronageCalculation>,
    allocableSurplus: Decimal,
    cashRate: number = 0.20
  ): AllocationResult[] {
    // Validate cash rate (IRC 1385 requires minimum 20%)
    if (cashRate < 0.20) {
      throw new Error('Cash distribution rate must be at least 20% (IRC 1385)')
    }

    if (cashRate > 1.0 || cashRate < 0) {
      throw new Error('Cash distribution rate must be between 0 and 1')
    }

    // Calculate total weighted patronage across all members
    let totalWeightedPatronage = 0
    for (const member of patronageByMember.values()) {
      totalWeightedPatronage += parseFloat(member.totalWeightedPatronage)
    }

    // Edge case: no patronage
    if (totalWeightedPatronage === 0) {
      return []
    }

    const surplusValue = parseFloat(allocableSurplus)
    const allocations: AllocationResult[] = []

    for (const member of patronageByMember.values()) {
      const memberWeighted = parseFloat(member.totalWeightedPatronage)
      const memberShare = memberWeighted / totalWeightedPatronage

      const totalAllocation = (surplusValue * memberShare).toFixed(2)
      const cashDistribution = (
        parseFloat(totalAllocation) * cashRate
      ).toFixed(2)
      const retainedAllocation = (
        parseFloat(totalAllocation) * (1 - cashRate)
      ).toFixed(2)

      // Calculate allocation by type
      const allocationsByType = []
      for (const [type, typeEntry] of member.contributionsByType.entries()) {
        const typeWeighted = parseFloat(typeEntry.weightedPatronage)
        const typeShare = memberWeighted > 0 ? typeWeighted / memberWeighted : 0
        const typeAllocation = (parseFloat(totalAllocation) * typeShare).toFixed(2)

        allocationsByType.push({
          type,
          rawPatronage: typeEntry.rawPatronage,
          weight: typeEntry.weight,
          weightedPatronage: typeEntry.weightedPatronage,
          allocation: typeAllocation,
        })
      }

      allocations.push({
        memberId: member.memberId,
        memberShare,
        totalAllocation,
        cashDistribution,
        retainedAllocation,
        allocationsByType,
      })
    }

    return allocations
  }

  /**
   * Update patronage weights
   */
  setWeights(weights: Partial<PatronageWeights>): void {
    this.weights = {
      ...this.weights,
      ...weights,
    }
  }

  /**
   * Get current weights
   */
  getWeights(): PatronageWeights {
    return { ...this.weights }
  }
}

/**
 * Multi-period patronage accumulation
 * Tracks patronage across multiple accounting periods
 */
export class MultiPeriodPatronageAccumulator {
  private periodPatronage: Map<UUID, Map<UUID, PatronageCalculation>>

  constructor() {
    this.periodPatronage = new Map()
  }

  /**
   * Add patronage for a period
   */
  addPeriod(
    periodId: UUID,
    patronage: Map<UUID, PatronageCalculation>
  ): void {
    this.periodPatronage.set(periodId, patronage)
  }

  /**
   * Get cumulative patronage for a member across all periods
   */
  getCumulativePatronage(memberId: UUID): PatronageCalculation {
    const cumulative: PatronageCalculation = {
      memberId,
      contributionsByType: new Map(),
      totalRawPatronage: '0',
      totalWeightedPatronage: '0',
    }

    for (const periodMap of this.periodPatronage.values()) {
      const periodData = periodMap.get(memberId)
      if (!periodData) continue

      // Accumulate each type
      for (const [type, typeData] of periodData.contributionsByType.entries()) {
        if (!cumulative.contributionsByType.has(type)) {
          cumulative.contributionsByType.set(type, {
            rawPatronage: '0',
            weight: typeData.weight,
            weightedPatronage: '0',
            contributionCount: 0,
          })
        }

        const cumulativeType = cumulative.contributionsByType.get(type)!
        cumulativeType.rawPatronage = (
          parseFloat(cumulativeType.rawPatronage) +
          parseFloat(typeData.rawPatronage)
        ).toFixed(2)
        cumulativeType.weightedPatronage = (
          parseFloat(cumulativeType.weightedPatronage) +
          parseFloat(typeData.weightedPatronage)
        ).toFixed(2)
        cumulativeType.contributionCount += typeData.contributionCount
      }
    }

    // Calculate cumulative totals
    let totalRaw = 0
    let totalWeighted = 0
    for (const typeEntry of cumulative.contributionsByType.values()) {
      totalRaw += parseFloat(typeEntry.rawPatronage)
      totalWeighted += parseFloat(typeEntry.weightedPatronage)
    }

    cumulative.totalRawPatronage = totalRaw.toFixed(2)
    cumulative.totalWeightedPatronage = totalWeighted.toFixed(2)

    return cumulative
  }

  /**
   * Get cumulative patronage for all members
   */
  getAllCumulativePatronage(): Map<UUID, PatronageCalculation> {
    const allMembers = new Set<UUID>()
    for (const periodMap of this.periodPatronage.values()) {
      for (const memberId of periodMap.keys()) {
        allMembers.add(memberId)
      }
    }

    const cumulative = new Map<UUID, PatronageCalculation>()
    for (const memberId of allMembers) {
      cumulative.set(memberId, this.getCumulativePatronage(memberId))
    }

    return cumulative
  }
}

/**
 * Verify allocation correctness
 */
export function verifyAllocations(
  allocations: AllocationResult[],
  allocableSurplus: Decimal,
  cashRate: number
): {
  valid: boolean
  violations: string[]
} {
  const violations: string[] = []

  // Invariant 1: Sum of allocations equals allocable surplus
  let totalAllocated = 0
  for (const allocation of allocations) {
    totalAllocated += parseFloat(allocation.totalAllocation)
  }

  const expectedTotal = parseFloat(allocableSurplus)
  if (Math.abs(totalAllocated - expectedTotal) > 0.01) {
    violations.push(
      `Total allocated (${totalAllocated.toFixed(2)}) must equal allocable surplus (${expectedTotal.toFixed(2)})`
    )
  }

  // Invariant 2: Cash + retained = total for each member
  for (const allocation of allocations) {
    const cashPlusRetained =
      parseFloat(allocation.cashDistribution) +
      parseFloat(allocation.retainedAllocation)
    const total = parseFloat(allocation.totalAllocation)

    if (Math.abs(cashPlusRetained - total) > 0.01) {
      violations.push(
        `Member ${allocation.memberId}: cash + retained (${cashPlusRetained.toFixed(2)}) must equal total (${total.toFixed(2)})`
      )
    }
  }

  // Invariant 3: Cash rate matches expected
  for (const allocation of allocations) {
    const total = parseFloat(allocation.totalAllocation)
    if (total === 0) continue

    const actualCashRate =
      parseFloat(allocation.cashDistribution) / total
    const expectedCashRate = cashRate

    if (Math.abs(actualCashRate - expectedCashRate) > 0.001) {
      violations.push(
        `Member ${allocation.memberId}: cash rate (${(actualCashRate * 100).toFixed(1)}%) must be ${(expectedCashRate * 100).toFixed(1)}%`
      )
    }
  }

  // Invariant 4: All member shares sum to 1.0
  let totalShare = 0
  for (const allocation of allocations) {
    totalShare += allocation.memberShare
  }

  if (Math.abs(totalShare - 1.0) > 0.0001) {
    violations.push(
      `Total member shares (${totalShare.toFixed(4)}) must equal 1.0`
    )
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}
