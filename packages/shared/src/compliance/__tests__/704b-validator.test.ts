/**
 * IRC 704(b) Capital Account Validator Tests
 * 
 * Tests all three 704(b) tests and edge cases
 */

import { describe, it, expect } from 'vitest'
import {
  IRC704bValidator,
  type CapitalAccountData,
  generateComplianceReport,
  checkDeficitRestorationObligations,
} from '../704b-validator.js'

describe('IRC704bValidator', () => {
  const validator = new IRC704bValidator()

  describe('Economic Effect Test (Primary)', () => {
    it('should pass with valid capital accounts and DRO', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00',
          taxBalance: '10000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: true,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.compliant).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when DRO missing', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00',
          taxBalance: '10000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: false,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.compliant).toBe(false)
      expect(result.violations.some(v => v.code === '704B-002')).toBe(true)
    })

    it('should fail with negative balance and no DRO', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '5000.00',
          taxBalance: '-1000.00',
          contributedCapital: '0.00',
          retainedPatronage: '-1000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: false,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.compliant).toBe(false)
      expect(result.violations.some(v => v.code === '704B-003')).toBe(true)
    })

    it('should pass with QIO instead of DRO', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00',
          taxBalance: '10000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: false,
          qualifiedIncomeOffset: true,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.compliant).toBe(true)
    })
  })

  describe('Alternate Economic Effect Test', () => {
    it('should fail with negative capital account', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '-5000.00',
          taxBalance: '-5000.00',
          contributedCapital: '0.00',
          retainedPatronage: '-5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: false,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.violations.some(v => v.code === '704B-ALT-001')).toBe(true)
    })
  })

  describe('Safe Harbor Requirements', () => {
    it('should pass when book balance matches calculation', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '8000.00', // 5000 + 5000 - 2000
          taxBalance: '8000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '2000.00',
          deficitRestorationObligation: true,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.testResults.safeHarbor.passed).toBe(true)
    })

    it('should fail when book balance does not match', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00', // Should be 8000
          taxBalance: '10000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '2000.00',
          deficitRestorationObligation: true,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.violations.some(v => v.code === '704B-SH-001')).toBe(true)
    })

    it('should warn when tax basis differs from book', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00',
          taxBalance: '9500.00', // Different
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: true,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      expect(result.warnings.some(w => w.code === '704B-SH-W001')).toBe(true)
    })
  })

  describe('Deficit Restoration Obligations', () => {
    it('should identify members without DRO or QIO', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00',
          taxBalance: '10000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: true,
          qualifiedIncomeOffset: false,
        },
        {
          memberId: 'member-2',
          bookBalance: '5000.00',
          taxBalance: '5000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '0.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: false,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = checkDeficitRestorationObligations(accounts)
      expect(result.allHaveObligation).toBe(false)
      expect(result.membersWithoutObligation).toContain('member-2')
    })
  })

  describe('Compliance Report', () => {
    it('should generate formatted report', () => {
      const accounts: CapitalAccountData[] = [
        {
          memberId: 'member-1',
          bookBalance: '10000.00',
          taxBalance: '10000.00',
          contributedCapital: '5000.00',
          retainedPatronage: '5000.00',
          distributedPatronage: '0.00',
          deficitRestorationObligation: false,
          qualifiedIncomeOffset: false,
        },
      ]

      const result = validator.validate(accounts)
      const report = generateComplianceReport(result)
      
      expect(report).toContain('IRC 704(b) Compliance Report')
      expect(report).toContain('NON-COMPLIANT')
      expect(report).toContain('704B-002')
    })
  })
})
