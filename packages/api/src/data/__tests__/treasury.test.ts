/**
 * Treasury Data Access Tests
 * 
 * Tests CRUD operations for Treasury bounded context
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Pool } from 'pg'
import { 
  createAccount, 
  getAccount, 
  listAccounts,
  createTransaction,
  getTransaction,
  createPeriod,
  getPeriod,
  getCurrentPeriod,
} from '../treasury.js'

// Mock database client for testing
// In real implementation, use testcontainers or test database
let mockClient: any

describe('Treasury Data Access', () => {
  beforeAll(() => {
    // Setup: create test database or mock client
    mockClient = createMockClient()
  })

  afterAll(() => {
    // Teardown: close connections, clean up
  })

  describe('Accounts', () => {
    it('creates an account with all required fields', async () => {
      const input = {
        accountNumber: '1000',
        accountName: 'Test Cash Account',
        accountType: 'asset' as const,
        ledgerType: 'book' as const,
        normalBalance: 'debit' as const,
        description: 'Test account for unit tests',
      }

      const account = await createAccount(mockClient, input)

      expect(account).toBeDefined()
      expect(account.accountNumber).toBe(input.accountNumber)
      expect(account.accountName).toBe(input.accountName)
      expect(account.accountType).toBe(input.accountType)
      expect(account.isActive).toBe(true)
    })

    it('retrieves an account by ID', async () => {
      const created = await createAccount(mockClient, {
        accountNumber: '1010',
        accountName: 'Test Account 2',
        accountType: 'asset' as const,
        ledgerType: 'book' as const,
        normalBalance: 'debit' as const,
      })

      const retrieved = await getAccount(mockClient, created.accountId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.accountId).toBe(created.accountId)
      expect(retrieved?.accountNumber).toBe('1010')
    })

    it('lists accounts with filters', async () => {
      await createAccount(mockClient, {
        accountNumber: '2000',
        accountName: 'Liability Account',
        accountType: 'liability' as const,
        ledgerType: 'book' as const,
        normalBalance: 'credit' as const,
      })

      const assets = await listAccounts(mockClient, { accountType: 'asset' })
      const liabilities = await listAccounts(mockClient, { accountType: 'liability' })

      expect(assets.length).toBeGreaterThan(0)
      expect(liabilities.length).toBeGreaterThan(0)
      expect(assets.every(a => a.accountType === 'asset')).toBe(true)
      expect(liabilities.every(a => a.accountType === 'liability')).toBe(true)
    })

    it('returns null for non-existent account', async () => {
      const account = await getAccount(mockClient, 'non-existent-id')
      expect(account).toBeNull()
    })
  })

  describe('Transactions', () => {
    it('creates a balanced transaction', async () => {
      const cashAccount = await createAccount(mockClient, {
        accountNumber: '1000',
        accountName: 'Cash',
        accountType: 'asset' as const,
        ledgerType: 'book' as const,
        normalBalance: 'debit' as const,
      })

      const equityAccount = await createAccount(mockClient, {
        accountNumber: '3000',
        accountName: 'Equity',
        accountType: 'equity' as const,
        ledgerType: 'book' as const,
        normalBalance: 'credit' as const,
      })

      const period = await createPeriod(mockClient, {
        periodName: 'Test Period',
        periodType: 'quarterly',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        fiscalYear: 2026,
        fiscalQuarter: 1,
      })

      const transaction = await createTransaction(mockClient, {
        transactionNumber: 'TX001',
        transactionDate: '2026-01-15',
        periodId: period.periodId,
        description: 'Test transaction',
        entries: [
          {
            accountId: cashAccount.accountId,
            entryType: 'debit',
            amount: '1000.00',
          },
          {
            accountId: equityAccount.accountId,
            entryType: 'credit',
            amount: '1000.00',
          },
        ],
      })

      expect(transaction).toBeDefined()
      expect(transaction.transactionNumber).toBe('TX001')
      expect(transaction.isBalanced).toBe(true)
      expect(transaction.totalDebit).toBe('1000.00')
      expect(transaction.totalCredit).toBe('1000.00')
    })

    it('rejects unbalanced transaction', async () => {
      const cashAccount = await createAccount(mockClient, {
        accountNumber: '1001',
        accountName: 'Cash 2',
        accountType: 'asset' as const,
        ledgerType: 'book' as const,
        normalBalance: 'debit' as const,
      })

      const equityAccount = await createAccount(mockClient, {
        accountNumber: '3001',
        accountName: 'Equity 2',
        accountType: 'equity' as const,
        ledgerType: 'book' as const,
        normalBalance: 'credit' as const,
      })

      const period = await createPeriod(mockClient, {
        periodName: 'Test Period 2',
        periodType: 'quarterly',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        fiscalYear: 2026,
      })

      await expect(
        createTransaction(mockClient, {
          transactionNumber: 'TX002',
          transactionDate: '2026-01-15',
          periodId: period.periodId,
          description: 'Unbalanced transaction',
          entries: [
            {
              accountId: cashAccount.accountId,
              entryType: 'debit',
              amount: '1000.00',
            },
            {
              accountId: equityAccount.accountId,
              entryType: 'credit',
              amount: '900.00', // Unbalanced!
            },
          ],
        })
      ).rejects.toThrow('must balance')
    })

    it('retrieves transaction by ID', async () => {
      const transaction = await getTransaction(mockClient, 'some-transaction-id')
      // Test retrieval logic
    })
  })

  describe('Periods', () => {
    it('creates a period', async () => {
      const period = await createPeriod(mockClient, {
        periodName: 'Q1 2026',
        periodType: 'quarterly',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        fiscalYear: 2026,
        fiscalQuarter: 1,
      })

      expect(period).toBeDefined()
      expect(period.periodName).toBe('Q1 2026')
      expect(period.status).toBe('open')
      expect(period.fiscalQuarter).toBe(1)
    })

    it('retrieves current period', async () => {
      await createPeriod(mockClient, {
        periodName: 'Q1 2026 Current',
        periodType: 'quarterly',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        fiscalYear: 2026,
      })

      const current = await getCurrentPeriod(mockClient)

      expect(current).toBeDefined()
      expect(current?.status).toBe('open')
    })
  })
})

// Mock client factory for testing
function createMockClient(): any {
  // In real implementation, return testcontainers PostgreSQL client
  // or connect to test database
  return {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    }),
  }
}
