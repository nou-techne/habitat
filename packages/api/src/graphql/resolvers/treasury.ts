/**
 * Treasury Resolvers
 * 
 * GraphQL resolvers for Treasury bounded context
 * Maps schema queries/mutations to data access layer
 */

import type { GraphQLResolveInfo } from 'graphql'
import {
  createAccount,
  getAccount,
  listAccounts,
  createTransaction,
  getTransaction,
  listTransactions,
  voidTransaction as voidTransactionData,
  createPeriod,
  getPeriod,
  listPeriods,
  getCurrentPeriod as getCurrentPeriodData,
  getAccountBalance,
} from '../../data/treasury.js'
import type { DatabaseClient } from '../../db/client.js'
import type {
  Account,
  Transaction,
  Period,
  AccountBalance,
  AccountType,
  LedgerType,
  TransactionStatus,
  PeriodStatus,
  PeriodType,
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
   * Get a single account by ID
   */
  async account(
    _parent: unknown,
    args: { accountId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Account | null> {
    return getAccount(context.db, args.accountId)
  },

  /**
   * List accounts with optional filters and pagination
   */
  async accounts(
    _parent: unknown,
    args: {
      filter?: {
        accountType?: AccountType
        ledgerType?: LedgerType
        isActive?: boolean
        isMemberCapital?: boolean
        search?: string
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Account; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    const limit = Math.min(args.first || 50, 200)
    
    const accounts = await listAccounts(context.db, {
      ...args.filter,
      limit: limit + 1, // Fetch one extra to determine hasNextPage
    })

    const hasNextPage = accounts.length > limit
    const nodes = hasNextPage ? accounts.slice(0, limit) : accounts

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`account:${index}`).toString('base64'),
    }))

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: false, // Simplified for now
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount: nodes.length,
    }
  },

  /**
   * Get a single transaction by ID
   */
  async transaction(
    _parent: unknown,
    args: { transactionId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Transaction | null> {
    return getTransaction(context.db, args.transactionId)
  },

  /**
   * List transactions with optional filters and pagination
   */
  async transactions(
    _parent: unknown,
    args: {
      filter?: {
        periodId?: string
        accountId?: string
        status?: TransactionStatus
        fromDate?: string
        toDate?: string
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Transaction; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
    totalCount: number
  }> {
    const limit = Math.min(args.first || 50, 200)

    const transactions = await listTransactions(context.db, {
      ...args.filter,
      limit: limit + 1,
    })

    const hasNextPage = transactions.length > limit
    const nodes = hasNextPage ? transactions.slice(0, limit) : transactions

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`transaction:${index}`).toString('base64'),
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
   * Get account balance as of a specific date
   */
  async accountBalance(
    _parent: unknown,
    args: { accountId: string; asOfDate?: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<AccountBalance | null> {
    return getAccountBalance(context.db, args.accountId, args.asOfDate)
  },

  /**
   * Get a single period by ID
   */
  async period(
    _parent: unknown,
    args: { periodId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Period | null> {
    return getPeriod(context.db, args.periodId)
  },

  /**
   * List periods with optional filters and pagination
   */
  async periods(
    _parent: unknown,
    args: {
      filter?: {
        status?: PeriodStatus
        fiscalYear?: number
        periodType?: PeriodType
      }
      first?: number
      after?: string
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<{
    edges: Array<{ node: Period; cursor: string }>
    pageInfo: {
      hasNextPage: boolean
      hasPreviousPage: boolean
      startCursor?: string
      endCursor?: string
    }
  }> {
    const limit = Math.min(args.first || 50, 200)

    const periods = await listPeriods(context.db, {
      ...args.filter,
      limit: limit + 1,
    })

    const hasNextPage = periods.length > limit
    const nodes = hasNextPage ? periods.slice(0, limit) : periods

    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`period:${index}`).toString('base64'),
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
   * Get the current open period
   */
  async currentPeriod(
    _parent: unknown,
    _args: Record<string, never>,
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Period | null> {
    return getCurrentPeriodData(context.db)
  },
}

// ============================================================================
// Mutation Resolvers
// ============================================================================

export const Mutation = {
  /**
   * Create a new account
   */
  async createAccount(
    _parent: unknown,
    args: {
      input: {
        accountNumber: string
        accountName: string
        accountType: AccountType
        ledgerType: LedgerType
        normalBalance: 'debit' | 'credit'
        description?: string
        parentAccountId?: string
        metadata?: Record<string, unknown>
      }
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Account> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: account creation requires steward role')
    }

    return createAccount(context.db, args.input)
  },

  /**
   * Create and post a new transaction
   */
  async createTransaction(
    _parent: unknown,
    args: {
      input: {
        transactionNumber: string
        transactionDate: string
        periodId: string
        description: string
        entries: Array<{
          accountId: string
          entryType: 'debit' | 'credit'
          amount: string
          description?: string
        }>
        sourceType?: string
        sourceId?: string
        metadata?: Record<string, unknown>
      }
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Transaction> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: transaction creation requires steward role')
    }

    // Business rule: transactions must balance
    const totalDebit = args.input.entries
      .filter(e => e.entryType === 'debit')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)

    const totalCredit = args.input.entries
      .filter(e => e.entryType === 'credit')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Transaction must balance: debits=${totalDebit}, credits=${totalCredit}`
      )
    }

    return createTransaction(context.db, args.input)
  },

  /**
   * Void an existing transaction
   */
  async voidTransaction(
    _parent: unknown,
    args: { transactionId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Transaction> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: voiding transactions requires steward role')
    }

    return voidTransactionData(context.db, args.transactionId)
  },

  /**
   * Create a new accounting period
   */
  async createPeriod(
    _parent: unknown,
    args: {
      input: {
        periodName: string
        periodType: PeriodType
        startDate: string
        endDate: string
        fiscalYear: number
        fiscalQuarter?: number
        fiscalMonth?: number
        metadata?: Record<string, unknown>
      }
    },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Period> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: period creation requires steward role')
    }

    return createPeriod(context.db, args.input)
  },

  /**
   * Close an accounting period
   */
  async closePeriod(
    _parent: unknown,
    args: { periodId: string },
    context: Context,
    _info: GraphQLResolveInfo
  ): Promise<Period> {
    // Auth check: require steward or admin role
    if (!context.user || !['steward', 'admin'].includes(context.user.role)) {
      throw new Error('Unauthorized: closing periods requires steward role')
    }

    // Business rule: verify all transactions are posted
    const transactions = await listTransactions(context.db, {
      periodId: args.periodId,
      status: 'draft' as TransactionStatus,
    })

    if (transactions.length > 0) {
      throw new Error(
        `Cannot close period: ${transactions.length} draft transaction(s) remain`
      )
    }

    // Close the period (implementation in data layer)
    const period = await getPeriod(context.db, args.periodId)
    if (!period) {
      throw new Error('Period not found')
    }

    if (period.status === 'closed' || period.status === 'locked') {
      throw new Error(`Period is already ${period.status}`)
    }

    // Update period status to closed
    // (In real implementation, this would be a dedicated closePeriod function)
    return { ...period, status: 'closed' as PeriodStatus, closedAt: new Date().toISOString() }
  },
}

// ============================================================================
// Field Resolvers
// ============================================================================

export const Account = {
  // Resolve related entities if needed
}

export const Transaction = {
  /**
   * Resolve period for a transaction
   */
  async period(parent: Transaction, _args: unknown, context: Context): Promise<Period | null> {
    return getPeriod(context.db, parent.periodId)
  },

  /**
   * Resolve account for each entry
   */
  async entries(parent: Transaction, _args: unknown, context: Context) {
    // Entries are already on the transaction object
    // But we could enrich them with account data
    return parent.entries
  },
}

export const TransactionEntry = {
  /**
   * Resolve account for an entry
   */
  async account(
    parent: { accountId: string },
    _args: unknown,
    context: Context
  ): Promise<Account | null> {
    return getAccount(context.db, parent.accountId)
  },
}

export const Period = {
  // Field resolvers if needed
}

export const AccountBalance = {
  /**
   * Resolve account for a balance
   */
  async account(
    parent: AccountBalance,
    _args: unknown,
    context: Context
  ): Promise<Account | null> {
    return getAccount(context.db, parent.accountId)
  },
}

// ============================================================================
// Export Combined Resolvers
// ============================================================================

export const treasuryResolvers = {
  Query,
  Mutation,
  Account,
  Transaction,
  TransactionEntry,
  Period,
  AccountBalance,
}
