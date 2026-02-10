/**
 * Treasury bounded context types
 * 
 * Corresponds to schema/01_treasury_core.sql
 */

import type { UUID, Timestamp, Decimal, JSONObject, EventMetadata } from './common.js'

// ============================================================================
// Enums
// ============================================================================

export enum AccountType {
  Asset = 'asset',
  Liability = 'liability',
  Equity = 'equity',
  Revenue = 'revenue',
  Expense = 'expense',
}

export enum LedgerType {
  Book = 'book',
  Tax = 'tax',
}

export enum PeriodStatus {
  Open = 'open',
  Closing = 'closing',
  Closed = 'closed',
  Locked = 'locked',
}

export enum TransactionStatus {
  Draft = 'draft',
  Pending = 'pending',
  Posted = 'posted',
  Void = 'void',
}

// ============================================================================
// Events
// ============================================================================

export interface TreasuryEvent {
  eventId: UUID
  aggregateType: 'account' | 'transaction' | 'period'
  aggregateId: UUID
  eventType: string
  eventVersion: number
  eventData: JSONObject
  metadata: EventMetadata
  occurredAt: Timestamp
  sequenceNumber: number
}

// ============================================================================
// Entities
// ============================================================================

export interface Account {
  accountId: UUID
  accountNumber: string
  accountName: string
  accountType: AccountType
  ledgerType: LedgerType
  parentAccountId?: UUID
  isActive: boolean
  normalBalance: 'debit' | 'credit'
  description?: string
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Transaction {
  transactionId: UUID
  transactionNumber: string
  transactionDate: Timestamp
  periodId: UUID
  description: string
  status: TransactionStatus
  totalDebit: Decimal
  totalCredit: Decimal
  isBalanced: boolean
  sourceType?: string
  sourceId?: string
  metadata: JSONObject
  createdAt: Timestamp
  updatedAt: Timestamp
  postedAt?: Timestamp
  postedBy?: string
  voidedAt?: Timestamp
  voidedBy?: string
  voidReason?: string
}

export interface Entry {
  entryId: UUID
  transactionId: UUID
  accountId: UUID
  entryType: 'debit' | 'credit'
  amount: Decimal
  description?: string
  metadata: JSONObject
  createdAt: Timestamp
}

export interface Period {
  periodId: UUID
  periodName: string
  periodType: 'monthly' | 'quarterly' | 'annual' | 'custom'
  startDate: Timestamp
  endDate: Timestamp
  status: PeriodStatus
  fiscalYear: number
  fiscalQuarter?: number
  metadata: JSONObject
  createdAt: Timestamp
  openedAt?: Timestamp
  closedAt?: Timestamp
  lockedAt?: Timestamp
}

// ============================================================================
// Computed views
// ============================================================================

export interface AccountBalance {
  accountId: UUID
  periodId: UUID
  debitAmount: Decimal
  creditAmount: Decimal
  balance: Decimal
  asOfDate: Timestamp
}

export interface TrialBalance {
  periodId: UUID
  asOfDate: Timestamp
  accounts: Array<{
    accountId: UUID
    accountNumber: string
    accountName: string
    accountType: AccountType
    debitBalance: Decimal
    creditBalance: Decimal
  }>
  totalDebits: Decimal
  totalCredits: Decimal
  isBalanced: boolean
}
