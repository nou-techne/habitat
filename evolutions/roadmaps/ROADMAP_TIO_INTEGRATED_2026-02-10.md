# Habitat Roadmap: TIO-Integrated MVP/Beta

*72+ sprints from Sprint 61 → Sprint 132. 12-hour implementation marathon.*
*Each sprint assigns a primary TIO role. Layer order governs build sequence.*

Date: 2026-02-10
Previous: ROADMAP_PHASE3_2026-02-09.md (Sprints 51-60)
Version: 0.3.3 → 0.5.0 (MVP) → 0.6.0 (Beta)

---

## Status

**Completed:**
- Phase 1 (Sprints 0-20): Design specification — COMPLETE
- Phase 2 (Sprints 21-50): Implementation bridge — COMPLETE
- Phase 3a - Infrastructure specs (Sprints 51-55): Deployment architecture — COMPLETE
- Phase 3b - Essential UI (Sprints 56-60): Frontend foundation through allocation review — COMPLETE

**Assets available:**
- 27 specification documents (`spec/`)
- 5 SQL schemas (`schema/`)
- 5 infrastructure specifications (`infrastructure/`)
- Full UI component library (`ui/`) — dashboard, contributions, approvals, allocations
- 12 TIO role artifacts (`tio/roles/`)
- 1 compliance mapping (`compliance/`)

**What's missing:** Running backend. Wired event bus. Integration tests. Compliance automation. Production deployment. Real data. The gap between specification and system.

---

## Governing Principles

1. **Layer order is build order.** Identity → State → Relationship → Event → Flow → Constraint → View. No skipping.
2. **Each sprint has a primary TIO role.** The role's quality criteria define acceptance.
3. **RACI per sprint.** R = primary role, A = Technical Lead, C = adjacent roles, I = Product Engineer.
4. **Specs exist; implementation doesn't.** Every sprint converts a spec into running code or validated infrastructure.
5. **Test at every layer.** QA Engineer is consulted on every sprint, owns dedicated test sprints.
6. **Dogfood target:** Techne/RegenHub Q1 2026 allocation by March 31.

---

## TIO Role Activation Sequence

The roles activate progressively as sprints move up the pattern stack:

| Phase | Sprints | Primary Roles | Layer Focus |
|-------|---------|--------------|-------------|
| Foundation | 61-68 | Schema Architect, Backend Engineer | 1-2: Identity, State |
| Integration | 69-76 | Integration Engineer, Event Systems Engineer | 3-4: Relationship, Event |
| Orchestration | 77-84 | Workflow Engineer | 5: Flow |
| Compliance | 85-92 | Compliance & Security Engineer | 6: Constraint |
| Interface | 93-100 | Frontend & DevOps Engineer | 7: View |
| Testing | 101-108 | QA & Test Engineer | All layers |
| Production | 109-116 | Technical Lead, DevOps | Cross-cutting |
| Pilot | 117-124 | Product Engineer, all roles | Cross-cutting |
| Beta | 125-132 | All roles | Hardening |

---

## Block 5: Foundation — Identity & State (Sprints 61-68)

*Primary roles: Schema Architect (01), Backend Engineer (02)*
*Layer focus: 1 (Identity), 2 (State)*

### Sprint 61: Project Scaffolding
- **Role:** Technical Lead (00)
- **Layer:** Cross-cutting
- **Type:** Infrastructure
- **Deliverable:** Monorepo structure — `packages/api`, `packages/worker`, `packages/shared`
- **Details:** TypeScript project setup, shared types, build tooling (tsup), workspace config (pnpm)
- **Spec source:** `infrastructure/deployment-architecture.md`
- **Acceptance:** `pnpm build` succeeds across all packages, types shared correctly

### Sprint 62: Entity Type System
- **Role:** Schema Architect (01)
- **Layer:** 1 (Identity)
- **Type:** Schema
- **Deliverable:** `packages/shared/src/types/` — TypeScript types for all REA entities
- **Details:** Member, Contribution, Account, Transaction, Allocation, Distribution, Period, Agreement. Enum types for contribution types, account types, period status, approval status
- **Spec source:** `spec/rea-event-grammar.md`, `spec/identity-strategy.md`
- **Acceptance:** Types compile, match SQL schema column definitions, exported as shared package

### Sprint 63: Database Connection Layer
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/db/` — PostgreSQL connection pool, query builder setup
- **Details:** pg pool with connection config, migration runner (node-pg-migrate), health check query
- **Spec source:** `infrastructure/database-deployment.md`
- **Acceptance:** Pool connects, health check returns, migration runner executes schema files

### Sprint 64: Treasury Data Access
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/data/treasury.ts` — Treasury CRUD operations
- **Details:** createAccount, getAccount, listAccounts, postTransaction, getBalance, getTransactions, openPeriod, closePeriod
- **Spec source:** `schema/01_treasury_core.sql`, `spec/transaction-model.md`
- **Acceptance:** All operations match SQL schema, parameterized queries, proper error handling

### Sprint 65: People Data Access
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/data/people.ts` — People CRUD operations
- **Details:** createMember, getMember, listMembers, createContribution, submitContribution, approveContribution, rejectContribution, getPatronageSummary
- **Spec source:** `schema/04_people_core.sql`, `spec/contribution-lifecycle.md`
- **Acceptance:** Operations match schema, contribution state machine enforced, patronage calculations correct

### Sprint 66: Agreements Data Access
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/data/agreements.ts` — Agreements CRUD operations
- **Details:** createAllocation, proposeAllocation, approveAllocation, createDistribution, scheduleDistribution, completeDistribution, getCapitalAccount, updateCapitalAccount
- **Spec source:** `schema/05_agreements_core.sql`, `spec/capital-accounts.md`
- **Acceptance:** Operations match schema, allocation formula matches spec, capital account updates correct

### Sprint 67: Seed Data & Fixtures
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/data/seed.ts` — Test data generation
- **Details:** Techne/RegenHub fixture data: 5 members, 20 contributions across all types, 1 open period (Q1 2026), chart of accounts, sample transactions
- **Spec source:** `schema/03_treasury_seed_data.sql`, `spec/chart-of-accounts.md`
- **Acceptance:** Seed data loads cleanly, references are consistent, ready for integration testing

### Sprint 68: Data Access Tests
- **Role:** QA & Test Engineer
- **Layer:** 2 (State)
- **Type:** Testing
- **Deliverable:** `packages/api/src/data/__tests__/` — Unit tests for all data access modules
- **Details:** Treasury, People, Agreements data layer tests. Test against real PostgreSQL (testcontainers or test database). Verify CRUD, state transitions, error handling
- **Spec source:** All schema files, data access modules from Sprints 64-66
- **Acceptance:** 100% coverage of public data access functions, all tests pass

---

## Block 6: Integration — Relationship & Event (Sprints 69-76)

*Primary roles: Integration Engineer (03), Event Systems Engineer (04)*
*Layer focus: 3 (Relationship), 4 (Event)*

### Sprint 69: GraphQL Schema Implementation
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/graphql/schema.ts` — Full GraphQL type definitions
- **Details:** SDL types for all entities, input types, enums, connection types (Relay pagination). Maps to data layer types
- **Spec source:** `spec/api-specification.md`, `infrastructure/api-server-core.md`
- **Acceptance:** Schema parses, all spec'd types present, input validation annotations

### Sprint 70: Treasury Resolvers
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/graphql/resolvers/treasury.ts`
- **Details:** Query resolvers: accounts, account, transactions, balance, periods, currentPeriod. Mutation resolvers: postTransaction, openPeriod, closePeriod
- **Spec source:** `infrastructure/api-server-core.md`, `infrastructure/api-server-mutations.md`
- **Acceptance:** All queries return correct data, mutations enforce business rules, auth context checked

### Sprint 71: People Resolvers
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/graphql/resolvers/people.ts`
- **Details:** Query resolvers: members, member, contributions, pendingContributions, patronageSummary, approvalHistory. Mutation resolvers: createContribution, submitContribution, approveContribution, rejectContribution
- **Spec source:** `infrastructure/api-server-core.md`, `infrastructure/api-server-mutations.md`
- **Acceptance:** Contribution lifecycle states enforced, patronage calculations match formula spec

### Sprint 72: Agreements Resolvers
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/graphql/resolvers/agreements.ts`
- **Details:** Query resolvers: allocations, proposedAllocations, allocationSummary, distributions, capitalAccount, periodCloseWorkflow. Mutation resolvers: initiatePeriodClose, approveAllocations, rejectAllocations, scheduleDistribution
- **Spec source:** `infrastructure/api-server-mutations.md`, `spec/period-close.md`
- **Acceptance:** Period close orchestration matches spec, allocation formula correct, governance approval threshold enforced

### Sprint 73: Apollo Server Setup
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Infrastructure
- **Deliverable:** `packages/api/src/server.ts` — Running Apollo Server
- **Details:** Server startup, middleware (CORS, auth, logging), health endpoint, graceful shutdown. JWT validation middleware. Context injection (user, db pool, event bus)
- **Spec source:** `infrastructure/api-server-core.md`
- **Acceptance:** Server starts, playground accessible, auth middleware rejects invalid tokens, health check responds

### Sprint 74: Event Schema & Bus Setup
- **Role:** Event Systems Engineer (04)
- **Layer:** 4 (Event)
- **Type:** Implementation
- **Deliverable:** `packages/worker/src/events/` — Event type definitions and bus connection
- **Details:** Event envelope schema (id, type, aggregateId, timestamp, payload, metadata). RabbitMQ connection. Exchange/queue declarations matching topology spec
- **Spec source:** `spec/rea-event-schema.md`, `spec/event-bus-specification.md`, `infrastructure/event-bus-implementation.md`
- **Acceptance:** Events serialize/deserialize correctly, exchanges and queues created, connection resilient

### Sprint 75: Event Publishers
- **Role:** Event Systems Engineer (04)
- **Layer:** 4 (Event)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/events/publishers.ts` — Event publishing from mutation resolvers
- **Details:** Publish events on: contribution.submitted, contribution.approved, contribution.rejected, period.opened, period.closed, allocation.proposed, allocation.approved, distribution.scheduled, distribution.completed, transaction.posted
- **Spec source:** `spec/rea-event-schema.md`, `infrastructure/event-bus-implementation.md`
- **Acceptance:** Every mutation publishes correct event, events include full payload, idempotency key set

### Sprint 76: Event Handlers (Cross-Context)
- **Role:** Event Systems Engineer (04)
- **Layer:** 4 (Event)
- **Type:** Implementation
- **Deliverable:** `packages/worker/src/handlers/` — Event consumer handlers
- **Details:** contribution.approved → create patronage claim in Agreements. allocation.approved → update capital accounts in Treasury. distribution.completed → record transaction in Treasury. Idempotency tracking (processed events table)
- **Spec source:** `spec/people-treasury-integration.md`, `infrastructure/event-bus-implementation.md`
- **Acceptance:** Cross-context events trigger correct side effects, idempotent on replay, dead-letter on failure

---

## Block 7: Orchestration — Flow (Sprints 77-84)

*Primary role: Workflow Engineer (05)*
*Layer focus: 5 (Flow)*

### Sprint 77: Contribution → Claim Workflow
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Integration
- **Deliverable:** `packages/worker/src/workflows/contribution-claim.ts`
- **Details:** End-to-end: submit contribution → approve → publish event → create patronage claim → verify patronage increment. Compensating actions on failure
- **Spec source:** `spec/contribution-lifecycle.md`, `spec/patronage-formula.md`
- **Acceptance:** Integration test passes full cycle, patronage values match formula

### Sprint 78: Period Close Orchestration
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Integration
- **Deliverable:** `packages/worker/src/workflows/period-close.ts`
- **Details:** 5-step orchestration: aggregate patronage → apply type weights → calculate member allocations → propose allocations → await governance approval. Step tracking, resumability, error recovery
- **Spec source:** `spec/period-close.md`, `spec/patronage-formula.md`
- **Acceptance:** Full period close completes with correct allocations, steps are independently resumable

### Sprint 79: Allocation → Distribution Workflow
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Integration
- **Deliverable:** `packages/worker/src/workflows/allocation-distribution.ts`
- **Details:** allocation.approved → calculate cash/retained split → update capital accounts → schedule distributions → record treasury transactions. Handles partial distributions
- **Spec source:** `spec/distribution-mechanics.md`, `spec/capital-accounts.md`
- **Acceptance:** Capital accounts update correctly, double-entry balanced, distributions scheduled

### Sprint 80: Distribution → Payment Workflow
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Integration
- **Deliverable:** `packages/worker/src/workflows/distribution-payment.ts`
- **Details:** Scheduled distribution → processing → payment execution → completion → treasury recording. Payment method abstraction (manual, ACH, crypto stub)
- **Spec source:** `spec/distribution-mechanics.md`, `spec/transaction-model.md`
- **Acceptance:** Payment lifecycle tracked, treasury balanced on completion

### Sprint 81: Balance Computation Engine
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Implementation
- **Deliverable:** `packages/shared/src/engine/balance-computation.ts`
- **Details:** Real-time balance computation from event stream. Book balance, tax balance, contributed capital, retained patronage, distributed patronage. Materialized view refresh
- **Spec source:** `spec/balance-computation.md`, `spec/capital-accounts.md`
- **Acceptance:** Balances match expected values from seed data, temporal queries work

### Sprint 82: Patronage Formula Engine
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Implementation
- **Deliverable:** `packages/shared/src/engine/patronage-formula.ts`
- **Details:** Weighted patronage calculation. Type weights (configurable), raw → weighted conversion, proportional allocation, cash/retained split ratio. Multi-period accumulation
- **Spec source:** `spec/patronage-formula.md`, `spec/valuation-rules.md`
- **Acceptance:** Formula matches spec examples exactly, handles edge cases (zero contributions, single member)

### Sprint 83: Complete Cycle Integration Test
- **Role:** Workflow Engineer (05) + QA (cross-cutting)
- **Layer:** 5 (Flow)
- **Type:** Testing
- **Deliverable:** `packages/worker/src/workflows/__tests__/complete-cycle.test.ts`
- **Details:** Full Q1 2026 simulation: 5 members, 20 contributions, period close, allocation, distribution. Verify every capital account balance. Verify double-entry integrity
- **Spec source:** All workflow specs
- **Acceptance:** End-to-end test passes, all balances correct, event audit trail complete

### Sprint 84: Workflow Error Recovery
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Implementation
- **Deliverable:** `packages/worker/src/workflows/recovery.ts`
- **Details:** Dead-letter queue handling, event replay mechanism, workflow step retry with backoff, compensating transactions. Manual intervention hooks
- **Spec source:** `spec/event-bus-specification.md`
- **Acceptance:** Failed workflows recoverable, replay produces same results, no duplicate side effects

---

## Block 8: Compliance — Constraint (Sprints 85-92)

*Primary role: Compliance & Security Engineer (06)*
*Layer focus: 6 (Constraint)*

### Sprint 85: 704(b) Capital Account Validator
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Compliance
- **Deliverable:** `packages/shared/src/compliance/704b-validator.ts`
- **Details:** Validate capital accounts against IRC 704(b) requirements: economic effect test, alternate test, safe harbor. Flag violations with specific regulation references
- **Spec source:** `compliance/704b-mapping.md`, `spec/capital-accounts.md`
- **Acceptance:** Validator catches all test cases from spec, references correct IRC sections

### Sprint 86: Double-Entry Integrity Checker
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Compliance
- **Deliverable:** `packages/shared/src/compliance/double-entry-checker.ts`
- **Details:** Verify debits = credits across all transactions. Period-level and account-level balance checks. Detect orphaned entries, unbalanced transactions, referential integrity violations
- **Spec source:** `spec/transaction-model.md`, `spec/chart-of-accounts.md`
- **Acceptance:** Checker validates seed data, detects intentionally unbalanced test cases

### Sprint 87: Allocation Formula Verifier
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Compliance
- **Deliverable:** `packages/shared/src/compliance/allocation-verifier.ts`
- **Details:** Verify allocations sum to 100% of distributable surplus. Verify type weights applied correctly. Verify cash/retained split within policy bounds. Verify no member receives negative allocation
- **Spec source:** `spec/patronage-formula.md`, `spec/governance-controls.md`
- **Acceptance:** Verifier validates all test scenarios, catches miscalculations

### Sprint 88: Authorization & Row-Level Security
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/auth/` — Authorization layer
- **Details:** Role-based access control (member, steward, admin). GraphQL directive authorization. Row-level security enforcement via context. Audit log for privileged operations
- **Spec source:** `spec/governance-controls.md`, `infrastructure/database-deployment.md`
- **Acceptance:** Members see only own data, stewards can approve, admins full access, audit log complete

### Sprint 89: K-1 Data Assembly
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Compliance
- **Deliverable:** `packages/shared/src/compliance/k1-assembly.ts`
- **Details:** Assemble Schedule K-1 data from capital accounts, allocations, and distributions. Partner's share of income, deductions, credits. Box-by-box mapping
- **Spec source:** `spec/k1-data-assembly.md`
- **Acceptance:** K-1 data matches manual calculation for test members

### Sprint 90: Tax Reporting Exports
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Implementation
- **Deliverable:** `packages/api/src/exports/` — CSV/PDF export endpoints
- **Details:** K-1 data export (CSV + PDF). 1099 data generation. Year-end capital account statements. Member allocation statements
- **Spec source:** `spec/k1-data-assembly.md`, `spec/member-allocation-statements.md`, `spec/treasury-reporting.md`
- **Acceptance:** Exports generate correctly, PDF renders cleanly, CSV parseable

### Sprint 91: Compliance Test Suite
- **Role:** QA & Test Engineer + Compliance (06)
- **Layer:** 6 (Constraint)
- **Type:** Testing
- **Deliverable:** `packages/shared/src/compliance/__tests__/`
- **Details:** Full compliance test suite: 704(b) scenarios, double-entry edge cases, allocation formula boundary conditions, authorization matrix verification, K-1 accuracy
- **Spec source:** All compliance modules
- **Acceptance:** 100% coverage of compliance modules, all tests pass, edge cases documented

### Sprint 92: Security Audit & Hardening
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Compliance
- **Deliverable:** `packages/api/src/security/` — Security middleware
- **Details:** Rate limiting, input sanitization, SQL injection prevention (parameterized queries audit), JWT expiry and refresh, CORS tightening, CSP headers, dependency vulnerability scan
- **Spec source:** `spec/governance-controls.md`
- **Acceptance:** No high/critical vulnerabilities, all OWASP top 10 addressed

---

## Block 9: Interface — View (Sprints 93-100)

*Primary role: Frontend & DevOps Engineer (07)*
*Layer focus: 7 (View)*

### Sprint 93: Wire UI to Live API
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Integration
- **Deliverable:** Update `ui/` components to consume live GraphQL API
- **Details:** Replace placeholder data with Apollo hooks. Generate typed hooks via codegen against running schema. Error boundaries, loading states, cache invalidation
- **Acceptance:** Dashboard loads real data from API, all queries resolve

### Sprint 94: Login & Authentication Flow
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** UI
- **Deliverable:** `ui/src/pages/login.tsx`, `ui/src/pages/register.tsx`
- **Details:** Login form (email/ENS + password or magic link). Registration form for new members. JWT token flow end-to-end. Protected route middleware. Session persistence
- **Acceptance:** User can log in, token stored, protected routes redirect, session survives reload

### Sprint 95: Real-Time Updates
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Implementation
- **Deliverable:** GraphQL subscriptions or polling for live data
- **Details:** Contribution status changes. Approval notifications. Period close progress. Balance updates. Notification toast system
- **Acceptance:** Status changes appear within 5 seconds, no manual refresh needed

### Sprint 96: Member Settings & Profile
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** UI
- **Deliverable:** `ui/src/pages/settings/` — Settings pages
- **Details:** Profile editing (display name, ENS, contact info). Notification preferences. Payment method setup. Password/auth management
- **Acceptance:** Settings save and persist, validation on all fields

### Sprint 97: Docker Compose Production Stack
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Infrastructure
- **Deliverable:** `docker-compose.prod.yml`, Dockerfiles for all services
- **Details:** PostgreSQL, RabbitMQ, API server, Event worker, Frontend (Next.js), Caddy (reverse proxy + TLS). Environment variable management, volume mounts, health checks
- **Spec source:** `infrastructure/deployment-architecture.md`
- **Acceptance:** `docker compose up` starts all services, health checks pass, UI accessible via Caddy

### Sprint 98: CI/CD Pipeline
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Infrastructure
- **Deliverable:** `.github/workflows/` — GitHub Actions
- **Details:** CI: lint, type-check, test on PR. CD: build Docker images, push to registry, deploy to staging. Database migration on deploy. Rollback capability
- **Acceptance:** PR triggers CI, merge to main triggers CD, staging deployment succeeds

### Sprint 99: Monitoring & Observability
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Infrastructure
- **Deliverable:** Prometheus metrics, Grafana dashboards, structured logging
- **Details:** API latency, error rate, active connections. Event bus queue depth, processing rate, dead letters. Database connection pool, query performance. Business metrics: contributions/day, active members, pending approvals
- **Spec source:** `infrastructure/deployment-architecture.md`
- **Acceptance:** Dashboards show real metrics, alerts fire on threshold breach

### Sprint 100: Operational Runbooks
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Documentation
- **Deliverable:** `docs/operations/` — Runbook collection
- **Details:** Backup and restore. Disaster recovery. Event replay. Database migration. SSL certificate renewal. Scaling guide. Troubleshooting decision tree
- **Acceptance:** Each runbook tested against staging environment

---

## Block 10: Validation — All Layers (Sprints 101-108)

*Primary role: QA & Test Engineer (cross-cutting)*
*Layer focus: All layers*

### Sprint 101: Layer 1-2 Contract Tests
- **Role:** QA & Test Engineer
- **Layer:** 1-2 (Identity, State)
- **Type:** Testing
- **Deliverable:** Contract tests: types ↔ database schema alignment
- **Acceptance:** Every TypeScript type maps to a database table/column, no drift

### Sprint 102: Layer 3 API Contract Tests
- **Role:** QA & Test Engineer
- **Layer:** 3 (Relationship)
- **Type:** Testing
- **Deliverable:** GraphQL schema tests, resolver integration tests
- **Acceptance:** Every spec'd query/mutation works, auth rules enforced, pagination correct

### Sprint 103: Layer 4 Event Contract Tests
- **Role:** QA & Test Engineer
- **Layer:** 4 (Event)
- **Type:** Testing
- **Deliverable:** Event schema validation, publisher/handler integration tests
- **Acceptance:** Every event type publishes and consumes correctly, idempotency verified

### Sprint 104: Layer 5 Workflow End-to-End Tests
- **Role:** QA & Test Engineer
- **Layer:** 5 (Flow)
- **Type:** Testing
- **Deliverable:** Full workflow integration tests with real database + event bus
- **Acceptance:** Complete contribution → allocation → distribution cycle verified

### Sprint 105: Layer 6 Compliance Verification
- **Role:** QA & Test Engineer
- **Layer:** 6 (Constraint)
- **Type:** Testing
- **Deliverable:** Compliance regression suite, security penetration test results
- **Acceptance:** All compliance checks pass, no authorization bypasses, K-1 data accurate

### Sprint 106: Layer 7 UI End-to-End Tests
- **Role:** QA & Test Engineer
- **Layer:** 7 (View)
- **Type:** Testing
- **Deliverable:** Playwright E2E tests for critical user journeys
- **Acceptance:** Login → submit contribution → approve → period close → view allocation works

### Sprint 107: Performance & Load Testing
- **Role:** QA & Test Engineer
- **Layer:** Cross-cutting
- **Type:** Testing
- **Deliverable:** Load test results and optimization recommendations
- **Details:** Simulate 50 concurrent members, 500 contributions, period close under load. Identify bottlenecks. Benchmark API response times
- **Acceptance:** P95 response time < 500ms for queries, period close completes in < 60s

### Sprint 108: Test Coverage Report & Gap Analysis
- **Role:** QA & Test Engineer
- **Layer:** Cross-cutting
- **Type:** Testing
- **Deliverable:** Coverage report, gap analysis, remediation plan
- **Acceptance:** Overall coverage > 80%, all critical paths tested, gaps documented with priority

---

## Block 11: Production — Cross-Cutting (Sprints 109-116)

*Primary roles: Technical Lead (00), Frontend & DevOps (07)*
*Layer focus: Deployment and data*

### Sprint 109: Staging Deployment
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Infrastructure
- **Deliverable:** Habitat running on staging with seed data
- **Acceptance:** All services healthy, UI accessible, API responding, events flowing

### Sprint 110: Data Migration Tooling
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** Migration scripts for Techne/RegenHub real data
- **Details:** Import members, historical contributions (if any), initial capital account balances. Validation checks on imported data
- **Acceptance:** Migration runs cleanly, data validates against schema

### Sprint 111: Production Environment Setup
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** Infrastructure
- **Deliverable:** Production infrastructure provisioned
- **Details:** VPS provisioned, DNS configured, TLS certificates, database backups scheduled, monitoring connected
- **Acceptance:** Production environment passes all health checks

### Sprint 112: Production Deployment
- **Role:** Technical Lead (00)
- **Layer:** Cross-cutting
- **Type:** Infrastructure
- **Deliverable:** Habitat running in production
- **Details:** Deploy all services, run migrations, load initial data, verify all integrations. Smoke test all critical paths
- **Acceptance:** Production URL accessible, login works, data correct

### Sprint 113: Real Member Onboarding
- **Role:** Product Engineer (00)
- **Layer:** Cross-cutting
- **Type:** Documentation
- **Deliverable:** Onboarding guide + member accounts created
- **Details:** Create accounts for Techne/RegenHub founding members. Distribute credentials. Walk-through guide for first contribution
- **Acceptance:** All founding members can log in and submit a contribution

### Sprint 114: Q1 2026 Contribution Intake
- **Role:** Product Engineer (00)
- **Layer:** Cross-cutting
- **Type:** Operations
- **Deliverable:** Q1 contributions entered into Habitat
- **Details:** Members submit Q1 contributions. Stewards review and approve. Address questions and issues in real-time
- **Acceptance:** All Q1 contributions submitted and approved

### Sprint 115: Q1 2026 Period Close
- **Role:** Technical Lead (00)
- **Layer:** Cross-cutting
- **Type:** Operations
- **Deliverable:** Q1 2026 patronage allocation completed
- **Details:** Initiate period close. Review proposed allocations. Governance approval. Generate K-1 data. Record distributions
- **Acceptance:** Allocations approved, capital accounts updated, K-1 data exportable

### Sprint 116: Post-Allocation Review
- **Role:** Product Engineer (00)
- **Layer:** Cross-cutting
- **Type:** Documentation
- **Deliverable:** Lessons learned document, bug list, improvement backlog
- **Details:** Gather member feedback. Document pain points. Identify bugs found during real use. Prioritize improvements
- **Acceptance:** Review documented, backlog prioritized, critical bugs flagged

---

## Block 12: Beta — Hardening (Sprints 117-124)

*Primary roles: All TIO roles activated*
*Version: 0.6.0 (Beta)*

### Sprint 117: Critical Bug Fixes
- **Role:** Technical Lead (00) — triage + assign
- **Layer:** As identified
- **Type:** Bug fix
- **Deliverable:** All critical bugs from post-allocation review resolved
- **Acceptance:** No critical or high-severity bugs open

### Sprint 118: Member Dashboard Enhancements
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** UI
- **Deliverable:** UI improvements based on member feedback
- **Acceptance:** Top 5 UX issues resolved

### Sprint 119: Multi-Period Support
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Implementation
- **Deliverable:** Historical period viewing, period comparison
- **Acceptance:** Members can view past period allocations, compare periods

### Sprint 120: Notification System
- **Role:** Event Systems Engineer (04)
- **Layer:** 4 (Event)
- **Type:** Implementation
- **Deliverable:** Email/webhook notifications for key events
- **Details:** Contribution approved/rejected, allocation proposed, distribution scheduled. Configurable preferences
- **Acceptance:** Notifications send on trigger, preferences honored

### Sprint 121: API Documentation
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Documentation
- **Deliverable:** GraphQL API documentation with examples
- **Details:** Introspection-based docs, query examples, authentication guide, rate limits
- **Acceptance:** Developer can onboard from docs alone

### Sprint 122: Second Cooperative Onboarding Prep
- **Role:** Product Engineer (00)
- **Layer:** Cross-cutting
- **Type:** Documentation
- **Deliverable:** Cooperative setup guide, configuration templates
- **Details:** Document what's configurable (type weights, cash/retained ratio, approval thresholds, period frequency). Template operating agreement integration
- **Acceptance:** A new cooperative can configure Habitat without code changes

### Sprint 123: $CLOUD Credit Integration Spec
- **Role:** Schema Architect (01) + Workflow Engineer (05)
- **Layer:** 1 + 5 (Identity, Flow)
- **Type:** Spec
- **Deliverable:** Specification for $CLOUD credit integration
- **Details:** $CLOUD balance tracking, resource primitive metering (compute, transfer, LTM, STM), Stripe mint mechanism, Superfluid stream integration
- **Spec source:** `spec/service-credits.md`, `spec/service-credit-integration.md`, `spec/superfluid-mapping.md`
- **Acceptance:** Spec reviewed and approved, integration points identified

### Sprint 124: Superfluid Stream Integration Spec
- **Role:** Integration Engineer (03) + Event Systems Engineer (04)
- **Layer:** 3 + 4 (Relationship, Event)
- **Type:** Spec
- **Deliverable:** Specification for Superfluid stream → patronage accounting bridge
- **Details:** Stream monitoring, patronage sampling model, on-chain ↔ off-chain reconciliation
- **Spec source:** `spec/superfluid-mapping.md`
- **Acceptance:** Spec reviewed, technical feasibility validated

---

## Block 13: Ecosystem — Expansion (Sprints 125-132)

*Primary roles: All TIO roles*
*Version: 0.6.x → approaching 1.0*

### Sprint 125: $CLOUD Credit Implementation (Identity)
- **Role:** Schema Architect (01)
- **Layer:** 1 (Identity)
- **Type:** Schema
- **Deliverable:** $CLOUD entity types, balance schema, resource primitive definitions

### Sprint 126: $CLOUD Credit Implementation (State)
- **Role:** Backend Engineer (02)
- **Layer:** 2 (State)
- **Type:** Implementation
- **Deliverable:** $CLOUD data access layer, balance operations, mint/burn/transfer

### Sprint 127: $CLOUD Credit Implementation (Relationship)
- **Role:** Integration Engineer (03)
- **Layer:** 3 (Relationship)
- **Type:** Implementation
- **Deliverable:** GraphQL resolvers for $CLOUD queries and mutations

### Sprint 128: $CLOUD Credit Implementation (Event)
- **Role:** Event Systems Engineer (04)
- **Layer:** 4 (Event)
- **Type:** Implementation
- **Deliverable:** $CLOUD events (minted, transferred, redeemed, expired), event handlers

### Sprint 129: $CLOUD Credit Implementation (Flow)
- **Role:** Workflow Engineer (05)
- **Layer:** 5 (Flow)
- **Type:** Implementation
- **Deliverable:** $CLOUD workflows: Stripe mint, resource metering, patronage credit

### Sprint 130: $CLOUD Credit Implementation (Constraint)
- **Role:** Compliance & Security (06)
- **Layer:** 6 (Constraint)
- **Type:** Compliance
- **Deliverable:** Howey test compliance verification, staking curve validation, regulatory review

### Sprint 131: $CLOUD Credit Implementation (View)
- **Role:** Frontend & DevOps (07)
- **Layer:** 7 (View)
- **Type:** UI
- **Deliverable:** $CLOUD dashboard: balance, transactions, staking, resource usage

### Sprint 132: 1.0 Release Candidate Assessment
- **Role:** Technical Lead (00) + Product Engineer (00)
- **Layer:** Cross-cutting
- **Type:** Documentation
- **Deliverable:** 1.0 readiness assessment
- **Details:** Feature completeness check, compliance verification, security audit results, documentation completeness, pilot feedback integration, go/no-go recommendation
- **Acceptance:** Clear path to 1.0 or documented blockers with resolution plan

---

## RACI Matrix (Summary)

| Sprint Block | R (Responsible) | A (Accountable) | C (Consulted) | I (Informed) |
|-------------|----------------|-----------------|---------------|--------------|
| 5: Foundation | Schema Architect, Backend Engineer | Technical Lead | Integration Engineer | Product Engineer |
| 6: Integration | Integration Engineer, Event Systems Engineer | Technical Lead | Backend Engineer, Workflow Engineer | Product Engineer |
| 7: Orchestration | Workflow Engineer | Technical Lead | Event Systems, Compliance | Product Engineer |
| 8: Compliance | Compliance & Security | Technical Lead | Workflow Engineer, Backend | Product Engineer |
| 9: Interface | Frontend & DevOps | Technical Lead | Integration Engineer | Product Engineer |
| 10: Validation | QA & Test Engineer | Technical Lead | All pattern roles | Product Engineer |
| 11: Production | Technical Lead, Product Engineer | Product Engineer | All roles | All members |
| 12: Beta | All roles (as assigned) | Technical Lead | Cross-role | Product Engineer |
| 13: Ecosystem | All roles (layer-by-layer) | Technical Lead | Cross-role | Product Engineer |

---

## Version Milestones

| Version | Sprint | Milestone |
|---------|--------|-----------|
| 0.3.2 | 60 | Essential UI complete ✓ |
| 0.3.3 | 68 | Foundation (Identity + State) complete |
| 0.3.4 | 76 | Integration (Relationship + Event) complete |
| 0.3.5 | 84 | Orchestration (Flow) complete |
| 0.3.6 | 92 | Compliance (Constraint) complete |
| 0.4.0 | 100 | Interface + Operations complete |
| 0.5.0 | 108 | MVP — All layers tested |
| 0.5.1 | 116 | First production allocation (Techne Q1 2026) |
| 0.6.0 | 124 | Beta — Hardened, documented, second cooperative ready |
| 0.7.0 | 132 | $CLOUD integration, 1.0 assessment |
| 1.0.0 | TBD | First production allocation with $CLOUD credits |

---

## Execution Model

- **Sprint cadence:** ~10 minutes per sprint via heartbeat
- **72 sprints = ~12 hours** of continuous execution
- **Sub-agent delegation:** Complex sprints may spawn Opus 4.6 sub-agents for parallel work
- **Journal entry:** Every 6 sprints (roughly 1 hour)
- **Commit cadence:** Every sprint
- **Quality gate:** Layer N-1 must be solid before starting Layer N

---

*Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.*

Developed by Techne / RegenHub, LCA
the-habitat.org | github.com/nou-techne/habitat
