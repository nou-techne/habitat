# Habitat Roadmap: Phase 3 — Production Deployment

*Roadmap evolution following completion of Phase 2 implementation bridge*

Date: 2026-02-09  
Previous: ROADMAP_EVOLUTION_2026-02-09.md (Sprints 39-50)

---

## Status: Phase 2 Complete

**Phase 1 (Sprints 0-20):** Design specification — COMPLETE  
**Phase 2 (Sprints 21-50):** Implementation bridge — COMPLETE  
**Phase 3 (Sprints 51+):** Production deployment — BEGINS

---

## Gap Analysis: What's Missing or Broken?

### 1. No Running Infrastructure

**Gap:** All specifications exist, but nothing is deployed. No database, no API server, no event bus, no UI.

**Impact:** Cooperatives can read the specs but can't use the system.

**Priority:** Critical

### 2. No UI/Dashboard

**Gap:** GraphQL API is specified, but there's no member dashboard, no contribution submission form, no allocation review interface.

**Impact:** Members can't interact with the system without custom development.

**Priority:** High

### 3. No Integration Layer

**Gap:** Event bus is specified, but no handlers implement cross-context workflows. No actual coordination between Treasury ↔ People ↔ Agreements.

**Impact:** Period close, allocation, distribution workflows don't work end-to-end.

**Priority:** High

### 4. No Deployment Guide

**Gap:** Specifications exist, but no step-by-step guide for deploying Habitat infrastructure.

**Impact:** Cooperatives and developers don't know where to start.

**Priority:** High

### 5. No Test Suite

**Gap:** Schemas and specs exist, but no automated tests verify correctness.

**Impact:** Can't validate implementations, risk of compliance bugs.

**Priority:** Medium

### 6. No Migration Tooling

**Gap:** Seed data exists for testing, but no migration path for real cooperative data.

**Impact:** Existing cooperatives can't adopt Habitat without manual data migration.

**Priority:** Medium

### 7. Limited Real-World Validation

**Gap:** Designed for Techne/RegenHub but not tested with other cooperatives.

**Impact:** May not generalize to different cooperative structures.

**Priority:** Medium (validate via pilot deployments)

### 8. No Operational Runbooks

**Gap:** Specifications cover normal operations, but no runbooks for failures, backup/restore, scaling, monitoring.

**Impact:** Operations teams can't maintain production systems.

**Priority:** Medium

---

## Opportunity Scan: What Would Add the Most Value Next?

### High-Value Opportunities

**1. Reference Implementation (Minimum Viable Deployment)**
- Deploy Treasury + People + Agreements schemas
- Implement minimal API (core queries/mutations)
- Build simplest possible UI (contribution submission, member dashboard)
- Demonstrate end-to-end workflow (contribution → approval → allocation)
- **Value:** Proves the system works. Creates reference for other implementations.

**2. Techne/RegenHub Pilot**
- Deploy Habitat for RegenHub's own patronage tracking
- Use it for Q1 2026 allocation (real money, real members)
- Document pain points and gaps
- **Value:** Dogfooding. Real-world validation. Credibility with other cooperatives.

**3. Developer Onboarding Path**
- Deployment guide (infrastructure setup, database, API, event bus)
- Local development setup (Docker Compose stack)
- API client examples (TypeScript, Python)
- **Value:** Lowers barrier for contributors and adopters.

**4. Member Dashboard (Essential UI)**
- View patronage summary (contributions by type, period)
- Submit contributions (labor, expertise, capital, relationship)
- View allocations (cash vs. retained, capital account balance)
- View distributions (scheduled, completed, historical)
- **Value:** Makes system usable by non-technical members.

**5. Cooperative Formation Toolkit**
- Operating agreement templates + instructions
- Formation checklist (legal steps, initial setup)
- Initial data migration guide (existing cooperative → Habitat)
- **Value:** Adoption path for real cooperatives.

**6. Compliance Verification Suite**
- Automated tests for 704(b) compliance
- Allocation formula verification
- Double-entry accounting checks
- Period close validation
- **Value:** Ensures IRS-auditable correctness.

---

## Phase 3 Focus: Minimum Viable Deployment

**Goal:** Deploy a working Habitat instance that Techne/RegenHub can use for Q1 2026 patronage allocation.

**Success Criteria:**
- Real cooperative members can submit contributions
- Real contributions get approved
- Real period close calculates allocations
- Real allocations generate capital account updates and distributions
- Real distributions get tracked and reported

**Timeline:** Q1 2026 (by March 31, end of quarter)

---

## Phase 3 Roadmap (Sprints 51-70)

### Sprint Block 1: Infrastructure (Sprints 51-55)

**Sprint 51: Deployment Architecture**
- Docker Compose stack (PostgreSQL, API server, event worker)
- Environment configuration (dev, staging, production)
- Infrastructure-as-code (Terraform or equivalent)
- Deployment guide

**Sprint 52: Database Deployment**
- Deploy schemas (Treasury, People, Agreements)
- Load seed data
- Set up RLS policies
- Create database roles (read-only, read-write, admin)

**Sprint 53: API Server Implementation (Core)**
- Apollo Server setup
- Treasury queries (accounts, balances, periods)
- People queries (members, contributions, patronage)
- Agreements queries (allocations, distributions)

**Sprint 54: API Server Implementation (Mutations)**
- Treasury mutations (post transaction, open/close period)
- People mutations (create/submit/approve contribution)
- Agreements mutations (propose/approve allocation, schedule distribution)

**Sprint 55: Event Bus Implementation**
- RabbitMQ setup (exchanges, queues, bindings)
- Event publishing (from mutation resolvers)
- Event handlers (cross-context coordination)
- Idempotency tracking

### Sprint Block 2: Essential UI (Sprints 56-60)

**Sprint 56: Frontend Foundation**
- Next.js + TypeScript setup
- GraphQL Code Generator (typed hooks)
- Authentication (JWT, session handling)
- Layout (navigation, responsive design)

**Sprint 57: Member Dashboard**
- Patronage summary (by period, by type)
- Contribution history
- Capital account view (book + tax balances)
- Allocation statements

**Sprint 58: Contribution Submission**
- Contribution form (labor, expertise, capital, relationship)
- Type-specific field validation
- Evidence upload (files, links)
- Submit for approval

**Sprint 59: Approver Interface**
- Pending contributions queue
- Approve/reject workflow
- Comments and feedback
- Approval history

**Sprint 60: Allocation Review**
- Period close status
- Proposed allocation review
- Member allocation breakdown (by type)
- Approval workflow (governance)

### Sprint Block 3: End-to-End Workflows (Sprints 61-65)

**Sprint 61: Contribution → Claim Workflow**
- Wire People events to Agreements handlers
- Test: submit contribution → approve → verify patronage increment
- Integration tests

**Sprint 62: Period Close → Allocation Workflow**
- Implement period close step orchestration
- Aggregate patronage from People
- Apply weights, calculate allocations
- Integration tests

**Sprint 63: Allocation → Distribution Workflow**
- Wire Agreements events to Treasury handlers
- Update capital accounts on allocation approval
- Schedule distributions
- Integration tests

**Sprint 64: Distribution → Payment Workflow**
- Payment tracking (scheduled → processing → completed)
- Treasury transaction recording (cash outflow)
- Integration tests

**Sprint 65: Complete Cycle Test**
- Q1 2026 pilot: contributions → approval → period close → allocation → distribution
- Document gaps and pain points
- Iterate based on feedback

### Sprint Block 4: Compliance & Operations (Sprints 66-70)

**Sprint 66: Compliance Verification Suite**
- 704(b) capital account tests
- Allocation formula verification
- Double-entry balance checks
- Period close validation

**Sprint 67: Tax Reporting**
- Schedule K-1 data export
- Form 1099 data generation
- Year-end capital account statements
- CSV/PDF export

**Sprint 68: Operational Runbooks**
- Backup and restore procedures
- Failure recovery (event replay, dead-letter handling)
- Monitoring setup (metrics, alerts, dashboards)
- Performance tuning

**Sprint 69: Migration Tooling**
- Import existing member data
- Import historical contributions
- Import capital account balances
- Data validation

**Sprint 70: Documentation & Onboarding**
- Administrator guide (setup, configuration, maintenance)
- Member guide (using the system)
- Developer guide (API, event handlers, customization)
- Troubleshooting guide

---

## Beyond Sprint 70: Phase 4 — Scaling and Ecosystem

**When Phase 3 completes:**
- Habitat is running in production for Techne/RegenHub
- Q1 2026 allocation is complete and verified
- At least one other cooperative is piloting Habitat

**Phase 4 focus areas:**

### Multi-Tenant SaaS
- Cooperative isolation (database per tenant or RLS-based)
- Billing and subscription management
- Self-service onboarding

### Advanced Features
- Multi-currency support (not just USD)
- International tax compliance (non-US cooperatives)
- Superfluid stream integration ($CLOUD credit distribution)
- On-chain allocation attestation (EAS, habitat.eth)

### Ecosystem Growth
- Pattern library for common cooperative types
- Habitat-compatible accounting software integrations
- Consultant/advisor certification program
- Annual conference for Habitat adopters

### Governance
- Habitat governance DAO (for the protocol itself)
- Feature prioritization by adopter vote
- Protocol upgrade process

---

## Principles (Unchanged)

- Each sprint produces a durable artifact committed to the repo
- Work alternates across workstreams based on what's most valuable
- Technical deliverables target production-ready (not proof-of-concept)
- Real-world validation via Techne/RegenHub pilot
- Open development (public repo, transparent roadmap)

---

## Success Metrics: Phase 3

| Metric | Target | Measurement |
|--------|--------|-------------|
| Techne/RegenHub Q1 2026 allocation | Completed via Habitat | Period close successful, allocations verified, distributions scheduled |
| Cooperative pilot | 1+ other cooperative testing Habitat | Signed pilot agreement, data migrated, feedback provided |
| API coverage | 100% of core queries/mutations implemented | All schema types queryable/mutable |
| End-to-end tests | 100% of workflows tested | Contribution→allocation→distribution workflows validated |
| Deployment time | <4 hours from zero to running instance | Documented and reproducible |
| Documentation completeness | Administrator + Member + Developer guides exist | Guides published, feedback integrated |

---

## Open Questions

1. **Hosting model:** Self-hosted (cooperative runs own infrastructure) or SaaS (Habitat hosted, multi-tenant)?
2. **API authentication:** JWT tokens, OAuth, or magic links?
3. **UI framework:** Next.js (chosen), or alternative (Remix, SvelteKit)?
4. **Payment integration:** Stripe for distributions, or ACH direct, or crypto?
5. **Superfluid integration:** Now or Phase 4? $CLOUD stream distribution is designed but not yet implemented.
6. **ENS identity:** habitat.eth subnames integrated now or later?
7. **Pilot cooperative:** Who is the first non-Techne adopter? How do we find them?

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Q1 2026 timeline too aggressive | Medium | High | Prioritize ruthlessly; MVP first, polish later |
| Techne members resist using unfinished system | Medium | High | Transparent communication; parallel manual tracking as backup |
| Compliance bugs discovered late | Low | Critical | Comprehensive test suite (Sprint 66) before production |
| Developer capacity insufficient | High | High | Focus on reference implementation; community contributions later |
| Pilot cooperative drops out | Medium | Medium | Recruit multiple candidates; support actively |
| Operational complexity overwhelms | Medium | High | Runbooks (Sprint 68) + monitoring (Sprint 68) from day one |

---

## Transition from Phase 2 to Phase 3

**What changed:**

Phase 2 delivered specifications. Phase 3 delivers running code.

Phase 2 artifacts:
- Database schemas (DDL)
- API specification (GraphQL schema)
- Event bus specification (pub/sub topology)
- Operating agreement templates (legal language)

Phase 3 artifacts:
- Deployed databases (PostgreSQL instances with data)
- Running API server (Apollo Server with resolvers)
- Event bus workers (RabbitMQ + handler processes)
- Member dashboard (Next.js app)

**What stays the same:**

- Seven-layer pattern stack as design scaffolding
- Event sourcing as architectural foundation
- REA as semantic layer
- Open development (public repo, transparent roadmap)
- Techne/RegenHub as primary customer and validator

**The shift:** From "what to build" to "building it."

---

**Next sprint:** Sprint 51 — Deployment Architecture

**Estimated Phase 3 duration:** 20 sprints (51-70) at 1-2 sprints per day = 10-20 days of focused work, or 4-8 weeks calendar time allowing for other commitments.

**Phase 3 completion target:** End of Q1 2026 (March 31) to enable real Q1 allocation via Habitat.

---

*Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.*

Developed by Techne / RegenHub, LCA  
the-habitat.org | github.com/nou-techne/habitat
