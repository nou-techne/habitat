# API Server Implementation — Core Queries

**Sprint:** 53  
**Phase:** 3 — Production Deployment  
**Layer:** Infrastructure (View + Flow)  
**Status:** Specification

---

## Purpose

Implement the GraphQL API server core: Apollo Server setup, type definitions, and query resolvers for Treasury, People, and Agreements bounded contexts. Provides read-only access to all Habitat data with proper authentication, authorization, and performance optimization.

---

## Architecture Overview

**Technology Stack:**
- **Runtime:** Node.js 18+
- **GraphQL Server:** Apollo Server 4
- **Database Client:** node-postgres (pg)
- **Schema Generation:** GraphQL Code Generator
- **Type Safety:** TypeScript
- **Authentication:** JWT tokens
- **Authorization:** Role-based + RLS enforcement

**Request Flow:**

```
Client Request
    ↓
Apollo Server (port 4000)
    ↓
Authentication Middleware (JWT verification)
    ↓
Context Builder (member_id, roles)
    ↓
Query Resolver
    ↓
PostgreSQL (with RLS session context)
    ↓
Response Formatting
    ↓
Client Response
```

---

## Project Structure

```
services/api/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Server entry point
│   ├── context.ts                  # Request context builder
│   ├── schema/
│   │   ├── index.ts                # Combined schema
│   │   ├── treasury.graphql        # Treasury type defs
│   │   ├── people.graphql          # People type defs
│   │   ├── agreements.graphql      # Agreements type defs
│   │   └── common.graphql          # Shared types
│   ├── resolvers/
│   │   ├── index.ts                # Combined resolvers
│   │   ├── treasury.ts             # Treasury resolvers
│   │   ├── people.ts               # People resolvers
│   │   └── agreements.ts           # Agreements resolvers
│   ├── datasources/
│   │   ├── TreasuryAPI.ts          # Treasury data access
│   │   ├── PeopleAPI.ts            # People data access
│   │   └── AgreementsAPI.ts        # Agreements data access
│   ├── auth/
│   │   ├── middleware.ts           # JWT verification
│   │   └── permissions.ts          # Authorization rules
│   └── utils/
│       ├── db.ts                   # Database connection pool
│       └── errors.ts               # Custom error types
└── tests/
    ├── integration/
    └── unit/
```

---

## Apollo Server Setup

**File:** `src/index.ts`

```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { buildContext } from './context';
import { resolvers } from './resolvers';

// Load GraphQL schema
const typeDefs = [
  readFileSync('./src/schema/common.graphql', 'utf8'),
  readFileSync('./src/schema/treasury.graphql', 'utf8'),
  readFileSync('./src/schema/people.graphql', 'utf8'),
  readFileSync('./src/schema/agreements.graphql', 'utf8'),
].join('\n');

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  csrfPrevention: true,
  cache: 'bounded',
  formatError: (error) => {
    // Log error for monitoring
    console.error('GraphQL Error:', error);
    
    // Hide internal details in production
    if (process.env.NODE_ENV === 'production') {
      return {
        message: error.message,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
        },
      };
    }
    
    return error;
  },
});

// Start server
const { url } = await startStandaloneServer(server, {
  context: buildContext,
  listen: { port: parseInt(process.env.PORT || '4000') },
});

console.log(`🚀 Habitat API Server ready at ${url}`);
```

---

## Context Builder

**File:** `src/context.ts`

```typescript
import { StandaloneServerContextFunctionArgument } from '@apollo/server/standalone';
import jwt from 'jsonwebtoken';
import { pool } from './utils/db';
import { TreasuryAPI } from './datasources/TreasuryAPI';
import { PeopleAPI } from './datasources/PeopleAPI';
import { AgreementsAPI } from './datasources/AgreementsAPI';

export interface HabitatContext {
  memberId?: string;
  roles: string[];
  dataSources: {
    treasury: TreasuryAPI;
    people: PeopleAPI;
    agreements: AgreementsAPI;
  };
  db: typeof pool;
}

export async function buildContext({
  req,
}: StandaloneServerContextFunctionArgument): Promise<HabitatContext> {
  // Extract JWT from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  let memberId: string | undefined;
  let roles: string[] = [];
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        memberId: string;
        roles: string[];
      };
      memberId = decoded.memberId;
      roles = decoded.roles || ['member'];
    } catch (error) {
      // Invalid token - proceed as unauthenticated
      console.warn('Invalid JWT token:', error);
    }
  }
  
  // Set session context for RLS
  if (memberId) {
    await pool.query(`SET LOCAL app.current_member_id = $1`, [memberId]);
    await pool.query(`SET LOCAL app.current_member_roles = $1`, [roles]);
  }
  
  return {
    memberId,
    roles,
    dataSources: {
      treasury: new TreasuryAPI(pool),
      people: new PeopleAPI(pool),
      agreements: new AgreementsAPI(pool),
    },
    db: pool,
  };
}
```

---

## Common Schema

**File:** `src/schema/common.graphql`

```graphql
"""
ISO 8601 datetime string (e.g., 2024-02-09T21:00:00Z)
"""
scalar DateTime

"""
Currency amount in USD cents (to avoid floating point errors)
"""
scalar Money

"""
UUID string
"""
scalar UUID

"""
JSON object
"""
scalar JSON

"""
Pagination arguments (Relay spec)
"""
input ConnectionArgs {
  first: Int
  after: String
  last: Int
  before: String
}

"""
Page info (Relay spec)
"""
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

"""
Standard error type
"""
type Error {
  message: String!
  code: String!
  path: [String!]
}

"""
Result type for mutations that may fail
"""
interface MutationResult {
  success: Boolean!
  errors: [Error!]
}

"""
Health check response
"""
type HealthCheck {
  status: String!
  version: String!
  timestamp: DateTime!
}

type Query {
  _empty: String
}

type Mutation {
  _empty: String
}
```

---

## Treasury Schema

**File:** `src/schema/treasury.graphql`

```graphql
extend type Query {
  """
  Get account by ID
  """
  account(accountId: UUID!): Account
  
  """
  List accounts with optional filtering
  """
  accounts(
    type: AccountType
    status: AccountStatus
    first: Int = 20
    after: String
  ): AccountConnection!
  
  """
  Get account balance (current or at a point in time)
  """
  accountBalance(
    accountId: UUID!
    asOf: DateTime
  ): AccountBalance!
  
  """
  Get transaction by ID
  """
  transaction(transactionId: UUID!): Transaction
  
  """
  List transactions with filtering
  """
  transactions(
    accountId: UUID
    startDate: DateTime
    endDate: DateTime
    first: Int = 50
    after: String
  ): TransactionConnection!
  
  """
  Get period by ID
  """
  period(periodId: UUID!): Period
  
  """
  List periods
  """
  periods(
    status: PeriodStatus
    year: Int
    first: Int = 20
    after: String
  ): PeriodConnection!
  
  """
  Get current open period
  """
  currentPeriod: Period
}

"""
Account types
"""
enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

"""
Account status
"""
enum AccountStatus {
  ACTIVE
  INACTIVE
  CLOSED
}

"""
Chart of accounts entry
"""
type Account {
  accountId: UUID!
  accountNumber: String!
  accountName: String!
  accountType: AccountType!
  parentAccountId: UUID
  parentAccount: Account
  description: String
  status: AccountStatus!
  createdAt: DateTime!
  
  """
  Current balance
  """
  balance: Money!
  
  """
  Recent transactions
  """
  transactions(first: Int = 10): TransactionConnection!
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

"""
Account balance at a point in time
"""
type AccountBalance {
  accountId: UUID!
  account: Account!
  balance: Money!
  asOf: DateTime!
}

"""
Transaction (collection of entries)
"""
type Transaction {
  transactionId: UUID!
  transactionDate: DateTime!
  description: String!
  referenceNumber: String
  notes: String
  createdBy: UUID
  createdAt: DateTime!
  
  """
  Double-entry bookkeeping entries
  """
  entries: [Entry!]!
  
  """
  Verify transaction balances to zero
  """
  isBalanced: Boolean!
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

"""
Individual entry in a transaction
"""
type Entry {
  entryId: UUID!
  transactionId: UUID!
  transaction: Transaction!
  accountId: UUID!
  account: Account!
  amount: Money!
  memo: String
}

"""
Accounting period
"""
type Period {
  periodId: UUID!
  periodName: String!
  periodType: PeriodType!
  startDate: DateTime!
  endDate: DateTime!
  status: PeriodStatus!
  closedAt: DateTime
  closedBy: UUID
  
  """
  Transactions in this period
  """
  transactions(first: Int = 50): TransactionConnection!
  
  """
  Period summary metrics
  """
  summary: PeriodSummary!
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

type PeriodConnection {
  edges: [PeriodEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PeriodEdge {
  node: Period!
  cursor: String!
}

"""
Period summary metrics
"""
type PeriodSummary {
  totalRevenue: Money!
  totalExpenses: Money!
  netIncome: Money!
  transactionCount: Int!
}
```

---

## People Schema

**File:** `src/schema/people.graphql`

```graphql
extend type Query {
  """
  Get member by ID
  """
  member(memberId: UUID!): Member
  
  """
  Get current authenticated member
  """
  me: Member
  
  """
  List members
  """
  members(
    tier: MembershipTier
    status: MemberStatus
    first: Int = 20
    after: String
  ): MemberConnection!
  
  """
  Get contribution by ID
  """
  contribution(contributionId: UUID!): Contribution
  
  """
  List contributions
  """
  contributions(
    contributorId: UUID
    contributionType: ContributionType
    status: ContributionStatus
    periodId: UUID
    first: Int = 50
    after: String
  ): ContributionConnection!
  
  """
  Get member's patronage summary
  """
  patronageSummary(
    memberId: UUID!
    periodId: UUID
  ): PatronageSummary!
}

"""
Membership tiers
"""
enum MembershipTier {
  COMMUNITY
  COWORKING
  COOPERATIVE
}

"""
Member status
"""
enum MemberStatus {
  PROSPECTIVE
  APPLICANT
  ACTIVE
  INACTIVE
  SUSPENDED
  EXITED
}

"""
Cooperative member
"""
type Member {
  memberId: UUID!
  ensName: String
  displayName: String!
  email: String!
  tier: MembershipTier!
  status: MemberStatus!
  joinedAt: DateTime
  exitedAt: DateTime
  votingRights: Boolean!
  
  """
  Member's contributions
  """
  contributions(
    periodId: UUID
    first: Int = 50
  ): ContributionConnection!
  
  """
  Member's patronage summary
  """
  patronage(periodId: UUID): PatronageSummary!
  
  """
  Member's allocations
  """
  allocations(first: Int = 20): AllocationConnection!
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

"""
Contribution types
"""
enum ContributionType {
  LABOR
  EXPERTISE
  CAPITAL
  RELATIONSHIP
}

"""
Contribution status
"""
enum ContributionStatus {
  DRAFT
  SUBMITTED
  PENDING_APPROVAL
  APPROVED
  REJECTED
  DISPUTED
}

"""
Member contribution
"""
type Contribution {
  contributionId: UUID!
  contributorId: UUID!
  contributor: Member!
  contributionType: ContributionType!
  periodId: UUID
  status: ContributionStatus!
  description: String!
  quantityHours: Float
  valueUsd: Money
  evidenceUrls: [String!]
  submittedAt: DateTime
  reviewedAt: DateTime
  createdAt: DateTime!
  
  """
  Approval records
  """
  approvals: [ContributionApproval!]!
  
  """
  Computed patronage value
  """
  patronageValue: Float!
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

"""
Contribution approval
"""
type ContributionApproval {
  approvalId: UUID!
  contributionId: UUID!
  contribution: Contribution!
  approverId: UUID!
  approver: Member!
  status: ApprovalStatus!
  comments: String
  approvedAt: DateTime
  createdAt: DateTime!
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}

"""
Member patronage summary
"""
type PatronageSummary {
  memberId: UUID!
  member: Member!
  periodId: UUID
  
  """
  Patronage by type
  """
  laborPatronage: Float!
  expertisePatronage: Float!
  capitalPatronage: Float!
  relationshipPatronage: Float!
  
  """
  Total weighted patronage
  """
  totalPatronage: Float!
  
  """
  Contribution counts
  """
  contributionCount: Int!
  approvedContributionCount: Int!
}
```

---

## Agreements Schema

**File:** `src/schema/agreements.graphql`

```graphql
extend type Query {
  """
  Get allocation by ID
  """
  allocation(allocationId: UUID!): Allocation
  
  """
  List allocations for a period
  """
  allocations(
    periodId: UUID!
    memberId: UUID
    first: Int = 50
    after: String
  ): AllocationConnection!
  
  """
  Get distribution by ID
  """
  distribution(distributionId: UUID!): Distribution
  
  """
  List distributions
  """
  distributions(
    memberId: UUID
    status: DistributionStatus
    first: Int = 50
    after: String
  ): DistributionConnection!
  
  """
  Get member's capital account
  """
  capitalAccount(memberId: UUID!): CapitalAccount!
}

"""
Patronage allocation for a period
"""
type Allocation {
  allocationId: UUID!
  periodId: UUID!
  period: Period!
  memberId: UUID!
  member: Member!
  
  """
  Patronage basis
  """
  laborPatronage: Float!
  expertisePatronage: Float!
  capitalPatronage: Float!
  relationshipPatronage: Float!
  totalPatronage: Float!
  
  """
  Weighted allocation
  """
  patronageWeight: Float!
  allocatedAmountCents: Money!
  
  """
  Split between cash and retained
  """
  cashDistributionCents: Money!
  retainedAmountCents: Money!
  
  """
  Special allocations (704(b) compliance)
  """
  qioAmountCents: Money
  minimumGainAmountCents: Money
  
  status: AllocationStatus!
  approvedAt: DateTime
  approvedBy: UUID
  createdAt: DateTime!
}

enum AllocationStatus {
  PROPOSED
  APPROVED
  APPLIED
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

"""
Cash or equity distribution
"""
type Distribution {
  distributionId: UUID!
  memberId: UUID!
  member: Member!
  allocationId: UUID
  allocation: Allocation
  amountCents: Money!
  distributionType: DistributionType!
  scheduledDate: DateTime!
  status: DistributionStatus!
  paidDate: DateTime
  paymentMethod: String
  referenceNumber: String
  notes: String
  createdAt: DateTime!
}

enum DistributionType {
  CASH
  EQUITY
  DEFERRED
}

enum DistributionStatus {
  SCHEDULED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

type DistributionConnection {
  edges: [DistributionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type DistributionEdge {
  node: Distribution!
  cursor: String!
}

"""
Member capital account (IRC 704(b))
"""
type CapitalAccount {
  memberId: UUID!
  member: Member!
  
  """
  Book capital account
  """
  bookBalance: Money!
  
  """
  Tax capital account
  """
  taxBalance: Money!
  
  """
  704(c) layers
  """
  layers: [CapitalAccountLayer!]!
  
  """
  Historical activity
  """
  transactions(first: Int = 50): [CapitalAccountTransaction!]!
}

"""
704(c) allocation layer
"""
type CapitalAccountLayer {
  layerId: UUID!
  createdAt: DateTime!
  contributionDate: DateTime!
  bookBasis: Money!
  taxBasis: Money!
  builtInGain: Money!
  remainingBasis: Money!
}

"""
Capital account transaction
"""
type CapitalAccountTransaction {
  transactionId: UUID!
  transactionDate: DateTime!
  description: String!
  bookAmount: Money!
  taxAmount: Money!
  balanceAfter: Money!
}
```

---

## Treasury Resolvers

**File:** `src/resolvers/treasury.ts`

```typescript
import { HabitatContext } from '../context';

export const treasuryResolvers = {
  Query: {
    account: async (_parent: any, { accountId }: { accountId: string }, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getAccount(accountId);
    },
    
    accounts: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getAccounts(args);
    },
    
    accountBalance: async (_parent: any, { accountId, asOf }: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getAccountBalance(accountId, asOf);
    },
    
    transaction: async (_parent: any, { transactionId }: { transactionId: string }, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getTransaction(transactionId);
    },
    
    transactions: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getTransactions(args);
    },
    
    period: async (_parent: any, { periodId }: { periodId: string }, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getPeriod(periodId);
    },
    
    periods: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getPeriods(args);
    },
    
    currentPeriod: async (_parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getCurrentPeriod();
    },
  },
  
  Account: {
    balance: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      const balance = await dataSources.treasury.getAccountBalance(parent.accountId);
      return balance.balance;
    },
    
    transactions: async (parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getTransactions({
        ...args,
        accountId: parent.accountId,
      });
    },
    
    parentAccount: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      if (!parent.parentAccountId) return null;
      return dataSources.treasury.getAccount(parent.parentAccountId);
    },
  },
  
  Transaction: {
    entries: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getTransactionEntries(parent.transactionId);
    },
    
    isBalanced: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      const entries = await dataSources.treasury.getTransactionEntries(parent.transactionId);
      const sum = entries.reduce((acc, entry) => acc + entry.amount, 0);
      return sum === 0;
    },
  },
  
  Entry: {
    transaction: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getTransaction(parent.transactionId);
    },
    
    account: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getAccount(parent.accountId);
    },
  },
  
  Period: {
    transactions: async (parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getTransactions({
        ...args,
        startDate: parent.startDate,
        endDate: parent.endDate,
      });
    },
    
    summary: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getPeriodSummary(parent.periodId);
    },
  },
};
```

---

## People Resolvers

**File:** `src/resolvers/people.ts`

```typescript
import { HabitatContext } from '../context';

export const peopleResolvers = {
  Query: {
    member: async (_parent: any, { memberId }: { memberId: string }, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(memberId);
    },
    
    me: async (_parent: any, _args: any, { memberId, dataSources }: HabitatContext) => {
      if (!memberId) throw new Error('Not authenticated');
      return dataSources.people.getMember(memberId);
    },
    
    members: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMembers(args);
    },
    
    contribution: async (_parent: any, { contributionId }: { contributionId: string }, { dataSources }: HabitatContext) => {
      return dataSources.people.getContribution(contributionId);
    },
    
    contributions: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getContributions(args);
    },
    
    patronageSummary: async (_parent: any, { memberId, periodId }: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getPatronageSummary(memberId, periodId);
    },
  },
  
  Member: {
    contributions: async (parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getContributions({
        ...args,
        contributorId: parent.memberId,
      });
    },
    
    patronage: async (parent: any, { periodId }: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getPatronageSummary(parent.memberId, periodId);
    },
    
    allocations: async (parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getAllocations({
        ...args,
        memberId: parent.memberId,
      });
    },
  },
  
  Contribution: {
    contributor: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(parent.contributorId);
    },
    
    approvals: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getContributionApprovals(parent.contributionId);
    },
    
    patronageValue: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.computePatronageValue(parent.contributionId);
    },
  },
  
  ContributionApproval: {
    contribution: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getContribution(parent.contributionId);
    },
    
    approver: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(parent.approverId);
    },
  },
  
  PatronageSummary: {
    member: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(parent.memberId);
    },
  },
};
```

---

## Agreements Resolvers

**File:** `src/resolvers/agreements.ts`

```typescript
import { HabitatContext } from '../context';

export const agreementsResolvers = {
  Query: {
    allocation: async (_parent: any, { allocationId }: { allocationId: string }, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getAllocation(allocationId);
    },
    
    allocations: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getAllocations(args);
    },
    
    distribution: async (_parent: any, { distributionId }: { distributionId: string }, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getDistribution(distributionId);
    },
    
    distributions: async (_parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getDistributions(args);
    },
    
    capitalAccount: async (_parent: any, { memberId }: { memberId: string }, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getCapitalAccount(memberId);
    },
  },
  
  Allocation: {
    period: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.treasury.getPeriod(parent.periodId);
    },
    
    member: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(parent.memberId);
    },
  },
  
  Distribution: {
    member: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(parent.memberId);
    },
    
    allocation: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      if (!parent.allocationId) return null;
      return dataSources.agreements.getAllocation(parent.allocationId);
    },
  },
  
  CapitalAccount: {
    member: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.people.getMember(parent.memberId);
    },
    
    layers: async (parent: any, _args: any, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getCapitalAccountLayers(parent.memberId);
    },
    
    transactions: async (parent: any, args: any, { dataSources }: HabitatContext) => {
      return dataSources.agreements.getCapitalAccountTransactions(parent.memberId, args);
    },
  },
};
```

---

## Example Data Source (Treasury)

**File:** `src/datasources/TreasuryAPI.ts`

```typescript
import { Pool } from 'pg';

export class TreasuryAPI {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getAccount(accountId: string) {
    const result = await this.pool.query(
      `SELECT * FROM treasury.accounts WHERE account_id = $1`,
      [accountId]
    );
    return result.rows[0] || null;
  }

  async getAccounts(args: {
    type?: string;
    status?: string;
    first?: number;
    after?: string;
  }) {
    let query = `SELECT * FROM treasury.accounts WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (args.type) {
      query += ` AND account_type = $${paramIndex++}`;
      params.push(args.type);
    }

    if (args.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(args.status);
    }

    query += ` ORDER BY account_number LIMIT $${paramIndex++}`;
    params.push(args.first || 20);

    const result = await this.pool.query(query, params);

    return {
      edges: result.rows.map((row, index) => ({
        node: row,
        cursor: Buffer.from(`${index}`).toString('base64'),
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: result.rowCount,
    };
  }

  async getAccountBalance(accountId: string, asOf?: Date) {
    const query = asOf
      ? `SELECT * FROM treasury.account_balance_at($1, $2)`
      : `SELECT * FROM treasury.account_balances WHERE account_id = $1`;
    
    const params = asOf ? [accountId, asOf] : [accountId];
    const result = await this.pool.query(query, params);

    return result.rows[0] || { accountId, balance: 0, asOf: asOf || new Date() };
  }

  async getTransaction(transactionId: string) {
    const result = await this.pool.query(
      `SELECT * FROM treasury.transactions WHERE transaction_id = $1`,
      [transactionId]
    );
    return result.rows[0] || null;
  }

  async getTransactions(args: any) {
    // Implementation similar to getAccounts
    // Add filtering by date range, account, etc.
    // Return paginated connection
  }

  async getTransactionEntries(transactionId: string) {
    const result = await this.pool.query(
      `SELECT * FROM treasury.entries WHERE transaction_id = $1 ORDER BY created_at`,
      [transactionId]
    );
    return result.rows;
  }

  async getPeriod(periodId: string) {
    const result = await this.pool.query(
      `SELECT * FROM treasury.periods WHERE period_id = $1`,
      [periodId]
    );
    return result.rows[0] || null;
  }

  async getPeriods(args: any) {
    // Implementation similar to getAccounts
  }

  async getCurrentPeriod() {
    const result = await this.pool.query(
      `SELECT * FROM treasury.periods WHERE status = 'open' ORDER BY start_date DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async getPeriodSummary(periodId: string) {
    // Calculate from transactions within period date range
    // Return revenue, expenses, net income, transaction count
  }
}
```

---

## Database Connection Pool

**File:** `src/utils/db.ts`

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await pool.end();
  process.exit(0);
});
```

---

## Next Steps (Sprint 54)

Sprint 53 specified query resolvers. Sprint 54 will implement mutations (write operations):
- Create/submit/approve contributions
- Post transactions
- Open/close periods
- Propose/approve allocations
- Schedule distributions

---

*Sprint 53 complete. API Server core queries specified.*

**Repository:** github.com/nou-techne/habitat  
**API Spec:** habitat/infrastructure/api-server-core.md
