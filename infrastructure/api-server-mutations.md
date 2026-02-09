# API Server Implementation — Mutations

**Sprint:** 54  
**Phase:** 3 — Production Deployment  
**Layer:** Infrastructure (Flow + Constraint)  
**Status:** Specification

---

## Purpose

Implement GraphQL mutations for write operations across Treasury, People, and Agreements bounded contexts. Enables creation, modification, and workflow state transitions with event publishing, authorization enforcement, and transactional integrity.

---

## Mutation Architecture

**Key Principles:**

1. **Event-driven:** Every mutation publishes an event to RabbitMQ after successful database write
2. **Transactional:** Database write + event publish wrapped in transaction where possible
3. **Authorization:** Role-based checks before execution
4. **Validation:** Input validation before database operations
5. **Idempotency:** Mutations check for duplicate operations where applicable
6. **Audit trail:** All mutations record actor + timestamp

**Mutation Response Pattern:**

Every mutation returns a result type implementing `MutationResult`:

```graphql
interface MutationResult {
  success: Boolean!
  errors: [Error!]
  # Plus the created/modified entity
}
```

---

## Treasury Mutations Schema

**File:** `src/schema/treasury-mutations.graphql`

```graphql
extend type Mutation {
  """
  Post a new transaction with double-entry bookkeeping entries
  """
  postTransaction(input: PostTransactionInput!): PostTransactionResult!
  
  """
  Open a new accounting period
  """
  openPeriod(input: OpenPeriodInput!): OpenPeriodResult!
  
  """
  Close an accounting period
  """
  closePeriod(input: ClosePeriodInput!): ClosePeriodResult!
  
  """
  Create a new account in the chart of accounts
  """
  createAccount(input: CreateAccountInput!): CreateAccountResult!
  
  """
  Update account details
  """
  updateAccount(input: UpdateAccountInput!): UpdateAccountResult!
}

"""
Input for posting a transaction
"""
input PostTransactionInput {
  transactionDate: DateTime!
  description: String!
  referenceNumber: String
  notes: String
  entries: [EntryInput!]!
}

input EntryInput {
  accountId: UUID!
  amount: Money!
  memo: String
}

type PostTransactionResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  transaction: Transaction
  event: Event
}

"""
Input for opening a period
"""
input OpenPeriodInput {
  periodName: String!
  periodType: PeriodType!
  startDate: DateTime!
  endDate: DateTime!
}

type OpenPeriodResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  period: Period
  event: Event
}

"""
Input for closing a period
"""
input ClosePeriodInput {
  periodId: UUID!
  notes: String
}

type ClosePeriodResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  period: Period
  event: Event
}

"""
Input for creating an account
"""
input CreateAccountInput {
  accountNumber: String!
  accountName: String!
  accountType: AccountType!
  parentAccountId: UUID
  description: String
}

type CreateAccountResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  account: Account
  event: Event
}

"""
Input for updating an account
"""
input UpdateAccountInput {
  accountId: UUID!
  accountName: String
  description: String
  status: AccountStatus
}

type UpdateAccountResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  account: Account
  event: Event
}

"""
Event metadata (returned with mutations)
"""
type Event {
  eventId: UUID!
  eventType: String!
  timestamp: DateTime!
}
```

---

## People Mutations Schema

**File:** `src/schema/people-mutations.graphql`

```graphql
extend type Mutation {
  """
  Create a new member profile
  """
  createMember(input: CreateMemberInput!): CreateMemberResult!
  
  """
  Update member profile
  """
  updateMember(input: UpdateMemberInput!): UpdateMemberResult!
  
  """
  Submit a new contribution
  """
  submitContribution(input: SubmitContributionInput!): SubmitContributionResult!
  
  """
  Approve a contribution
  """
  approveContribution(input: ApproveContributionInput!): ApproveContributionResult!
  
  """
  Reject a contribution
  """
  rejectContribution(input: RejectContributionInput!): RejectContributionResult!
}

"""
Input for creating a member
"""
input CreateMemberInput {
  ensName: String
  displayName: String!
  email: String!
  tier: MembershipTier!
  votingRights: Boolean!
}

type CreateMemberResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  member: Member
  event: Event
}

"""
Input for updating a member
"""
input UpdateMemberInput {
  memberId: UUID!
  displayName: String
  email: String
  tier: MembershipTier
  status: MemberStatus
}

type UpdateMemberResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  member: Member
  event: Event
}

"""
Input for submitting a contribution
"""
input SubmitContributionInput {
  contributionType: ContributionType!
  periodId: UUID
  description: String!
  quantityHours: Float
  valueUsd: Money
  evidenceUrls: [String!]
}

type SubmitContributionResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  contribution: Contribution
  event: Event
}

"""
Input for approving a contribution
"""
input ApproveContributionInput {
  contributionId: UUID!
  comments: String
}

type ApproveContributionResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  contribution: Contribution
  approval: ContributionApproval
  event: Event
}

"""
Input for rejecting a contribution
"""
input RejectContributionInput {
  contributionId: UUID!
  reason: String!
}

type RejectContributionResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  contribution: Contribution
  approval: ContributionApproval
  event: Event
}
```

---

## Agreements Mutations Schema

**File:** `src/schema/agreements-mutations.graphql`

```graphql
extend type Mutation {
  """
  Propose allocations for a period
  """
  proposeAllocations(input: ProposeAllocationsInput!): ProposeAllocationsResult!
  
  """
  Approve proposed allocations
  """
  approveAllocations(input: ApproveAllocationsInput!): ApproveAllocationsResult!
  
  """
  Schedule a distribution
  """
  scheduleDistribution(input: ScheduleDistributionInput!): ScheduleDistributionResult!
  
  """
  Mark distribution as completed
  """
  completeDistribution(input: CompleteDistributionInput!): CompleteDistributionResult!
  
  """
  Update operating agreement weights
  """
  updateAgreementWeights(input: UpdateAgreementWeightsInput!): UpdateAgreementWeightsResult!
}

"""
Input for proposing allocations
"""
input ProposeAllocationsInput {
  periodId: UUID!
  allocations: [AllocationInput!]!
}

input AllocationInput {
  memberId: UUID!
  allocatedAmountCents: Money!
  cashDistributionCents: Money!
  retainedAmountCents: Money!
}

type ProposeAllocationsResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  allocations: [Allocation!]
  event: Event
}

"""
Input for approving allocations
"""
input ApproveAllocationsInput {
  periodId: UUID!
  approvalNotes: String
}

type ApproveAllocationsResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  allocations: [Allocation!]
  event: Event
}

"""
Input for scheduling a distribution
"""
input ScheduleDistributionInput {
  memberId: UUID!
  allocationId: UUID
  amountCents: Money!
  distributionType: DistributionType!
  scheduledDate: DateTime!
  paymentMethod: String
  notes: String
}

type ScheduleDistributionResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  distribution: Distribution
  event: Event
}

"""
Input for completing a distribution
"""
input CompleteDistributionInput {
  distributionId: UUID!
  paidDate: DateTime!
  referenceNumber: String
  notes: String
}

type CompleteDistributionResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  distribution: Distribution
  event: Event
}

"""
Input for updating agreement weights
"""
input UpdateAgreementWeightsInput {
  agreementId: UUID!
  laborWeight: Float!
  expertiseWeight: Float!
  capitalWeight: Float!
  relationshipWeight: Float!
  effectiveDate: DateTime!
}

type UpdateAgreementWeightsResult implements MutationResult {
  success: Boolean!
  errors: [Error!]
  agreement: Agreement
  event: Event
}

type Agreement {
  agreementId: UUID!
  effectiveDate: DateTime!
  laborWeight: Float!
  expertiseWeight: Float!
  capitalWeight: Float!
  relationshipWeight: Float!
}
```

---

## Treasury Mutation Resolvers

**File:** `src/resolvers/treasury-mutations.ts`

```typescript
import { HabitatContext } from '../context';
import { AuthorizationError } from '../utils/errors';
import { publishEvent } from '../utils/events';

export const treasuryMutationResolvers = {
  Mutation: {
    postTransaction: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: bookkeeper or governance role required
      if (!roles.includes('bookkeeper') && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        // Validate double-entry: entries must sum to zero
        const sum = input.entries.reduce((acc: number, e: any) => acc + e.amount, 0);
        if (sum !== 0) {
          return {
            success: false,
            errors: [{ message: 'Entries must sum to zero', code: 'VALIDATION_ERROR' }],
          };
        }

        // Insert transaction
        const transaction = await dataSources.treasury.postTransaction(input, memberId!);

        // Publish event
        const event = await publishEvent({
          eventType: 'treasury.transaction.posted',
          aggregateId: transaction.transactionId,
          payload: {
            transactionId: transaction.transactionId,
            transactionDate: transaction.transactionDate,
            description: transaction.description,
            entries: input.entries,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          transaction,
          event,
        };
      } catch (error: any) {
        console.error('postTransaction error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    openPeriod: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: bookkeeper or governance role required
      if (!roles.includes('bookkeeper') && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        // Check for existing open period
        const currentPeriod = await dataSources.treasury.getCurrentPeriod();
        if (currentPeriod) {
          return {
            success: false,
            errors: [
              {
                message: 'Cannot open new period: another period is currently open',
                code: 'VALIDATION_ERROR',
              },
            ],
          };
        }

        const period = await dataSources.treasury.openPeriod(input, memberId!);

        const event = await publishEvent({
          eventType: 'treasury.period.opened',
          aggregateId: period.periodId,
          payload: {
            periodId: period.periodId,
            periodName: period.periodName,
            startDate: period.startDate,
            endDate: period.endDate,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          period,
          event,
        };
      } catch (error: any) {
        console.error('openPeriod error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    closePeriod: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: governance role required
      if (!roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized: governance role required', code: 'FORBIDDEN' }],
        };
      }

      try {
        const period = await dataSources.treasury.closePeriod(input.periodId, memberId!);

        const event = await publishEvent({
          eventType: 'treasury.period.closed',
          aggregateId: period.periodId,
          payload: {
            periodId: period.periodId,
            periodName: period.periodName,
            endDate: period.endDate,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          period,
          event,
        };
      } catch (error: any) {
        console.error('closePeriod error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    createAccount: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: bookkeeper or governance role required
      if (!roles.includes('bookkeeper') && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const account = await dataSources.treasury.createAccount(input, memberId!);

        const event = await publishEvent({
          eventType: 'treasury.account.created',
          aggregateId: account.accountId,
          payload: {
            accountId: account.accountId,
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            accountType: account.accountType,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          account,
          event,
        };
      } catch (error: any) {
        console.error('createAccount error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    updateAccount: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      if (!roles.includes('bookkeeper') && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const account = await dataSources.treasury.updateAccount(input, memberId!);

        const event = await publishEvent({
          eventType: 'treasury.account.updated',
          aggregateId: account.accountId,
          payload: {
            accountId: account.accountId,
            changes: input,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          account,
          event,
        };
      } catch (error: any) {
        console.error('updateAccount error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },
  },
};
```

---

## People Mutation Resolvers

**File:** `src/resolvers/people-mutations.ts`

```typescript
import { HabitatContext } from '../context';
import { publishEvent } from '../utils/events';

export const peopleMutationResolvers = {
  Mutation: {
    createMember: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: governance role required
      if (!roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const member = await dataSources.people.createMember(input, memberId!);

        const event = await publishEvent({
          eventType: 'people.member.created',
          aggregateId: member.memberId,
          payload: {
            memberId: member.memberId,
            displayName: member.displayName,
            tier: member.tier,
            votingRights: member.votingRights,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          member,
          event,
        };
      } catch (error: any) {
        console.error('createMember error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    updateMember: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Members can update their own profile, governance can update anyone
      const isOwnProfile = input.memberId === memberId;
      const isGovernance = roles.includes('governance');

      if (!isOwnProfile && !isGovernance) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const member = await dataSources.people.updateMember(input, memberId!);

        const event = await publishEvent({
          eventType: 'people.member.updated',
          aggregateId: member.memberId,
          payload: {
            memberId: member.memberId,
            changes: input,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          member,
          event,
        };
      } catch (error: any) {
        console.error('updateMember error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    submitContribution: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId }: HabitatContext
    ) => {
      if (!memberId) {
        return {
          success: false,
          errors: [{ message: 'Not authenticated', code: 'UNAUTHENTICATED' }],
        };
      }

      try {
        const contribution = await dataSources.people.submitContribution(input, memberId);

        const event = await publishEvent({
          eventType: 'people.contribution.submitted',
          aggregateId: contribution.contributionId,
          payload: {
            contributionId: contribution.contributionId,
            contributorId: memberId,
            contributionType: contribution.contributionType,
            description: contribution.description,
            periodId: contribution.periodId,
          },
          actorId: memberId,
        });

        return {
          success: true,
          errors: [],
          contribution,
          event,
        };
      } catch (error: any) {
        console.error('submitContribution error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    approveContribution: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Check if member is an approver for this contribution
      const canApprove = await dataSources.people.canApproveContribution(
        input.contributionId,
        memberId!
      );

      if (!canApprove && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const result = await dataSources.people.approveContribution(
          input.contributionId,
          memberId!,
          input.comments
        );

        const event = await publishEvent({
          eventType: 'people.contribution.approved',
          aggregateId: input.contributionId,
          payload: {
            contributionId: input.contributionId,
            approverId: memberId!,
            approvalId: result.approval.approvalId,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          contribution: result.contribution,
          approval: result.approval,
          event,
        };
      } catch (error: any) {
        console.error('approveContribution error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    rejectContribution: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      const canApprove = await dataSources.people.canApproveContribution(
        input.contributionId,
        memberId!
      );

      if (!canApprove && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const result = await dataSources.people.rejectContribution(
          input.contributionId,
          memberId!,
          input.reason
        );

        const event = await publishEvent({
          eventType: 'people.contribution.rejected',
          aggregateId: input.contributionId,
          payload: {
            contributionId: input.contributionId,
            approverId: memberId!,
            reason: input.reason,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          contribution: result.contribution,
          approval: result.approval,
          event,
        };
      } catch (error: any) {
        console.error('rejectContribution error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },
  },
};
```

---

## Agreements Mutation Resolvers

**File:** `src/resolvers/agreements-mutations.ts`

```typescript
import { HabitatContext } from '../context';
import { publishEvent } from '../utils/events';

export const agreementsMutationResolvers = {
  Mutation: {
    proposeAllocations: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: governance role required
      if (!roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const allocations = await dataSources.agreements.proposeAllocations(
          input.periodId,
          input.allocations,
          memberId!
        );

        const event = await publishEvent({
          eventType: 'agreements.allocations.proposed',
          aggregateId: input.periodId,
          payload: {
            periodId: input.periodId,
            allocationCount: allocations.length,
            totalAllocated: allocations.reduce(
              (sum, a) => sum + a.allocatedAmountCents,
              0
            ),
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          allocations,
          event,
        };
      } catch (error: any) {
        console.error('proposeAllocations error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    approveAllocations: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: governance role required
      if (!roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const allocations = await dataSources.agreements.approveAllocations(
          input.periodId,
          memberId!,
          input.approvalNotes
        );

        const event = await publishEvent({
          eventType: 'agreements.allocations.approved',
          aggregateId: input.periodId,
          payload: {
            periodId: input.periodId,
            approvedBy: memberId!,
            allocationCount: allocations.length,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          allocations,
          event,
        };
      } catch (error: any) {
        console.error('approveAllocations error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    scheduleDistribution: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: bookkeeper or governance role required
      if (!roles.includes('bookkeeper') && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const distribution = await dataSources.agreements.scheduleDistribution(
          input,
          memberId!
        );

        const event = await publishEvent({
          eventType: 'agreements.distribution.scheduled',
          aggregateId: distribution.distributionId,
          payload: {
            distributionId: distribution.distributionId,
            memberId: input.memberId,
            amountCents: input.amountCents,
            scheduledDate: input.scheduledDate,
            distributionType: input.distributionType,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          distribution,
          event,
        };
      } catch (error: any) {
        console.error('scheduleDistribution error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    completeDistribution: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: bookkeeper or governance role required
      if (!roles.includes('bookkeeper') && !roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        const distribution = await dataSources.agreements.completeDistribution(
          input.distributionId,
          input.paidDate,
          input.referenceNumber,
          input.notes,
          memberId!
        );

        const event = await publishEvent({
          eventType: 'agreements.distribution.completed',
          aggregateId: distribution.distributionId,
          payload: {
            distributionId: distribution.distributionId,
            memberId: distribution.memberId,
            amountCents: distribution.amountCents,
            paidDate: input.paidDate,
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          distribution,
          event,
        };
      } catch (error: any) {
        console.error('completeDistribution error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },

    updateAgreementWeights: async (
      _parent: any,
      { input }: { input: any },
      { dataSources, memberId, roles }: HabitatContext
    ) => {
      // Authorization: governance role required
      if (!roles.includes('governance')) {
        return {
          success: false,
          errors: [{ message: 'Unauthorized', code: 'FORBIDDEN' }],
        };
      }

      try {
        // Validate weights sum to 1.0
        const sum =
          input.laborWeight +
          input.expertiseWeight +
          input.capitalWeight +
          input.relationshipWeight;

        if (Math.abs(sum - 1.0) > 0.001) {
          return {
            success: false,
            errors: [
              {
                message: 'Weights must sum to 1.0',
                code: 'VALIDATION_ERROR',
              },
            ],
          };
        }

        const agreement = await dataSources.agreements.updateAgreementWeights(
          input,
          memberId!
        );

        const event = await publishEvent({
          eventType: 'agreements.weights.updated',
          aggregateId: input.agreementId,
          payload: {
            agreementId: input.agreementId,
            effectiveDate: input.effectiveDate,
            weights: {
              labor: input.laborWeight,
              expertise: input.expertiseWeight,
              capital: input.capitalWeight,
              relationship: input.relationshipWeight,
            },
          },
          actorId: memberId!,
        });

        return {
          success: true,
          errors: [],
          agreement,
          event,
        };
      } catch (error: any) {
        console.error('updateAgreementWeights error:', error);
        return {
          success: false,
          errors: [{ message: error.message, code: 'INTERNAL_ERROR' }],
        };
      }
    },
  },
};
```

---

## Event Publishing Utility

**File:** `src/utils/events.ts`

```typescript
import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

let connection: amqp.Connection;
let channel: amqp.Channel;

export async function initializeEventBus() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL!);
    channel = await connection.createChannel();

    // Declare exchanges for each bounded context
    await channel.assertExchange('treasury.events', 'topic', { durable: true });
    await channel.assertExchange('people.events', 'topic', { durable: true });
    await channel.assertExchange('agreements.events', 'topic', { durable: true });

    console.log('✓ Event bus initialized');
  } catch (error) {
    console.error('Event bus initialization failed:', error);
    throw error;
  }
}

export async function publishEvent(event: {
  eventType: string;
  aggregateId: string;
  payload: any;
  actorId: string;
}) {
  const eventId = uuidv4();
  const timestamp = new Date().toISOString();

  const fullEvent = {
    eventId,
    eventType: event.eventType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    actorId: event.actorId,
    timestamp,
  };

  // Determine exchange from event type
  const [context] = event.eventType.split('.');
  const exchange = `${context}.events`;

  // Publish to exchange with routing key = event type
  channel.publish(
    exchange,
    event.eventType,
    Buffer.from(JSON.stringify(fullEvent)),
    {
      persistent: true,
      contentType: 'application/json',
      messageId: eventId,
      timestamp: Date.now(),
    }
  );

  return {
    eventId,
    eventType: event.eventType,
    timestamp,
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (channel) await channel.close();
  if (connection) await connection.close();
});
```

---

## Example Data Source Mutation Methods (People)

**File:** `src/datasources/PeopleAPI.ts` (additions)

```typescript
export class PeopleAPI {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async submitContribution(input: any, contributorId: string) {
    const contributionId = uuidv4();
    const result = await this.pool.query(
      `INSERT INTO people.contributions 
        (contribution_id, contributor_id, contribution_type, period_id, description, 
         quantity_hours, value_usd, evidence_urls, status, submitted_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', NOW(), NOW())
      RETURNING *`,
      [
        contributionId,
        contributorId,
        input.contributionType,
        input.periodId,
        input.description,
        input.quantityHours,
        input.valueUsd,
        input.evidenceUrls,
      ]
    );

    return result.rows[0];
  }

  async canApproveContribution(contributionId: string, approverId: string): Promise<boolean> {
    // Check if this approver has a pending approval record for this contribution
    const result = await this.pool.query(
      `SELECT 1 FROM people.contribution_approvals
       WHERE contribution_id = $1 AND approver_id = $2 AND status = 'pending'`,
      [contributionId, approverId]
    );

    return result.rowCount > 0;
  }

  async approveContribution(contributionId: string, approverId: string, comments?: string) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update approval record
      const approvalResult = await client.query(
        `UPDATE people.contribution_approvals
         SET status = 'approved', comments = $1, approved_at = NOW()
         WHERE contribution_id = $2 AND approver_id = $3
         RETURNING *`,
        [comments, contributionId, approverId]
      );

      // Check if all approvals are complete
      const pendingResult = await client.query(
        `SELECT COUNT(*) as pending_count FROM people.contribution_approvals
         WHERE contribution_id = $1 AND status = 'pending'`,
        [contributionId]
      );

      const pendingCount = parseInt(pendingResult.rows[0].pending_count);

      // If all approvals complete, update contribution status
      if (pendingCount === 0) {
        await client.query(
          `UPDATE people.contributions
           SET status = 'approved', reviewed_at = NOW()
           WHERE contribution_id = $1`,
          [contributionId]
        );
      }

      // Fetch updated contribution
      const contributionResult = await client.query(
        `SELECT * FROM people.contributions WHERE contribution_id = $1`,
        [contributionId]
      );

      await client.query('COMMIT');

      return {
        contribution: contributionResult.rows[0],
        approval: approvalResult.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectContribution(contributionId: string, approverId: string, reason: string) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update approval record
      const approvalResult = await client.query(
        `UPDATE people.contribution_approvals
         SET status = 'rejected', comments = $1, approved_at = NOW()
         WHERE contribution_id = $2 AND approver_id = $3
         RETURNING *`,
        [reason, contributionId, approverId]
      );

      // Reject the entire contribution (one rejection fails it)
      const contributionResult = await client.query(
        `UPDATE people.contributions
         SET status = 'rejected', reviewed_at = NOW()
         WHERE contribution_id = $1
         RETURNING *`,
        [contributionId]
      );

      await client.query('COMMIT');

      return {
        contribution: contributionResult.rows[0],
        approval: approvalResult.rows[0],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

---

## Authorization Patterns

**Summary of role-based authorization:**

| Mutation | Required Role | Notes |
|----------|---------------|-------|
| `postTransaction` | bookkeeper, governance | Treasury write access |
| `openPeriod` | bookkeeper, governance | Period management |
| `closePeriod` | governance | Period close requires governance approval |
| `createAccount` | bookkeeper, governance | Chart of accounts modification |
| `updateAccount` | bookkeeper, governance | Chart of accounts modification |
| `createMember` | governance | Member onboarding |
| `updateMember` | self or governance | Members can edit own profile |
| `submitContribution` | authenticated | Any member can submit |
| `approveContribution` | designated approver or governance | Multi-approver workflow |
| `rejectContribution` | designated approver or governance | One rejection fails contribution |
| `proposeAllocations` | governance | Allocation calculation |
| `approveAllocations` | governance | Allocation approval |
| `scheduleDistribution` | bookkeeper, governance | Distribution scheduling |
| `completeDistribution` | bookkeeper, governance | Mark distribution paid |
| `updateAgreementWeights` | governance | Operating agreement changes |

---

## Validation Patterns

**Input validation:**

1. **Double-entry constraint:** Transaction entries must sum to zero
2. **Weight normalization:** Patronage weights must sum to 1.0
3. **Date logic:** Period end date must be after start date
4. **Enum validation:** Status values, types, etc. must match defined enums
5. **Required fields:** Non-nullable inputs enforced at schema level
6. **Business rules:** Single open period, pending approvals complete before status change

---

## Error Handling

**Error types:**

```typescript
// src/utils/errors.ts
export class AuthorizationError extends Error {
  code = 'FORBIDDEN';
  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
  code = 'NOT_FOUND';
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

export class ConflictError extends Error {
  code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}
```

---

## Transaction Management

For mutations that require atomicity across multiple database operations:

```typescript
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  
  // Multiple operations
  await client.query(/* ... */);
  await client.query(/* ... */);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

Event publishing happens **after** commit to ensure database consistency.

---

## Next Steps (Sprint 55)

Sprint 54 specified mutation resolvers. Sprint 55 will implement the event bus infrastructure:
- RabbitMQ setup (exchanges, queues, bindings)
- Event handlers for cross-context workflows
- Idempotency tracking
- Dead-letter queue handling

---

*Sprint 54 complete. API Server mutations specified.*

**Repository:** github.com/nou-techne/habitat  
**API Spec:** habitat/infrastructure/api-server-mutations.md
