/**
 * Agreements Data Access Layer
 * 
 * CRUD operations for Agreements bounded context:
 * - Allocations (patronage allocations to members)
 * - Distributions (cash/retained split)
 * - Capital Accounts (member equity tracking)
 * - Period Close (workflow orchestration)
 */

import type { DatabaseClient } from '../db/client.js'
import type {
  Allocation,
  AllocationStatus,
  Distribution,
  DistributionStatus,
  DistributionMethod,
  CapitalAccount,
  PeriodClose,
  PeriodCloseStatus,
  AllocationSummary,
  ContributionType,
  UUID,
  Timestamp,
  Decimal,
  JSONObject,
} from '@habitat/shared'

// ============================================================================
// Allocations
// ============================================================================

export interface CreateAllocationInput {
  allocationNumber: string
  memberId: UUID
  periodId: UUID
  totalPatronage: Decimal
  allocationsByType: Array<{
    type: ContributionType
    patronageValue: Decimal
    weight: Decimal
    weightedValue: Decimal
    allocation: Decimal
  }>
  cashDistribution: Decimal
  retainedAllocation: Decimal
  retainedPercentage: Decimal
  metadata?: JSONObject
}

export async function createAllocation(
  client: DatabaseClient,
  input: CreateAllocationInput
): Promise<Allocation> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('allocations')
      .insert({
        allocation_number: input.allocationNumber,
        member_id: input.memberId,
        period_id: input.periodId,
        status: 'draft',
        total_patronage: input.totalPatronage,
        allocations_by_type: input.allocationsByType,
        cash_distribution: input.cashDistribution,
        retained_allocation: input.retainedAllocation,
        retained_percentage: input.retainedPercentage,
        metadata: input.metadata || {},
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create allocation: ${error.message}`)
    return mapAllocationFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AllocationRow>(
      `INSERT INTO allocations (
        allocation_number, member_id, period_id, status,
        total_patronage, allocations_by_type,
        cash_distribution, retained_allocation, retained_percentage,
        metadata
      ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        input.allocationNumber,
        input.memberId,
        input.periodId,
        input.totalPatronage,
        JSON.stringify(input.allocationsByType),
        input.cashDistribution,
        input.retainedAllocation,
        input.retainedPercentage,
        input.metadata || {},
      ]
    )
    return mapAllocationFromDb(result.rows[0])
  }
}

export async function proposeAllocation(
  client: DatabaseClient,
  allocationId: UUID
): Promise<Allocation> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('allocations')
      .update({
        status: 'proposed',
        proposed_at: now,
        updated_at: now,
      })
      .eq('allocation_id', allocationId)
      .eq('status', 'draft')
      .select()
      .single()
    
    if (error) throw new Error(`Failed to propose allocation: ${error.message}`)
    return mapAllocationFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AllocationRow>(
      `UPDATE allocations 
       SET status = 'proposed', proposed_at = $1, updated_at = $1
       WHERE allocation_id = $2 AND status = 'draft'
       RETURNING *`,
      [now, allocationId]
    )
    
    if (result.rows.length === 0) {
      throw new Error('Allocation not found or not in draft status')
    }
    
    return mapAllocationFromDb(result.rows[0])
  }
}

export async function approveAllocation(
  client: DatabaseClient,
  allocationId: UUID,
  approvedBy: UUID
): Promise<Allocation> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('allocations')
      .update({
        status: 'approved',
        approved_at: now,
        approved_by: approvedBy,
        updated_at: now,
      })
      .eq('allocation_id', allocationId)
      .eq('status', 'proposed')
      .select()
      .single()
    
    if (error) throw new Error(`Failed to approve allocation: ${error.message}`)
    return mapAllocationFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AllocationRow>(
      `UPDATE allocations 
       SET status = 'approved', approved_at = $1, approved_by = $2, updated_at = $1
       WHERE allocation_id = $3 AND status = 'proposed'
       RETURNING *`,
      [now, approvedBy, allocationId]
    )
    
    if (result.rows.length === 0) {
      throw new Error('Allocation not found or not in proposed status')
    }
    
    return mapAllocationFromDb(result.rows[0])
  }
}

export async function getAllocation(
  client: DatabaseClient,
  allocationId: UUID
): Promise<Allocation | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('allocations')
      .select()
      .eq('allocation_id', allocationId)
      .single()
    
    if (error) return null
    return mapAllocationFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AllocationRow>(
      'SELECT * FROM allocations WHERE allocation_id = $1',
      [allocationId]
    )
    return result.rows[0] ? mapAllocationFromDb(result.rows[0]) : null
  }
}

export async function listAllocations(
  client: DatabaseClient,
  filters?: {
    periodId?: UUID
    memberId?: UUID
    status?: AllocationStatus
    limit?: number
  }
): Promise<Allocation[]> {
  if ('from' in client) {
    // Supabase
    let query = client.from('allocations').select()
    
    if (filters?.periodId) query = query.eq('period_id', filters.periodId)
    if (filters?.memberId) query = query.eq('member_id', filters.memberId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.limit) query = query.limit(filters.limit)
    
    query = query.order('proposed_at', { ascending: false })
    
    const { data, error } = await query
    
    if (error) throw new Error(`Failed to list allocations: ${error.message}`)
    return data.map(mapAllocationFromDb)
  } else {
    // PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (filters?.periodId) {
      conditions.push(`period_id = $${++paramCount}`)
      params.push(filters.periodId)
    }
    if (filters?.memberId) {
      conditions.push(`member_id = $${++paramCount}`)
      params.push(filters.memberId)
    }
    if (filters?.status) {
      conditions.push(`status = $${++paramCount}`)
      params.push(filters.status)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : ''
    
    const result = await client.query<AllocationRow>(
      `SELECT * FROM allocations ${whereClause} 
       ORDER BY proposed_at DESC ${limitClause}`,
      params
    )
    
    return result.rows.map(mapAllocationFromDb)
  }
}

// ============================================================================
// Distributions
// ============================================================================

export interface CreateDistributionInput {
  distributionNumber: string
  allocationId: UUID
  memberId: UUID
  amount: Decimal
  currency: string
  method: DistributionMethod
  scheduledDate: Timestamp
  metadata?: JSONObject
}

export async function createDistribution(
  client: DatabaseClient,
  input: CreateDistributionInput
): Promise<Distribution> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('distributions')
      .insert({
        distribution_number: input.distributionNumber,
        allocation_id: input.allocationId,
        member_id: input.memberId,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        status: 'scheduled',
        scheduled_date: input.scheduledDate,
        metadata: input.metadata || {},
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create distribution: ${error.message}`)
    return mapDistributionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<DistributionRow>(
      `INSERT INTO distributions (
        distribution_number, allocation_id, member_id,
        amount, currency, method, status, scheduled_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8)
      RETURNING *`,
      [
        input.distributionNumber,
        input.allocationId,
        input.memberId,
        input.amount,
        input.currency,
        input.method,
        input.scheduledDate,
        input.metadata || {},
      ]
    )
    return mapDistributionFromDb(result.rows[0])
  }
}

export async function completeDistribution(
  client: DatabaseClient,
  distributionId: UUID,
  transactionId?: UUID,
  paymentReference?: string
): Promise<Distribution> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('distributions')
      .update({
        status: 'completed',
        completed_at: now,
        transaction_id: transactionId,
        payment_reference: paymentReference,
        updated_at: now,
      })
      .eq('distribution_id', distributionId)
      .in('status', ['scheduled', 'processing'])
      .select()
      .single()
    
    if (error) throw new Error(`Failed to complete distribution: ${error.message}`)
    return mapDistributionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<DistributionRow>(
      `UPDATE distributions 
       SET status = 'completed', completed_at = $1, 
           transaction_id = $2, payment_reference = $3, updated_at = $1
       WHERE distribution_id = $4 AND status IN ('scheduled', 'processing')
       RETURNING *`,
      [now, transactionId, paymentReference, distributionId]
    )
    
    if (result.rows.length === 0) {
      throw new Error('Distribution not found or not in scheduled/processing status')
    }
    
    return mapDistributionFromDb(result.rows[0])
  }
}

export async function getDistribution(
  client: DatabaseClient,
  distributionId: UUID
): Promise<Distribution | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('distributions')
      .select()
      .eq('distribution_id', distributionId)
      .single()
    
    if (error) return null
    return mapDistributionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<DistributionRow>(
      'SELECT * FROM distributions WHERE distribution_id = $1',
      [distributionId]
    )
    return result.rows[0] ? mapDistributionFromDb(result.rows[0]) : null
  }
}

export async function listDistributions(
  client: DatabaseClient,
  filters?: {
    memberId?: UUID
    allocationId?: UUID
    status?: DistributionStatus
    limit?: number
  }
): Promise<Distribution[]> {
  if ('from' in client) {
    // Supabase
    let query = client.from('distributions').select()
    
    if (filters?.memberId) query = query.eq('member_id', filters.memberId)
    if (filters?.allocationId) query = query.eq('allocation_id', filters.allocationId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.limit) query = query.limit(filters.limit)
    
    query = query.order('scheduled_date', { ascending: false })
    
    const { data, error } = await query
    
    if (error) throw new Error(`Failed to list distributions: ${error.message}`)
    return data.map(mapDistributionFromDb)
  } else {
    // PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (filters?.memberId) {
      conditions.push(`member_id = $${++paramCount}`)
      params.push(filters.memberId)
    }
    if (filters?.allocationId) {
      conditions.push(`allocation_id = $${++paramCount}`)
      params.push(filters.allocationId)
    }
    if (filters?.status) {
      conditions.push(`status = $${++paramCount}`)
      params.push(filters.status)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : ''
    
    const result = await client.query<DistributionRow>(
      `SELECT * FROM distributions ${whereClause} 
       ORDER BY scheduled_date DESC ${limitClause}`,
      params
    )
    
    return result.rows.map(mapDistributionFromDb)
  }
}

// ============================================================================
// Capital Accounts
// ============================================================================

export async function getCapitalAccount(
  client: DatabaseClient,
  memberId: UUID
): Promise<CapitalAccount | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('capital_accounts')
      .select()
      .eq('member_id', memberId)
      .single()
    
    if (error) return null
    return mapCapitalAccountFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<CapitalAccountRow>(
      'SELECT * FROM capital_accounts WHERE member_id = $1',
      [memberId]
    )
    return result.rows[0] ? mapCapitalAccountFromDb(result.rows[0]) : null
  }
}

export interface UpdateCapitalAccountInput {
  bookBalance?: Decimal
  taxBalance?: Decimal
  contributedCapital?: Decimal
  retainedPatronage?: Decimal
  distributedPatronage?: Decimal
  lastAllocationId?: UUID
  lastDistributionId?: UUID
}

export async function updateCapitalAccount(
  client: DatabaseClient,
  memberId: UUID,
  input: UpdateCapitalAccountInput
): Promise<CapitalAccount> {
  const now = new Date().toISOString()
  
  if ('from' in client) {
    // Supabase
    const updates: any = { 
      last_updated_at: now,
      updated_at: now,
    }
    
    if (input.bookBalance !== undefined) updates.book_balance = input.bookBalance
    if (input.taxBalance !== undefined) updates.tax_balance = input.taxBalance
    if (input.contributedCapital !== undefined) updates.contributed_capital = input.contributedCapital
    if (input.retainedPatronage !== undefined) updates.retained_patronage = input.retainedPatronage
    if (input.distributedPatronage !== undefined) updates.distributed_patronage = input.distributedPatronage
    if (input.lastAllocationId !== undefined) updates.last_allocation_id = input.lastAllocationId
    if (input.lastDistributionId !== undefined) updates.last_distribution_id = input.lastDistributionId
    
    const { data, error } = await client
      .from('capital_accounts')
      .update(updates)
      .eq('member_id', memberId)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update capital account: ${error.message}`)
    return mapCapitalAccountFromDb(data)
  } else {
    // PostgreSQL - build dynamic update
    const setClauses: string[] = ['last_updated_at = $1', 'updated_at = $1']
    const params: any[] = [now]
    let paramCount = 1
    
    if (input.bookBalance !== undefined) {
      setClauses.push(`book_balance = $${++paramCount}`)
      params.push(input.bookBalance)
    }
    if (input.taxBalance !== undefined) {
      setClauses.push(`tax_balance = $${++paramCount}`)
      params.push(input.taxBalance)
    }
    if (input.contributedCapital !== undefined) {
      setClauses.push(`contributed_capital = $${++paramCount}`)
      params.push(input.contributedCapital)
    }
    if (input.retainedPatronage !== undefined) {
      setClauses.push(`retained_patronage = $${++paramCount}`)
      params.push(input.retainedPatronage)
    }
    if (input.distributedPatronage !== undefined) {
      setClauses.push(`distributed_patronage = $${++paramCount}`)
      params.push(input.distributedPatronage)
    }
    if (input.lastAllocationId !== undefined) {
      setClauses.push(`last_allocation_id = $${++paramCount}`)
      params.push(input.lastAllocationId)
    }
    if (input.lastDistributionId !== undefined) {
      setClauses.push(`last_distribution_id = $${++paramCount}`)
      params.push(input.lastDistributionId)
    }
    
    params.push(memberId)
    
    const result = await client.query<CapitalAccountRow>(
      `UPDATE capital_accounts 
       SET ${setClauses.join(', ')}
       WHERE member_id = $${++paramCount}
       RETURNING *`,
      params
    )
    
    if (result.rows.length === 0) {
      throw new Error('Capital account not found')
    }
    
    return mapCapitalAccountFromDb(result.rows[0])
  }
}

// ============================================================================
// Allocation Summary
// ============================================================================

export async function getAllocationSummary(
  client: DatabaseClient,
  periodId: UUID
): Promise<AllocationSummary | null> {
  if ('from' in client) {
    // Supabase - use view or RPC
    const { data, error } = await client
      .from('allocation_summaries')
      .select()
      .eq('period_id', periodId)
      .single()
    
    if (error) return null
    
    return {
      periodId: data.period_id,
      totalAllocated: data.total_allocated,
      totalCash: data.total_cash,
      totalRetained: data.total_retained,
      averageAllocation: data.average_allocation,
      memberCount: data.member_count,
      byType: data.by_type || [],
    }
  } else {
    // PostgreSQL - compute from allocations
    const result = await client.query<AllocationSummaryRow>(
      `SELECT 
        $1 as period_id,
        SUM(total_patronage) as total_allocated,
        SUM(cash_distribution) as total_cash,
        SUM(retained_allocation) as total_retained,
        AVG(total_patronage) as average_allocation,
        COUNT(*) as member_count
       FROM allocations
       WHERE period_id = $1 AND status IN ('approved', 'executed')`,
      [periodId]
    )
    
    if (result.rows.length === 0 || !result.rows[0].total_allocated) {
      return null
    }
    
    const row = result.rows[0]
    
    return {
      periodId: row.period_id,
      totalAllocated: row.total_allocated,
      totalCash: row.total_cash,
      totalRetained: row.total_retained,
      averageAllocation: row.average_allocation,
      memberCount: parseInt(row.member_count, 10),
      byType: [], // Would need additional query with jsonb_array_elements
    }
  }
}

// ============================================================================
// Mappers
// ============================================================================

interface AllocationRow {
  allocation_id: string
  allocation_number: string
  member_id: string
  period_id: string
  status: string
  total_patronage: string
  allocations_by_type: any
  cash_distribution: string
  retained_allocation: string
  retained_percentage: string
  proposed_at: string | null
  approved_at: string | null
  approved_by: string | null
  executed_at: string | null
  metadata: any
  created_at: string
  updated_at: string
}

function mapAllocationFromDb(row: AllocationRow): Allocation {
  return {
    allocationId: row.allocation_id,
    allocationNumber: row.allocation_number,
    memberId: row.member_id,
    periodId: row.period_id,
    status: row.status as AllocationStatus,
    totalPatronage: row.total_patronage,
    allocationsByType: Array.isArray(row.allocations_by_type) 
      ? row.allocations_by_type 
      : [],
    cashDistribution: row.cash_distribution,
    retainedAllocation: row.retained_allocation,
    retainedPercentage: row.retained_percentage,
    proposedAt: row.proposed_at || undefined,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    executedAt: row.executed_at || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface DistributionRow {
  distribution_id: string
  distribution_number: string
  allocation_id: string
  member_id: string
  amount: string
  currency: string
  method: string
  status: string
  scheduled_date: string
  processed_at: string | null
  completed_at: string | null
  failed_at: string | null
  failure_reason: string | null
  transaction_id: string | null
  payment_reference: string | null
  metadata: any
  created_at: string
  updated_at: string
}

function mapDistributionFromDb(row: DistributionRow): Distribution {
  return {
    distributionId: row.distribution_id,
    distributionNumber: row.distribution_number,
    allocationId: row.allocation_id,
    memberId: row.member_id,
    amount: row.amount,
    currency: row.currency,
    method: row.method as DistributionMethod,
    status: row.status as DistributionStatus,
    scheduledDate: row.scheduled_date,
    processedAt: row.processed_at || undefined,
    completedAt: row.completed_at || undefined,
    failedAt: row.failed_at || undefined,
    failureReason: row.failure_reason || undefined,
    transactionId: row.transaction_id || undefined,
    paymentReference: row.payment_reference || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface CapitalAccountRow {
  account_id: string
  member_id: string
  book_balance: string
  tax_balance: string
  contributed_capital: string
  retained_patronage: string
  distributed_patronage: string
  last_allocation_id: string | null
  last_distribution_id: string | null
  last_updated_at: string
  metadata: any
  created_at: string
  updated_at: string
}

function mapCapitalAccountFromDb(row: CapitalAccountRow): CapitalAccount {
  return {
    accountId: row.account_id,
    memberId: row.member_id,
    bookBalance: row.book_balance,
    taxBalance: row.tax_balance,
    contributedCapital: row.contributed_capital,
    retainedPatronage: row.retained_patronage,
    distributedPatronage: row.distributed_patronage,
    lastAllocationId: row.last_allocation_id || undefined,
    lastDistributionId: row.last_distribution_id || undefined,
    lastUpdatedAt: row.last_updated_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface AllocationSummaryRow {
  period_id: string
  total_allocated: string
  total_cash: string
  total_retained: string
  average_allocation: string
  member_count: string
}
