# Changelog

All notable changes to the Habitat project, organized by sprint version.

## [0.3.2] — Essential UI (Sprints 56–60, in progress)

### Sprint 59: Approver Interface (2026-02-10)
- PendingQueue component for contributions awaiting approval
- ApprovalModal with required rejection reasons
- ApprovalHistory timeline component
- Tabs component (lightweight navigation)
- Approvals dashboard with pending/history tabs
- Contribution detail page for approvers
- GraphQL queries for approvals + history

### Sprint 58: Contribution Submission (2026-02-10)
- Multi-step contribution form (4-step wizard)
- Type selection: Labor, Expertise, Capital, Relationship
- Type-specific field validation
- Evidence attachment system (links, files, images, documents)
- Review step before submission
- GraphQL mutations for create/submit/approve/reject
- Contributions list page with filtering

### Sprint 57: Member Dashboard (2026-02-10)
- PatronageSummary component (current period + lifetime, by type)
- ContributionHistory component (recent contributions with status)
- CapitalAccountView component (book/tax balances + breakdown)
- AllocationStatements component (period allocations with details)
- GraphQL fragments and dashboard query
- Format utilities (currency, date, relative time)

### Sprint 56: Frontend Foundation (2026-02-10)
- Next.js 14 + TypeScript + Tailwind CSS setup
- GraphQL Code Generator configuration
- Apollo Client with JWT authentication middleware
- Responsive Layout component with navigation
- Three-color design system (green/blue/orange)
- Lucide icons (no emoji per design rules)

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
- Self-hosted VPS recommended for early-stage cooperative economics

## [0.2] — Implementation Bridge (Sprints 21–50)

Phase 2 delivered schemas, API specifications, event bus topology, and operating agreement templates. See `ROADMAP_EVOLUTION_2026-02-09.md` for detailed sprint log.

## [0.1] — Design (Sprints 0–20)

Phase 1 delivered the complete design specification: REA ontology, seven-layer pattern stack, patronage accounting model, compliance framework, and cooperative formation toolkit. See `ROADMAP.md` for detailed sprint log.

---

*Versioning schema: major.phase.block — see [journal/README.md](README.md) for mapping.*
