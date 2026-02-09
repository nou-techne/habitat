# Habitat API Specification

*GraphQL API for Treasury, People, and Agreements bounded contexts*

---

## Abstract

This document specifies the Habitat GraphQL API — the interface through which cooperatives, ventures, and integrators interact with the patronage accounting system.

The API provides:
- **Queries** — read access to accounts, members, contributions, allocations, distributions
- **Mutations** — write operations (create contributions, approve, allocate, distribute)
- **Subscriptions** — real-time event streams for reactive UIs and integrations

The API is event-sourced, meaning all state changes flow through events recorded in the underlying event stores. Queries read from materialized views (fast, eventually consistent) or event projections (slower, perfectly consistent).

---

## 1. API Design Principles

### 1.1 GraphQL Over REST

**Why GraphQL:**
- Clients specify exactly what data they need (no over-fetching)
- Single endpoint, strongly typed schema
- Excellent tooling for exploration (GraphiQL, Playground)
- Subscriptions for real-time updates
- Self-documenting via introspection

### 1.2 Bounded Context Separation

The API surface reflects the three bounded contexts:
- **Treasury** — accounts, transactions, balances, capital accounts
- **People** — members, contributions, approvals, patronage
- **Agreements** — allocations, distributions, patronage weights, period close

Each context has its own root types and resolvers. Cross-context queries are supported but made explicit.

### 1.3 Event Sourcing Visibility

Mutations return both:
- The resulting state (e.g., the created contribution)
- The event that caused it (e.g., ContributionSubmitted)

This makes the event-sourced architecture transparent to clients and enables event-driven integrations.

### 1.4 Authorization and Privacy

- **Row-level security** enforced at the database layer (PostgreSQL RLS policies)
- **Context-aware authorization** — current user/member passed via JWT or session
- **Field-level privacy** — sensitive fields (SSNs, bank details) require elevated permissions
- **Cooperative isolation** — multi-tenant deployments isolate data by cooperative_id

### 1.5 Pagination

All list queries support:
- **Cursor-based pagination** (Relay spec) for infinite scroll
- **Offset/limit pagination** for traditional page navigation
- Default page size: 50 items
- Maximum page size: 200 items

---

## 2. Schema Overview

### 2.1 Root Types

```graphql
type Query {
  # Treasury queries
  treasury: TreasuryQueries
  
  # People queries
  people: PeopleQueries
  
  # Agreements queries
  agreements: AgreementsQueries
  
  # Cross-context queries
  member(id: ID!): Member
  period(id: ID!): AccountingPeriod
}

type Mutation {
  # Treasury mutations
  treasury: TreasuryMutations
  
  # People mutations
  people: PeopleMutations
  
  # Agreements mutations
  agreements: AgreementsMutations
}

type Subscription {
  # Event streams
  treasuryEvents(filter: EventFilter): Event!
  peopleEvents(filter: EventFilter): Event!
  agreementsEvents(filter: EventFilter): Event!
}
```

### 2.2 Common Types

```graphql
# ISO 8601 timestamp
scalar DateTime

# Decimal for financial values (precision: 12, scale: 2)
scalar Decimal

# JSON object for flexible metadata
scalar JSON

# Standard pagination types (Relay spec)
interface Node {
  id: ID!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

interface Connection {
  edges: [Edge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

interface Edge {
  node: Node!
  cursor: String!
}
```

---

## 3. Treasury API

### 3.1 Treasury Queries

```graphql
type TreasuryQueries {
  # Accounts
  account(id: ID!): Account
  accounts(
    ledgerType: LedgerType
    accountType: AccountType
    first: Int
    after: String
  ): AccountConnection!
  
  # Balances
  accountBalance(accountId: ID!, asOf: DateTime): Balance
  accountBalances(
    ledgerType: LedgerType
    asOf: DateTime
    first: Int
    after: String
  ): BalanceConnection!
  
  # Transactions
  transaction(id: ID!): Transaction
  transactions(
    periodId: ID
    accountId: ID
    fromDate: DateTime
    toDate: DateTime
    first: Int
    after: String
  ): TransactionConnection!
  
  # Periods
  period(id: ID!): AccountingPeriod
  periods(
    year: Int
    status: PeriodStatus
    first: Int
    after: String
  ): PeriodConnection!
  
  # Capital accounts
  capitalAccount(memberId: ID!, ledgerType: LedgerType!): CapitalAccount
  capitalAccounts(
    ledgerType: LedgerType
    first: Int
    after: String
  ): CapitalAccountConnection!
  
  # 704(c) layers
  section704cLayers(memberId: ID!): [Section704cLayer!]!
  
  # Audit trail
  auditTrail(
    fromDate: DateTime
    toDate: DateTime
    first: Int
    after: String
  ): AuditEntryConnection!
}
```

### 3.2 Treasury Types

```graphql
type Account implements Node {
  id: ID!
  accountNumber: String!
  accountName: String!
  accountType: AccountType!
  ledgerType: LedgerType!
  parentAccount: Account
  subAccounts: [Account!]!
  currentBalance: Decimal!
  balanceHistory(
    fromDate: DateTime
    toDate: DateTime
  ): [Balance!]!
  transactions(first: Int, after: String): TransactionConnection!
  createdAt: DateTime!
}

enum LedgerType {
  BOOK
  TAX
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

type Balance {
  accountId: ID!
  account: Account!
  ledgerType: LedgerType!
  balance: Decimal!
  asOf: DateTime!
}

type Transaction implements Node {
  id: ID!
  transactionDate: DateTime!
  description: String!
  periodId: ID!
  period: AccountingPeriod!
  entries: [Entry!]!
  posted: Boolean!
  postedAt: DateTime
  metadata: JSON
  events: [Event!]!
  createdAt: DateTime!
}

type Entry {
  id: ID!
  transaction: Transaction!
  accountId: ID!
  account: Account!
  ledgerType: LedgerType!
  debit: Decimal!
  credit: Decimal!
  sequence: Int!
}

type AccountingPeriod implements Node {
  id: ID!
  periodName: String!
  periodType: PeriodType!
  startDate: DateTime!
  endDate: DateTime!
  status: PeriodStatus!
  fiscalYear: Int!
  fiscalPeriod: Int!
  closedAt: DateTime
  transactions(first: Int, after: String): TransactionConnection!
}

enum PeriodType {
  MONTH
  QUARTER
  YEAR
}

enum PeriodStatus {
  OPEN
  PENDING_CLOSE
  CLOSED
}

type CapitalAccount {
  memberId: ID!
  member: Member!
  ledgerType: LedgerType!
  bookBalance: Decimal!
  taxBalance: Decimal!
  contributionsToDate: Decimal!
  allocationsToDate: Decimal!
  distributionsToDate: Decimal!
  section704cLayers: [Section704cLayer!]!
  history(first: Int, after: String): [CapitalAccountEntry!]!
}

type Section704cLayer {
  layerId: ID!
  memberId: ID!
  member: Member!
  propertyDescription: String!
  contributionDate: DateTime!
  bookValue: Decimal!
  taxBasis: Decimal!
  builtInGain: Decimal!
  remainingGain: Decimal!
}

type CapitalAccountEntry {
  entryId: ID!
  memberId: ID!
  periodId: ID!
  period: AccountingPeriod!
  entryType: CapitalAccountEntryType!
  amount: Decimal!
  description: String!
  recordedAt: DateTime!
}

enum CapitalAccountEntryType {
  CONTRIBUTION
  ALLOCATION
  DISTRIBUTION
  ADJUSTMENT
}
```

### 3.3 Treasury Mutations

```graphql
type TreasuryMutations {
  # Post a transaction
  postTransaction(input: PostTransactionInput!): PostTransactionPayload!
  
  # Update capital account
  updateCapitalAccount(input: UpdateCapitalAccountInput!): UpdateCapitalAccountPayload!
  
  # Create 704(c) layer
  createSection704cLayer(input: CreateSection704cLayerInput!): CreateSection704cLayerPayload!
  
  # Period operations
  openPeriod(input: OpenPeriodInput!): OpenPeriodPayload!
  closePeriod(input: ClosePeriodInput!): ClosePeriodPayload!
}

input PostTransactionInput {
  periodId: ID!
  transactionDate: DateTime!
  description: String!
  entries: [EntryInput!]!
  metadata: JSON
}

input EntryInput {
  accountId: ID!
  ledgerType: LedgerType!
  debit: Decimal!
  credit: Decimal!
}

type PostTransactionPayload {
  transaction: Transaction!
  event: Event!
}

input UpdateCapitalAccountInput {
  memberId: ID!
  periodId: ID!
  allocationAmount: Decimal!
  distributionAmount: Decimal
}

type UpdateCapitalAccountPayload {
  capitalAccount: CapitalAccount!
  event: Event!
}

input CreateSection704cLayerInput {
  memberId: ID!
  propertyDescription: String!
  contributionDate: DateTime!
  bookValue: Decimal!
  taxBasis: Decimal!
}

type CreateSection704cLayerPayload {
  layer: Section704cLayer!
  event: Event!
}

input OpenPeriodInput {
  periodName: String!
  periodType: PeriodType!
  startDate: DateTime!
  endDate: DateTime!
  fiscalYear: Int!
  fiscalPeriod: Int!
}

type OpenPeriodPayload {
  period: AccountingPeriod!
  event: Event!
}

input ClosePeriodInput {
  periodId: ID!
}

type ClosePeriodPayload {
  period: AccountingPeriod!
  event: Event!
}
```

---

## 4. People API

### 4.1 People Queries

```graphql
type PeopleQueries {
  # Members
  member(id: ID!): Member
  members(
    status: MemberStatus
    tier: MemberTier
    first: Int
    after: String
  ): MemberConnection!
  
  # Contributions
  contribution(id: ID!): Contribution
  contributions(
    memberId: ID
    periodId: ID
    contributionType: ContributionType
    status: ContributionStatus
    first: Int
    after: String
  ): ContributionConnection!
  
  # Patronage summary
  patronageSummary(
    memberId: ID!
    periodId: ID!
  ): PatronageSummary!
  
  memberPatronage(
    memberId: ID!
    fromPeriod: ID
    toPeriod: ID
  ): [PatronageSummary!]!
  
  # Approvals
  approval(id: ID!): Approval
  approvalsForContribution(contributionId: ID!): [Approval!]!
  pendingApprovals(approverId: ID!): [Contribution!]!
}
```

### 4.2 People Types

```graphql
type Member implements Node {
  id: ID!
  legalName: String!
  displayName: String!
  email: String!
  ensName: String
  status: MemberStatus!
  tier: MemberTier!
  joinedAt: DateTime
  hourlyRate: Decimal
  expertiseRate: Decimal
  votingRights: Boolean!
  boardEligible: Boolean!
  contributions(
    periodId: ID
    first: Int
    after: String
  ): ContributionConnection!
  patronageSummary(periodId: ID!): PatronageSummary
  capitalAccount(ledgerType: LedgerType!): CapitalAccount
  metadata: JSON
  createdAt: DateTime!
}

enum MemberStatus {
  PENDING
  ACTIVE
  SUSPENDED
  INACTIVE
  WITHDRAWN
  EXPELLED
}

enum MemberTier {
  COMMUNITY
  COWORKING
  COOPERATIVE
}

type Contribution implements Node {
  id: ID!
  memberId: ID!
  member: Member!
  contributionType: ContributionType!
  status: ContributionStatus!
  periodId: ID!
  period: AccountingPeriod!
  
  # Type-specific fields
  hoursWorked: Decimal
  hourlyRate: Decimal
  expertiseDescription: String
  expertiseValue: Decimal
  capitalType: String
  capitalAmount: Decimal
  relationshipDescription: String
  relationshipValue: Decimal
  
  description: String!
  notes: String
  evidenceUrls: [String!]
  submittedAt: DateTime
  approvedAt: DateTime
  approvedBy: Member
  rejectedAt: DateTime
  rejectedBy: Member
  rejectionReason: String
  metadata: JSON
  createdAt: DateTime!
  
  # Computed value
  value: Decimal!
  
  # Approvals
  approvals: [Approval!]!
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
  DISPUTED
}

type PatronageSummary {
  memberId: ID!
  member: Member!
  periodId: ID!
  period: AccountingPeriod!
  contributionsByType: [ContributionTypeSummary!]!
  totalValue: Decimal!
  totalHours: Decimal!
  contributionCount: Int!
}

type ContributionTypeSummary {
  contributionType: ContributionType!
  count: Int!
  totalValue: Decimal!
  totalHours: Decimal
}

type Approval implements Node {
  id: ID!
  contributionId: ID!
  contribution: Contribution!
  approverId: ID!
  approver: Member!
  approved: Boolean!
  approvalDate: DateTime!
  comments: String
  metadata: JSON
}
```

### 4.3 People Mutations

```graphql
type PeopleMutations {
  # Member management
  createMember(input: CreateMemberInput!): CreateMemberPayload!
  updateMember(input: UpdateMemberInput!): UpdateMemberPayload!
  changeMemberStatus(input: ChangeMemberStatusInput!): ChangeMemberStatusPayload!
  
  # Contribution lifecycle
  createContribution(input: CreateContributionInput!): CreateContributionPayload!
  submitContribution(contributionId: ID!): SubmitContributionPayload!
  approveContribution(contributionId: ID!, comments: String): ApproveContributionPayload!
  rejectContribution(contributionId: ID!, reason: String!): RejectContributionPayload!
  
  # Approvals
  recordApproval(input: RecordApprovalInput!): RecordApprovalPayload!
}

input CreateMemberInput {
  legalName: String!
  displayName: String!
  email: String!
  ensName: String
  tier: MemberTier!
  hourlyRate: Decimal
  expertiseRate: Decimal
  metadata: JSON
}

type CreateMemberPayload {
  member: Member!
  event: Event!
}

input UpdateMemberInput {
  memberId: ID!
  displayName: String
  email: String
  hourlyRate: Decimal
  expertiseRate: Decimal
  metadata: JSON
}

type UpdateMemberPayload {
  member: Member!
  event: Event!
}

input ChangeMemberStatusInput {
  memberId: ID!
  newStatus: MemberStatus!
  reason: String
}

type ChangeMemberStatusPayload {
  member: Member!
  event: Event!
}

input CreateContributionInput {
  memberId: ID!
  contributionType: ContributionType!
  periodId: ID!
  
  # Type-specific fields (provide based on type)
  hoursWorked: Decimal
  hourlyRate: Decimal
  expertiseDescription: String
  expertiseValue: Decimal
  capitalType: String
  capitalAmount: Decimal
  relationshipDescription: String
  relationshipValue: Decimal
  
  description: String!
  notes: String
  evidenceUrls: [String!]
  metadata: JSON
}

type CreateContributionPayload {
  contribution: Contribution!
  event: Event!
}

type SubmitContributionPayload {
  contribution: Contribution!
  event: Event!
}

type ApproveContributionPayload {
  contribution: Contribution!
  event: Event!
}

type RejectContributionPayload {
  contribution: Contribution!
  event: Event!
}

input RecordApprovalInput {
  contributionId: ID!
  approverId: ID!
  approved: Boolean!
  comments: String
}

type RecordApprovalPayload {
  approval: Approval!
  event: Event!
}
```

---

## 5. Agreements API

### 5.1 Agreements Queries

```graphql
type AgreementsQueries {
  # Patronage weights
  patronageWeights(periodId: ID!): [PatronageWeight!]!
  
  # Allocation agreements
  allocationAgreement(id: ID!): AllocationAgreement
  allocationAgreements(
    periodId: ID
    status: AllocationStatus
    first: Int
    after: String
  ): AllocationAgreementConnection!
  
  # Member allocations
  memberAllocation(allocationId: ID!): MemberAllocation
  memberAllocations(
    agreementId: ID!
    memberId: ID
  ): [MemberAllocation!]!
  
  # Distributions
  distribution(id: ID!): Distribution
  distributions(
    memberId: ID
    status: DistributionStatus
    taxYear: Int
    first: Int
    after: String
  ): DistributionConnection!
  
  # Period close workflow
  periodCloseSteps(periodId: ID!): [PeriodCloseStep!]!
}
```

### 5.2 Agreements Types

```graphql
type PatronageWeight implements Node {
  id: ID!
  periodId: ID!
  period: AccountingPeriod!
  contributionType: ContributionType!
  weight: Decimal!
  notes: String
  createdAt: DateTime!
}

type AllocationAgreement implements Node {
  id: ID!
  periodId: ID!
  period: AccountingPeriod!
  status: AllocationStatus!
  allocableSurplus: Decimal!
  totalWeightedPatronage: Decimal!
  cashDistributionRate: Decimal!
  retainedAllocationRate: Decimal!
  proposedAt: DateTime
  proposedBy: String
  approvedAt: DateTime
  approvedBy: String
  memberAllocations: [MemberAllocation!]!
  notes: String
  metadata: JSON
  createdAt: DateTime!
}

enum AllocationStatus {
  DRAFT
  PROPOSED
  APPROVED
  DISTRIBUTED
  AMENDED
}

type MemberAllocation implements Node {
  id: ID!
  agreementId: ID!
  agreement: AllocationAgreement!
  memberId: ID!
  member: Member!
  weightedPatronage: Decimal!
  patronageShare: Decimal!
  totalAllocation: Decimal!
  cashDistribution: Decimal!
  retainedAllocation: Decimal!
  treasuryTransactionId: ID
  capitalAccountEntryId: ID
  allocationDetail: [AllocationDetail!]!
  notes: String
  metadata: JSON
  createdAt: DateTime!
}

type AllocationDetail {
  detailId: ID!
  allocationId: ID!
  allocation: MemberAllocation!
  memberId: ID!
  periodId: ID!
  contributionType: ContributionType!
  contributionValue: Decimal!
  patronageWeight: Decimal!
  weightedValue: Decimal!
}

type Distribution implements Node {
  id: ID!
  memberId: ID!
  member: Member!
  distributionType: DistributionType!
  status: DistributionStatus!
  amount: Decimal!
  allocationId: ID
  allocation: MemberAllocation
  periodId: ID
  scheduledDate: DateTime!
  paymentDate: DateTime
  paymentMethod: String
  paymentReference: String
  taxYear: Int!
  form1099Required: Boolean!
  notes: String
  metadata: JSON
  createdAt: DateTime!
}

enum DistributionType {
  PATRONAGE_CASH
  REDEMPTION
  CAPITAL_RETURN
  LIQUIDATING
}

enum DistributionStatus {
  SCHEDULED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

type PeriodCloseStep implements Node {
  id: ID!
  periodId: ID!
  period: AccountingPeriod!
  stepNumber: Int!
  stepName: String!
  stepDescription: String
  status: CloseStepStatus!
  startedAt: DateTime
  completedAt: DateTime
  errorMessage: String
  metadata: JSON
}

enum CloseStepStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  SKIPPED
}
```

### 5.3 Agreements Mutations

```graphql
type AgreementsMutations {
  # Patronage weights
  setPatronageWeight(input: SetPatronageWeightInput!): SetPatronageWeightPayload!
  
  # Allocation lifecycle
  proposeAllocation(input: ProposeAllocationInput!): ProposeAllocationPayload!
  approveAllocation(agreementId: ID!, approvedBy: String!): ApproveAllocationPayload!
  
  # Distributions
  scheduleDistribution(input: ScheduleDistributionInput!): ScheduleDistributionPayload!
  recordDistributionPayment(input: RecordDistributionPaymentInput!): RecordDistributionPaymentPayload!
  cancelDistribution(distributionId: ID!, reason: String!): CancelDistributionPayload!
  
  # Period close
  startPeriodClose(periodId: ID!): StartPeriodClosePayload!
  completePeriodCloseStep(stepId: ID!): CompletePeriodCloseStepPayload!
}

input SetPatronageWeightInput {
  periodId: ID!
  contributionType: ContributionType!
  weight: Decimal!
  notes: String
}

type SetPatronageWeightPayload {
  patronageWeight: PatronageWeight!
  event: Event!
}

input ProposeAllocationInput {
  periodId: ID!
  allocableSurplus: Decimal!
  cashDistributionRate: Decimal!
  proposedBy: String!
  notes: String
}

type ProposeAllocationPayload {
  allocationAgreement: AllocationAgreement!
  memberAllocations: [MemberAllocation!]!
  event: Event!
}

type ApproveAllocationPayload {
  allocationAgreement: AllocationAgreement!
  event: Event!
}

input ScheduleDistributionInput {
  memberId: ID!
  distributionType: DistributionType!
  amount: Decimal!
  allocationId: ID
  periodId: ID
  scheduledDate: DateTime!
  paymentMethod: String!
  taxYear: Int!
  form1099Required: Boolean
  notes: String
}

type ScheduleDistributionPayload {
  distribution: Distribution!
  event: Event!
}

input RecordDistributionPaymentInput {
  distributionId: ID!
  paymentDate: DateTime!
  paymentReference: String!
}

type RecordDistributionPaymentPayload {
  distribution: Distribution!
  event: Event!
}

type CancelDistributionPayload {
  distribution: Distribution!
  event: Event!
}

type StartPeriodClosePayload {
  period: AccountingPeriod!
  steps: [PeriodCloseStep!]!
  event: Event!
}

type CompletePeriodCloseStepPayload {
  step: PeriodCloseStep!
  event: Event!
}
```

---

## 6. Events and Subscriptions

### 6.1 Event Type

```graphql
type Event implements Node {
  id: ID!
  eventType: String!
  aggregateType: String!
  aggregateId: ID!
  occurredAt: DateTime!
  recordedAt: DateTime!
  payload: JSON!
  metadata: JSON
  sequenceNumber: Int!
  causationId: ID
  correlationId: ID
}

input EventFilter {
  eventTypes: [String!]
  aggregateTypes: [String!]
  aggregateIds: [ID!]
  fromDate: DateTime
  toDate: DateTime
  correlationId: ID
}
```

### 6.2 Subscriptions

```graphql
type Subscription {
  # Subscribe to Treasury events
  treasuryEvents(filter: EventFilter): Event!
  
  # Subscribe to People events
  peopleEvents(filter: EventFilter): Event!
  
  # Subscribe to Agreements events
  agreementsEvents(filter: EventFilter): Event!
  
  # Subscribe to events for a specific member
  memberEvents(memberId: ID!): Event!
  
  # Subscribe to events for a specific period
  periodEvents(periodId: ID!): Event!
}
```

**Usage example:**
```graphql
subscription {
  agreementsEvents(filter: {
    eventTypes: ["AllocationProposed", "AllocationApproved"]
  }) {
    id
    eventType
    occurredAt
    payload
  }
}
```

---

## 7. Pagination and Connections

All list queries return Connection types following the Relay specification:

```graphql
type AccountConnection implements Connection {
  edges: [AccountEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type AccountEdge implements Edge {
  node: Account!
  cursor: String!
}
```

**Usage example:**
```graphql
query {
  treasury {
    accounts(first: 10, after: "cursor123") {
      edges {
        node {
          id
          accountName
          currentBalance
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
}
```

---

## 8. Authorization and Context

### 8.1 Authentication

API requests must include authentication via:
- **JWT token** (preferred) — passed in Authorization header
- **Session cookie** (for browser-based clients)
- **API key** (for service-to-service)

### 8.2 Authorization Context

Each request includes a context object:

```typescript
interface Context {
  currentUser?: User;
  currentMember?: Member;
  cooperativeId: string;
  permissions: string[];
}
```

Resolvers check permissions before executing:
- Read operations: check if user has access to requested data
- Write operations: check if user has permission to perform action
- RLS policies enforce row-level security at database layer

### 8.3 Permission Model

| Permission | Grants |
|------------|--------|
| `member:read` | View member profiles |
| `member:write` | Create/update members |
| `contribution:read` | View contributions |
| `contribution:write` | Create/submit contributions |
| `contribution:approve` | Approve/reject contributions |
| `allocation:read` | View allocations |
| `allocation:propose` | Propose allocations |
| `allocation:approve` | Approve allocations |
| `treasury:read` | View accounts/transactions |
| `treasury:write` | Post transactions |
| `admin` | Full access to all operations |

---

## 9. Error Handling

### 9.1 GraphQL Errors

Errors follow GraphQL spec with extensions:

```json
{
  "errors": [
    {
      "message": "Contribution not found",
      "extensions": {
        "code": "NOT_FOUND",
        "contributionId": "contrib_123",
        "timestamp": "2026-02-09T18:00:00Z"
      }
    }
  ]
}
```

### 9.2 Error Codes

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Resource does not exist |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Permission denied |
| `VALIDATION_ERROR` | Input validation failed |
| `CONFLICT` | State conflict (e.g., period already closed) |
| `INTERNAL_ERROR` | Server error |

---

## 10. Implementation Notes

### 10.1 Technology Stack

Recommended implementation:
- **GraphQL server:** Apollo Server (Node.js) or Hasura (declarative)
- **Database:** PostgreSQL 14+ with event store tables
- **ORM/Query Builder:** Prisma or raw SQL for complex queries
- **Authentication:** JWT tokens via Auth0, Supabase Auth, or custom
- **Subscriptions:** GraphQL subscriptions over WebSocket
- **Caching:** DataLoader for N+1 query optimization

### 10.2 Resolver Pattern

```typescript
// Example resolver structure
const resolvers = {
  Query: {
    treasury: () => ({}),
  },
  
  TreasuryQueries: {
    account: async (_, { id }, context) => {
      // 1. Check permissions
      if (!context.permissions.includes('treasury:read')) {
        throw new ForbiddenError();
      }
      
      // 2. Query database (respects RLS)
      const account = await db.accounts.findUnique({
        where: { id },
      });
      
      // 3. Return result
      return account;
    },
  },
  
  Mutation: {
    treasury: () => ({}),
  },
  
  TreasuryMutations: {
    postTransaction: async (_, { input }, context) => {
      // 1. Validate input
      // 2. Check permissions
      // 3. Record event
      // 4. Update state
      // 5. Return payload
    },
  },
};
```

### 10.3 Event Sourcing Integration

Mutations should:
1. Validate input
2. Record event to event store
3. Update materialized views/projections
4. Return both the updated entity and the event

This makes the event-sourced architecture transparent and enables event-driven downstream systems.

---

## 11. Client Usage Examples

### 11.1 Query Member Patronage

```graphql
query MemberPatronageQuery($memberId: ID!, $periodId: ID!) {
  people {
    member(id: $memberId) {
      id
      displayName
      patronageSummary(periodId: $periodId) {
        totalValue
        totalHours
        contributionsByType {
          contributionType
          count
          totalValue
        }
      }
    }
  }
}
```

### 11.2 Submit and Approve Contribution

```graphql
mutation SubmitContribution($input: CreateContributionInput!) {
  people {
    createContribution(input: $input) {
      contribution {
        id
        status
        value
      }
      event {
        eventType
        occurredAt
      }
    }
  }
}

mutation ApproveContribution($contributionId: ID!, $comments: String) {
  people {
    approveContribution(contributionId: $contributionId, comments: $comments) {
      contribution {
        id
        status
        approvedAt
        approvedBy {
          displayName
        }
      }
      event {
        eventType
        occurredAt
      }
    }
  }
}
```

### 11.3 Propose and Approve Allocation

```graphql
mutation ProposeAllocation($input: ProposeAllocationInput!) {
  agreements {
    proposeAllocation(input: $input) {
      allocationAgreement {
        id
        status
        allocableSurplus
        totalWeightedPatronage
      }
      memberAllocations {
        memberId
        totalAllocation
        cashDistribution
        retainedAllocation
      }
      event {
        eventType
        occurredAt
      }
    }
  }
}

mutation ApproveAllocation($agreementId: ID!, $approvedBy: String!) {
  agreements {
    approveAllocation(agreementId: $agreementId, approvedBy: $approvedBy) {
      allocationAgreement {
        id
        status
        approvedAt
        approvedBy
      }
      event {
        eventType
        occurredAt
      }
    }
  }
}
```

### 11.4 Subscribe to Period Close Events

```graphql
subscription PeriodCloseEvents($periodId: ID!) {
  periodEvents(periodId: $periodId) {
    eventType
    occurredAt
    payload
  }
}
```

---

## 12. Versioning and Evolution

### 12.1 Schema Versioning

The API follows semantic versioning:
- **Major version** — breaking changes (field removal, type change)
- **Minor version** — additive changes (new fields, new types)
- **Patch version** — bug fixes, documentation

Current version: `1.0.0`

### 12.2 Deprecation Strategy

- Deprecated fields marked with `@deprecated` directive
- Deprecation notice includes removal timeline and migration path
- Minimum 6 months notice before removal
- Alternative provided before deprecation

Example:
```graphql
type Member {
  hourly_rate: Decimal @deprecated(reason: "Use hourlyRate instead. Removed in v2.0")
  hourlyRate: Decimal
}
```

---

## Appendix: Complete Schema (SDL)

A complete GraphQL Schema Definition Language (SDL) file is available at:
`habitat/schema/api.graphql`

This SDL can be used with code generation tools (GraphQL Code Generator, Apollo Codegen) to generate typed clients in TypeScript, Python, Go, etc.

---

**Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.**

This specification is part of the Habitat Protocol Documentation, developed by Techne / RegenHub, LCA.  
License: Peer Production License (CopyFarLeft) — free for cooperatives and nonprofits; commercial license required for for-profit use.

the-habitat.org | github.com/nou-techne/habitat
