/**
 * Agreements Resolvers
 * 
 * GraphQL resolvers for Agreements bounded context
 * Handles allocations, distributions, capital accounts, and period close workflow
 */

import type { GraphQLResolveInfo } from 'graphql'
import {
  createAllocation,
  proposeAllocation as proposeAllocationData,
  approveAllocation as approveAllocationData,
  getAllocation,
  listAllocations,
  createDistribution,
  completeDistribution as completeDistributionData,
  getDistribution,
  listDistributions,
  getCapitalAccount as getCapitalAccountData,
  updateCapitalAccount,
  getAllocationSummary as getAllocationSummaryData,
} from '../../data/agreements.js'
import { getPeriod } from '../../data/treasury.js'
import { getMember } from '../../data/people.js'
import type { DatabaseClient } from '../../db/client.js'
import type {
  Allocation,
  Distribution,
  CapitalAccount,
  AllocationSummary,
  AllocationStatus,
  DistributionStatus,
  DistributionMethod,
  Member,
  Period,
} from '@habitat/shared'

export interface Context {
  db: DatabaseClient
  user?: {
    userId: string
    memberId?: string
    role: string
  }
}

// ============================================================================
// Query Resolvers
// ============================================================================

export const Query = {
  /**
   * Get a single allocation by ID
   */
  async allocation(
    _parent: unknown,
    args: { allocationId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Allocation | null> {
    const allocation = await getAllocation(context.db, args.allocationId)

    // Privacy: members can only see their own allocations unless steward
    if (
      allocation &&
      allocation.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      return null
    }

    return allocation
  },

  /**
   * List allocations with optional filters and pagination
   */
  async allocations(
    _parent: unknown,
    args: {
      filter?: {
        periodId?: string
        memberId?: string
        status?: AllocationStatus
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Allocation; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    const limit = Math.min(args.first || 50, 200)

    // Non-stewards can only see their own allocations
    const filter = { ...args.filter }
    if (!['steward', 'admin'].includes(context.user?.role || '')) {
      filter.memberId = context.user?.memberId
    }

    const allocations = await listAllocations(context.db, {
      ...filter,
      limit: limit + 1,
    })

    const hasNextPage = allocations.length > limit
    const nodes = hasNextPage ? allocations.slice(0, limit) : allocations

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`allocation:${index}`).toString('base64'),
    }))

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount: nodes.length,
    }
  },

  /**
   * Get proposed allocations (proposed status, awaiting approval)
   */
  async proposedAllocations(
    _parent: unknown,
    args: {
      periodId: string
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Allocation; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    // Auth check: only stewards can see proposed allocations
    if (!['steward', 'admin'].includes(context.user?.role || '')) {
      throw new Error('Unauthorized: viewing proposed allocations requires steward role')
    }

    const limit = Math.min(args.first || 50, 200)

    const allocations = await listAllocations(context.db, {
      periodId: args.periodId,
      status: 'proposed' as AllocationStatus,
      limit: limit + 1,
    })

    const hasNextPage = allocations.length > limit
    const nodes = hasNextPage ? allocations.slice(0, limit) : allocations

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`allocation:${index}`).toString('base64'),
    }))

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount: nodes.length,
    }
  },

  /**
   * Get a single distribution by ID
   */
  async distribution(
    _parent: unknown,
    args: { distributionId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Distribution | null> {
    const distribution = await getDistribution(context.db, args.distributionId)

    // Privacy: members can only see their own distributions
    if (
      distribution &&
      distribution.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      return null
    }

    return distribution
  },

  /**
   * List distributions with optional filters and pagination
   */
  async distributions(
    _parent: unknown,
    args: {
      filter?: {
        allocationId?: string
        memberId?: string
        status?: DistributionStatus
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Distribution; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
  }> {
    const limit = Math.min(args.first || 50, 200)

    // Non-stewards can only see their own distributions
    const filter = { ...args.filter }
    if (!['steward', 'admin'].includes(context.user?.role || '')) {
      filter.memberId = context.user?.memberId
    }

    const distributions = await listDistributions(context.db, {
      ...filter,
      limit: limit + 1,
    })

    const hasNextPage = distributions.length > limit
    const nodes = hasNextPage ? distributions.slice(0, limit) : distributions

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`distribution:${index}`).toString('base64'),
    }))

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
    }
  },

  /**
   * Get capital account for a member
   */
  async capitalAccount(
    _parent: unknown,
    args: { memberId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<CapitalAccount | null> {
    // Privacy: members can only see their own capital accounts
    if (
      args.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      throw new Error('Unauthorized: can only view your own capital account')
    }

    return getCapitalAccountData(context.db, args.memberId)
  },

  /**
   * Get allocation summary for a period
   */
  async allocationSummary(
    _parent: unknown,
    args: { periodId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<AllocationSummary | null> {
    // Auth check: only stewards can see allocation summaries
    if (!['steward', 'admin'].includes(context.user?.role || '')) {
      throw new Error('Unauthorized: viewing allocation summaries requires steward role')
    }

    return getAllocationSummaryData(context.db, args.periodId)
  },
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

export const Mutation = {
  /**
   * Propose an allocation (draft → proposed)
   */
  async proposeAllocation(
    _parent: unknown,
    args: { allocationId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Allocation> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: proposing allocations requires steward role')
    }

    const allocation = await getAllocation(context.db, args.allocationId)
    if (!allocation) {
      throw new Error('Allocation not found')
    }

    // Business rule: can only propose draft allocations
    if (allocation.status !== 'draft') {
      throw new Error(`Cannot propose allocation in ${allocation.status} status`)
    }

    return proposeAllocationData(context.db, args.allocationId)
  },

  /**
   * Approve an allocation (proposed → approved)
   */
  async approveAllocation(
    _parent: unknown,
    args: { allocationId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Allocation> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: approving allocations requires steward role')
    }

    const allocation = await getAllocation(context.db, args.allocationId)
    if (!allocation) {
      throw new Error('Allocation not found')
    }

    // Business rule: can only approve proposed allocations
    if (allocation.status !== 'proposed') {
      throw new Error(`Cannot approve allocation in ${allocation.status} status`)
    }

    // Business rule: cannot approve your own allocation
    if (allocation.memberId === context.user.memberId) {
      throw new Error('Cannot approve your own allocation')
    }

    return approveAllocationData(context.db, args.allocationId, context.user.memberId!)
  },

  /**
   * Schedule a distribution
   */
  async scheduleDistribution(
    _parent: unknown,
    args: {
      distributionId: string
      scheduledDate: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Distribution> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: scheduling distributions requires steward role')
    }

    const distribution = await getDistribution(context.db, args.distributionId)
    if (!distribution) {
      throw new Error('Distribution not found')
    }

    // Business rule: can only schedule distributions in scheduled status
    if (distribution.status !== 'scheduled') {
      throw new Error(`Cannot reschedule distribution in ${distribution.status} status`)
    }

    // Update scheduled date (in real implementation, would be dedicated function)
    return { ...distribution, scheduledDate: args.scheduledDate }
  },

  /**
   * Complete a distribution
   */
  async completeDistribution(
    _parent: unknown,
    args: {
      distributionId: string
      transactionId?: string
      paymentReference?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Distribution> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: completing distributions requires steward role')
    }

    const distribution = await getDistribution(context.db, args.distributionId)
    if (!distribution) {
      throw new Error('Distribution not found')
    }

    // Business rule: can only complete scheduled or processing distributions
    if (!['scheduled', 'processing'].includes(distribution.status)) {
      throw new Error(`Cannot complete distribution in ${distribution.status} status`)
    }

    return completeDistributionData(
      context.db,
      args.distributionId,
      args.transactionId,
      args.paymentReference
    )
  },

  /**
   * Initiate period close workflow
   * Creates draft allocations for all members with approved contributions
   */
  async initiatePeriodClose(
    _parent: unknown,
    args: { periodId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{ allocations: Allocation[]; summary: AllocationSummary }> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: period close requires steward role')
    }

    const period = await getPeriod(context.db, args.periodId)
    if (!period) {
      throw new Error('Period not found')
    }

    // Business rule: period must be open
    if (period.status !== 'open') {
      throw new Error(`Cannot close period in ${period.status} status`)
    }

    // Business rule: check for pending contributions
    // (In real implementation, query contributions table)
    
    // Placeholder: actual implementation would:
    // 1. Compute patronage weights for the period
    // 2. Calculate allocations for each member
    // 3. Apply cash/retained split
    // 4. Create draft allocations
    // 5. Generate allocation summary

    throw new Error('Period close workflow not yet implemented (placeholder)')
  },

  /**
   * Approve all allocations for a period
   * Bulk approval operation for governance
   */
  async approveAllocations(
    _parent: unknown,
    args: { periodId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{ count: number; allocations: Allocation[] }> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: approving allocations requires steward role')
    }

    const proposedAllocations = await listAllocations(context.db, {
      periodId: args.periodId,
      status: 'proposed' as AllocationStatus,
    })

    // Business rule: cannot approve your own allocations
    const allocationsToApprove = proposedAllocations.filter(
      a => a.memberId !== context.user?.memberId
    )

    if (allocationsToApprove.length !== proposedAllocations.length) {
      throw new Error('Cannot approve allocations that include your own')
    }

    // Approve all
    const approved: Allocation[] = []
    for (const allocation of allocationsToApprove) {
      const result = await approveAllocationData(
        context.db,
        allocation.allocationId,
        context.user.memberId!
      )
      approved.push(result)
    }

    return {
      count: approved.length,
      allocations: approved,
    }
  },
}

// ============================================================================
// Field Resolvers
// ============================================================================

export const Allocation = {
  /**
   * Resolve member for an allocation
   */
  async member(parent: Allocation, _args: unknown, context: Context): Promise<Member | null> {
    return getMember(context.db, parent.memberId)
  },

  /**
   * Resolve period for an allocation
   */
  async period(parent: Allocation, _args: unknown, context: Context): Promise<Period | null> {
    return getPeriod(context.db, parent.periodId)
  },
}

export const Distribution = {
  /**
   * Resolve allocation for a distribution
   */
  async allocation(
    parent: Distribution,
    _args: unknown,
    context: Context
  ): Promise<Allocation | null> {
    return getAllocation(context.db, parent.allocationId)
  },

  /**
   * Resolve member for a distribution
   */
  async member(parent: Distribution, _args: unknown, context: Context): Promise<Member | null> {
    return getMember(context.db, parent.memberId)
  },
}

export const CapitalAccount = {
  /**
   * Resolve member for a capital account
   */
  async member(
    parent: CapitalAccount,
    _args: unknown,
    context: Context
  ): Promise<Member | null> {
    return getMember(context.db, parent.memberId)
  },
}

export const AllocationSummary = {
  /**
   * Resolve period for an allocation summary
   */
  async period(
    parent: AllocationSummary,
    _args: unknown,
    context: Context
  ): Promise<Period | null> {
    return getPeriod(context.db, parent.periodId)
  },
}

// ============================================================================
// Export Combined Resolvers
// ============================================================================

export const agreementsResolvers = {
  Query,
  Mutation,
  Allocation,
  Distribution,
  CapitalAccount,
  AllocationSummary,
}
