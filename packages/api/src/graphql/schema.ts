/**
 * GraphQL Schema Definition
 * 
 * Complete type definitions for Habitat API
 * Maps to REA data layer entities (Treasury, People, Agreements)
 */

export const typeDefs = `#graphql
  # ============================================================================
  # Common Types & Scalars
  # ============================================================================

  scalar DateTime
  scalar Decimal
  scalar JSON

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  enum SortOrder {
    ASC
    DESC
  }

  # ============================================================================
  # Treasury Types
  # ============================================================================

  enum AccountType {
    ASSET
    LIABILITY
    EQUITY
    REVENUE
    EXPENSE
  }

  enum LedgerType {
    BOOK
    TAX
  }

  enum NormalBalance {
    DEBIT
    CREDIT
  }

  type Account {
    accountId: ID!
    accountNumber: String!
    accountName: String!
    accountType: AccountType!
    ledgerType: LedgerType!
    normalBalance: NormalBalance!
    description: String
    isActive: Boolean!
    isMemberCapital: Boolean!
    memberId: ID
    parentAccountId: ID
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AccountConnection {
    edges: [AccountEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AccountEdge {
    node: Account!
    cursor: String!
  }

  input AccountFilter {
    accountType: AccountType
    ledgerType: LedgerType
    isActive: Boolean
    isMemberCapital: Boolean
    search: String
  }

  input CreateAccountInput {
    accountNumber: String!
    accountName: String!
    accountType: AccountType!
    ledgerType: LedgerType!
    normalBalance: NormalBalance!
    description: String
    parentAccountId: ID
    metadata: JSON
  }

  enum TransactionStatus {
    DRAFT
    POSTED
    VOIDED
  }

  enum EntryType {
    DEBIT
    CREDIT
  }

  type TransactionEntry {
    entryId: ID!
    accountId: ID!
    account: Account
    entryType: EntryType!
    amount: Decimal!
    description: String
    lineOrder: Int!
  }

  type Transaction {
    transactionId: ID!
    transactionNumber: String!
    transactionDate: DateTime!
    periodId: ID!
    period: Period
    status: TransactionStatus!
    description: String!
    entries: [TransactionEntry!]!
    totalDebit: Decimal!
    totalCredit: Decimal!
    isBalanced: Boolean!
    sourceType: String
    sourceId: ID
    postedAt: DateTime
    voidedAt: DateTime
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
  }

  input TransactionFilter {
    periodId: ID
    accountId: ID
    status: TransactionStatus
    fromDate: DateTime
    toDate: DateTime
  }

  input TransactionEntryInput {
    accountId: ID!
    entryType: EntryType!
    amount: Decimal!
    description: String
  }

  input CreateTransactionInput {
    transactionNumber: String!
    transactionDate: DateTime!
    periodId: ID!
    description: String!
    entries: [TransactionEntryInput!]!
    sourceType: String
    sourceId: ID
    metadata: JSON
  }

  enum PeriodType {
    MONTHLY
    QUARTERLY
    ANNUAL
  }

  enum PeriodStatus {
    OPEN
    CLOSED
    LOCKED
  }

  type Period {
    periodId: ID!
    periodName: String!
    periodType: PeriodType!
    startDate: DateTime!
    endDate: DateTime!
    status: PeriodStatus!
    fiscalYear: Int!
    fiscalQuarter: Int
    fiscalMonth: Int
    closedAt: DateTime
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PeriodConnection {
    edges: [PeriodEdge!]!
    pageInfo: PageInfo!
  }

  type PeriodEdge {
    node: Period!
    cursor: String!
  }

  input PeriodFilter {
    status: PeriodStatus
    fiscalYear: Int
    periodType: PeriodType
  }

  input CreatePeriodInput {
    periodName: String!
    periodType: PeriodType!
    startDate: DateTime!
    endDate: DateTime!
    fiscalYear: Int!
    fiscalQuarter: Int
    fiscalMonth: Int
    metadata: JSON
  }

  type AccountBalance {
    accountId: ID!
    account: Account
    debitBalance: Decimal!
    creditBalance: Decimal!
    netBalance: Decimal!
    periodId: ID
    asOfDate: DateTime!
  }

  # ============================================================================
  # People Types
  # ============================================================================

  enum MemberTier {
    COMMUNITY
    COWORKING
    COOPERATIVE
  }

  enum MemberStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
  }

  type Member {
    memberId: ID!
    memberNumber: String!
    ensName: String
    displayName: String!
    tier: MemberTier!
    status: MemberStatus!
    joinedAt: DateTime
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MemberConnection {
    edges: [MemberEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type MemberEdge {
    node: Member!
    cursor: String!
  }

  input MemberFilter {
    tier: MemberTier
    status: MemberStatus
    search: String
  }

  input CreateMemberInput {
    memberNumber: String!
    ensName: String
    displayName: String!
    tier: MemberTier!
    metadata: JSON
  }

  enum ContributionType {
    LABOR
    EXPERTISE
    CAPITAL
    RELATIONSHIP
  }

  enum ContributionStatus {
    DRAFT
    SUBMITTED
    APPROVED
    REJECTED
  }

  type Contribution {
    contributionId: ID!
    contributionNumber: String!
    memberId: ID!
    member: Member
    contributionType: ContributionType!
    status: ContributionStatus!
    description: String!
    
    # Labor fields
    hours: Decimal
    ratePerHour: Decimal
    
    # Expertise fields
    expertise: String
    
    # Capital fields
    capitalType: String
    
    # Relationship fields
    relationshipType: String
    
    # Common
    monetaryValue: Decimal
    evidenceUrls: [String!]
    
    submittedAt: DateTime
    reviewedAt: DateTime
    reviewedBy: ID
    reviewNotes: String
    
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ContributionConnection {
    edges: [ContributionEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ContributionEdge {
    node: Contribution!
    cursor: String!
  }

  input ContributionFilter {
    memberId: ID
    contributionType: ContributionType
    status: ContributionStatus
    fromDate: DateTime
    toDate: DateTime
  }

  input CreateContributionInput {
    contributionNumber: String!
    memberId: ID!
    contributionType: ContributionType!
    description: String!
    hours: Decimal
    ratePerHour: Decimal
    expertise: String
    capitalType: String
    relationshipType: String
    monetaryValue: Decimal
    evidenceUrls: [String!]
    metadata: JSON
  }

  type Approval {
    approvalId: ID!
    contributionId: ID!
    contribution: Contribution
    approverId: ID!
    approver: Member
    decision: String!
    notes: String
    approvedAt: DateTime!
  }

  type PatronageByType {
    contributionType: ContributionType!
    count: Int!
    totalValue: Decimal!
    approvedValue: Decimal!
  }

  type PatronageSummary {
    memberId: ID!
    member: Member
    periodId: ID
    totalContributions: Int!
    totalValue: Decimal!
    approvedValue: Decimal!
    byType: [PatronageByType!]!
  }

  # ============================================================================
  # Agreements Types
  # ============================================================================

  enum AllocationStatus {
    DRAFT
    PROPOSED
    APPROVED
    EXECUTED
  }

  type AllocationByType {
    type: ContributionType!
    patronageValue: Decimal!
    weight: Decimal!
    weightedValue: Decimal!
    allocation: Decimal!
  }

  type Allocation {
    allocationId: ID!
    allocationNumber: String!
    memberId: ID!
    member: Member
    periodId: ID!
    period: Period
    status: AllocationStatus!
    totalPatronage: Decimal!
    allocationsByType: [AllocationByType!]!
    cashDistribution: Decimal!
    retainedAllocation: Decimal!
    retainedPercentage: Decimal!
    proposedAt: DateTime
    approvedAt: DateTime
    approvedBy: ID
    executedAt: DateTime
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AllocationConnection {
    edges: [AllocationEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AllocationEdge {
    node: Allocation!
    cursor: String!
  }

  input AllocationFilter {
    periodId: ID
    memberId: ID
    status: AllocationStatus
  }

  enum DistributionMethod {
    ACH
    CHECK
    WIRE
    RETAINED
  }

  enum DistributionStatus {
    SCHEDULED
    PROCESSING
    COMPLETED
    FAILED
    CANCELLED
  }

  type Distribution {
    distributionId: ID!
    distributionNumber: String!
    allocationId: ID!
    allocation: Allocation
    memberId: ID!
    member: Member
    amount: Decimal!
    currency: String!
    method: DistributionMethod!
    status: DistributionStatus!
    scheduledDate: DateTime!
    processedAt: DateTime
    completedAt: DateTime
    failedAt: DateTime
    failureReason: String
    transactionId: ID
    paymentReference: String
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DistributionConnection {
    edges: [DistributionEdge!]!
    pageInfo: PageInfo!
  }

  type DistributionEdge {
    node: Distribution!
    cursor: String!
  }

  input DistributionFilter {
    allocationId: ID
    memberId: ID
    status: DistributionStatus
  }

  type CapitalAccount {
    accountId: ID!
    memberId: ID!
    member: Member
    bookBalance: Decimal!
    taxBalance: Decimal!
    contributedCapital: Decimal!
    retainedPatronage: Decimal!
    distributedPatronage: Decimal!
    lastAllocationId: ID
    lastDistributionId: ID
    lastUpdatedAt: DateTime!
    metadata: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AllocationSummary {
    periodId: ID!
    period: Period
    totalAllocated: Decimal!
    totalCash: Decimal!
    totalRetained: Decimal!
    averageAllocation: Decimal!
    memberCount: Int!
    byType: [AllocationByType!]!
  }

  # ============================================================================
  # Queries
  # ============================================================================

  type Query {
    # Treasury
    account(accountId: ID!): Account
    accounts(filter: AccountFilter, first: Int, after: String): AccountConnection!
    transaction(transactionId: ID!): Transaction
    transactions(filter: TransactionFilter, first: Int, after: String): TransactionConnection!
    accountBalance(accountId: ID!, asOfDate: DateTime): AccountBalance
    period(periodId: ID!): Period
    periods(filter: PeriodFilter, first: Int, after: String): PeriodConnection!
    currentPeriod: Period
    
    # People
    member(memberId: ID!): Member
    members(filter: MemberFilter, first: Int, after: String): MemberConnection!
    contribution(contributionId: ID!): Contribution
    contributions(filter: ContributionFilter, first: Int, after: String): ContributionConnection!
    patronageSummary(memberId: ID!, periodId: ID): PatronageSummary
    
    # Agreements
    allocation(allocationId: ID!): Allocation
    allocations(filter: AllocationFilter, first: Int, after: String): AllocationConnection!
    distribution(distributionId: ID!): Distribution
    distributions(filter: DistributionFilter, first: Int, after: String): DistributionConnection!
    capitalAccount(memberId: ID!): CapitalAccount
    allocationSummary(periodId: ID!): AllocationSummary
  }

  # ============================================================================
  # Mutations
  # ============================================================================

  type Mutation {
    # Treasury
    createAccount(input: CreateAccountInput!): Account!
    createTransaction(input: CreateTransactionInput!): Transaction!
    voidTransaction(transactionId: ID!): Transaction!
    createPeriod(input: CreatePeriodInput!): Period!
    closePeriod(periodId: ID!): Period!
    
    # People
    createMember(input: CreateMemberInput!): Member!
    createContribution(input: CreateContributionInput!): Contribution!
    submitContribution(contributionId: ID!): Contribution!
    approveContribution(contributionId: ID!, notes: String): Contribution!
    rejectContribution(contributionId: ID!, reason: String!): Contribution!
    
    # Agreements
    proposeAllocation(allocationId: ID!): Allocation!
    approveAllocation(allocationId: ID!): Allocation!
    scheduleDistribution(distributionId: ID!, scheduledDate: DateTime!): Distribution!
    completeDistribution(distributionId: ID!, transactionId: ID, paymentReference: String): Distribution!
  }
`
