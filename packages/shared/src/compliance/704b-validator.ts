/**
 * IRC 704(b) Capital Account Validator
 * 
 * Validates capital accounts against IRC 704(b) requirements
 * Ensures compliance with partnership tax regulations
 * 
 * IRC 704(b) Requirements:
 * 1. Capital accounts maintained in accordance with regulations
 * 2. Liquidation proceeds distributed per capital account balances
 * 3. Partners have deficit restoration obligations (or qualified income offset)
 * 4. Allocations have substantial economic effect
 * 
 * Tests:
 * - Primary Test: Three-part economic effect test
 * - Alternate Test: If primary fails, check alternate economic effect
 * - Safe Harbor: Partner capital contributions and distributions tracked
 * 
 * This is Layer 6 (Constraint) - enforcing regulatory compliance
 */

import type { UUID, Decimal } from '../types/index.js'

export interface CapitalAccountData {
  memberId: UUID
  bookBalance: Decimal
  taxBalance: Decimal
  contributedCapital: Decimal
  retainedPatronage: Decimal
  distributedPatronage: Decimal
  deficitRestorationObligation: boolean
  qualifiedIncomeOffset: boolean
}

export interface ValidationResult {
  compliant: boolean
  violations: Violation[]
  warnings: Warning[]
  testResults: {
    economicEffectTest: TestResult
    alternateTest?: TestResult
    safeHarbor: TestResult
  }
}

export interface Violation {
  code: string
  regulation: string // e.g., "Treas. Reg. § 1.704-1(b)(2)(ii)(a)"
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  memberId?: UUID
  remediation?: string
}

export interface Warning {
  code: string
  description: string
  memberId?: UUID
}

export interface TestResult {
  passed: boolean
  failures: string[]
}

/**
 * IRC 704(b) Capital Account Validator
 */
export class IRC704bValidator {
  /**
   * Validate capital accounts for all members
   */
  validate(accounts: CapitalAccountData[]): ValidationResult {
    const violations: Violation[] = []
    const warnings: Warning[] = []

    // Test 1: Economic Effect Test (Primary)
    const economicEffectTest = this.testEconomicEffect(accounts, violations, warnings)

    // Test 2: Alternate Economic Effect Test (if primary fails)
    let alternateTest: TestResult | undefined
    if (!economicEffectTest.passed) {
      alternateTest = this.testAlternateEconomicEffect(accounts, violations, warnings)
    }

    // Test 3: Safe Harbor Requirements
    const safeHarbor = this.testSafeHarbor(accounts, violations, warnings)

    // Determine overall compliance
    const compliant =
      (economicEffectTest.passed || alternateTest?.passed || false) && safeHarbor.passed

    return {
      compliant,
      violations,
      warnings,
      testResults: {
        economicEffectTest,
        alternateTest,
        safeHarbor,
      },
    }
  }

  /**
   * Economic Effect Test (Primary Test)
   * Treas. Reg. § 1.704-1(b)(2)(ii)
   * 
   * Three requirements:
   * 1. Capital accounts maintained per regulations
   * 2. Liquidation proceeds distributed per capital account balances
   * 3. Deficit restoration obligation or qualified income offset
   */
  private testEconomicEffect(
    accounts: CapitalAccountData[],
    violations: Violation[],
    warnings: Warning[]
  ): TestResult {
    const failures: string[] = []

    // Requirement 1: Capital accounts maintained per regulations
    if (!this.checkCapitalAccountMaintenance(accounts)) {
      failures.push('Capital accounts not maintained in accordance with Treas. Reg. § 1.704-1(b)(2)(iv)')
      
      violations.push({
        code: '704B-001',
        regulation: 'Treas. Reg. § 1.704-1(b)(2)(iv)',
        severity: 'critical',
        description: 'Capital accounts must be maintained in accordance with regulations',
        remediation: 'Review capital account calculation methodology and adjust to comply with regulations',
      })
    }

    // Requirement 2: Liquidation proceeds distributed per capital accounts
    // (This is a governance/operating agreement requirement, not testable from data alone)
    
    // Requirement 3: Deficit restoration obligation
    for (const account of accounts) {
      if (!account.deficitRestorationObligation && !account.qualifiedIncomeOffset) {
        failures.push(`Member ${account.memberId} lacks deficit restoration obligation or qualified income offset`)
        
        violations.push({
          code: '704B-002',
          regulation: 'Treas. Reg. § 1.704-1(b)(2)(ii)(c)',
          severity: 'high',
          description: 'Partner must have deficit restoration obligation or qualified income offset',
          memberId: account.memberId,
          remediation: 'Add deficit restoration obligation to operating agreement or implement qualified income offset provision',
        })
      }

      // Check for negative capital account balance
      if (parseFloat(account.taxBalance) < 0 && !account.deficitRestorationObligation) {
        violations.push({
          code: '704B-003',
          regulation: 'Treas. Reg. § 1.704-1(b)(2)(ii)(c)',
          severity: 'critical',
          description: 'Member has negative capital account without deficit restoration obligation',
          memberId: account.memberId,
          remediation: 'Add deficit restoration obligation to operating agreement',
        })
      }
    }

    return {
      passed: failures.length === 0,
      failures,
    }
  }

  /**
   * Alternate Economic Effect Test
   * Treas. Reg. § 1.704-1(b)(2)(iii)
   * 
   * Requirements:
   * 1. Requirements 1 & 2 of primary test met
   * 2. Allocations can't cause negative capital account
   * 3. Allocation formula reasonably consistent with underlying economic arrangement
   */
  private testAlternateEconomicEffect(
    accounts: CapitalAccountData[],
    violations: Violation[],
    warnings: Warning[]
  ): TestResult {
    const failures: string[] = []

    // Check for negative capital accounts
    for (const account of accounts) {
      if (parseFloat(account.taxBalance) < 0) {
        failures.push(`Member ${account.memberId} has negative capital account`)
        
        violations.push({
          code: '704B-ALT-001',
          regulation: 'Treas. Reg. § 1.704-1(b)(2)(iii)(b)',
          severity: 'high',
          description: 'Allocations have caused member capital account to become negative',
          memberId: account.memberId,
          remediation: 'Adjust allocation formula to prevent negative capital accounts',
        })
      }
    }

    // Economic arrangement consistency
    // (This requires analyzing allocation formula against economic reality)
    // For now, we assume formula is consistent if passed by patronage formula

    return {
      passed: failures.length === 0,
      failures,
    }
  }

  /**
   * Safe Harbor Requirements
   * Treas. Reg. § 1.704-1(b)(2)(iv)
   * 
   * Capital account must reflect:
   * - Money contributed
   * - Fair market value of property contributed (net of liabilities)
   * - Allocations of income/gain
   * - Distributions
   * - Allocations of loss/deduction
   */
  private testSafeHarbor(
    accounts: CapitalAccountData[],
    violations: Violation[],
    warnings: Warning[]
  ): TestResult {
    const failures: string[] = []

    for (const account of accounts) {
      // Verify book balance reflects required items
      // Book balance should equal: contributed + retained - distributed
      const expectedBookBalance =
        parseFloat(account.contributedCapital) +
        parseFloat(account.retainedPatronage) -
        parseFloat(account.distributedPatronage)

      const actualBookBalance = parseFloat(account.bookBalance)

      if (Math.abs(expectedBookBalance - actualBookBalance) > 0.01) {
        failures.push(`Member ${account.memberId} book balance mismatch`)
        
        violations.push({
          code: '704B-SH-001',
          regulation: 'Treas. Reg. § 1.704-1(b)(2)(iv)',
          severity: 'high',
          description: 'Book capital account does not reflect all required items',
          memberId: account.memberId,
          remediation: 'Recalculate capital account to include all contributions, allocations, and distributions',
        })
      }

      // Verify tax basis matches book basis (simplified - no 704(c) adjustments)
      // In real implementation, would check for 704(c) layers
      if (account.taxBalance !== account.bookBalance) {
        warnings.push({
          code: '704B-SH-W001',
          description: 'Tax basis differs from book basis - verify 704(c) adjustments if property contributed',
          memberId: account.memberId,
        })
      }
    }

    return {
      passed: failures.length === 0,
      failures,
    }
  }

  /**
   * Check if capital accounts are maintained per regulations
   */
  private checkCapitalAccountMaintenance(accounts: CapitalAccountData[]): boolean {
    // Verify all required fields are present and valid
    for (const account of accounts) {
      if (!account.memberId) return false
      if (account.bookBalance === undefined) return false
      if (account.taxBalance === undefined) return false
      if (account.contributedCapital === undefined) return false
      if (account.retainedPatronage === undefined) return false
      if (account.distributedPatronage === undefined) return false
    }

    return true
  }

  /**
   * Validate a single capital account
   */
  validateAccount(account: CapitalAccountData): ValidationResult {
    return this.validate([account])
  }
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(
  validation: ValidationResult
): string {
  let report = '=== IRC 704(b) Compliance Report ===\n\n'

  // Overall status
  report += `Status: ${validation.compliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}\n\n`

  // Test results
  report += '--- Test Results ---\n'
  report += `Economic Effect Test: ${validation.testResults.economicEffectTest.passed ? 'PASS' : 'FAIL'}\n`
  
  if (validation.testResults.alternateTest) {
    report += `Alternate Economic Effect Test: ${validation.testResults.alternateTest.passed ? 'PASS' : 'FAIL'}\n`
  }
  
  report += `Safe Harbor: ${validation.testResults.safeHarbor.passed ? 'PASS' : 'FAIL'}\n\n`

  // Violations
  if (validation.violations.length > 0) {
    report += '--- Violations ---\n'
    for (const violation of validation.violations) {
      report += `[${violation.severity.toUpperCase()}] ${violation.code}: ${violation.description}\n`
      report += `  Regulation: ${violation.regulation}\n`
      if (violation.memberId) {
        report += `  Member: ${violation.memberId}\n`
      }
      if (violation.remediation) {
        report += `  Remediation: ${violation.remediation}\n`
      }
      report += '\n'
    }
  }

  // Warnings
  if (validation.warnings.length > 0) {
    report += '--- Warnings ---\n'
    for (const warning of validation.warnings) {
      report += `${warning.code}: ${warning.description}\n`
      if (warning.memberId) {
        report += `  Member: ${warning.memberId}\n`
      }
      report += '\n'
    }
  }

  return report
}

/**
 * Check if deficit restoration obligations are in place
 */
export function checkDeficitRestorationObligations(
  accounts: CapitalAccountData[]
): {
  allHaveObligation: boolean
  membersWithoutObligation: UUID[]
} {
  const membersWithoutObligation: UUID[] = []

  for (const account of accounts) {
    if (!account.deficitRestorationObligation && !account.qualifiedIncomeOffset) {
      membersWithoutObligation.push(account.memberId)
    }
  }

  return {
    allHaveObligation: membersWithoutObligation.length === 0,
    membersWithoutObligation,
  }
}
