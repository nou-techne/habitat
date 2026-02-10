/**
 * Double-Entry Integrity Checker Tests
 * 
 * Tests all integrity checks and edge cases
 */

import { describe, it, expect } from 'vitest'
import {
  DoubleEntryIntegrityChecker,
  type Transaction,
  type Account,
  generateIntegrityReport,
} from '../double-entry-checker.js'

describe('DoubleEntryIntegrityChecker', () => {
  const checker = new DoubleEntryIntegrityChecker()

  const accounts: Account[] = [
    {
      accountId: 'cash',
      accountNumber: '1000',
      accountName: 'Cash',
      accountType: 'asset',
      normalBalance: 'debit',
    },
    {
      accountId: 'capital',
      accountNumber: '3000',
      accountName: 'Member Capital',
      accountType: 'equity',
      normalBalance: 'credit',
    },
  ]

  describe('Transaction Balance Check', () => {
    it('should pass for balanced transaction', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Capital contribution',
          entries: [
            {
              entryId: 'entry-1',
              transactionId: 'txn-1',
              accountId: 'cash',
              entryType: 'debit',
              amount: '1000.00',
            },
            {
              entryId: 'entry-2',
              transactionId: 'txn-1',
              accountId: 'capital',
              entryType: 'credit',
              amount: '1000.00',
            },
          ],
          totalDebit: '1000.00',
          totalCredit: '1000.00',
          isBalanced: true,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      expect(result.valid).toBe(true)
      expect(result.summary.balancedTransactions).toBe(1)
      expect(result.summary.unbalancedTransactions).toBe(0)
    })

    it('should fail for unbalanced transaction', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Unbalanced entry',
          entries: [
            {
              entryId: 'entry-1',
              transactionId: 'txn-1',
              accountId: 'cash',
              entryType: 'debit',
              amount: '1000.00',
            },
            {
              entryId: 'entry-2',
              transactionId: 'txn-1',
              accountId: 'capital',
              entryType: 'credit',
              amount: '900.00', // Unbalanced
            },
          ],
          totalDebit: '1000.00',
          totalCredit: '900.00',
          isBalanced: false,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      expect(result.valid).toBe(false)
      expect(result.violations.some(v => v.code === 'DBL-001')).toBe(true)
    })

    it('should detect incorrect stored totals', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Test',
          entries: [
            {
              entryId: 'entry-1',
              transactionId: 'txn-1',
              accountId: 'cash',
              entryType: 'debit',
              amount: '1000.00',
            },
            {
              entryId: 'entry-2',
              transactionId: 'txn-1',
              accountId: 'capital',
              entryType: 'credit',
              amount: '1000.00',
            },
          ],
          totalDebit: '1100.00', // Wrong
          totalCredit: '1000.00',
          isBalanced: true,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      expect(result.violations.some(v => v.code === 'DBL-002')).toBe(true)
    })
  })

  describe('Orphaned Entries Check', () => {
    it('should detect entry with wrong transaction ID', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Test',
          entries: [
            {
              entryId: 'entry-1',
              transactionId: 'txn-2', // Wrong!
              accountId: 'cash',
              entryType: 'debit',
              amount: '1000.00',
            },
            {
              entryId: 'entry-2',
              transactionId: 'txn-1',
              accountId: 'capital',
              entryType: 'credit',
              amount: '1000.00',
            },
          ],
          totalDebit: '1000.00',
          totalCredit: '1000.00',
          isBalanced: true,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      expect(result.violations.some(v => v.code === 'DBL-005')).toBe(true)
    })
  })

  describe('Referential Integrity Check', () => {
    it('should detect reference to non-existent account', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Test',
          entries: [
            {
              entryId: 'entry-1',
              transactionId: 'txn-1',
              accountId: 'nonexistent', // Invalid
              entryType: 'debit',
              amount: '1000.00',
            },
            {
              entryId: 'entry-2',
              transactionId: 'txn-1',
              accountId: 'capital',
              entryType: 'credit',
              amount: '1000.00',
            },
          ],
          totalDebit: '1000.00',
          totalCredit: '1000.00',
          isBalanced: true,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      expect(result.violations.some(v => v.code === 'DBL-006')).toBe(true)
    })
  })

  describe('Normal Balance Check', () => {
    it('should warn when asset account has credit balance', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Test',
          entries: [
            {
              entryId: 'entry-1',
              transactionId: 'txn-1',
              accountId: 'cash',
              entryType: 'credit', // Credit to asset
              amount: '1000.00',
            },
            {
              entryId: 'entry-2',
              transactionId: 'txn-1',
              accountId: 'capital',
              entryType: 'debit', // Debit to equity
              amount: '1000.00',
            },
          ],
          totalDebit: '1000.00',
          totalCredit: '1000.00',
          isBalanced: true,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      expect(result.violations.some(v => v.code === 'DBL-008')).toBe(true)
    })
  })

  describe('Period Balance Check', () => {
    it('should verify period-level balance', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Test 1',
          entries: [],
          totalDebit: '1000.00',
          totalCredit: '1000.00',
          isBalanced: true,
        },
        {
          transactionId: 'txn-2',
          transactionNumber: 'T002',
          transactionDate: '2026-01-02',
          periodId: 'period-1',
          description: 'Test 2',
          entries: [],
          totalDebit: '500.00',
          totalCredit: '500.00',
          isBalanced: true,
        },
      ]

      const result = checker.checkPeriodBalance(transactions, 'period-1')
      expect(result.balanced).toBe(true)
      expect(result.totalDebit).toBe('1500.00')
      expect(result.totalCredit).toBe('1500.00')
    })
  })

  describe('Integrity Report', () => {
    it('should generate formatted report', () => {
      const transactions: Transaction[] = [
        {
          transactionId: 'txn-1',
          transactionNumber: 'T001',
          transactionDate: '2026-01-01',
          periodId: 'period-1',
          description: 'Unbalanced',
          entries: [],
          totalDebit: '1000.00',
          totalCredit: '900.00',
          isBalanced: false,
        },
      ]

      const result = checker.checkIntegrity(transactions, accounts)
      const report = generateIntegrityReport(result)
      
      expect(report).toContain('Double-Entry Integrity Report')
      expect(report).toContain('INTEGRITY VIOLATIONS DETECTED')
      expect(report).toContain('DBL-001')
    })
  })
})
