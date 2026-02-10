/**
 * Treasury Data Access Layer
 * 
 * CRUD operations for Treasury bounded context:
 * - Accounts (chart of accounts)
 * - Transactions (journal entries)
 * - Entries (debits/credits)
 * - Periods (accounting periods)
 * - Balances (computed from transactions)
 */

import type { DatabaseClient } from '../db/client.js'
import type {
  Account,
  AccountType,
  LedgerType,
  Transaction,
  TransactionStatus,
  Entry,
  Period,
  PeriodStatus,
  AccountBalance,
  UUID,
  Timestamp,
  Decimal,
  JSONObject,
} from '@habitat/shared'

// ============================================================================
// Accounts
// ============================================================================

export interface CreateAccountInput {
  accountNumber: string
  accountName: string
  accountType: AccountType
  ledgerType: LedgerType
  parentAccountId?: UUID
  normalBalance: 'debit' | 'credit'
  description?: string
  metadata?: JSONObject
}

export async function createAccount(
  client: DatabaseClient,
  input: CreateAccountInput
): Promise<Account> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('accounts')
      .insert({
        account_number: input.accountNumber,
        account_name: input.accountName,
        account_type: input.accountType,
        ledger_type: input.ledgerType,
        parent_account_id: input.parentAccountId,
        normal_balance: input.normalBalance,
        description: input.description,
        metadata: input.metadata || {},
        is_active: true,
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create account: ${error.message}`)
    return mapAccountFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AccountRow>(
      `INSERT INTO accounts (
        account_number, account_name, account_type, ledger_type,
        parent_account_id, normal_balance, description, metadata, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *`,
      [
        input.accountNumber,
        input.accountName,
        input.accountType,
        input.ledgerType,
        input.parentAccountId,
        input.normalBalance,
        input.description,
        input.metadata || {},
      ]
    )
    return mapAccountFromDb(result.rows[0])
  }
}

export async function getAccount(
  client: DatabaseClient,
  accountId: UUID
): Promise<Account | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('accounts')
      .select()
      .eq('account_id', accountId)
      .single()
    
    if (error) return null
    return mapAccountFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AccountRow>(
      'SELECT * FROM accounts WHERE account_id = $1',
      [accountId]
    )
    return result.rows[0] ? mapAccountFromDb(result.rows[0]) : null
  }
}

export async function listAccounts(
  client: DatabaseClient,
  filters?: {
    accountType?: AccountType
    ledgerType?: LedgerType
    isActive?: boolean
  }
): Promise<Account[]> {
  if ('from' in client) {
    // Supabase
    let query = client.from('accounts').select()
    
    if (filters?.accountType) query = query.eq('account_type', filters.accountType)
    if (filters?.ledgerType) query = query.eq('ledger_type', filters.ledgerType)
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive)
    
    const { data, error } = await query.order('account_number')
    
    if (error) throw new Error(`Failed to list accounts: ${error.message}`)
    return data.map(mapAccountFromDb)
  } else {
    // PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (filters?.accountType) {
      conditions.push(`account_type = $${++paramCount}`)
      params.push(filters.accountType)
    }
    if (filters?.ledgerType) {
      conditions.push(`ledger_type = $${++paramCount}`)
      params.push(filters.ledgerType)
    }
    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${++paramCount}`)
      params.push(filters.isActive)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    const result = await client.query<AccountRow>(
      `SELECT * FROM accounts ${whereClause} ORDER BY account_number`,
      params
    )
    
    return result.rows.map(mapAccountFromDb)
  }
}

// ============================================================================
// Transactions
// ============================================================================

export interface CreateTransactionInput {
  transactionNumber: string
  transactionDate: Timestamp
  periodId: UUID
  description: string
  entries: Array<{
    accountId: UUID
    entryType: 'debit' | 'credit'
    amount: Decimal
    description?: string
  }>
  sourceType?: string
  sourceId?: string
  metadata?: JSONObject
}

export async function createTransaction(
  client: DatabaseClient,
  input: CreateTransactionInput
): Promise<Transaction> {
  // Validate entries balance
  const totalDebits = input.entries
    .filter(e => e.entryType === 'debit')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  
  const totalCredits = input.entries
    .filter(e => e.entryType === 'credit')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error('Transaction entries must balance (debits = credits)')
  }
  
  if ('from' in client) {
    // Supabase - use RPC for atomic transaction + entries
    const { data, error } = await client.rpc('create_transaction_with_entries', {
      p_transaction_number: input.transactionNumber,
      p_transaction_date: input.transactionDate,
      p_period_id: input.periodId,
      p_description: input.description,
      p_entries: input.entries,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_metadata: input.metadata || {},
    })
    
    if (error) throw new Error(`Failed to create transaction: ${error.message}`)
    return mapTransactionFromDb(data)
  } else {
    // PostgreSQL - use transaction block
    const pgClient = await client.connect()
    
    try {
      await pgClient.query('BEGIN')
      
      // Insert transaction
      const txResult = await pgClient.query<TransactionRow>(
        `INSERT INTO transactions (
          transaction_number, transaction_date, period_id, description,
          status, total_debit, total_credit, is_balanced,
          source_type, source_id, metadata
        ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, true, $7, $8, $9)
        RETURNING *`,
        [
          input.transactionNumber,
          input.transactionDate,
          input.periodId,
          input.description,
          totalDebits.toFixed(2),
          totalCredits.toFixed(2),
          input.sourceType,
          input.sourceId,
          input.metadata || {},
        ]
      )
      
      const transaction = txResult.rows[0]
      
      // Insert entries
      for (const entry of input.entries) {
        await pgClient.query(
          `INSERT INTO entries (
            transaction_id, account_id, entry_type, amount, description
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            transaction.transaction_id,
            entry.accountId,
            entry.entryType,
            entry.amount,
            entry.description,
          ]
        )
      }
      
      await pgClient.query('COMMIT')
      
      return mapTransactionFromDb(transaction)
    } catch (error) {
      await pgClient.query('ROLLBACK')
      throw error
    } finally {
      pgClient.release()
    }
  }
}

export async function getTransaction(
  client: DatabaseClient,
  transactionId: UUID
): Promise<Transaction | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('transactions')
      .select()
      .eq('transaction_id', transactionId)
      .single()
    
    if (error) return null
    return mapTransactionFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<TransactionRow>(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [transactionId]
    )
    return result.rows[0] ? mapTransactionFromDb(result.rows[0]) : null
  }
}

export async function listTransactions(
  client: DatabaseClient,
  filters?: {
    periodId?: UUID
    status?: TransactionStatus
    fromDate?: Timestamp
    toDate?: Timestamp
    limit?: number
  }
): Promise<Transaction[]> {
  if ('from' in client) {
    // Supabase
    let query = client.from('transactions').select()
    
    if (filters?.periodId) query = query.eq('period_id', filters.periodId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.fromDate) query = query.gte('transaction_date', filters.fromDate)
    if (filters?.toDate) query = query.lte('transaction_date', filters.toDate)
    
    query = query.order('transaction_date', { ascending: false })
    
    if (filters?.limit) query = query.limit(filters.limit)
    
    const { data, error } = await query
    
    if (error) throw new Error(`Failed to list transactions: ${error.message}`)
    return data.map(mapTransactionFromDb)
  } else {
    // PostgreSQL
    const conditions: string[] = []
    const params: any[] = []
    let paramCount = 0
    
    if (filters?.periodId) {
      conditions.push(`period_id = $${++paramCount}`)
      params.push(filters.periodId)
    }
    if (filters?.status) {
      conditions.push(`status = $${++paramCount}`)
      params.push(filters.status)
    }
    if (filters?.fromDate) {
      conditions.push(`transaction_date >= $${++paramCount}`)
      params.push(filters.fromDate)
    }
    if (filters?.toDate) {
      conditions.push(`transaction_date <= $${++paramCount}`)
      params.push(filters.toDate)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limitClause = filters?.limit ? `LIMIT ${filters.limit}` : ''
    
    const result = await client.query<TransactionRow>(
      `SELECT * FROM transactions ${whereClause} 
       ORDER BY transaction_date DESC ${limitClause}`,
      params
    )
    
    return result.rows.map(mapTransactionFromDb)
  }
}

// ============================================================================
// Periods
// ============================================================================

export interface CreatePeriodInput {
  periodName: string
  periodType: 'monthly' | 'quarterly' | 'annual' | 'custom'
  startDate: Timestamp
  endDate: Timestamp
  fiscalYear: number
  fiscalQuarter?: number
  metadata?: JSONObject
}

export async function createPeriod(
  client: DatabaseClient,
  input: CreatePeriodInput
): Promise<Period> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('periods')
      .insert({
        period_name: input.periodName,
        period_type: input.periodType,
        start_date: input.startDate,
        end_date: input.endDate,
        fiscal_year: input.fiscalYear,
        fiscal_quarter: input.fiscalQuarter,
        status: 'open',
        metadata: input.metadata || {},
      })
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create period: ${error.message}`)
    return mapPeriodFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<PeriodRow>(
      `INSERT INTO periods (
        period_name, period_type, start_date, end_date,
        fiscal_year, fiscal_quarter, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
      RETURNING *`,
      [
        input.periodName,
        input.periodType,
        input.startDate,
        input.endDate,
        input.fiscalYear,
        input.fiscalQuarter,
        input.metadata || {},
      ]
    )
    return mapPeriodFromDb(result.rows[0])
  }
}

export async function getPeriod(
  client: DatabaseClient,
  periodId: UUID
): Promise<Period | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('periods')
      .select()
      .eq('period_id', periodId)
      .single()
    
    if (error) return null
    return mapPeriodFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<PeriodRow>(
      'SELECT * FROM periods WHERE period_id = $1',
      [periodId]
    )
    return result.rows[0] ? mapPeriodFromDb(result.rows[0]) : null
  }
}

export async function getCurrentPeriod(
  client: DatabaseClient
): Promise<Period | null> {
  if ('from' in client) {
    // Supabase
    const { data, error } = await client
      .from('periods')
      .select()
      .eq('status', 'open')
      .order('start_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error) return null
    return mapPeriodFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<PeriodRow>(
      `SELECT * FROM periods 
       WHERE status = 'open' 
       ORDER BY start_date DESC 
       LIMIT 1`
    )
    return result.rows[0] ? mapPeriodFromDb(result.rows[0]) : null
  }
}

// ============================================================================
// Balances
// ============================================================================

export async function getAccountBalance(
  client: DatabaseClient,
  accountId: UUID,
  periodId: UUID
): Promise<AccountBalance | null> {
  if ('from' in client) {
    // Supabase - use RPC or view
    const { data, error } = await client
      .from('account_balances')
      .select()
      .eq('account_id', accountId)
      .eq('period_id', periodId)
      .single()
    
    if (error) return null
    return mapAccountBalanceFromDb(data)
  } else {
    // PostgreSQL
    const result = await client.query<AccountBalanceRow>(
      `SELECT * FROM account_balances 
       WHERE account_id = $1 AND period_id = $2`,
      [accountId, periodId]
    )
    return result.rows[0] ? mapAccountBalanceFromDb(result.rows[0]) : null
  }
}

// ============================================================================
// Mappers
// ============================================================================

interface AccountRow {
  account_id: string
  account_number: string
  account_name: string
  account_type: string
  ledger_type: string
  parent_account_id: string | null
  is_active: boolean
  normal_balance: string
  description: string | null
  metadata: any
  created_at: string
  updated_at: string
}

function mapAccountFromDb(row: AccountRow): Account {
  return {
    accountId: row.account_id,
    accountNumber: row.account_number,
    accountName: row.account_name,
    accountType: row.account_type as AccountType,
    ledgerType: row.ledger_type as LedgerType,
    parentAccountId: row.parent_account_id || undefined,
    isActive: row.is_active,
    normalBalance: row.normal_balance as 'debit' | 'credit',
    description: row.description || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

interface TransactionRow {
  transaction_id: string
  transaction_number: string
  transaction_date: string
  period_id: string
  description: string
  status: string
  total_debit: string
  total_credit: string
  is_balanced: boolean
  source_type: string | null
  source_id: string | null
  metadata: any
  created_at: string
  updated_at: string
  posted_at: string | null
  posted_by: string | null
  voided_at: string | null
  voided_by: string | null
  void_reason: string | null
}

function mapTransactionFromDb(row: TransactionRow): Transaction {
  return {
    transactionId: row.transaction_id,
    transactionNumber: row.transaction_number,
    transactionDate: row.transaction_date,
    periodId: row.period_id,
    description: row.description,
    status: row.status as TransactionStatus,
    totalDebit: row.total_debit,
    totalCredit: row.total_credit,
    isBalanced: row.is_balanced,
    sourceType: row.source_type || undefined,
    sourceId: row.source_id || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postedAt: row.posted_at || undefined,
    postedBy: row.posted_by || undefined,
    voidedAt: row.voided_at || undefined,
    voidedBy: row.voided_by || undefined,
    voidReason: row.void_reason || undefined,
  }
}

interface PeriodRow {
  period_id: string
  period_name: string
  period_type: string
  start_date: string
  end_date: string
  status: string
  fiscal_year: number
  fiscal_quarter: number | null
  metadata: any
  created_at: string
  opened_at: string | null
  closed_at: string | null
  locked_at: string | null
}

function mapPeriodFromDb(row: PeriodRow): Period {
  return {
    periodId: row.period_id,
    periodName: row.period_name,
    periodType: row.period_type as Period['periodType'],
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as PeriodStatus,
    fiscalYear: row.fiscal_year,
    fiscalQuarter: row.fiscal_quarter || undefined,
    metadata: row.metadata,
    createdAt: row.created_at,
    openedAt: row.opened_at || undefined,
    closedAt: row.closed_at || undefined,
    lockedAt: row.locked_at || undefined,
  }
}

interface AccountBalanceRow {
  account_id: string
  period_id: string
  debit_amount: string
  credit_amount: string
  balance: string
  as_of_date: string
}

function mapAccountBalanceFromDb(row: AccountBalanceRow): AccountBalance {
  return {
    accountId: row.account_id,
    periodId: row.period_id,
    debitAmount: row.debit_amount,
    creditAmount: row.credit_amount,
    balance: row.balance,
    asOfDate: row.as_of_date,
  }
}
