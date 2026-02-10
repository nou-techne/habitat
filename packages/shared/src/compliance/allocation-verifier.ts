/**
 * Allocation Formula Verifier
 * 
 * Verifies patronage allocation calculations are correct:
 * - Allocations sum to 100% of distributable surplus
 * - Type weights applied correctly
 * - Cash/retained split within policy bounds
 * - No member receives negative allocation
 * - Individual allocations within governance limits
 * 
 * Ensures allocation integrity and catches calculation errors
 * 
 * This is Layer 6 (Constraint) - enforcing allocation rules
 */

import type { UUID, Decimal } from '../types/index.js'

export interface AllocationInput {
  memberId: UUID
  patronage: Decimal
  typeWeights: Record<string, number>
  rawPatronage: Decimal
}

export interface AllocationResult {
  memberId: UUID
  totalAllocation: Decimal
  cashDistribution: Decimal
  retainedAllocation: Decimal
  patronageShare: number
}

export interface AllocationPolicy {
  minimumCashRate: number // IRC 1385 requires ≥ 20%
  maximumCashRate: number
  maximumIndividualShare: number // Governance: no single member > X%
  typeWeights: Record<string, number>
}

export interface VerificationResult {
  valid: boolean
  violations: AllocationViolation[]
  summary: {
    totalSurplus: Decimal
    totalAllocated: Decimal
    totalCash: Decimal
    totalRetained: Decimal
    memberCount: number
    averageAllocation: Decimal
    largestAllocation: Decimal
    smallestAllocation: Decimal
  }
}

export interface AllocationViolation {
  code: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  memberId?: UUID
  expectedValue?: string
  actualValue?: string
  remediation?: string
}

/**
 * Allocation Formula Verifier
 */
export class AllocationFormulaVerifier {
  private policy: AllocationPolicy

  constructor(policy?: Partial<AllocationPolicy>) {
    this.policy = {
      minimumCashRate: 0.2, // IRC 1385 requirement
      maximumCashRate: 1.0,
      maximumIndividualShare: 0.5, // No single member > 50%
      typeWeights: {
        labor: 1.0,
        expertise: 1.5,
        capital: 1.0,
        relationship: 0.5,
      },
      ...policy,
    }
  }

  /**
   * Comprehensive allocation verification
   */
  verify(
    allocations: AllocationResult[],
    inputs: AllocationInput[],
    surplus: Decimal
  ): VerificationResult {
    const violations: AllocationViolation[] = []

    // Check 1: Total allocations sum to surplus
    this.checkTotalAllocation(allocations, surplus, violations)

    // Check 2: Cash/retained splits correct
    this.checkCashRetainedSplits(allocations, violations)

    // Check 3: Cash rate within policy bounds
    this.checkCashRate(allocations, surplus, violations)

    // Check 4: No negative allocations
    this.checkNegativeAllocations(allocations, violations)

    // Check 5: Patronage shares sum to 100%
    this.checkPatronageShares(allocations, violations)

    // Check 6: Type weights applied correctly
    this.checkTypeWeights(inputs, violations)

    // Check 7: Individual share limits
    this.checkIndividualLimits(allocations, surplus, violations)

    // Calculate summary
    const summary = this.calculateSummary(allocations, surplus)

    return {
      valid: violations.length === 0,
      violations,
      summary,
    }
  }

  /**
   * Check 1: Total allocations sum to surplus
   */
  private checkTotalAllocation(
    allocations: AllocationResult[],
    surplus: Decimal,
    violations: AllocationViolation[]
  ): void {
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.totalAllocation),
      0
    )

    const surplusNum = parseFloat(surplus)
    const difference = Math.abs(totalAllocated - surplusNum)

    if (difference > 0.01) {
      violations.push({
        code: 'ALLOC-001',
        severity: 'critical',
        description: 'Total allocations do not sum to distributable surplus',
        expectedValue: surplus,
        actualValue: totalAllocated.toFixed(2),
        remediation: `Adjust allocations. Difference: ${difference.toFixed(2)}`,
      })
    }
  }

  /**
   * Check 2: Cash + retained = total for each member
   */
  private checkCashRetainedSplits(
    allocations: AllocationResult[],
    violations: AllocationViolation[]
  ): void {
    for (const alloc of allocations) {
      const cash = parseFloat(alloc.cashDistribution)
      const retained = parseFloat(alloc.retainedAllocation)
      const total = parseFloat(alloc.totalAllocation)

      const sum = cash + retained
      const difference = Math.abs(sum - total)

      if (difference > 0.01) {
        violations.push({
          code: 'ALLOC-002',
          severity: 'critical',
          description: 'Cash + retained does not equal total allocation',
          memberId: alloc.memberId,
          expectedValue: total.toFixed(2),
          actualValue: sum.toFixed(2),
          remediation: 'Recalculate cash and retained amounts',
        })
      }
    }
  }

  /**
   * Check 3: Overall cash rate within policy bounds
   */
  private checkCashRate(
    allocations: AllocationResult[],
    surplus: Decimal,
    violations: AllocationViolation[]
  ): void {
    const totalCash = allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.cashDistribution),
      0
    )

    const surplusNum = parseFloat(surplus)
    const cashRate = surplusNum > 0 ? totalCash / surplusNum : 0

    if (cashRate < this.policy.minimumCashRate - 0.001) {
      violations.push({
        code: 'ALLOC-003',
        severity: 'critical',
        description: 'Cash distribution rate below IRC 1385 minimum',
        expectedValue: `>= ${(this.policy.minimumCashRate * 100).toFixed(0)}%`,
        actualValue: `${(cashRate * 100).toFixed(2)}%`,
        remediation: `IRC 1385 requires at least 20% cash distribution. Increase cash rate to ${this.policy.minimumCashRate}`,
      })
    }

    if (cashRate > this.policy.maximumCashRate + 0.001) {
      violations.push({
        code: 'ALLOC-004',
        severity: 'medium',
        description: 'Cash distribution rate exceeds policy maximum',
        expectedValue: `<= ${(this.policy.maximumCashRate * 100).toFixed(0)}%`,
        actualValue: `${(cashRate * 100).toFixed(2)}%`,
        remediation: `Policy limits cash to ${(this.policy.maximumCashRate * 100).toFixed(0)}%. Increase retained allocations`,
      })
    }
  }

  /**
   * Check 4: No negative allocations
   */
  private checkNegativeAllocations(
    allocations: AllocationResult[],
    violations: AllocationViolation[]
  ): void {
    for (const alloc of allocations) {
      if (parseFloat(alloc.totalAllocation) < 0) {
        violations.push({
          code: 'ALLOC-005',
          severity: 'critical',
          description: 'Member has negative total allocation',
          memberId: alloc.memberId,
          actualValue: alloc.totalAllocation,
          remediation: 'Negative allocations not permitted. Review calculation',
        })
      }

      if (parseFloat(alloc.cashDistribution) < 0) {
        violations.push({
          code: 'ALLOC-006',
          severity: 'critical',
          description: 'Member has negative cash distribution',
          memberId: alloc.memberId,
          actualValue: alloc.cashDistribution,
          remediation: 'Negative cash distributions not permitted',
        })
      }

      if (parseFloat(alloc.retainedAllocation) < 0) {
        violations.push({
          code: 'ALLOC-007',
          severity: 'critical',
          description: 'Member has negative retained allocation',
          memberId: alloc.memberId,
          actualValue: alloc.retainedAllocation,
          remediation: 'Negative retained allocations not permitted',
        })
      }
    }
  }

  /**
   * Check 5: Patronage shares sum to 100%
   */
  private checkPatronageShares(
    allocations: AllocationResult[],
    violations: AllocationViolation[]
  ): void {
    const totalShare = allocations.reduce(
      (sum, alloc) => sum + alloc.patronageShare,
      0
    )

    const difference = Math.abs(totalShare - 1.0)

    if (difference > 0.0001) {
      violations.push({
        code: 'ALLOC-008',
        severity: 'high',
        description: 'Patronage shares do not sum to 100%',
        expectedValue: '1.0 (100%)',
        actualValue: totalShare.toFixed(6),
        remediation: 'Recalculate patronage shares',
      })
    }
  }

  /**
   * Check 6: Type weights applied correctly
   */
  private checkTypeWeights(
    inputs: AllocationInput[],
    violations: AllocationViolation[]
  ): void {
    for (const input of inputs) {
      // Verify each type uses correct weight
      for (const [type, weight] of Object.entries(input.typeWeights)) {
        const expectedWeight = this.policy.typeWeights[type]

        if (expectedWeight === undefined) {
          violations.push({
            code: 'ALLOC-009',
            severity: 'high',
            description: `Unknown contribution type: ${type}`,
            memberId: input.memberId,
            remediation: 'Use recognized contribution types only',
          })
          continue
        }

        if (Math.abs(weight - expectedWeight) > 0.001) {
          violations.push({
            code: 'ALLOC-010',
            severity: 'high',
            description: `Incorrect weight for type ${type}`,
            memberId: input.memberId,
            expectedValue: expectedWeight.toString(),
            actualValue: weight.toString(),
            remediation: `Use policy weight of ${expectedWeight} for ${type}`,
          })
        }
      }
    }
  }

  /**
   * Check 7: Individual member shares within governance limits
   */
  private checkIndividualLimits(
    allocations: AllocationResult[],
    surplus: Decimal,
    violations: AllocationViolation[]
  ): void {
    const surplusNum = parseFloat(surplus)

    for (const alloc of allocations) {
      const allocNum = parseFloat(alloc.totalAllocation)
      const share = surplusNum > 0 ? allocNum / surplusNum : 0

      if (share > this.policy.maximumIndividualShare) {
        violations.push({
          code: 'ALLOC-011',
          severity: 'high',
          description: 'Member allocation exceeds governance limit',
          memberId: alloc.memberId,
          expectedValue: `<= ${(this.policy.maximumIndividualShare * 100).toFixed(0)}%`,
          actualValue: `${(share * 100).toFixed(2)}%`,
          remediation: `Governance limits individual allocation to ${(this.policy.maximumIndividualShare * 100).toFixed(0)}%. Review contribution weighting`,
        })
      }
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    allocations: AllocationResult[],
    surplus: Decimal
  ): VerificationResult['summary'] {
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.totalAllocation),
      0
    )

    const totalCash = allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.cashDistribution),
      0
    )

    const totalRetained = allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.retainedAllocation),
      0
    )

    const amounts = allocations.map(a => parseFloat(a.totalAllocation))
    const largestAllocation = Math.max(...amounts)
    const smallestAllocation = Math.min(...amounts)
    const averageAllocation = totalAllocated / allocations.length

    return {
      totalSurplus: surplus,
      totalAllocated: totalAllocated.toFixed(2),
      totalCash: totalCash.toFixed(2),
      totalRetained: totalRetained.toFixed(2),
      memberCount: allocations.length,
      averageAllocation: averageAllocation.toFixed(2),
      largestAllocation: largestAllocation.toFixed(2),
      smallestAllocation: smallestAllocation.toFixed(2),
    }
  }
}

/**
 * Generate verification report
 */
export function generateVerificationReport(result: VerificationResult): string {
  let report = '=== Allocation Formula Verification Report ===\n\n'

  // Overall status
  report += `Status: ${result.valid ? '✓ VALID' : '✗ VIOLATIONS DETECTED'}\n\n`

  // Summary
  report += '--- Summary ---\n'
  report += `Total Surplus: $${result.summary.totalSurplus}\n`
  report += `Total Allocated: $${result.summary.totalAllocated}\n`
  report += `Total Cash: $${result.summary.totalCash}\n`
  report += `Total Retained: $${result.summary.totalRetained}\n`
  report += `Members: ${result.summary.memberCount}\n`
  report += `Average Allocation: $${result.summary.averageAllocation}\n`
  report += `Largest Allocation: $${result.summary.largestAllocation}\n`
  report += `Smallest Allocation: $${result.summary.smallestAllocation}\n\n`

  // Violations
  if (result.violations.length > 0) {
    const bySeverity = {
      critical: result.violations.filter(v => v.severity === 'critical'),
      high: result.violations.filter(v => v.severity === 'high'),
      medium: result.violations.filter(v => v.severity === 'medium'),
      low: result.violations.filter(v => v.severity === 'low'),
    }

    for (const [severity, violations] of Object.entries(bySeverity)) {
      if (violations.length === 0) continue

      report += `--- ${severity.toUpperCase()} Violations (${violations.length}) ---\n`
      for (const violation of violations) {
        report += `[${violation.code}] ${violation.description}\n`
        if (violation.memberId) {
          report += `  Member: ${violation.memberId}\n`
        }
        if (violation.expectedValue && violation.actualValue) {
          report += `  Expected: ${violation.expectedValue}, Actual: ${violation.actualValue}\n`
        }
        if (violation.remediation) {
          report += `  Remediation: ${violation.remediation}\n`
        }
        report += '\n'
      }
    }
  }

  return report
}

/**
 * Quick validation for common scenarios
 */
export function quickValidate(
  allocations: AllocationResult[],
  surplus: Decimal
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check total
  const total = allocations.reduce(
    (sum, a) => sum + parseFloat(a.totalAllocation),
    0
  )
  if (Math.abs(total - parseFloat(surplus)) > 0.01) {
    errors.push(`Total mismatch: ${total.toFixed(2)} vs ${surplus}`)
  }

  // Check negatives
  for (const alloc of allocations) {
    if (parseFloat(alloc.totalAllocation) < 0) {
      errors.push(`Negative allocation: ${alloc.memberId}`)
    }
  }

  // Check shares
  const shareSum = allocations.reduce((sum, a) => sum + a.patronageShare, 0)
  if (Math.abs(shareSum - 1.0) > 0.0001) {
    errors.push(`Shares don't sum to 1.0: ${shareSum.toFixed(6)}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
