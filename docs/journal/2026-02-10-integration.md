# February 10, 2026 — Integration Block (Partial)

**Sprints 69-73: Relationship Layer**

The Integration block began with the Relationship layer (Layer 3): GraphQL schema and resolvers connecting the data layer to the API surface. The system can now serve queries and mutations over HTTP, with authentication and privacy enforcement.

---

## Block Summary

| Sprint | Role | Artifact | Layer |
|--------|------|----------|-------|
| 69 | Integration Engineer | GraphQL schema (SDL) | 3 (Relationship) |
| 70 | Integration Engineer | Treasury resolvers | 3 (Relationship) |
| 71 | Integration Engineer | People resolvers | 3 (Relationship) |
| 72 | Integration Engineer | Agreements resolvers | 3 (Relationship) |
| 73 | Integration Engineer | Apollo Server setup | 3 (Relationship) |

**Version:** 0.4.0 (Integration — partial)

---

## Sprint 69: GraphQL Schema Implementation

**Role:** Integration Engineer (03)  
**Artifact:** `packages/api/src/graphql/schema.ts`  
**Deliverable:** Complete SDL type definitions

604 lines of GraphQL schema. 27 types across three bounded contexts. 15 queries, 13 mutations. Relay cursor pagination on all connection types. Input types for mutations. Enums for status tracking.

**Key structure:**
- Treasury: Account, Transaction, Period, AccountBalance
- People: Member, Contribution, Approval, PatronageSummary  
- Agreements: Allocation, Distribution, CapitalAccount, AllocationSummary

Every type maps 1:1 to data layer entities from Sprints 64-66. Input validation enforced via GraphQL type system.

---

## Sprint 70: Treasury Resolvers

**Role:** Integration Engineer (03)  
**Artifact:** `packages/api/src/graphql/resolvers/treasury.ts`  
**Deliverable:** Query + mutation resolvers for Treasury context

508 lines. 8 query resolvers, 5 mutation resolvers, 5 field resolvers.

**Queries:** account, accounts, transaction, transactions, accountBalance, period, periods, currentPeriod

**Mutations:** createAccount, createTransaction, voidTransaction, createPeriod, closePeriod

**Business rules enforced:**
- Transactions must balance (debits = credits within 0.01)
- Cannot close period with draft transactions
- Cannot close already-closed periods

**Authorization:** All mutations require steward/admin role. Auth context checked via `context.user.role`.

**Pagination:** Relay cursors, max 200 items per page.

---

## Sprint 71: People Resolvers

**Role:** Integration Engineer (03)  
**Artifact:** `packages/api/src/graphql/resolvers/people.ts`  
**Deliverable:** Query + mutation resolvers for People context

554 lines. 6 query resolvers (+ 1 specialized), 5 mutation resolvers, 4 field resolvers.

**Queries:** member, members, contribution, contributions, pendingContributions, patronageSummary, approvalHistory

**Mutations:** createMember, createContribution, submitContribution, approveContribution, rejectContribution

**Contribution lifecycle:** draft → submitted → approved/rejected

**Type-specific validation:**
- Labor: requires hours
- Expertise: requires expertise field
- Capital: requires capitalType
- Relationship: requires relationshipType

**Privacy enforcement:**
- Members see only their own draft contributions
- Members see only their own patronage summaries
- Stewards see all contributions and can approve/reject

**Authorization rules:**
- Cannot approve your own contributions
- Rejection requires reason
- Pending contributions visible only to stewards

---

## Sprint 72: Agreements Resolvers

**Role:** Integration Engineer (03)  
**Artifact:** `packages/api/src/graphql/resolvers/agreements.ts`  
**Deliverable:** Query + mutation resolvers for Agreements context

600 lines. 6 query resolvers, 6 mutation resolvers, 4 field resolvers.

**Queries:** allocation, allocations, proposedAllocations, distribution, distributions, capitalAccount, allocationSummary

**Mutations:** proposeAllocation, approveAllocation, scheduleDistribution, completeDistribution, initiatePeriodClose, approveAllocations

**Allocation lifecycle:** draft → proposed → approved → executed

**Privacy enforcement:**
- Members see only their own allocations, distributions, capital accounts
- Stewards see all data and can approve/schedule/complete

**Authorization rules:**
- Cannot approve your own allocation
- Bulk approval (approveAllocations) excludes self-allocations

**Period close workflow:** initiatePeriodClose validates period state. Actual allocation computation deferred to Sprint 90-91 (Formula Engine). Current implementation is a placeholder.

---

## Sprint 73: Apollo Server Setup

**Role:** Integration Engineer (03)  
**Artifact:** `packages/api/src/server.ts`, `packages/api/src/health.ts`  
**Deliverable:** Running GraphQL API server with middleware

290 lines across 2 files.

**Features:**
- Apollo Server with schema from Sprint 69
- Merged resolvers from Sprints 70-72
- JWT authentication middleware (Bearer token parsing)
- User context injection (userId, memberId, role)
- Request logging with timestamp + user info
- Error logging plugin
- Graceful shutdown on SIGTERM/SIGINT
- Database connection in context

**Health checks:**
- Standalone HTTP server on separate port (3001)
- `/health` endpoint (liveness probe)
- `/ready` endpoint (readiness probe)  
- Database connection check
- Returns 200 (healthy) or 503 (unhealthy)

**Configuration:**
- Server port (4000), health port (3001)
- CORS origin whitelist
- Introspection enabled in dev, disabled in prod

**Scripts:**
- `pnpm dev` → GraphQL server with hot reload
- `pnpm dev:health` → health check server
- `pnpm start` → production server

**Auth:** JWT Bearer tokens parsed from Authorization header. Signature validation is a placeholder (production TODO). User context available in all resolvers.

---

## What's Solid

**Layer 3 (Relationship):** Complete API surface. All queries and mutations from spec. Resolvers map schema to data layer. Privacy enforcement. Authorization checks. Business rules validated.

**Authentication:** JWT middleware parses tokens, injects user context. Invalid tokens rejected.

**Health checks:** Container-ready liveness + readiness probes.

**API documentation:** GraphQL Playground in development. Introspection for tooling.

---

## What's Missing

**No events yet.** Mutations update database state, but no events published. State changes are not observable outside the transaction.

**No event bus.** No pub/sub infrastructure. No cross-context coordination via events.

**No workflows.** Contribution approval updates the database, but doesn't create patronage claims. Allocation approval doesn't update capital accounts. The coordination layer is missing.

**Period close is a placeholder.** `initiatePeriodClose` validates period state but doesn't compute allocations. Formula engine deferred to Sprint 90-91.

**JWT signature validation.** Current implementation parses tokens but doesn't validate signatures. Production requires public key verification.

---

## Next Sprints: Event Layer (Sprints 74-76)

**Focus:** Layer 4 (Event)

- Event schema and type definitions
- Event bus connection (pub/sub)
- Event publishers (mutations → events)
- Event handlers (cross-context coordination)

The API layer is complete. Now we need the event layer to make state changes observable and enable workflows that span multiple contexts.

---

## Observations

**The resolver pattern is consistent.** Every resolver follows the same structure: auth check → business rule validation → data layer call → return result. The data layer handles database operations. Resolvers handle authorization and orchestration.

**Privacy is enforced at the resolver level, not the database.** Resolvers scope queries by `context.user.memberId` before calling data layer functions. This keeps privacy logic out of the data layer and makes it easier to reason about.

**Business rules live in resolvers, not data layer.** "Cannot approve your own contributions" is enforced in the resolver, not the database. This separation keeps the data layer focused on CRUD and the resolver layer focused on domain logic.

**State machines are explicit.** Contribution: draft → submitted → approved/rejected. Allocation: draft → proposed → approved → executed. Each transition is a separate mutation with validation.

**The period close workflow is complex.** `initiatePeriodClose` is currently a placeholder because it requires:
1. Computing patronage weights for the period
2. Calculating allocations for each member
3. Applying cash/retained split
4. Creating draft allocations
5. Generating allocation summary

This is Sprint 90-91 work (Formula Engine). The resolver layer is ready for it, but the formula engine doesn't exist yet.

**JWT authentication is simplified for now.** Production deployments need:
- Signature validation with public key
- Token expiration checks
- Refresh token flow
- Role assignment via claims

Current implementation is "good enough" for development but not production-ready.

**Health checks are Kubernetes-native.** Separate port for health probes follows best practices for container orchestration. Liveness probe (`/health`) vs. readiness probe (`/ready`) distinction matters for rolling deployments.

---

**Integration block partial (Sprints 69-73). Event layer next (Sprints 74-76).**

*5 sprints, ~2,500 lines of code.*
