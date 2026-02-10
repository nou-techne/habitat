/**
 * Schedule K-1 Data Assembly
 * 
 * Assembles IRS Schedule K-1 (Form 1065) data for partnership members
 * 
 * Schedule K-1 reports each partner's share of:
 * - Income (ordinary business income, dividends, interest, etc.)
 * - Deductions (charitable contributions, Section 179, etc.)
 * - Credits (various tax credits)
 * - Capital account reconciliation
 * 
 * Box-by-box mapping from capital account and allocation data
 * 
 * This is Layer 6 (Constraint) - ensuring tax compliance
 */

import type { UUID, Decimal } from '../types/index.js'

export interface K1Data {
  taxYear: number
  partnershipEIN: string
  partnershipName: string
  partnershipAddress: string
  
  // Partner information
  partnerSSN: string // or EIN for entity partners
  partnerName: string
  partnerAddress: string
  partnerType: 'individual' | 'entity'
  
  // Partner share information
  profitSharePercent: Decimal
  lossSharePercent: Decimal
  capitalSharePercent: Decimal
  
  // Part I - Information About the Partnership
  partnershipIRSCenter: string
  
  // Part II - Information About the Partner
  isGeneralPartner: boolean
  isLimitedPartner: boolean
  isDomesticPartner: boolean
  isForeignPartner: boolean
  
  // Part III - Partner's Share of Current Year Income, Deductions, Credits, and Other Items
  income: K1Income
  deductions: K1Deductions
  credits: K1Credits
  otherInformation: K1OtherInformation
  
  // Part IV - Capital Account Analysis (per books)
  capitalAccount: K1CapitalAccount
}

/**
 * Part III - Income (Lines 1-11)
 */
export interface K1Income {
  // Line 1: Ordinary business income (loss)
  ordinaryIncome: Decimal
  
  // Line 2: Net rental real estate income (loss)
  rentalRealEstateIncome: Decimal
  
  // Line 3: Other net rental income (loss)
  otherRentalIncome: Decimal
  
  // Line 4: Guaranteed payments
  guaranteedPayments: {
    forServices: Decimal
    forCapital: Decimal
  }
  
  // Line 5: Interest income
  interestIncome: {
    taxExempt: Decimal
    ordinary: Decimal
  }
  
  // Line 6: Dividends
  dividends: {
    ordinary: Decimal
    qualified: Decimal
  }
  
  // Line 7: Royalties
  royalties: Decimal
  
  // Line 8: Net short-term capital gain (loss)
  shortTermCapitalGain: Decimal
  
  // Line 9: Net long-term capital gain (loss)
  longTermCapitalGain: Decimal
  
  // Line 10: Net section 1231 gain (loss)
  section1231Gain: Decimal
  
  // Line 11: Other income (loss)
  otherIncome: K1OtherIncomeItem[]
}

export interface K1OtherIncomeItem {
  code: string
  description: string
  amount: Decimal
}

/**
 * Part III - Deductions (Lines 12-13)
 */
export interface K1Deductions {
  // Line 12: Section 179 deduction
  section179Deduction: Decimal
  
  // Line 13: Other deductions
  otherDeductions: K1DeductionItem[]
}

export interface K1DeductionItem {
  code: string
  description: string
  amount: Decimal
}

/**
 * Part III - Credits (Line 14-15)
 */
export interface K1Credits {
  // Line 14: Self-employment earnings (loss)
  selfEmploymentEarnings: Decimal
  
  // Line 15: Credits
  credits: K1CreditItem[]
}

export interface K1CreditItem {
  code: string
  description: string
  amount: Decimal
}

/**
 * Part III - Other Information (Lines 16-20)
 */
export interface K1OtherInformation {
  // Line 16: Foreign transactions
  foreignTransactions: K1ForeignItem[]
  
  // Line 17: Alternative minimum tax (AMT) items
  amtItems: K1AMTItem[]
  
  // Line 18: Tax-exempt income and nondeductible expenses
  taxExemptIncome: Decimal
  nondeductibleExpenses: Decimal
  
  // Line 19: Distributions
  cashDistributions: Decimal
  propertyDistributions: Decimal
  
  // Line 20: Other information
  otherInfo: K1OtherInfoItem[]
}

export interface K1ForeignItem {
  code: string
  description: string
  amount: Decimal
}

export interface K1AMTItem {
  code: string
  description: string
  amount: Decimal
}

export interface K1OtherInfoItem {
  code: string
  description: string
  amount: Decimal
}

/**
 * Part IV - Capital Account Analysis (per books)
 */
export interface K1CapitalAccount {
  // Beginning capital account
  beginningCapital: Decimal
  
  // Capital contributed during year
  capitalContributed: Decimal
  
  // Current year increase (decrease)
  currentYearIncrease: Decimal
  
  // Withdrawals and distributions
  withdrawals: Decimal
  distributions: Decimal
  
  // Ending capital account
  endingCapital: Decimal
  
  // Tax basis method
  basisMethod: 'tax' | 'gaap' | 'section704b' | 'other'
}

/**
 * K-1 Data Assembler
 */
export class K1DataAssembler {
  /**
   * Assemble K-1 data from capital account and allocation records
   */
  assembleK1(input: {
    taxYear: number
    partnership: PartnershipInfo
    partner: PartnerInfo
    capitalAccount: CapitalAccountData
    allocations: AllocationData[]
    distributions: DistributionData[]
  }): K1Data {
    const {
      taxYear,
      partnership,
      partner,
      capitalAccount,
      allocations,
      distributions,
    } = input

    return {
      taxYear,
      partnershipEIN: partnership.ein,
      partnershipName: partnership.name,
      partnershipAddress: partnership.address,

      partnerSSN: partner.ssn,
      partnerName: partner.name,
      partnerAddress: partner.address,
      partnerType: partner.type,

      profitSharePercent: this.calculateProfitShare(allocations),
      lossSharePercent: this.calculateLossShare(allocations),
      capitalSharePercent: this.calculateCapitalShare(capitalAccount),

      partnershipIRSCenter: partnership.irsCenter,

      isGeneralPartner: partner.isGeneralPartner,
      isLimitedPartner: partner.isLimitedPartner,
      isDomesticPartner: partner.isDomestic,
      isForeignPartner: !partner.isDomestic,

      income: this.assembleIncome(allocations),
      deductions: this.assembleDeductions(allocations),
      credits: this.assembleCredits(allocations),
      otherInformation: this.assembleOtherInformation(distributions),

      capitalAccount: this.assembleCapitalAccount(capitalAccount, allocations, distributions),
    }
  }

  /**
   * Calculate profit share percentage
   */
  private calculateProfitShare(allocations: AllocationData[]): Decimal {
    // In patronage model, profit share = patronage share
    const totalAllocation = allocations.reduce(
      (sum, a) => sum + parseFloat(a.totalAllocation),
      0
    )
    
    if (totalAllocation === 0) return '0.00'
    
    // For simplicity, use first allocation's share percentage
    // In real implementation, would calculate from total partnership profit
    return allocations[0]?.patronageShare.toFixed(4) || '0.00'
  }

  /**
   * Calculate loss share percentage
   */
  private calculateLossShare(allocations: AllocationData[]): Decimal {
    // For LCA, loss share typically same as profit share
    return this.calculateProfitShare(allocations)
  }

  /**
   * Calculate capital share percentage
   */
  private calculateCapitalShare(capitalAccount: CapitalAccountData): Decimal {
    // Capital share based on contributed capital
    // Would need total partnership capital to calculate percentage
    // For now, return placeholder
    return '0.00' // TODO: Calculate from total partnership capital
  }

  /**
   * Assemble income section
   */
  private assembleIncome(allocations: AllocationData[]): K1Income {
    const totalIncome = allocations.reduce(
      (sum, a) => sum + parseFloat(a.totalAllocation),
      0
    )

    return {
      // Line 1: Ordinary business income (patronage allocations)
      ordinaryIncome: totalIncome.toFixed(2),

      // Lines 2-11: Typically zero for simple cooperatives
      rentalRealEstateIncome: '0.00',
      otherRentalIncome: '0.00',
      guaranteedPayments: {
        forServices: '0.00',
        forCapital: '0.00',
      },
      interestIncome: {
        taxExempt: '0.00',
        ordinary: '0.00',
      },
      dividends: {
        ordinary: '0.00',
        qualified: '0.00',
      },
      royalties: '0.00',
      shortTermCapitalGain: '0.00',
      longTermCapitalGain: '0.00',
      section1231Gain: '0.00',
      otherIncome: [],
    }
  }

  /**
   * Assemble deductions section
   */
  private assembleDeductions(allocations: AllocationData[]): K1Deductions {
    return {
      section179Deduction: '0.00',
      otherDeductions: [],
    }
  }

  /**
   * Assemble credits section
   */
  private assembleCredits(allocations: AllocationData[]): K1Credits {
    const totalIncome = allocations.reduce(
      (sum, a) => sum + parseFloat(a.totalAllocation),
      0
    )

    return {
      // Self-employment earnings (for active members)
      selfEmploymentEarnings: totalIncome.toFixed(2),
      credits: [],
    }
  }

  /**
   * Assemble other information section
   */
  private assembleOtherInformation(distributions: DistributionData[]): K1OtherInformation {
    const totalCashDistributions = distributions.reduce(
      (sum, d) => sum + (d.paymentMethod === 'cash' ? parseFloat(d.amount) : 0),
      0
    )

    return {
      foreignTransactions: [],
      amtItems: [],
      taxExemptIncome: '0.00',
      nondeductibleExpenses: '0.00',
      cashDistributions: totalCashDistributions.toFixed(2),
      propertyDistributions: '0.00',
      otherInfo: [],
    }
  }

  /**
   * Assemble capital account section (per books)
   */
  private assembleCapitalAccount(
    capitalAccount: CapitalAccountData,
    allocations: AllocationData[],
    distributions: DistributionData[]
  ): K1CapitalAccount {
    const currentYearAllocation = allocations.reduce(
      (sum, a) => sum + parseFloat(a.totalAllocation),
      0
    )

    const currentYearDistributions = distributions.reduce(
      (sum, d) => sum + parseFloat(d.amount),
      0
    )

    // Beginning = Ending from prior year
    // Current year increase = allocations
    // Ending = Beginning + Contributed + Increase - Withdrawals - Distributions

    const beginningCapital =
      parseFloat(capitalAccount.bookBalance) -
      currentYearAllocation +
      currentYearDistributions -
      parseFloat(capitalAccount.contributedCapital)

    return {
      beginningCapital: beginningCapital.toFixed(2),
      capitalContributed: capitalAccount.contributedCapital,
      currentYearIncrease: currentYearAllocation.toFixed(2),
      withdrawals: '0.00',
      distributions: currentYearDistributions.toFixed(2),
      endingCapital: capitalAccount.bookBalance,
      basisMethod: 'section704b',
    }
  }
}

/**
 * Input data structures
 */
export interface PartnershipInfo {
  ein: string
  name: string
  address: string
  irsCenter: string
}

export interface PartnerInfo {
  ssn: string
  name: string
  address: string
  type: 'individual' | 'entity'
  isGeneralPartner: boolean
  isLimitedPartner: boolean
  isDomestic: boolean
}

export interface CapitalAccountData {
  memberId: UUID
  bookBalance: Decimal
  taxBalance: Decimal
  contributedCapital: Decimal
  retainedPatronage: Decimal
  distributedPatronage: Decimal
}

export interface AllocationData {
  memberId: UUID
  periodId: UUID
  totalAllocation: Decimal
  cashDistribution: Decimal
  retainedAllocation: Decimal
  patronageShare: number
}

export interface DistributionData {
  memberId: UUID
  amount: Decimal
  paymentMethod: string
  status: string
}

/**
 * Generate K-1 summary report
 */
export function generateK1Summary(k1: K1Data): string {
  let report = `=== Schedule K-1 Summary (Form 1065) ===\n`
  report += `Tax Year: ${k1.taxYear}\n\n`

  report += `--- Partnership Information ---\n`
  report += `Name: ${k1.partnershipName}\n`
  report += `EIN: ${k1.partnershipEIN}\n`
  report += `Address: ${k1.partnershipAddress}\n\n`

  report += `--- Partner Information ---\n`
  report += `Name: ${k1.partnerName}\n`
  report += `SSN/EIN: ${k1.partnerSSN}\n`
  report += `Type: ${k1.partnerType}\n`
  report += `Partner Type: ${k1.isGeneralPartner ? 'General' : 'Limited'}\n\n`

  report += `--- Share Percentages ---\n`
  report += `Profit Share: ${(parseFloat(k1.profitSharePercent) * 100).toFixed(2)}%\n`
  report += `Loss Share: ${(parseFloat(k1.lossSharePercent) * 100).toFixed(2)}%\n`
  report += `Capital Share: ${(parseFloat(k1.capitalSharePercent) * 100).toFixed(2)}%\n\n`

  report += `--- Income (Part III) ---\n`
  report += `Ordinary Business Income (Line 1): $${k1.income.ordinaryIncome}\n`
  report += `Self-Employment Earnings (Line 14): $${k1.credits.selfEmploymentEarnings}\n\n`

  report += `--- Distributions (Part III, Line 19) ---\n`
  report += `Cash Distributions: $${k1.otherInformation.cashDistributions}\n`
  report += `Property Distributions: $${k1.otherInformation.propertyDistributions}\n\n`

  report += `--- Capital Account Analysis (Part IV) ---\n`
  report += `Beginning Capital: $${k1.capitalAccount.beginningCapital}\n`
  report += `Capital Contributed: $${k1.capitalAccount.capitalContributed}\n`
  report += `Current Year Increase: $${k1.capitalAccount.currentYearIncrease}\n`
  report += `Withdrawals: $${k1.capitalAccount.withdrawals}\n`
  report += `Distributions: $${k1.capitalAccount.distributions}\n`
  report += `Ending Capital: $${k1.capitalAccount.endingCapital}\n`
  report += `Basis Method: ${k1.capitalAccount.basisMethod}\n\n`

  return report
}

/**
 * Validate K-1 data
 */
export function validateK1(k1: K1Data): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Verify capital account reconciliation
  const calculatedEnding =
    parseFloat(k1.capitalAccount.beginningCapital) +
    parseFloat(k1.capitalAccount.capitalContributed) +
    parseFloat(k1.capitalAccount.currentYearIncrease) -
    parseFloat(k1.capitalAccount.withdrawals) -
    parseFloat(k1.capitalAccount.distributions)

  const reportedEnding = parseFloat(k1.capitalAccount.endingCapital)

  if (Math.abs(calculatedEnding - reportedEnding) > 0.01) {
    errors.push(
      `Capital account does not reconcile: calculated ${calculatedEnding.toFixed(2)}, reported ${reportedEnding.toFixed(2)}`
    )
  }

  // Verify required fields
  if (!k1.partnershipEIN) errors.push('Partnership EIN required')
  if (!k1.partnerSSN) errors.push('Partner SSN/EIN required')
  if (!k1.partnershipName) errors.push('Partnership name required')
  if (!k1.partnerName) errors.push('Partner name required')

  return {
    valid: errors.length === 0,
    errors,
  }
}
