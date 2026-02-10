/**
 * K-1 Data Assembly Tests
 * 
 * Tests K-1 assembly accuracy and validation
 */

import { describe, it, expect } from 'vitest'
import {
  K1DataAssembler,
  type PartnershipInfo,
  type PartnerInfo,
  type CapitalAccountData,
  type AllocationData,
  type DistributionData,
  validateK1,
  generateK1Summary,
} from '../k1-assembly.js'

describe('K1DataAssembler', () => {
  const assembler = new K1DataAssembler()

  const partnership: PartnershipInfo = {
    ein: '12-3456789',
    name: 'Techne Cooperative',
    address: '1515 Walnut St, Boulder, CO',
    irsCenter: 'Ogden, UT',
  }

  const partner: PartnerInfo = {
    ssn: '123-45-6789',
    name: 'Test Member',
    address: '123 Main St',
    type: 'individual',
    isGeneralPartner: false,
    isLimitedPartner: true,
    isDomestic: true,
  }

  const capitalAccount: CapitalAccountData = {
    memberId: 'member-1',
    bookBalance: '15000.00',
    taxBalance: '15000.00',
    contributedCapital: '5000.00',
    retainedPatronage: '10000.00',
    distributedPatronage: '2000.00',
  }

  const allocations: AllocationData[] = [
    {
      memberId: 'member-1',
      periodId: 'period-1',
      totalAllocation: '10000.00',
      cashDistribution: '2000.00',
      retainedAllocation: '8000.00',
      patronageShare: 0.2, // 20%
    },
  ]

  const distributions: DistributionData[] = [
    {
      memberId: 'member-1',
      amount: '2000.00',
      paymentMethod: 'cash',
      status: 'completed',
    },
  ]

  describe('K-1 Assembly', () => {
    it('should assemble complete K-1 data', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      expect(k1.taxYear).toBe(2026)
      expect(k1.partnershipEIN).toBe('12-3456789')
      expect(k1.partnerSSN).toBe('123-45-6789')
      expect(k1.partnerType).toBe('individual')
    })

    it('should calculate profit share from allocations', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      expect(parseFloat(k1.profitSharePercent)).toBeCloseTo(0.2, 2)
    })

    it('should map ordinary income to patronage allocation', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      expect(k1.income.ordinaryIncome).toBe('10000.00')
    })

    it('should map self-employment earnings', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      expect(k1.credits.selfEmploymentEarnings).toBe('10000.00')
    })

    it('should track cash distributions', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      expect(k1.otherInformation.cashDistributions).toBe('2000.00')
    })
  })

  describe('Capital Account Analysis', () => {
    it('should reconcile capital account', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      // Ending = Beginning + Contributed + Increase - Distributions
      const beginning = parseFloat(k1.capitalAccount.beginningCapital)
      const contributed = parseFloat(k1.capitalAccount.capitalContributed)
      const increase = parseFloat(k1.capitalAccount.currentYearIncrease)
      const distributions = parseFloat(k1.capitalAccount.distributions)
      const ending = parseFloat(k1.capitalAccount.endingCapital)

      const calculated = beginning + contributed + increase - distributions
      expect(calculated).toBeCloseTo(ending, 2)
    })

    it('should use section 704(b) basis method', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      expect(k1.capitalAccount.basisMethod).toBe('section704b')
    })
  })

  describe('K-1 Validation', () => {
    it('should validate correct K-1 data', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      const result = validateK1(k1)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect capital account reconciliation errors', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      // Break capital account
      k1.capitalAccount.endingCapital = '99999.00'

      const result = validateK1(k1)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('reconcile'))).toBe(true)
    })

    it('should require partnership EIN', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      k1.partnershipEIN = ''

      const result = validateK1(k1)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('EIN'))).toBe(true)
    })
  })

  describe('K-1 Summary', () => {
    it('should generate readable summary', () => {
      const k1 = assembler.assembleK1({
        taxYear: 2026,
        partnership,
        partner,
        capitalAccount,
        allocations,
        distributions,
      })

      const summary = generateK1Summary(k1)
      expect(summary).toContain('Schedule K-1')
      expect(summary).toContain('2026')
      expect(summary).toContain('Techne Cooperative')
      expect(summary).toContain('Test Member')
      expect(summary).toContain('$10000.00')
    })
  })
})
