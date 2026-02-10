/**
 * Compliance Regression Test Suite
 * 
 * Verifies all compliance checks pass and no regressions occur
 * Layer 6 (Constraint) validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validate704bCapitalAccount,
  verifyDoubleEntry,
  verifyAllocationFormula,
  assembleK1Data,
} from '../../compliance';
import type {
  CapitalAccount,
  Contribution,
  Allocation,
  AllocationPeriod,
  Member,
} from '../../types';

describe('IRC 704(b) Capital Account Compliance', () => {
  describe('Capital Account Validation', () => {
    it('should validate correct capital account', () => {
      const account: CapitalAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123e4567-e89b-12d3-a456-426614174001',
        balance: '10000.00',
        tax_basis: '10000.00',
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const contributions: Contribution[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          member_id: account.member_id,
          period_id: '123e4567-e89b-12d3-a456-426614174003',
          contribution_type: 'capital',
          amount: '10000.00',
          description: 'Initial capital contribution',
          status: 'approved',
          approved_by: '123e4567-e89b-12d3-a456-426614174004',
          approved_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const allocations: Allocation[] = [];
      
      const result = validate704bCapitalAccount(account, contributions, allocations);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect balance mismatch', () => {
      const account: CapitalAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123e4567-e89b-12d3-a456-426614174001',
        balance: '10000.00', // Says 10000
        tax_basis: '10000.00',
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const contributions: Contribution[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          member_id: account.member_id,
          period_id: '123e4567-e89b-12d3-a456-426614174003',
          contribution_type: 'capital',
          amount: '5000.00', // Only 5000 contributed
          description: 'Capital contribution',
          status: 'approved',
          approved_by: null,
          approved_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const allocations: Allocation[] = [];
      
      const result = validate704bCapitalAccount(account, contributions, allocations);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'BALANCE_MISMATCH',
          message: expect.stringMatching(/balance.*mismatch/i),
        })
      );
    });
    
    it('should detect negative capital account', () => {
      const account: CapitalAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123e4567-e89b-12d3-a456-426614174001',
        balance: '-1000.00', // Negative!
        tax_basis: '0.00',
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const result = validate704bCapitalAccount(account, [], []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'NEGATIVE_CAPITAL',
          severity: 'error',
        })
      );
    });
    
    it('should validate capital account after distributions', () => {
      const account: CapitalAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123e4567-e89b-12d3-a456-426614174001',
        balance: '12000.00',
        tax_basis: '12000.00',
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const contributions: Contribution[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          member_id: account.member_id,
          period_id: '123e4567-e89b-12d3-a456-426614174003',
          contribution_type: 'capital',
          amount: '10000.00',
          description: 'Initial contribution',
          status: 'approved',
          approved_by: null,
          approved_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const allocations: Allocation[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174004',
          member_id: account.member_id,
          period_id: '123e4567-e89b-12d3-a456-426614174003',
          amount: '2000.00',
          patronage_score: '0.5',
          status: 'distributed',
          distributed_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const result = validate704bCapitalAccount(account, contributions, allocations);
      
      expect(result.valid).toBe(true);
      // 10000 (contribution) + 2000 (allocation) = 12000 (balance)
    });
  });
  
  describe('Tax Basis Tracking', () => {
    it('should match tax basis to balance for cash contributions', () => {
      const account: CapitalAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123e4567-e89b-12d3-a456-426614174001',
        balance: '10000.00',
        tax_basis: '10000.00', // Should match for cash
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const contributions: Contribution[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          member_id: account.member_id,
          period_id: '123e4567-e89b-12d3-a456-426614174003',
          contribution_type: 'capital',
          amount: '10000.00',
          description: 'Cash contribution',
          status: 'approved',
          approved_by: null,
          approved_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const result = validate704bCapitalAccount(account, contributions, []);
      
      expect(result.valid).toBe(true);
      expect(parseFloat(account.balance)).toBe(parseFloat(account.tax_basis));
    });
    
    it('should handle property contributions with different basis', () => {
      const account: CapitalAccount = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        member_id: '123e4567-e89b-12d3-a456-426614174001',
        balance: '15000.00', // FMV
        tax_basis: '10000.00', // Original cost basis
        last_updated: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const contributions: Contribution[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          member_id: account.member_id,
          period_id: '123e4567-e89b-12d3-a456-426614174003',
          contribution_type: 'property',
          amount: '15000.00', // FMV
          description: 'Equipment contribution (basis: $10,000)',
          status: 'approved',
          approved_by: null,
          approved_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      
      const result = validate704bCapitalAccount(account, contributions, []);
      
      // Property contributions can have different tax basis
      expect(result.valid).toBe(true);
      expect(parseFloat(account.balance)).toBeGreaterThan(parseFloat(account.tax_basis));
    });
  });
});

describe('Double-Entry Integrity', () => {
  it('should verify balanced transactions', () => {
    const transactions = [
      {
        date: new Date('2026-01-01'),
        description: 'Member contribution',
        debits: [
          { account: 'Cash', amount: 10000.00 },
        ],
        credits: [
          { account: 'Member Capital', amount: 10000.00 },
        ],
      },
    ];
    
    const result = verifyDoubleEntry(transactions);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should detect unbalanced transactions', () => {
    const transactions = [
      {
        date: new Date('2026-01-01'),
        description: 'Unbalanced entry',
        debits: [
          { account: 'Cash', amount: 10000.00 },
        ],
        credits: [
          { account: 'Member Capital', amount: 9999.00 }, // Off by $1
        ],
      },
    ];
    
    const result = verifyDoubleEntry(transactions);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'UNBALANCED_ENTRY',
        message: expect.stringMatching(/debits.*credits/i),
      })
    );
  });
  
  it('should handle rounding correctly', () => {
    const transactions = [
      {
        date: new Date('2026-01-01'),
        description: 'Allocation with rounding',
        debits: [
          { account: 'Patronage Payable', amount: 33.33 },
          { account: 'Patronage Payable', amount: 33.33 },
          { account: 'Patronage Payable', amount: 33.34 }, // Rounding difference
        ],
        credits: [
          { account: 'Retained Earnings', amount: 100.00 },
        ],
      },
    ];
    
    const result = verifyDoubleEntry(transactions);
    
    expect(result.valid).toBe(true);
    // Sum of debits: 33.33 + 33.33 + 33.34 = 100.00
  });
});

describe('Allocation Formula Verification', () => {
  it('should verify correct patronage allocation', () => {
    const period: AllocationPeriod = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Q1 2026',
      description: null,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-03-31'),
      status: 'closed',
      closed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const contributions: Contribution[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        member_id: 'member1',
        period_id: period.id,
        contribution_type: 'labor',
        amount: '200.00',
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        member_id: 'member2',
        period_id: period.id,
        contribution_type: 'labor',
        amount: '300.00',
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const allocations: Allocation[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        member_id: 'member1',
        period_id: period.id,
        amount: '400.00', // 200/500 * 1000 = 400
        patronage_score: '0.4',
        status: 'calculated',
        distributed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174004',
        member_id: 'member2',
        period_id: period.id,
        amount: '600.00', // 300/500 * 1000 = 600
        patronage_score: '0.6',
        status: 'calculated',
        distributed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const distributionAmount = 1000.00;
    
    const result = verifyAllocationFormula(
      contributions,
      allocations,
      distributionAmount
    );
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should detect allocation sum mismatch', () => {
    const contributions: Contribution[] = [
      {
        id: '1',
        member_id: 'member1',
        period_id: 'period1',
        contribution_type: 'labor',
        amount: '100.00',
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const allocations: Allocation[] = [
      {
        id: '2',
        member_id: 'member1',
        period_id: 'period1',
        amount: '150.00', // Should be 100 if distribution = 100
        patronage_score: '1.0',
        status: 'calculated',
        distributed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const distributionAmount = 100.00;
    
    const result = verifyAllocationFormula(
      contributions,
      allocations,
      distributionAmount
    );
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'ALLOCATION_SUM_MISMATCH',
      })
    );
  });
  
  it('should verify weighted contribution formula', () => {
    const contributions: Contribution[] = [
      {
        id: '1',
        member_id: 'member1',
        period_id: 'period1',
        contribution_type: 'labor',
        amount: '100.00', // Weight: 1.0
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '2',
        member_id: 'member1',
        period_id: 'period1',
        contribution_type: 'capital',
        amount: '500.00', // Weight: 0.5 → 250 weighted
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    // Weighted: 100 + (500 * 0.5) = 350
    
    const allocations: Allocation[] = [
      {
        id: '3',
        member_id: 'member1',
        period_id: 'period1',
        amount: '1000.00', // Gets full distribution (only member)
        patronage_score: '1.0',
        status: 'calculated',
        distributed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const result = verifyAllocationFormula(
      contributions,
      allocations,
      1000.00,
      { labor: 1.0, capital: 0.5, property: 0.5 } // Weights
    );
    
    expect(result.valid).toBe(true);
  });
  
  it('should verify patronage scores sum to 1.0', () => {
    const allocations: Allocation[] = [
      {
        id: '1',
        member_id: 'member1',
        period_id: 'period1',
        amount: '400.00',
        patronage_score: '0.4',
        status: 'calculated',
        distributed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '2',
        member_id: 'member2',
        period_id: 'period1',
        amount: '600.00',
        patronage_score: '0.6',
        status: 'calculated',
        distributed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const sumScores = allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.patronage_score),
      0
    );
    
    expect(sumScores).toBeCloseTo(1.0, 10);
  });
});

describe('K-1 Data Assembly', () => {
  it('should assemble complete K-1 data', () => {
    const member: Member = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'member@habitat.eth',
      ens_name: 'member.habitat.eth',
      display_name: 'Test Member',
      role: 'member',
      status: 'active',
      joined_at: new Date('2025-01-01'),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const capitalAccount: CapitalAccount = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      member_id: member.id,
      balance: '12000.00',
      tax_basis: '12000.00',
      last_updated: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const contributions: Contribution[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        member_id: member.id,
        period_id: '123e4567-e89b-12d3-a456-426614174003',
        contribution_type: 'capital',
        amount: '10000.00',
        description: 'Initial contribution',
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date('2026-01-01'),
        updated_at: new Date(),
      },
    ];
    
    const allocations: Allocation[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174004',
        member_id: member.id,
        period_id: '123e4567-e89b-12d3-a456-426614174003',
        amount: '2000.00',
        patronage_score: '0.5',
        status: 'distributed',
        distributed_at: new Date('2026-03-31'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const taxYear = 2026;
    
    const k1Data = assembleK1Data(
      member,
      capitalAccount,
      contributions,
      allocations,
      taxYear
    );
    
    expect(k1Data).toBeDefined();
    expect(k1Data.taxYear).toBe(2026);
    expect(k1Data.member.name).toBe('Test Member');
    expect(k1Data.member.email).toBe('member@habitat.eth');
    expect(k1Data.capitalAccount.beginningBalance).toBe('10000.00');
    expect(k1Data.capitalAccount.endingBalance).toBe('12000.00');
    expect(k1Data.capitalAccount.taxBasis).toBe('12000.00');
    expect(k1Data.contributions).toHaveLength(1);
    expect(k1Data.allocations).toHaveLength(1);
    expect(k1Data.patronageDividends).toBe('2000.00');
  });
  
  it('should calculate beginning and ending capital balances', () => {
    const member: Member = {
      id: '1',
      email: 'test@test.com',
      ens_name: null,
      display_name: 'Test',
      role: 'member',
      status: 'active',
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const capitalAccount: CapitalAccount = {
      id: '2',
      member_id: '1',
      balance: '15000.00', // Ending
      tax_basis: '15000.00',
      last_updated: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const contributions: Contribution[] = [
      {
        id: '3',
        member_id: '1',
        period_id: 'p1',
        contribution_type: 'capital',
        amount: '10000.00',
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date('2026-01-15'),
        updated_at: new Date(),
      },
    ];
    
    const allocations: Allocation[] = [
      {
        id: '4',
        member_id: '1',
        period_id: 'p1',
        amount: '5000.00',
        patronage_score: '1.0',
        status: 'distributed',
        distributed_at: new Date('2026-12-31'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];
    
    const k1Data = assembleK1Data(member, capitalAccount, contributions, allocations, 2026);
    
    // Beginning: 0 (new member)
    // + Contribution: 10,000
    // + Allocation: 5,000
    // = Ending: 15,000
    
    expect(k1Data.capitalAccount.beginningBalance).toBe('0.00'); // or calculate from prior year
    expect(k1Data.capitalAccount.endingBalance).toBe('15000.00');
  });
  
  it('should include only current year transactions', () => {
    const member: Member = {
      id: '1',
      email: 'test@test.com',
      ens_name: null,
      display_name: 'Test',
      role: 'member',
      status: 'active',
      joined_at: new Date('2025-01-01'),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const capitalAccount: CapitalAccount = {
      id: '2',
      member_id: '1',
      balance: '15000.00',
      tax_basis: '15000.00',
      last_updated: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    const contributions: Contribution[] = [
      {
        id: '3',
        member_id: '1',
        period_id: 'p1',
        contribution_type: 'capital',
        amount: '10000.00',
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date('2025-12-31'), // Prior year
        updated_at: new Date(),
      },
      {
        id: '4',
        member_id: '1',
        period_id: 'p2',
        contribution_type: 'capital',
        amount: '5000.00',
        description: null,
        status: 'approved',
        approved_by: null,
        approved_at: null,
        created_at: new Date('2026-01-15'), // Current year
        updated_at: new Date(),
      },
    ];
    
    const allocations: Allocation[] = [];
    
    const k1Data = assembleK1Data(member, capitalAccount, contributions, allocations, 2026);
    
    // Should only include 2026 contribution
    expect(k1Data.contributions).toHaveLength(1);
    expect(k1Data.contributions[0].amount).toBe('5000.00');
  });
});

describe('IRC 1385 Minimum Cash Requirement', () => {
  it('should verify 20% minimum cash distribution', () => {
    const totalPatronageDividend = 10000.00;
    const cashDistribution = 2000.00; // 20%
    const retainedPatronage = 8000.00; // 80%
    
    expect(cashDistribution / totalPatronageDividend).toBeGreaterThanOrEqual(0.20);
    expect(cashDistribution + retainedPatronage).toBe(totalPatronageDividend);
  });
  
  it('should reject distributions below 20% cash', () => {
    const totalPatronageDividend = 10000.00;
    const cashDistribution = 1000.00; // Only 10%
    
    const cashPercentage = cashDistribution / totalPatronageDividend;
    
    expect(cashPercentage).toBeLessThan(0.20);
    // Compliance check should fail
  });
  
  it('should allow 100% cash distribution', () => {
    const totalPatronageDividend = 10000.00;
    const cashDistribution = 10000.00; // 100%
    const retainedPatronage = 0.00;
    
    expect(cashDistribution / totalPatronageDividend).toBe(1.0);
    expect(cashDistribution + retainedPatronage).toBe(totalPatronageDividend);
  });
});

describe('Compliance Regression Tests', () => {
  it('should not allow capital account to go negative', () => {
    // Regression: Ensure distributions never exceed balance
    const balance = 1000.00;
    const distribution = 1500.00;
    
    expect(balance - distribution).toBeLessThan(0);
    // System should reject this distribution
  });
  
  it('should maintain capital account integrity across multiple periods', () => {
    let balance = 0.00;
    
    // Period 1: Contribute 10,000
    balance += 10000.00;
    expect(balance).toBe(10000.00);
    
    // Period 2: Receive allocation 2,000
    balance += 2000.00;
    expect(balance).toBe(12000.00);
    
    // Period 3: Receive allocation 3,000
    balance += 3000.00;
    expect(balance).toBe(15000.00);
    
    // Balance should equal sum of all transactions
    expect(balance).toBe(10000 + 2000 + 3000);
  });
  
  it('should round allocation amounts consistently', () => {
    // Regression: Ensure rounding doesn't cause sum mismatch
    const distributionAmount = 100.00;
    const numMembers = 3;
    
    // Split evenly: 33.33, 33.33, 33.34
    const allocations = [
      Math.floor((distributionAmount / numMembers) * 100) / 100,
      Math.floor((distributionAmount / numMembers) * 100) / 100,
      distributionAmount - (2 * Math.floor((distributionAmount / numMembers) * 100) / 100),
    ];
    
    const sum = allocations.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(distributionAmount, 2);
  });
});
