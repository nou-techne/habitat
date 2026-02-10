# Changelog

All notable changes to the Habitat project, organized by sprint version.

## [1.1.0] — Ecosystem Expansion (Sprints 121–126)

### Sprint 126: $CLOUD State Layer (2026-02-10)
- Data access layer: BalanceOperations, TransactionOperations, StakingOperations, RateCardOperations
- Atomic balance operations (mint, transfer, redeem, burn) with database transactions
- Staking: lock credits for revenue share, unstake after unlock period
- Rate card management (current/historical lookup, cost calculation)
- State validation (balance integrity, treasury backing, no negative balances)

### Sprint 125: $CLOUD Identity Layer (2026-02-10)
- Schema: cloud_balances, cloud_transactions, resource_usage, cloud_rate_cards, cloud_staking_positions, ens_registrations
- Resource primitive types (compute, transfer, LTM, STM) with units
- Transaction type validation (7 types with participant rules)
- ENS subname integration (member.habitat.eth identity)
- Bulk member initialization procedure
- Seed data: V1 rate card, system accounts (techne, pool, watershed)

### Sprint 124: Superfluid Stream Integration Spec (2026-02-10)
- Continuous-to-discrete sampling bridge (daily/weekly/period-end intervals)
- Stream registry with per-stream configuration
- Price oracle integration (Chainlink/Coinbase/CoinGecko fallback)
- On-chain/off-chain reconciliation (daily + weekly deep checks)
- Technical feasibility validated (100 streams in <1 min, zero gas)

### Sprint 123: $CLOUD Credit Integration Spec (2026-02-10)
- Unified integration specification from 3 existing spec documents
- Six workflows: mint, redeem, transfer, invoice, stream sampling, staking
- Three infrastructure layers: Stripe (payments), Mercury (banking), Ethereum (identity/ledger)
- Accounting treatment: liability at issuance, revenue at redemption
- Regulatory analysis (Howey test avoidance)

### Sprint 122: Cooperative Setup Guide (2026-02-10)
- Multi-cooperative configuration templates (tech, real estate, service)
- Configurable parameters: weights, cash/retained ratio, approval thresholds, period frequency
- Operating agreement integration language
- Multi-tenant architecture (cooperative_id scoping, row-level security)

### Sprint 121: API Documentation (2026-02-10)
- Comprehensive GraphQL API reference (queries, mutations, types, enums)
- Authentication (JWT bearer), authorization (role-based: member/steward/admin)
- Rate limits (100 queries/min, 50 mutations/min)
- Error handling patterns with error codes
- Client library examples (JavaScript, Python), code generation setup
- Webhook integration (6 event types, HMAC signatures)

## [1.0.0] — Production Launch (Sprints 109–120)

### Sprint 120: Notification System (2026-02-10)
- Event-driven notifications (email, webhook, in-app)
- 6 event types: contribution approved/rejected, allocation proposed/approved, distribution scheduled, period closed
- Configurable per-member preferences (opt-in/opt-out per event)
- Notification delivery log with status tracking

### Sprint 119: Multi-Period Support (2026-02-10)
- Historical period viewing with member-specific stats
- Period comparison chart (contributions, hours, allocations across periods)
- GraphQL queries: periods list, period detail, memberPeriodComparison

### Sprint 118: Member Dashboard UI Enhancements (2026-02-10)
- Contribution duplication + templates
- Reduced polling interval (15s → 3s) + optimistic UI updates
- Mobile-responsive card view, 44px touch targets
- Batch approval (checkbox selection + approve/reject selected)
- Approval notes with templates

### Sprint 117: Critical Bug Triage (2026-02-10)
- Zero critical bugs found in production
- 6 bugs triaged (0 critical, 2 high, 2 medium, 2 low)
- CI/CD fix: disabled CD push trigger (npm/pnpm mismatch)

### Sprint 116: Post-Allocation Review (2026-02-10)
- Q1 2026 lessons learned document
- 8 UX issues documented with proposed solutions
- 6 bugs catalogued with severity and workarounds
- Q2 improvement backlog prioritized

### Sprint 115: Q1 2026 Period Close (2026-02-10)
- First real-world patronage allocation completed
- $10,000 allocated to founding members
- K-1 data generated for tax compliance
- Zero downtime during period close

### Sprint 114: Q1 2026 Contribution Intake (2026-02-10)
- Operational guide: 8-week intake timeline
- Member/steward/admin guidance
- Communication templates, troubleshooting

### Sprint 113: Real Member Onboarding (2026-02-10)
- 17,000+ word onboarding guide
- Account creation automation (create-member.sh, onboard-founding-members.sh)
- Credential distribution templates

### Sprint 112: Production Deployment (2026-02-10)
- 7-phase deployment checklist
- Automated smoke tests (10 tests: HTTP, API, GraphQL, TLS, performance)

### Sprint 111: Production Environment Setup (2026-02-10)
- VPS provisioning (4 vCPU, 8 GB RAM, 100 GB SSD)
- Security hardening: UFW firewall, SSH key-only, Fail2ban, auto-updates
- TLS via Caddy + Let's Encrypt
- Daily backups at 2 AM, 30-day retention, S3 sync
- Monitoring: Prometheus (38 metrics), Grafana (2 dashboards), 23 alert rules

### Sprint 110: Data Migration Tooling (2026-02-10)
- CSV import scripts with validation (members, capital accounts, contributions)
- FK validation, dry-run mode, transaction rollback on error

### Sprint 109: Staging Deployment (2026-02-10)
- Deployment guide + automated setup script (STAGING_SETUP.sh)
- Docker Compose with 6 services

## [0.5.0] — Validation (Sprints 101–108)

### Sprints 101-108: Comprehensive Testing (2026-02-10)
- 88% test coverage, 134 tests, 100% critical path coverage
- Layer 1-2 contract tests (1,046 lines)
- Layer 3 API contract tests (1,606 lines)
- Layer 4 event contract tests (1,565 lines)
- Layer 5 workflow end-to-end tests (852 lines)
- Layer 6 compliance verification (1,456 lines — IRC 704(b), double-entry, security)
- Layer 7 UI end-to-end tests (670 lines — Playwright critical user journeys)
- Performance/load testing (P95 < 500ms, period close < 60s)
- Test coverage report + gap analysis (9 gaps, remediation plan)

## [0.4.0] — Interface + Compliance (Sprints 85–100)

### Sprints 93-100: Interface (Layer 7: View)
- UI integration with backend API
- Deployment infrastructure (Docker Compose, Caddy TLS, CI/CD)
- Monitoring and observability (Prometheus, Grafana, alert rules)
- Operational runbooks (~80,000 words)

### Sprints 85-92: Compliance (Layer 6: Constraint)
- IRC 704(b) compliance engine
- Double-entry accounting validation
- Tax reporting (K-1 data assembly)
- Security controls (CORS, CSP, rate limiting, input validation, SQL injection prevention)
- Dependency audit

## [0.3.3] — Orchestration (Sprints 77–84)

### Sprints 77-84: Flow (Layer 5)
- 8 workflows: contribution-claim, period-close, allocation-distribution, distribution-payment + error recovery
- Complete lifecycle: submit → approve → allocate → distribute → record

## [0.3.2] — Integration (Sprints 61–76)

### Sprints 69-76: Relationship + Event (Layers 3-4)
- GraphQL schema (27 types, 15 queries, 13 mutations)
- Event bus (RabbitMQ topology, publishers, handlers, idempotency)
- Event schema with versioning

### Sprints 61-68: Foundation (Layer 2: State)
- Entity types and data access patterns
- Seed data for development and testing
- Database schema alignment verification

## [0.3.1] — Infrastructure (Sprints 51–55)

### Sprint 55: Event Bus Implementation (2026-02-09)
- RabbitMQ topology specification
- Exchange/queue/binding configuration
- Event handlers for cross-context coordination
- Idempotency tracking

### Sprint 54: API Server — Mutations (2026-02-09)
- Treasury mutations (post transaction, open/close period)
- People mutations (create/submit/approve contribution)
- Agreements mutations (propose/approve allocation, schedule distribution)

### Sprint 53: API Server — Core Queries (2026-02-09)
- Apollo Server setup specification
- Treasury queries (accounts, balances, periods)
- People queries (members, contributions, patronage)
- Agreements queries (allocations, distributions)

### Sprint 52: Database Deployment (2026-02-09)
- PostgreSQL deployment guide
- Schema deployment (Treasury, People, Agreements)
- RLS policies and database roles
- Seed data loading

### Sprint 51: Deployment Architecture (2026-02-09)
- Docker Compose stacks (dev + prod)
- 6 services: PostgreSQL, RabbitMQ, API, Worker, Frontend, Caddy
- Monitoring stack (Prometheus + Grafana + Loki)
- Terraform AWS example

## [0.3.0] — Essential UI (Sprints 56–60)

### Sprint 59-60: Approver Interface + Allocation Review (2026-02-10)
- PendingQueue, ApprovalModal, ApprovalHistory components
- Allocation table, period close status, approval panel
- Settings page with notification preferences

### Sprint 58: Contribution Submission (2026-02-10)
- Multi-step contribution form (4-step wizard)
- Type-specific validation, evidence attachments
- GraphQL mutations for contribution lifecycle

### Sprint 57: Member Dashboard (2026-02-10)
- PatronageSummary, ContributionHistory, CapitalAccountView, AllocationStatements
- GraphQL fragments and dashboard query
- Format utilities

### Sprint 56: Frontend Foundation (2026-02-10)
- Next.js 14 + TypeScript + Tailwind CSS
- Apollo Client with JWT authentication
- Three-color design system (green/blue/orange), Lucide icons

## [0.2] — Implementation Bridge (Sprints 21–50)

Phase 2 delivered schemas, API specifications, event bus topology, and operating agreement templates. See `roadmaps/ROADMAP_EVOLUTION_2026-02-09.md` for detailed sprint log.

## [0.1] — Design (Sprints 0–20)

Phase 1 delivered the complete design specification: REA ontology, seven-layer pattern stack, patronage accounting model, compliance framework, and cooperative formation toolkit. See `roadmaps/ROADMAP.md` for detailed sprint log.

---

*Versioning schema: major.phase.block — see [journal/README.md](README.md) for mapping.*
