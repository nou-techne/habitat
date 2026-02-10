/**
 * Double-Entry Integrity Checker
 * 
 * Verifies accounting integrity across all transactions:
 * - Debits = Credits (fundamental double-entry principle)
 * - Period-level balance checks
 * - Account-level balance checks
 * - Orphaned entries detection
 * - Unbalanced transactions detection
 * - Referential integrity violations
 * 
 * Ensures financial data integrity and catches accounting errors
 * 
 * This is Layer 6 (Constraint) - enforcing accounting rules
 */

import type { UUID, Decimal } from '../types/index.js'

export interface Transaction {
  transactionId: UUID
  transactionNumber: string
  transactionDate: string
  periodId: UUID
  description: string
  entries: TransactionEntry[]
  totalDebit: Decimal
  totalCredit: Decimal
  isBalanced: boolean
}

export interface TransactionEntry {
  entryId: UUID
  transactionId: UUID
  accountId: UUID
  entryType: 'debit' | 'credit'
  amount: Decimal
  description?: string
}

export interface Account {
  accountId: UUID
  accountNumber: string
  accountName: string
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  normalBalance: 'debit' | 'credit'
}

export interface IntegrityCheckResult {
  valid: boolean
  violations: IntegrityViolation[]
  summary: {
    totalTransactions: number
    balancedTransactions: number
    unbalancedTransactions: number
    totalEntries: number
    orphanedEntries: number
    accountsChecked: number
    accountsWithViolations: number
  }
}

export interface IntegrityViolation {
  code: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  transactionId?: UUID
  accountId?: UUID
  expectedValue?: Decimal
  actualValue?: Decimal
  remediation?: string
}

/**
 * Double-Entry Integrity Checker
 */
export class DoubleEntryIntegrityChecker {
  /**
   * Comprehensive integrity check
   */
  checkIntegrity(
    transactions: Transaction[],
    accounts: Account[]
  ): IntegrityCheckResult {
    const violations: IntegrityViolation[] = []

    // Check 1: Transaction-level balance
    const txnCheck = this.checkTransactionBalance(transactions, violations)

    // Check 2: Orphaned entries
    const orphanCheck = this.checkOrphanedEntries(transactions, violations)

    // Check 3: Referential integrity
    const refCheck = this.checkReferentialIntegrity(transactions, accounts, violations)

    // Check 4: Account balance integrity
    const acctCheck = this.checkAccountBalances(transactions, accounts, violations)

    // Check 5: Normal balance violations
    const normalCheck = this.checkNormalBalances(transactions, accounts, violations)

    const summary = {
      totalTransactions: transactions.length,
      balancedTransactions: txnCheck.balanced,
      unbalancedTransactions: txnCheck.unbalanced,
      totalEntries: txnCheck.totalEntries,
      orphanedEntries: orphanCheck.orphanedCount,
      accountsChecked: accounts.length,
      accountsWithViolations: acctCheck.violationCount,
    }

    return {
      valid: violations.length === 0,
      violations,
      summary,
    }
  }

  /**
   * Check 1: Verify each transaction balances (debits = credits)
   */
  private checkTransactionBalance(
    transactions: Transaction[],
    violations: IntegrityViolation[]
  ): {
    balanced: number
    unbalanced: number
    totalEntries: number
  } {
    let balanced = 0
    let unbalanced = 0
    let totalEntries = 0

    for (const txn of transactions) {
      totalEntries += txn.entries.length

      // Calculate debits and credits
      let debitSum = 0
      let creditSum = 0

      for (const entry of txn.entries) {
        if (entry.entryType === 'debit') {
          debitSum += parseFloat(entry.amount)
        } else {
          creditSum += parseFloat(entry.amount)
        }
      }

      // Check if balanced (within 0.01 tolerance)
      if (Math.abs(debitSum - creditSum) > 0.01) {
        unbalanced++

        violations.push({
          code: 'DBL-001',
          severity: 'critical',
          description: 'Transaction debits do not equal credits',
          transactionId: txn.transactionId,
          expectedValue: debitSum.toFixed(2),
          actualValue: creditSum.toFixed(2),
          remediation: `Adjust transaction entries to balance. Debits: ${debitSum.toFixed(2)}, Credits: ${creditSum.toFixed(2)}, Difference: ${(debitSum - creditSum).toFixed(2)}`,
        })
      } else {
        balanced++
      }

      // Verify stored totals match calculated
      if (Math.abs(parseFloat(txn.totalDebit) - debitSum) > 0.01) {
        violations.push({
          code: 'DBL-002',
          severity: 'high',
          description: 'Stored debit total does not match calculated sum',
          transactionId: txn.transactionId,
          expectedValue: debitSum.toFixed(2),
          actualValue: txn.totalDebit,
          remediation: 'Recalculate transaction totals',
        })
      }

      if (Math.abs(parseFloat(txn.totalCredit) - creditSum) > 0.01) {
        violations.push({
          code: 'DBL-003',
          severity: 'high',
          description: 'Stored credit total does not match calculated sum',
          transactionId: txn.transactionId,
          expectedValue: creditSum.toFixed(2),
          actualValue: txn.totalCredit,
          remediation: 'Recalculate transaction totals',
        })
      }

      // Verify isBalanced flag
      const shouldBeBalanced = Math.abs(debitSum - creditSum) <= 0.01
      if (txn.isBalanced !== shouldBeBalanced) {
        violations.push({
          code: 'DBL-004',
          severity: 'medium',
          description: 'Transaction isBalanced flag incorrect',
          transactionId: txn.transactionId,
          remediation: 'Update isBalanced flag to match actual balance status',
        })
      }
    }

    return { balanced, unbalanced, totalEntries }
  }

  /**
   * Check 2: Detect orphaned entries (entries without parent transaction)
   */
  private checkOrphanedEntries(
    transactions: Transaction[],
    violations: IntegrityViolation[]
  ): {
    orphanedCount: number
  } {
    const transactionIds = new Set(transactions.map(t => t.transactionId))
    let orphanedCount = 0

    for (const txn of transactions) {
      for (const entry of txn.entries) {
        if (entry.transactionId !== txn.transactionId) {
          orphanedCount++

          violations.push({
            code: 'DBL-005',
            severity: 'critical',
            description: 'Entry references different transaction than parent',
            transactionId: txn.transactionId,
            remediation: 'Fix entry.transactionId to match parent transaction',
          })
        }
      }
    }

    return { orphanedCount }
  }

  /**
   * Check 3: Verify referential integrity (all accounts exist)
   */
  private checkReferentialIntegrity(
    transactions: Transaction[],
    accounts: Account[],
    violations: IntegrityViolation[]
  ): {
    missingAccounts: number
  } {
    const accountIds = new Set(accounts.map(a => a.accountId))
    let missingAccounts = 0

    for (const txn of transactions) {
      for (const entry of txn.entries) {
        if (!accountIds.has(entry.accountId)) {
          missingAccounts++

          violations.push({
            code: 'DBL-006',
            severity: 'critical',
            description: 'Entry references non-existent account',
            transactionId: txn.transactionId,
            accountId: entry.accountId,
            remediation: 'Create missing account or correct account reference',
          })
        }
      }
    }

    return { missingAccounts }
  }

  /**
   * Check 4: Verify account balances are calculable
   */
  private checkAccountBalances(
    transactions: Transaction[],
    accounts: Account[],
    violations: IntegrityViolation[]
  ): {
    violationCount: number
  } {
    const accountBalances = new Map<UUID, { debit: number; credit: number }>()

    // Initialize accounts
    for (const account of accounts) {
      accountBalances.set(account.accountId, { debit: 0, credit: 0 })
    }

    // Accumulate entries
    for (const txn of transactions) {
      for (const entry of txn.entries) {
        const balance = accountBalances.get(entry.accountId)
        if (!balance) continue // Already caught in referential integrity check

        const amount = parseFloat(entry.amount)
        if (entry.entryType === 'debit') {
          balance.debit += amount
        } else {
          balance.credit += amount
        }
      }
    }

    // Check for accounts with no activity (warning)
    let violationCount = 0
    for (const account of accounts) {
      const balance = accountBalances.get(account.accountId)!

      if (balance.debit === 0 && balance.credit === 0) {
        violations.push({
          code: 'DBL-007',
          severity: 'low',
          description: 'Account has no transaction activity',
          accountId: account.accountId,
          remediation: 'Consider archiving inactive accounts',
        })
        violationCount++
      }
    }

    return { violationCount }
  }

  /**
   * Check 5: Verify normal balance conventions
   */
  private checkNormalBalances(
    transactions: Transaction[],
    accounts: Account[],
    violations: IntegrityViolation[]
  ): {
    violationCount: number
  } {
    const accountBalances = new Map<UUID, { debit: number; credit: number }>()

    // Initialize
    for (const account of accounts) {
      accountBalances.set(account.accountId, { debit: 0, credit: 0 })
    }

    // Accumulate
    for (const txn of transactions) {
      for (const entry of txn.entries) {
        const balance = accountBalances.get(entry.accountId)
        if (!balance) continue

        const amount = parseFloat(entry.amount)
        if (entry.entryType === 'debit') {
          balance.debit += amount
        } else {
          balance.credit += amount
        }
      }
    }

    // Check normal balances
    let violationCount = 0
    for (const account of accounts) {
      const balance = accountBalances.get(account.accountId)!
      const netBalance = balance.debit - balance.credit

      // Asset, Expense → normal debit balance (positive net)
      // Liability, Equity, Revenue → normal credit balance (negative net)
      
      if (account.normalBalance === 'debit' && netBalance < 0) {
        violations.push({
          code: 'DBL-008',
          severity: 'medium',
          description: 'Account has credit balance but normal balance is debit',
          accountId: account.accountId,
          remediation: 'Review transactions - account balance is unusual for account type',
        })
        violationCount++
      } else if (account.normalBalance === 'credit' && netBalance > 0) {
        violations.push({
          code: 'DBL-009',
          severity: 'medium',
          description: 'Account has debit balance but normal balance is credit',
          accountId: account.accountId,
          remediation: 'Review transactions - account balance is unusual for account type',
        })
        violationCount++
      }
    }

    return { violationCount }
  }

  /**
   * Check period-level balance
   */
  checkPeriodBalance(
    transactions: Transaction[],
    periodId: UUID
  ): {
    balanced: boolean
    totalDebit: Decimal
    totalCredit: Decimal
    difference: Decimal
  } {
    const periodTxns = transactions.filter(t => t.periodId === periodId)

    let totalDebit = 0
    let totalCredit = 0

    for (const txn of periodTxns) {
      totalDebit += parseFloat(txn.totalDebit)
      totalCredit += parseFloat(txn.totalCredit)
    }

    const difference = totalDebit - totalCredit

    return {
      balanced: Math.abs(difference) <= 0.01,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      difference: difference.toFixed(2),
    }
  }

  /**
   * Get account balance
   */
  getAccountBalance(
    transactions: Transaction[],
    accountId: UUID
  ): {
    debitTotal: Decimal
    creditTotal: Decimal
    netBalance: Decimal
  } {
    let debitTotal = 0
    let creditTotal = 0

    for (const txn of transactions) {
      for (const entry of txn.entries) {
        if (entry.accountId === accountId) {
          const amount = parseFloat(entry.amount)
          if (entry.entryType === 'debit') {
            debitTotal += amount
          } else {
            creditTotal += amount
          }
        }
      }
    }

    return {
      debitTotal: debitTotal.toFixed(2),
      creditTotal: creditTotal.toFixed(2),
      netBalance: (debitTotal - creditTotal).toFixed(2),
    }
  }
}

/**
 * Generate integrity report
 */
export function generateIntegrityReport(result: IntegrityCheckResult): string {
  let report = '=== Double-Entry Integrity Report ===\n\n'

  // Overall status
  report += `Status: ${result.valid ? '✓ VALID' : '✗ INTEGRITY VIOLATIONS DETECTED'}\n\n`

  // Summary
  report += '--- Summary ---\n'
  report += `Total Transactions: ${result.summary.totalTransactions}\n`
  report += `Balanced: ${result.summary.balancedTransactions}\n`
  report += `Unbalanced: ${result.summary.unbalancedTransactions}\n`
  report += `Total Entries: ${result.summary.totalEntries}\n`
  report += `Orphaned Entries: ${result.summary.orphanedEntries}\n`
  report += `Accounts Checked: ${result.summary.accountsChecked}\n`
  report += `Accounts with Violations: ${result.summary.accountsWithViolations}\n\n`

  // Violations by severity
  if (result.violations.length > 0) {
    const bySeverity = {
      critical: result.violations.filter(v => v.severity === 'critical'),
      high: result.violations.filter(v => v.severity === 'high'),
      medium: result.violations.filter(v => v.severity === 'medium'),
      low: result.violations.filter(v => v.severity === 'low'),
    }

    for (const [severity, violations] of Object.entries(bySeverity)) {
      if (violations.length === 0) continue

      report += `--- ${severity.toUpperCase()} Violations (${violations.length}) ---\n`
      for (const violation of violations) {
        report += `[${violation.code}] ${violation.description}\n`
        if (violation.transactionId) {
          report += `  Transaction: ${violation.transactionId}\n`
        }
        if (violation.accountId) {
          report += `  Account: ${violation.accountId}\n`
        }
        if (violation.expectedValue && violation.actualValue) {
          report += `  Expected: ${violation.expectedValue}, Actual: ${violation.actualValue}\n`
        }
        if (violation.remediation) {
          report += `  Remediation: ${violation.remediation}\n`
        }
        report += '\n'
      }
    }
  }

  return report
}
