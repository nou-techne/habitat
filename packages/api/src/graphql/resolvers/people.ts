/**
 * People Resolvers
 * 
 * GraphQL resolvers for People bounded context
 * Handles members, contributions, approvals, and patronage
 */

import type { GraphQLResolveInfo } from 'graphql'
import {
  createMember,
  getMember,
  listMembers,
  createContribution,
  submitContribution as submitContributionData,
  approveContribution as approveContributionData,
  rejectContribution as rejectContributionData,
  getContribution,
  listContributions,
  getApproval,
  listApprovals,
  getPatronageSummary as getPatronageSummaryData,
} from '../../data/people.js'
import type { DatabaseClient } from '../../db/client.js'
import type {
  Member,
  Contribution,
  Approval,
  PatronageSummary,
  MemberTier,
  MemberStatus,
  ContributionType,
  ContributionStatus,
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
   * Get a single member by ID
   */
  async member(
    _parent: unknown,
    args: { memberId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Member | null> {
    return getMember(context.db, args.memberId)
  },

  /**
   * List members with optional filters and pagination
   */
  async members(
    _parent: unknown,
    args: {
      filter?: {
        tier?: MemberTier
        status?: MemberStatus
        search?: string
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Member; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    const limit = Math.min(args.first || 50, 200)

    const members = await listMembers(context.db, {
      ...args.filter,
      limit: limit + 1,
    })

    const hasNextPage = members.length > limit
    const nodes = hasNextPage ? members.slice(0, limit) : members

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`member:${index}`).toString('base64'),
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
   * Get a single contribution by ID
   */
  async contribution(
    _parent: unknown,
    args: { contributionId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Contribution | null> {
    const contribution = await getContribution(context.db, args.contributionId)

    // Auth check: members can only see their own draft contributions
    if (
      contribution &&
      contribution.status === 'draft' &&
      contribution.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      return null
    }

    return contribution
  },

  /**
   * List contributions with optional filters and pagination
   */
  async contributions(
    _parent: unknown,
    args: {
      filter?: {
        memberId?: string
        contributionType?: ContributionType
        status?: ContributionStatus
        fromDate?: string
        toDate?: string
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Contribution; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    const limit = Math.min(args.first || 50, 200)

    // Non-stewards can only see their own contributions
    const filter = { ...args.filter }
    if (!['steward', 'admin'].includes(context.user?.role || '')) {
      filter.memberId = context.user?.memberId
    }

    const contributions = await listContributions(context.db, {
      ...filter,
      limit: limit + 1,
    })

    const hasNextPage = contributions.length > limit
    const nodes = hasNextPage ? contributions.slice(0, limit) : contributions

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`contribution:${index}`).toString('base64'),
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
   * Get pending contributions (submitted, not yet approved/rejected)
   */
  async pendingContributions(
    _parent: unknown,
    args: {
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Contribution; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    // Auth check: only stewards can see pending contributions
    if (!['steward', 'admin'].includes(context.user?.role || '')) {
      throw new Error('Unauthorized: viewing pending contributions requires steward role')
    }

    const limit = Math.min(args.first || 50, 200)

    const contributions = await listContributions(context.db, {
      status: 'submitted' as ContributionStatus,
      limit: limit + 1,
    })

    const hasNextPage = contributions.length > limit
    const nodes = hasNextPage ? contributions.slice(0, limit) : contributions

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`contribution:${index}`).toString('base64'),
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
   * Get patronage summary for a member
   */
  async patronageSummary(
    _parent: unknown,
    args: { memberId: string; periodId?: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<PatronageSummary | null> {
    // Auth check: members can only see their own patronage
    if (
      args.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      throw new Error('Unauthorized: can only view your own patronage summary')
    }

    return getPatronageSummaryData(context.db, args.memberId, args.periodId)
  },

  /**
   * Get approval history for a contribution
   */
  async approvalHistory(
    _parent: unknown,
    args: { contributionId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Approval[]> {
    // Verify contribution exists and user has access
    const contribution = await getContribution(context.db, args.contributionId)
    if (!contribution) {
      throw new Error('Contribution not found')
    }

    if (
      contribution.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      throw new Error('Unauthorized: can only view approval history for your own contributions')
    }

    return listApprovals(context.db, { contributionId: args.contributionId })
  },
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

export const Mutation = {
  /**
   * Create a new member
   */
  async createMember(
    _parent: unknown,
    args: {
      input: {
        memberNumber: string
        ensName?: string
        displayName: string
        tier: MemberTier
        metadata?: Record<string, unknown>
      }
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Member> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: member creation requires steward role')
    }

    return createMember(context.db, args.input)
  },

  /**
   * Create a new contribution (draft status)
   */
  async createContribution(
    _parent: unknown,
    args: {
      input: {
        contributionNumber: string
        memberId: string
        contributionType: ContributionType
        description: string
        hours?: string
        ratePerHour?: string
        expertise?: string
        capitalType?: string
        relationshipType?: string
        monetaryValue?: string
        evidenceUrls?: string[]
        metadata?: Record<string, unknown>
      }
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Contribution> {
    // Auth check: members can only create their own contributions
    if (
      args.input.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      throw new Error('Unauthorized: can only create contributions for yourself')
    }

    // Business rule: validate type-specific required fields
    const { contributionType, hours, expertise, capitalType, relationshipType } = args.input

    if (contributionType === 'labor' && !hours) {
      throw new Error('Labor contributions require hours')
    }

    if (contributionType === 'expertise' && !expertise) {
      throw new Error('Expertise contributions require expertise field')
    }

    if (contributionType === 'capital' && !capitalType) {
      throw new Error('Capital contributions require capitalType')
    }

    if (contributionType === 'relationship' && !relationshipType) {
      throw new Error('Relationship contributions require relationshipType')
    }

    return createContribution(context.db, args.input)
  },

  /**
   * Submit a draft contribution for review
   */
  async submitContribution(
    _parent: unknown,
    args: { contributionId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Contribution> {
    const contribution = await getContribution(context.db, args.contributionId)
    if (!contribution) {
      throw new Error('Contribution not found')
    }

    // Auth check: members can only submit their own contributions
    if (
      contribution.memberId !== context.user?.memberId &&
      !['steward', 'admin'].includes(context.user?.role || '')
    ) {
      throw new Error('Unauthorized: can only submit your own contributions')
    }

    // Business rule: can only submit draft contributions
    if (contribution.status !== 'draft') {
      throw new Error(`Cannot submit contribution in ${contribution.status} status`)
    }

    return submitContributionData(context.db, args.contributionId)
  },

  /**
   * Approve a submitted contribution
   */
  async approveContribution(
    _parent: unknown,
    args: {
      contributionId: string
      notes?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Contribution> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: approving contributions requires steward role')
    }

    const contribution = await getContribution(context.db, args.contributionId)
    if (!contribution) {
      throw new Error('Contribution not found')
    }

    // Business rule: can only approve submitted contributions
    if (contribution.status !== 'submitted') {
      throw new Error(`Cannot approve contribution in ${contribution.status} status`)
    }

    // Business rule: cannot approve your own contributions
    if (contribution.memberId === context.user.memberId) {
      throw new Error('Cannot approve your own contributions')
    }

    return approveContributionData(
      context.db,
      args.contributionId,
      context.user.memberId!,
      args.notes
    )
  },

  /**
   * Reject a submitted contribution
   */
  async rejectContribution(
    _parent: unknown,
    args: {
      contributionId: string
      reason: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Contribution> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: rejecting contributions requires steward role')
    }

    const contribution = await getContribution(context.db, args.contributionId)
    if (!contribution) {
      throw new Error('Contribution not found')
    }

    // Business rule: can only reject submitted contributions
    if (contribution.status !== 'submitted') {
      throw new Error(`Cannot reject contribution in ${contribution.status} status`)
    }

    // Business rule: must provide rejection reason
    if (!args.reason || args.reason.trim().length === 0) {
      throw new Error('Rejection reason is required')
    }

    return rejectContributionData(
      context.db,
      args.contributionId,
      context.user.memberId!,
      args.reason
    )
  },
}

// ============================================================================
// Field Resolvers
// ============================================================================

export const Member = {
  // Field resolvers if needed
}

export const Contribution = {
  /**
   * Resolve member for a contribution
   */
  async member(parent: Contribution, _args: unknown, context: Context): Promise<Member | null> {
    return getMember(context.db, parent.memberId)
  },
}

export const Approval = {
  /**
   * Resolve contribution for an approval
   */
  async contribution(
    parent: Approval,
    _args: unknown,
    context: Context
  ): Promise<Contribution | null> {
    return getContribution(context.db, parent.contributionId)
  },

  /**
   * Resolve approver (member) for an approval
   */
  async approver(parent: Approval, _args: unknown, context: Context): Promise<Member | null> {
    return getMember(context.db, parent.approverId)
  },
}

export const PatronageSummary = {
  /**
   * Resolve member for a patronage summary
   */
  async member(
    parent: PatronageSummary,
    _args: unknown,
    context: Context
  ): Promise<Member | null> {
    return getMember(context.db, parent.memberId)
  },
}

// ============================================================================
// Export Combined Resolvers
// ============================================================================

export const peopleResolvers = {
  Query,
  Mutation,
  Member,
  Contribution,
  Approval,
  PatronageSummary,
}
