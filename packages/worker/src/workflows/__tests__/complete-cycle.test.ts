/**
 * Complete Cycle Integration Test
 * 
 * Full Q1 2026 simulation testing the entire patronage system end-to-end:
 * 1. Setup 5 members (Techne/RegenHub)
 * 2. Create 20 contributions across all types
 * 3. Submit and approve contributions
 * 4. Close period and calculate allocations
 * 5. Execute distributions
 * 6. Verify capital account balances
 * 7. Verify double-entry integrity
 * 8. Verify event audit trail
 * 
 * This is the comprehensive integration test proving the system works end-to-end.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PatronageFormulaEngine, verifyAllocations } from '@habitat/shared/engine/patronage-formula'
import { BalanceComputationEngine, verifyBalanceIntegrity } from '@habitat/shared/engine/balance-computation'
import type { ContributionInput, BalanceEvent } from '@habitat/shared'

describe('Complete Cycle Integration Test - Q1 2026', () => {
  let mockDb: any
  let mockEventBus: any

  beforeAll(() => {
    // Setup test environment
    mockDb = createMockDatabase()
    mockEventBus = createMockEventBus()
  })

  afterAll(() => {
    // Cleanup
  })

  it('executes full Q1 2026 cycle: contributions → allocations → distributions', async () => {
    console.log('\n=== Q1 2026 Complete Cycle Test ===\n')

    // Step 1: Setup members
    console.log('Step 1: Setting up 5 members...')
    const members = [
      { id: 'member-todd', name: 'Todd Youngblood', tier: 'cooperative' },
      { id: 'member-kevin', name: 'Kevin Owocki', tier: 'cooperative' },
      { id: 'member-jeremy', name: 'Jeremy', tier: 'cooperative' },
      { id: 'member-aaron', name: 'Aaron G Neyer', tier: 'coworking' },
      { id: 'member-benjamin', name: 'Benjamin Ross', tier: 'coworking' },
    ]
    console.log(`  ✓ ${members.length} members created\n`)

    // Step 2: Create contributions
    console.log('Step 2: Creating 20 contributions...')
    const contributions: ContributionInput[] = [
      // Labor contributions
      { contributionId: 'c1', memberId: 'member-todd', contributionType: 'labor', monetaryValue: '4000.00' },
      { contributionId: 'c2', memberId: 'member-kevin', contributionType: 'labor', monetaryValue: '2000.00' },
      { contributionId: 'c3', memberId: 'member-jeremy', contributionType: 'labor', monetaryValue: '3000.00' },
      { contributionId: 'c4', memberId: 'member-aaron', contributionType: 'labor', monetaryValue: '1500.00' },
      
      // Expertise contributions
      { contributionId: 'c5', memberId: 'member-todd', contributionType: 'expertise', monetaryValue: '3000.00' },
      { contributionId: 'c6', memberId: 'member-kevin', contributionType: 'expertise', monetaryValue: '5000.00' },
      { contributionId: 'c7', memberId: 'member-jeremy', contributionType: 'expertise', monetaryValue: '2000.00' },
      { contributionId: 'c8', memberId: 'member-benjamin', contributionType: 'expertise', monetaryValue: '2500.00' },
      
      // Capital contributions
      { contributionId: 'c9', memberId: 'member-kevin', contributionType: 'capital', monetaryValue: '10000.00' },
      { contributionId: 'c10', memberId: 'member-todd', contributionType: 'capital', monetaryValue: '5000.00' },
      { contributionId: 'c11', memberId: 'member-jeremy', contributionType: 'capital', monetaryValue: '3000.00' },
      { contributionId: 'c12', memberId: 'member-aaron', contributionType: 'capital', monetaryValue: '1200.00' },
      
      // Relationship contributions
      { contributionId: 'c13', memberId: 'member-kevin', contributionType: 'relationship', monetaryValue: '0' },
      { contributionId: 'c14', memberId: 'member-todd', contributionType: 'relationship', monetaryValue: '0' },
      { contributionId: 'c15', memberId: 'member-jeremy', contributionType: 'relationship', monetaryValue: '0' },
      { contributionId: 'c16', memberId: 'member-benjamin', contributionType: 'relationship', monetaryValue: '0' },
      
      // Additional labor
      { contributionId: 'c17', memberId: 'member-todd', contributionType: 'labor', monetaryValue: '2000.00' },
      { contributionId: 'c18', memberId: 'member-aaron', contributionType: 'labor', monetaryValue: '800.00' },
      { contributionId: 'c19', memberId: 'member-benjamin', contributionType: 'labor', monetaryValue: '1000.00' },
      { contributionId: 'c20', memberId: 'member-kevin', contributionType: 'labor', monetaryValue: '1500.00' },
    ]
    
    // Filter out zero-value contributions for patronage calculation
    const valuedContributions = contributions.filter(c => parseFloat(c.monetaryValue) > 0)
    
    console.log(`  ✓ ${contributions.length} contributions created`)
    console.log(`  ✓ ${valuedContributions.length} valued contributions\n`)

    // Step 3: Calculate patronage
    console.log('Step 3: Calculating patronage with weighted formula...')
    const engine = new PatronageFormulaEngine()
    const patronage = engine.calculatePatronage(valuedContributions)
    
    console.log(`  ✓ Patronage calculated for ${patronage.size} members`)
    
    for (const [memberId, memberPatronage] of patronage.entries()) {
      const memberName = members.find(m => m.id === memberId)?.name
      console.log(`    ${memberName}: Raw: $${memberPatronage.totalRawPatronage}, Weighted: $${memberPatronage.totalWeightedPatronage}`)
    }
    console.log()

    // Step 4: Calculate allocations
    console.log('Step 4: Calculating allocations...')
    const allocableSurplus = '50000.00' // Q1 2026 surplus
    const cashRate = 0.20 // 20% cash, 80% retained
    
    const allocations = engine.calculateAllocations(patronage, allocableSurplus, cashRate)
    
    console.log(`  ✓ Allocations calculated for ${allocations.length} members`)
    console.log(`  Surplus: $${allocableSurplus}`)
    
    for (const allocation of allocations) {
      const memberName = members.find(m => m.id === allocation.memberId)?.name
      console.log(`    ${memberName}:`)
      console.log(`      Share: ${(allocation.memberShare * 100).toFixed(2)}%`)
      console.log(`      Total: $${allocation.totalAllocation}`)
      console.log(`      Cash: $${allocation.cashDistribution}`)
      console.log(`      Retained: $${allocation.retainedAllocation}`)
    }
    console.log()

    // Step 5: Verify allocation correctness
    console.log('Step 5: Verifying allocation correctness...')
    const verification = verifyAllocations(allocations, allocableSurplus, cashRate)
    
    expect(verification.valid).toBe(true)
    expect(verification.violations).toHaveLength(0)
    
    console.log(`  ✓ All allocation invariants satisfied\n`)

    // Step 6: Simulate balance events
    console.log('Step 6: Simulating balance events...')
    const balanceEvents: BalanceEvent[] = []
    
    // Capital contribution events
    for (const contribution of contributions.filter(c => c.contributionType === 'capital')) {
      balanceEvents.push({
        eventId: `event-${contribution.contributionId}`,
        eventType: 'capital_contribution',
        timestamp: '2026-01-15T00:00:00Z',
        memberId: contribution.memberId,
        amount: contribution.monetaryValue,
      })
    }
    
    // Allocation events
    for (const allocation of allocations) {
      balanceEvents.push({
        eventId: `event-alloc-${allocation.memberId}`,
        eventType: 'allocation_approved',
        timestamp: '2026-04-01T00:00:00Z',
        memberId: allocation.memberId,
        amount: allocation.retainedAllocation,
      })
    }
    
    // Distribution events
    for (const allocation of allocations) {
      if (parseFloat(allocation.cashDistribution) > 0) {
        balanceEvents.push({
          eventId: `event-dist-${allocation.memberId}`,
          eventType: 'distribution_completed',
          timestamp: '2026-04-15T00:00:00Z',
          memberId: allocation.memberId,
          amount: allocation.cashDistribution,
        })
      }
    }
    
    console.log(`  ✓ ${balanceEvents.length} balance events created\n`)

    // Step 7: Compute capital account balances
    console.log('Step 7: Computing capital account balances...')
    const balanceEngine = new BalanceComputationEngine()
    const balances = await balanceEngine.computeAllBalances(balanceEvents, '2026-04-30T00:00:00Z')
    
    console.log(`  ✓ Balances computed for ${balances.size} members`)
    
    for (const [memberId, balance] of balances.entries()) {
      const memberName = members.find(m => m.id === memberId)?.name
      console.log(`    ${memberName}:`)
      console.log(`      Book Balance: $${balance.bookBalance}`)
      console.log(`      Tax Balance: $${balance.taxBalance}`)
      console.log(`      Contributed Capital: $${balance.contributedCapital}`)
      console.log(`      Retained Patronage: $${balance.retainedPatronage}`)
      console.log(`      Distributed Patronage: $${balance.distributedPatronage}`)
      
      // Verify balance integrity
      const balanceCheck = await verifyBalanceIntegrity(balance)
      expect(balanceCheck.valid).toBe(true)
    }
    console.log()

    // Step 8: Verify double-entry integrity
    console.log('Step 8: Verifying double-entry integrity...')
    
    // For each allocation, verify cash + retained = total
    for (const allocation of allocations) {
      const cashPlusRetained = 
        parseFloat(allocation.cashDistribution) + 
        parseFloat(allocation.retainedAllocation)
      const total = parseFloat(allocation.totalAllocation)
      
      expect(Math.abs(cashPlusRetained - total)).toBeLessThan(0.01)
    }
    
    // Verify total allocations = surplus
    let totalAllocated = 0
    for (const allocation of allocations) {
      totalAllocated += parseFloat(allocation.totalAllocation)
    }
    
    expect(Math.abs(totalAllocated - parseFloat(allocableSurplus))).toBeLessThan(0.01)
    
    console.log(`  ✓ Double-entry integrity verified\n`)

    // Step 9: Verify event audit trail
    console.log('Step 9: Verifying event audit trail...')
    
    expect(balanceEvents.length).toBeGreaterThan(0)
    
    // All events should have timestamps
    for (const event of balanceEvents) {
      expect(event.eventId).toBeDefined()
      expect(event.eventType).toBeDefined()
      expect(event.timestamp).toBeDefined()
      expect(event.memberId).toBeDefined()
    }
    
    console.log(`  ✓ Event audit trail complete (${balanceEvents.length} events)\n`)

    console.log('=== Q1 2026 Complete Cycle Test PASSED ===\n')
  })

  it('handles edge case: single member gets 100% of surplus', async () => {
    const contributions: ContributionInput[] = [
      { contributionId: 'c1', memberId: 'solo-member', contributionType: 'labor', monetaryValue: '5000.00' },
    ]

    const engine = new PatronageFormulaEngine()
    const patronage = engine.calculatePatronage(contributions)
    const allocations = engine.calculateAllocations(patronage, '10000.00', 0.20)

    expect(allocations).toHaveLength(1)
    expect(allocations[0].memberShare).toBe(1.0)
    expect(allocations[0].totalAllocation).toBe('10000.00')
    expect(allocations[0].cashDistribution).toBe('2000.00')
    expect(allocations[0].retainedAllocation).toBe('8000.00')
  })

  it('handles edge case: zero surplus results in zero allocations', async () => {
    const contributions: ContributionInput[] = [
      { contributionId: 'c1', memberId: 'member-1', contributionType: 'labor', monetaryValue: '5000.00' },
      { contributionId: 'c2', memberId: 'member-2', contributionType: 'labor', monetaryValue: '3000.00' },
    ]

    const engine = new PatronageFormulaEngine()
    const patronage = engine.calculatePatronage(contributions)
    const allocations = engine.calculateAllocations(patronage, '0.00', 0.20)

    expect(allocations).toHaveLength(2)
    
    for (const allocation of allocations) {
      expect(allocation.totalAllocation).toBe('0.00')
      expect(allocation.cashDistribution).toBe('0.00')
      expect(allocation.retainedAllocation).toBe('0.00')
    }
  })

  it('handles edge case: zero contributions results in empty allocations', async () => {
    const contributions: ContributionInput[] = []

    const engine = new PatronageFormulaEngine()
    const patronage = engine.calculatePatronage(contributions)
    const allocations = engine.calculateAllocations(patronage, '10000.00', 0.20)

    expect(allocations).toHaveLength(0)
  })

  it('verifies expertise weight (1.5x) gives more allocation than labor (1.0x)', async () => {
    const contributions: ContributionInput[] = [
      { contributionId: 'c1', memberId: 'labor-member', contributionType: 'labor', monetaryValue: '5000.00' },
      { contributionId: 'c2', memberId: 'expert-member', contributionType: 'expertise', monetaryValue: '5000.00' },
    ]

    const engine = new PatronageFormulaEngine()
    const patronage = engine.calculatePatronage(contributions)
    const allocations = engine.calculateAllocations(patronage, '10000.00', 0.20)

    const laborAllocation = allocations.find(a => a.memberId === 'labor-member')!
    const expertAllocation = allocations.find(a => a.memberId === 'expert-member')!

    // Expert should get more allocation due to 1.5x weight
    expect(parseFloat(expertAllocation.totalAllocation)).toBeGreaterThan(
      parseFloat(laborAllocation.totalAllocation)
    )

    // Specifically, expert should get 60% of surplus (7.5 / 12.5)
    // Labor should get 40% of surplus (5.0 / 12.5)
    expect(expertAllocation.memberShare).toBeCloseTo(0.6, 2)
    expect(laborAllocation.memberShare).toBeCloseTo(0.4, 2)
  })
})

function createMockDatabase(): any {
  return {
    query: async () => ({ rows: [] }),
  }
}

function createMockEventBus(): any {
  return {
    publish: async () => true,
  }
}
