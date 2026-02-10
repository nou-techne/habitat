/**
 * People Data Access Tests
 * 
 * Tests CRUD operations for People bounded context
 * Focuses on state machine transitions for contributions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createMember,
  getMember,
  listMembers,
  createContribution,
  submitContribution,
  approveContribution,
  rejectContribution,
  getPatronageSummary,
} from '../people.js'

let mockClient: any

describe('People Data Access', () => {
  beforeAll(() => {
    mockClient = createMockClient()
  })

  afterAll(() => {
    // Cleanup
  })

  describe('Members', () => {
    it('creates a member with required fields', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0001',
        displayName: 'Alice Test',
        ensName: 'alice.habitat.eth',
        tier: 'cooperative',
      })

      expect(member).toBeDefined()
      expect(member.memberNumber).toBe('M0001')
      expect(member.status).toBe('active')
      expect(member.tier).toBe('cooperative')
    })

    it('retrieves member by ID', async () => {
      const created = await createMember(mockClient, {
        memberNumber: 'M0002',
        displayName: 'Bob Test',
        tier: 'coworking',
      })

      const retrieved = await getMember(mockClient, created.memberId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.memberId).toBe(created.memberId)
    })

    it('filters members by status', async () => {
      const activeMembers = await listMembers(mockClient, { status: 'active' })

      expect(Array.isArray(activeMembers)).toBe(true)
      expect(activeMembers.every(m => m.status === 'active')).toBe(true)
    })

    it('filters members by tier', async () => {
      const cooperativeMembers = await listMembers(mockClient, { tier: 'cooperative' })

      expect(cooperativeMembers.every(m => m.tier === 'cooperative')).toBe(true)
    })
  })

  describe('Contributions', () => {
    it('creates a labor contribution', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0003',
        displayName: 'Carol Labor',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0001',
        memberId: member.memberId,
        contributionType: 'labor',
        description: 'Development work on Habitat',
        hours: '40',
        monetaryValue: '4000',
      })

      expect(contribution).toBeDefined()
      expect(contribution.contributionType).toBe('labor')
      expect(contribution.status).toBe('draft')
      expect(contribution.hours).toBe('40')
    })

    it('creates an expertise contribution', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0004',
        displayName: 'David Expert',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0002',
        memberId: member.memberId,
        contributionType: 'expertise',
        description: 'Legal review of operating agreement',
        expertise: 'Legal counsel',
        monetaryValue: '5000',
      })

      expect(contribution.contributionType).toBe('expertise')
      expect(contribution.expertise).toBe('Legal counsel')
    })

    it('creates a capital contribution', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0005',
        displayName: 'Eve Capital',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0003',
        memberId: member.memberId,
        contributionType: 'capital',
        description: 'Seed funding',
        capitalType: 'cash',
        monetaryValue: '10000',
      })

      expect(contribution.contributionType).toBe('capital')
      expect(contribution.capitalType).toBe('cash')
    })

    it('creates a relationship contribution', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0006',
        displayName: 'Frank Network',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0004',
        memberId: member.memberId,
        contributionType: 'relationship',
        description: 'Introduction to potential partner',
        relationshipType: 'partnership',
      })

      expect(contribution.contributionType).toBe('relationship')
      expect(contribution.relationshipType).toBe('partnership')
    })
  })

  describe('Contribution State Machine', () => {
    it('transitions from draft to submitted', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0007',
        displayName: 'Grace State',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0005',
        memberId: member.memberId,
        contributionType: 'labor',
        description: 'Test contribution',
        hours: '10',
      })

      expect(contribution.status).toBe('draft')

      const submitted = await submitContribution(mockClient, contribution.contributionId)

      expect(submitted.status).toBe('submitted')
      expect(submitted.submittedAt).toBeDefined()
    })

    it('approves a submitted contribution', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0008',
        displayName: 'Hank Approve',
        tier: 'cooperative',
      })

      const approver = await createMember(mockClient, {
        memberNumber: 'M0009',
        displayName: 'Iris Steward',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0006',
        memberId: member.memberId,
        contributionType: 'labor',
        description: 'Work to approve',
        hours: '20',
      })

      await submitContribution(mockClient, contribution.contributionId)

      const approved = await approveContribution(
        mockClient,
        contribution.contributionId,
        approver.memberId,
        'Looks good!'
      )

      expect(approved.status).toBe('approved')
      expect(approved.reviewedAt).toBeDefined()
    })

    it('rejects a submitted contribution with reason', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0010',
        displayName: 'Jack Reject',
        tier: 'cooperative',
      })

      const approver = await createMember(mockClient, {
        memberNumber: 'M0011',
        displayName: 'Kate Steward',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0007',
        memberId: member.memberId,
        contributionType: 'labor',
        description: 'Work to reject',
        hours: '5',
      })

      await submitContribution(mockClient, contribution.contributionId)

      const rejected = await rejectContribution(
        mockClient,
        contribution.contributionId,
        approver.memberId,
        'Insufficient evidence provided'
      )

      expect(rejected.status).toBe('rejected')
      expect(rejected.reviewedAt).toBeDefined()
    })

    it('prevents approving a draft contribution', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0012',
        displayName: 'Leo Draft',
        tier: 'cooperative',
      })

      const approver = await createMember(mockClient, {
        memberNumber: 'M0013',
        displayName: 'Mia Steward',
        tier: 'cooperative',
      })

      const contribution = await createContribution(mockClient, {
        contributionNumber: 'C0008',
        memberId: member.memberId,
        contributionType: 'labor',
        description: 'Still a draft',
        hours: '10',
      })

      // Should not be able to approve a draft
      await expect(
        approveContribution(mockClient, contribution.contributionId, approver.memberId)
      ).rejects.toThrow()
    })
  })

  describe('Patronage', () => {
    it('computes patronage summary', async () => {
      const member = await createMember(mockClient, {
        memberNumber: 'M0014',
        displayName: 'Nina Patronage',
        tier: 'cooperative',
      })

      const summary = await getPatronageSummary(mockClient, member.memberId)

      expect(summary).toBeDefined()
      expect(summary?.memberId).toBe(member.memberId)
      expect(Array.isArray(summary?.byType)).toBe(true)
    })
  })
})

function createMockClient(): any {
  return {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    }),
  }
}
