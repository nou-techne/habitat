/**
 * People Data Access Layer
 * 
 * CRUD operations for People bounded context:
 * - Members (cooperative members)
 * - Contributions (labor, expertise, capital, relationship)
 * - Approvals (steward decisions on contributions)
 * - Patronage Claims (patronage earned from contributions)
 */

import type { DatabaseClient } from '../db/client.js'
import type {
  Member,
  MemberStatus,
  MemberTier,
  Contribution,
  ContributionType,
  ContributionStatus,
  Approval,
  ApprovalDecision,
  PatronageClaim,
  PatronageSummary,
  UUID,
  Timestamp,
  Decimal,
  JSONObject,
} from '@habitat/shared'

// ============================================================================
// Members
// ============================================================================

export interface CreateMemberInput {
  memberNumber: string
  ensName?: string
  displayName?: string
  email?: string
  tier: MemberTier
  metadata?: JSONObject
}

export async function createMember(
  client: DatabaseClient,
  input: CreateMemberInput
): Promise<Member> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('members')
      .insert({
        member_number: input.memberNumber,
        ens_name: input.ensName,
        display_name: input.displayName,
        email: input.email,
        status: 'active',
        tier: input.tier,
        joined_at: new Date().toISOString(),
        metadata: input.metadata || {},
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create member: ${error.message}`)
    return mapMemberFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<MemberRow>(
      `INSERT INTO members (
        member_number, ens_name, display_name, email,
        status, tier, joined_at, metadata
      ) VALUES ($1, $2, $3, $4, 'active', $5, NOW(), $6)
      RETURNING *`,
      [
        input.memberNumber,
        input.ensName,
        input.displayName,
        input.email,
        input.tier,
        input.metadata || {},
      ]
    )
    return mapMemberFromDb(result.rows[0])
  }
}

export async function getMember(
  client: DatabaseClient,
  memberId: UUID
): Promise<Member | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('members')
      .select()
      .eq('member_id', memberId)
      .single()
    
    if (error) return null
    return mapMemberFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<MemberRow>(
      'SELECT * FROM members WHERE member_id = $1',
      [memberId]
    )
    return result.rows[0] ? mapMemberFromDb(result.rows[0]) : null
  }
}

export async function listMembers(
  client: DatabaseClient,
  filters?: {
    status?: MemberStatus
    tier?: MemberTier
    limit?: number
  }
): Promise<Member[]> {
  if ('from' in client) {
    // Supabase
    let query = client.from('members').select()
    
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.tier) query = query.eq('tier', filters.tier)
    if (filters?.limit) query = query.limit(filters.limit)
    
    query = query.order('joined_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) throw new Error(`Failed to list members: ${error.message}`)
    return data.map(mapMemberFromDb)
  } else {
    // PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (filters?.status) {
      conditions.push(`status = $${++paramCount}`)
      params.push(filters.status)
    }
    if (filters?.tier) {
      conditions.push(`tier = $${++paramCount}`)
      params.push(filters.tier)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : ''
    
    const result = await client.query<MemberRow>(
      `SELECT * FROM members ${whereClause} 
       ORDER BY joined_at DESC ${limitClause}`,
      params
    )
    
    return result.rows.map(mapMemberFromDb)
  }
}

// ============================================================================
// Contributions
// ============================================================================

export interface CreateContributionInput {
  contributionNumber: string
  memberId: UUID
  contributionType: ContributionType
  description: string
  hours?: Decimal
  monetaryValue?: Decimal
  expertise?: string
  capitalType?: 'cash' | 'equipment' | 'space' | 'intellectual_property'
  relationshipType?: 'partnership' | 'customer_referral' | 'network_access' | 'reputation'
  evidence?: Array<{
    type: string
    url: string
    description?: string
  }>
  metadata?: JSONObject
}

export async function createContribution(
  client: DatabaseClient,
  input: CreateContributionInput
): Promise<Contribution> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('contributions')
      .insert({
        contribution_number: input.contributionNumber,
        member_id: input.memberId,
        contribution_type: input.contributionType,
        status: 'draft',
        description: input.description,
        hours: input.hours,
        monetary_value: input.monetaryValue,
        expertise: input.expertise,
        capital_type: input.capitalType,
        relationship_type: input.relationshipType,
        evidence: input.evidence || [],
        metadata: input.metadata || {},
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create contribution: ${error.message}`)
    return mapContributionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<ContributionRow>(
      `INSERT INTO contributions (
        contribution_number, member_id, contribution_type, status,
        description, hours, monetary_value, expertise,
        capital_type, relationship_type, evidence, metadata
      ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        input.contributionNumber,
        input.memberId,
        input.contributionType,
        input.description,
        input.hours,
        input.monetaryValue,
        input.expertise,
        input.capitalType,
        input.relationshipType,
        JSON.stringify(input.evidence || []),
        input.metadata || {},
      ]
    )
    return mapContributionFromDb(result.rows[0])
  }
}

export async function submitContribution(
  client: DatabaseClient,
  contributionId: UUID
): Promise<Contribution> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('contributions')
      .update({
        status: 'submitted',
        submitted_at: now,
        updated_at: now,
      })
      .eq('contribution_id', contributionId)
      .eq('status', 'draft') // Only allow draft -> submitted
      .select()
      .single()
    
    if (error) throw new Error(`Failed to submit contribution: ${error.message}`)
    return mapContributionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<ContributionRow>(
      `UPDATE contributions 
       SET status = 'submitted', submitted_at = $1, updated_at = $1
       WHERE contribution_id = $2 AND status = 'draft'
       RETURNING *`,
      [now, contributionId]
    )
    
    if (result.rows.length === 0) {
      throw new Error('Contribution not found or not in draft status')
    }
    
    return mapContributionFromDb(result.rows[0])
  }
}

export async function approveContribution(
  client: DatabaseClient,
  contributionId: UUID,
  approverId: UUID,
  comment?: string
): Promise<Contribution> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase - use RPC for atomic approval + contribution update
    const { data, error } = await client.rpc('approve_contribution', {
      p_contribution_id: contributionId,
      p_approver_id: approverId,
      p_comment: comment,
    })
    
    if (error) throw new Error(`Failed to approve contribution: ${error.message}`)
    return mapContributionFromDb(data)
  } else {
    // PostgreSQL - transaction block
    const pgClient = await client.connect()
    
    try {
      await pgClient.query('BEGIN')
      
      // Update contribution status
      const contributionResult = await pgClient.query<ContributionRow>(
        `UPDATE contributions 
         SET status = 'approved', reviewed_at = $1, updated_at = $1
         WHERE contribution_id = $2 AND status IN ('submitted', 'under_review')
         RETURNING *`,
        [now, contributionId]
      )
      
      if (contributionResult.rows.length === 0) {
        throw new Error('Contribution not found or not in submitted/under_review status')
      }
      
      // Record approval
      await pgClient.query(
        `INSERT INTO approvals (contribution_id, approver_id, decision, comment, decided_at)
         VALUES ($1, $2, 'approved', $3, $4)`,
        [contributionId, approverId, comment, now]
      )
      
      await pgClient.query('COMMIT')
      
      return mapContributionFromDb(contributionResult.rows[0])
    } catch (error) {
      await pgClient.query('ROLLBACK')
      throw error
    } finally {
      pgClient.release()
    }
  }
}

export async function rejectContribution(
  client: DatabaseClient,
  contributionId: UUID,
  approverId: UUID,
  reason: string
): Promise<Contribution> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase
    const { data, error } = await client.rpc('reject_contribution', {
      p_contribution_id: contributionId,
      p_approver_id: approverId,
      p_reason: reason,
    })
    
    if (error) throw new Error(`Failed to reject contribution: ${error.message}`)
    return mapContributionFromDb(data)
  } else {
    // PostgreSQL
    const pgClient = await client.connect()
    
    try {
      await pgClient.query('BEGIN')
      
      // Update contribution status
      const contributionResult = await pgClient.query<ContributionRow>(
        `UPDATE contributions 
         SET status = 'rejected', reviewed_at = $1, updated_at = $1
         WHERE contribution_id = $2 AND status IN ('submitted', 'under_review')
         RETURNING *`,
        [now, contributionId]
      )
      
      if (contributionResult.rows.length === 0) {
        throw new Error('Contribution not found or not in submitted/under_review status')
      }
      
      // Record rejection
      await pgClient.query(
        `INSERT INTO approvals (contribution_id, approver_id, decision, reason, decided_at)
         VALUES ($1, $2, 'rejected', $3, $4)`,
        [contributionId, approverId, reason, now]
      )
      
      await pgClient.query('COMMIT')
      
      return mapContributionFromDb(contributionResult.rows[0])
    } catch (error) {
      await pgClient.query('ROLLBACK')
      throw error
    } finally {
      pgClient.release()
    }
  }
}

export async function getContribution(
  client: DatabaseClient,
  contributionId: UUID
): Promise<Contribution | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('contributions')
      .select()
      .eq('contribution_id', contributionId)
      .single()
    
    if (error) return null
    return mapContributionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<ContributionRow>(
      'SELECT * FROM contributions WHERE contribution_id = $1',
      [contributionId]
    )
    return result.rows[0] ? mapContributionFromDb(result.rows[0]) : null
  }
}

export async function listContributions(
  client: DatabaseClient,
  filters?: {
    memberId?: UUID
    status?: ContributionStatus
    contributionType?: ContributionType
    limit?: number
  }
): Promise<Contribution[]> {
  if ('from' in client) {
    // Supabase
    let query = client.from('contributions').select()
    
    if (filters?.memberId) query = query.eq('member_id', filters.memberId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.contributionType) query = query.eq('contribution_type', filters.contributionType)
    if (filters?.limit) query = query.limit(filters.limit)
    
    query = query.order('submitted_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) throw new Error(`Failed to list contributions: ${error.message}`)
    return data.map(mapContributionFromDb)
  } else {
    // PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (filters?.memberId) {
      conditions.push(`member_id = $${++paramCount}`)
      params.push(filters.memberId)
    }
    if (filters?.status) {
      conditions.push(`status = $${++paramCount}`)
      params.push(filters.status)
    }
    if (filters?.contributionType) {
      conditions.push(`contribution_type = $${++paramCount}`)
      params.push(filters.contributionType)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : ''
    
    const result = await client.query<ContributionRow>(
      `SELECT * FROM contributions ${whereClause} 
       ORDER BY submitted_at DESC ${limitClause}`,
      params
    )
    
    return result.rows.map(mapContributionFromDb)
  }
}

// ============================================================================
// Patronage
// ============================================================================

export async function getPatronageSummary(
  client: DatabaseClient,
  memberId: UUID,
  periodId?: UUID
): Promise<PatronageSummary | null> {
  if ('from' in client) {
    // Supabase - use view or RPC
    const { data, error } = await client
      .from('patronage_summaries')
      .select()
      .eq('member_id', memberId)
      .maybeSingle()
    
    if (error) return null
    if (!data) return null
    
    return {
      memberId: data.member_id,
      periodId: periodId,
      totalPatronage: data.total_patronage,
      currentPeriodPatronage: data.current_period_patronage || '0',
      lifetimePatronage: data.lifetime_patronage,
      byType: data.by_type || [],
      byPeriod: data.by_period || [],
    }
  } else {
    // PostgreSQL - compute from patronage_claims
    const result = await client.query<PatronageSummaryRow>(
      `SELECT 
        member_id,
        SUM(weighted_value) as total_patronage,
        SUM(CASE WHEN period_id = $2 THEN weighted_value ELSE 0 END) as current_period_patronage,
        SUM(weighted_value) as lifetime_patronage
       FROM patronage_claims
       WHERE member_id = $1
       GROUP BY member_id`,
      [memberId, periodId || null]
    )
    
    if (result.rows.length === 0) return null
    
    const row = result.rows[0]
    
    // Get breakdown by type
    const byTypeResult = await client.query<PatronageByTypeRow>(
      `SELECT 
        contribution_type as type,
        SUM(weighted_value) as amount,
        COUNT(*) as count
       FROM patronage_claims
       WHERE member_id = $1
       GROUP BY contribution_type`,
      [memberId]
    )
    
    return {
      memberId: row.member_id,
      periodId: periodId,
      totalPatronage: row.total_patronage,
      currentPeriodPatronage: row.current_period_patronage,
      lifetimePatronage: row.lifetime_patronage,
      byType: byTypeResult.rows.map(r => ({
        type: r.type as ContributionType,
        amount: r.amount,
        count: parseInt(r.count, 10),
      })),
      byPeriod: [], // Would need additional query
    }
  }
}

// ============================================================================
// Mappers
// ============================================================================

interface MemberRow {
  member_id: string
  member_number: string
  ens_name: string | null
  display_name: string | null
  email: string | null
  status: string
  tier: string
  joined_at: string
  approved_at: string | null
  metadata: any
  created_at: string
  updated_at: string
}

function mapMemberFromDb(row: MemberRow): Member {
  return {
    memberId: row.member_id,
    memberNumber: row.member_number,
    ensName: row.ens_name || undefined,
    displayName: row.display_name || undefined,
    email: row.email || undefined,
    status: row.status as MemberStatus,
    tier: row.tier as MemberTier,
    joinedAt: row.joined_at,
    approvedAt: row.approved_at || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface ContributionRow {
  contribution_id: string
  contribution_number: string
  member_id: string
  contribution_type: string
  status: string
  description: string
  hours: string | null
  monetary_value: string | null
  expertise: string | null
  capital_type: string | null
  relationship_type: string | null
  evidence: any
  submitted_at: string | null
  review_started_at: string | null
  reviewed_at: string | null
  metadata: any
  created_at: string
  updated_at: string
}

function mapContributionFromDb(row: ContributionRow): Contribution {
  return {
    contributionId: row.contribution_id,
    contributionNumber: row.contribution_number,
    memberId: row.member_id,
    contributionType: row.contribution_type as ContributionType,
    status: row.status as ContributionStatus,
    description: row.description,
    hours: row.hours || undefined,
    monetaryValue: row.monetary_value || undefined,
    expertise: row.expertise || undefined,
    capitalType: row.capital_type as any || undefined,
    relationshipType: row.relationship_type as any || undefined,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    submittedAt: row.submitted_at || undefined,
    reviewStartedAt: row.review_started_at || undefined,
    reviewedAt: row.reviewed_at || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface PatronageSummaryRow {
  member_id: string
  total_patronage: string
  current_period_patronage: string
  lifetime_patronage: string
}

interface PatronageByTypeRow {
  type: string
  amount: string
  count: string
}
