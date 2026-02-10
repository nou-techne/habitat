/**
 * Seed Data Generator
 * 
 * Generates fixture data for testing and development:
 * - Techne/RegenHub cooperative setup
 * - 5 founding members
 * - Chart of accounts (Treasury)
 * - 20 contributions across all types
 * - 1 open period (Q1 2026)
 * - Sample transactions
 */

import type { DatabaseClient } from '../db/client.js'
import { 
  createAccount, 
  createPeriod, 
  createTransaction 
} from './treasury.js'
import { 
  createMember, 
  createContribution, 
  submitContribution, 
  approveContribution 
} from './people.js'
import type { 
  AccountType, 
  LedgerType, 
  MemberTier, 
  ContributionType 
} from '@habitat/shared'

export interface SeedDataOptions {
  cooperativeName?: string
  memberCount?: number
  contributionCount?: number
  includeTransactions?: boolean
}

export async function seedDatabase(
  client: DatabaseClient,
  options: SeedDataOptions = {}
): Promise<void> {
  const {
    cooperativeName = 'Techne / RegenHub',
    memberCount = 5,
    contributionCount = 20,
    includeTransactions = true,
  } = options

  console.log(`Seeding database for ${cooperativeName}...`)

  // 1. Create Chart of Accounts
  console.log('Creating chart of accounts...')
  const accounts = await createChartOfAccounts(client)

  // 2. Create Accounting Period (Q1 2026)
  console.log('Creating Q1 2026 period...')
  const period = await createPeriod(client, {
    periodName: 'Q1 2026',
    periodType: 'quarterly',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    fiscalYear: 2026,
    fiscalQuarter: 1,
    metadata: { cooperativeName },
  })

  // 3. Create Members
  console.log(`Creating ${memberCount} members...`)
  const members = await createMembers(client, memberCount)

  // 4. Create Contributions
  console.log(`Creating ${contributionCount} contributions...`)
  const contributions = await createContributions(
    client,
    members.map(m => m.memberId),
    contributionCount,
    period.periodId
  )

  // 5. Approve some contributions
  console.log('Approving contributions...')
  const approverId = members[0].memberId // First member is steward
  
  for (let i = 0; i < Math.min(15, contributions.length); i++) {
    await approveContribution(client, contributions[i].contributionId, approverId)
  }

  // 6. Create sample transactions
  if (includeTransactions) {
    console.log('Creating sample transactions...')
    await createSampleTransactions(client, period.periodId, accounts)
  }

  console.log('✓ Seed data created successfully')
}

// ============================================================================
// Chart of Accounts
// ============================================================================

interface AccountSet {
  [key: string]: string // account name -> account id
}

async function createChartOfAccounts(client: DatabaseClient): Promise<AccountSet> {
  const accounts: AccountSet = {}

  // Asset accounts
  const cashAccount = await createAccount(client, {
    accountNumber: '1000',
    accountName: 'Cash - Operating',
    accountType: 'asset' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'debit',
    description: 'Primary operating cash account',
  })
  accounts['Cash'] = cashAccount.accountId

  const bankAccount = await createAccount(client, {
    accountNumber: '1010',
    accountName: 'Bank - Mercury',
    accountType: 'asset' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'debit',
    description: 'Mercury cooperative banking account',
  })
  accounts['Bank'] = bankAccount.accountId

  // Equity accounts
  const retainedAccount = await createAccount(client, {
    accountNumber: '3000',
    accountName: 'Retained Patronage',
    accountType: 'equity' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'credit',
    description: 'Accumulated retained patronage allocations',
  })
  accounts['RetainedPatronage'] = retainedAccount.accountId

  const contributedAccount = await createAccount(client, {
    accountNumber: '3100',
    accountName: 'Contributed Capital',
    accountType: 'equity' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'credit',
    description: 'Member capital contributions',
  })
  accounts['ContributedCapital'] = contributedAccount.accountId

  // Revenue accounts
  const serviceRevenue = await createAccount(client, {
    accountNumber: '4000',
    accountName: 'Service Revenue',
    accountType: 'revenue' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'credit',
    description: 'Revenue from member services',
  })
  accounts['ServiceRevenue'] = serviceRevenue.accountId

  // Expense accounts
  const laborExpense = await createAccount(client, {
    accountNumber: '5000',
    accountName: 'Labor Expense',
    accountType: 'expense' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'debit',
    description: 'Member labor expenses',
  })
  accounts['LaborExpense'] = laborExpense.accountId

  const operatingExpense = await createAccount(client, {
    accountNumber: '5100',
    accountName: 'Operating Expense',
    accountType: 'expense' as AccountType,
    ledgerType: 'book' as LedgerType,
    normalBalance: 'debit',
    description: 'General operating expenses',
  })
  accounts['OperatingExpense'] = operatingExpense.accountId

  return accounts
}

// ============================================================================
// Members
// ============================================================================

async function createMembers(
  client: DatabaseClient,
  count: number
): Promise<Array<{ memberId: string; memberNumber: string }>> {
  const members = []
  const names = [
    { ens: 'todd.habitat.eth', display: 'Todd Youngblood', tier: 'cooperative' as MemberTier },
    { ens: 'kevin.habitat.eth', display: 'Kevin Owocki', tier: 'cooperative' as MemberTier },
    { ens: 'jeremy.habitat.eth', display: 'Jeremy', tier: 'cooperative' as MemberTier },
    { ens: 'aaron.habitat.eth', display: 'Aaron G Neyer', tier: 'coworking' as MemberTier },
    { ens: 'benjamin.habitat.eth', display: 'Benjamin Ross', tier: 'coworking' as MemberTier },
  ]

  for (let i = 0; i < Math.min(count, names.length); i++) {
    const member = await createMember(client, {
      memberNumber: `M${String(i + 1).padStart(4, '0')}`,
      ensName: names[i].ens,
      displayName: names[i].display,
      tier: names[i].tier,
      metadata: {
        seedData: true,
        role: i === 0 ? 'steward' : 'member',
      },
    })
    members.push(member)
  }

  return members
}

// ============================================================================
// Contributions
// ============================================================================

async function createContributions(
  client: DatabaseClient,
  memberIds: string[],
  count: number,
  periodId: string
): Promise<Array<{ contributionId: string }>> {
  const contributions = []
  const types: ContributionType[] = ['labor', 'expertise', 'capital', 'relationship']

  const templates = [
    // Labor
    { type: 'labor', desc: 'Development work on Habitat MVP', hours: '40', value: '4000' },
    { type: 'labor', desc: 'Techne space buildout and setup', hours: '20', value: '1500' },
    { type: 'labor', desc: 'Member onboarding and documentation', hours: '8', value: '800' },
    { type: 'labor', desc: 'Weekly operations coordination', hours: '12', value: '1200' },
    
    // Expertise
    { type: 'expertise', desc: 'Legal formation and operating agreement review', expertise: 'Legal counsel', value: '5000' },
    { type: 'expertise', desc: 'Financial modeling and patronage calculation design', expertise: 'Financial planning', value: '3000' },
    { type: 'expertise', desc: 'Brand identity and design system', expertise: 'Design', value: '2500' },
    { type: 'expertise', desc: 'Technical architecture consultation', expertise: 'System design', value: '4000' },
    
    // Capital
    { type: 'capital', desc: 'Seed funding for cooperative formation', capitalType: 'cash', value: '10000' },
    { type: 'capital', desc: 'Equipment donation - laptops and monitors', capitalType: 'equipment', value: '3000' },
    { type: 'capital', desc: 'Space lease deposit and first month', capitalType: 'space', value: '5000' },
    { type: 'capital', desc: 'Software licenses and infrastructure', capitalType: 'cash', value: '1200' },
    
    // Relationship
    { type: 'relationship', desc: 'Introduction to potential venture partner', relationshipType: 'partnership', value: '0' },
    { type: 'relationship', desc: 'ETHBoulder community connections', relationshipType: 'network_access', value: '0' },
    { type: 'relationship', desc: 'LearnVibe.Build pilot engagement', relationshipType: 'customer_referral', value: '0' },
    { type: 'relationship', desc: 'Gitcoin ecosystem reputation and trust', relationshipType: 'reputation', value: '0' },
  ]

  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length]
    const memberId = memberIds[i % memberIds.length]

    const input: any = {
      contributionNumber: `C${String(i + 1).padStart(5, '0')}`,
      memberId,
      contributionType: template.type as ContributionType,
      description: template.desc,
      metadata: { seedData: true, periodId },
    }

    if (template.type === 'labor') {
      input.hours = template.hours
      input.monetaryValue = template.value
    } else if (template.type === 'expertise') {
      input.expertise = (template as any).expertise
      input.monetaryValue = template.value
    } else if (template.type === 'capital') {
      input.capitalType = (template as any).capitalType
      input.monetaryValue = template.value
    } else if (template.type === 'relationship') {
      input.relationshipType = (template as any).relationshipType
    }

    const contribution = await createContribution(client, input)
    await submitContribution(client, contribution.contributionId)
    contributions.push(contribution)
  }

  return contributions
}

// ============================================================================
// Sample Transactions
// ============================================================================

async function createSampleTransactions(
  client: DatabaseClient,
  periodId: string,
  accounts: AccountSet
): Promise<void> {
  // Transaction 1: Initial capital contribution
  await createTransaction(client, {
    transactionNumber: 'TX0001',
    transactionDate: '2026-01-15',
    periodId,
    description: 'Initial capital contribution from founding members',
    entries: [
      {
        accountId: accounts['Bank'],
        entryType: 'debit',
        amount: '25000.00',
        description: 'Cash received',
      },
      {
        accountId: accounts['ContributedCapital'],
        entryType: 'credit',
        amount: '25000.00',
        description: 'Member capital contributions',
      },
    ],
    sourceType: 'capital_contribution',
    metadata: { seedData: true },
  })

  // Transaction 2: Service revenue
  await createTransaction(client, {
    transactionNumber: 'TX0002',
    transactionDate: '2026-02-01',
    periodId,
    description: 'Service revenue from LearnVibe.Build engagement',
    entries: [
      {
        accountId: accounts['Bank'],
        entryType: 'debit',
        amount: '5000.00',
        description: 'Payment received',
      },
      {
        accountId: accounts['ServiceRevenue'],
        entryType: 'credit',
        amount: '5000.00',
        description: 'Consulting services',
      },
    ],
    sourceType: 'service_revenue',
    metadata: { seedData: true },
  })

  // Transaction 3: Operating expenses
  await createTransaction(client, {
    transactionNumber: 'TX0003',
    transactionDate: '2026-02-15',
    periodId,
    description: 'Monthly operating expenses - Feb 2026',
    entries: [
      {
        accountId: accounts['OperatingExpense'],
        entryType: 'debit',
        amount: '3200.00',
        description: 'Space, utilities, software',
      },
      {
        accountId: accounts['Bank'],
        entryType: 'credit',
        amount: '3200.00',
        description: 'Payment for operating expenses',
      },
    ],
    sourceType: 'operating_expense',
    metadata: { seedData: true },
  })
}

// ============================================================================
// CLI interface
// ============================================================================

export async function seedFromCLI(): Promise<void> {
  const { getConfig } = await import('../config.js')
  const { createDatabaseClient } = await import('../db/client.js')

  const config = getConfig()
  const client = await createDatabaseClient(config.database)

  try {
    await seedDatabase(client)
    console.log('✓ Database seeded successfully')
    process.exit(0)
  } catch (error) {
    console.error('✗ Seed failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFromCLI()
}
