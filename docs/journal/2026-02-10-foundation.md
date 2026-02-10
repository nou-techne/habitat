# February 10, 2026 — Foundation Block Complete

**Sprints 61-67: Identity & State Layers**

The Foundation block is complete. Seven sprints building the data layer — the bedrock upon which everything else rests. No GraphQL yet. No event bus. No UI wiring. Just types, database connections, CRUD operations, and seed data. Layer 1 (Identity) and Layer 2 (State) solid.

---

## Block Summary

| Sprint | Role | Artifact | Layer |
|--------|------|----------|-------|
| 61 | Technical Lead | Monorepo scaffolding | Cross-cutting |
| 62 | Schema Architect | REA entity types | 1 (Identity) |
| 63 | Backend Engineer | Database connection (dual-provider) | 2 (State) |
| 64 | Backend Engineer | Treasury data access | 2 (State) |
| 65 | Backend Engineer | People data access | 2 (State) |
| 66 | Backend Engineer | Agreements data access | 2 (State) |
| 67 | Backend Engineer | Seed data & fixtures | 2 (State) |

**Version:** 0.3.3 (Foundation)

---

## Sprint 61: Monorepo Scaffolding

**Role:** Technical Lead (00)  
**Artifact:** `packages/` directory structure  
**Deliverable:** pnpm workspace with shared, api, worker packages

Built the container. TypeScript 5.3, tsup for builds, tsx for dev, vitest for tests. Workspace protocol for internal dependencies. Project references for incremental builds. The plumbing that lets everything else compose.

**Key decision:** Monorepo over polyrepo. Shared types need to be shared, not duplicated. Change propagation should be compile-time, not runtime discovery.

---

## Sprint 62: REA Entity Types

**Role:** Schema Architect (01)  
**Artifact:** `packages/shared/src/types/`  
**Deliverable:** Complete TypeScript type system for all bounded contexts

668 lines of precisely typed entities. Every enum, every status, every computed view. Treasury (accounts, transactions, periods), People (members, contributions, approvals), Agreements (allocations, distributions, capital accounts). All types match SQL schema definitions exactly.

**Key decision:** Types in `shared` package are the source of truth for the TypeScript layer. When schemas change, types change first. Database is the ultimate source of truth, but types are the contract.

**TIO insight:** Schema Architect (01) maps to Layer 1 (Identity). Distinguishing one thing from another. Before you can store it, you must name it.

---

## Sprint 63: Database Connection Layer

**Role:** Backend Engineer (02)  
**Artifact:** `packages/api/src/db/`  
**Deliverable:** Dual-provider database client (Supabase OR PostgreSQL)

Abstraction over two worlds. Supabase for low-code path (auto-handles auth, RLS, realtime). PostgreSQL pool for self-hosted path (full control). Unified interface. Health checks. Migration runner for self-hosted (Supabase uses CLI).

**Infrastructure dependency added:** Supabase Pro ($25/mo) OR self-hosted PostgreSQL (VPS cost).

**Key decision:** Don't commit to one provider. Build abstraction that works with both. Low-code when possible, self-hosted when necessary.

---

## Sprint 64: Treasury Data Access

**Role:** Backend Engineer (02)  
**Artifact:** `packages/api/src/data/treasury.ts`  
**Deliverable:** CRUD operations for Treasury context

Accounts, Transactions, Periods, Balances. 637 lines. Every operation parameterized (SQL injection safe). Entry balance validation (debits = credits). Transaction blocks for PostgreSQL, RPC for Supabase. Row mappers for DB → TypeScript conversion.

**Key pattern:** Each data access module exports typed functions that work with both providers. Supabase path uses `.from()` queries. PostgreSQL path uses parameterized `client.query()`. Mappers handle snake_case → camelCase.

---

## Sprint 65: People Data Access

**Role:** Backend Engineer (02)  
**Artifact:** `packages/api/src/data/people.ts`  
**Deliverable:** CRUD operations for People context

Members, Contributions (all 4 types), Approvals, Patronage summaries. 636 lines. State machine enforced: draft → submitted → approved/rejected. Atomic approval operations (contribution update + approval record in single transaction). Evidence attachment support.

**Key constraint:** Only valid state transitions allowed. Can't approve a draft. Can't submit an approved contribution. The database schema defines the rules; the data layer enforces them.

---

## Sprint 66: Agreements Data Access

**Role:** Backend Engineer (02)  
**Artifact:** `packages/api/src/data/agreements.ts`  
**Deliverable:** CRUD operations for Agreements context

Allocations (with patronage by type), Distributions, Capital Accounts (book + tax balance), Allocation summaries. 766 lines. Dynamic updates for capital accounts. State transitions (draft → proposed → approved). Payment tracking (scheduled → processing → completed).

**Key structure:** Allocations track `allocationsByType` as JSONB array — each contribution type's patronage, weight, weighted value, and final allocation. This is where the patronage formula outputs live.

---

## Sprint 67: Seed Data & Fixtures

**Role:** Backend Engineer (02)  
**Artifact:** `packages/api/src/data/seed.ts`  
**Deliverable:** Test data generator for Techne/RegenHub

5 members (Todd, Kevin, Jeremy, Aaron, Benjamin). 7 chart of accounts. 20 contributions across all types. Q1 2026 period (open). 3 sample transactions ($25k capital, $5k revenue, $3.2k expenses). CLI command: `pnpm seed`.

**Key value:** Can now spin up a populated database for testing. Contributions submitted and approved. Members with ENS names. Transactions balanced. Period open for allocation.

---

## Infrastructure Inventory Update

Low-code pivot documented in `INFRASTRUCTURE_INVENTORY.md`:

**Tier 1 (provision now):**
- Supabase Pro ($25/mo) — database, auth, RLS, API, realtime, Edge Functions
- GlideApps Business ($60/mo) — member dashboard, forms, approvals

**Tier 2 (integration):**
- Make Pro ($16/mo) — event-driven workflows

**Tier 3 (operations):**
- Stripe — distribution payments
- Mercury — cooperative banking

**Total:** ~$101/month vs self-hosted complexity.

**Principle:** Low-code is the infrastructure. Custom code is the intelligence. Patronage formulas, 704(b) compliance, double-entry validation — those are custom. Everything else is commodity plumbing.

---

## What's Solid

**Layer 1 (Identity):** Complete type system across all bounded contexts. Every entity, every enum, every status.

**Layer 2 (State):** Complete CRUD layer for Treasury, People, Agreements. Dual-provider support. State machines enforced. Seed data for testing.

**Build system:** Monorepo compiles cleanly. Types shared across packages. Dev mode watches and rebuilds.

---

## What's Missing

**No API yet.** Data access functions exist, but no GraphQL resolvers exposing them.

**No event bus.** State changes happen, but no events published.

**No workflows.** Contribution approval updates the database, but doesn't create patronage claims. Allocation approval doesn't update capital accounts. The glue between contexts is missing.

**No UI wiring.** The UI exists (Sprints 56-60), but it's not connected to the live API yet. Placeholder data only.

**No tests.** Data access code is written, but not tested. Next sprint (68) is QA.

---

## Next Block: Integration (Sprints 69-76)

**Focus:** Layer 3 (Relationship) and Layer 4 (Event)

- GraphQL schema implementation
- Resolvers for all three contexts
- Apollo Server setup
- Event schema and bus connection
- Event publishers (mutations → events)
- Event handlers (cross-context coordination)

The Foundation block built the database layer. The Integration block builds the API layer and event layer. Relationships between contexts become explicit. State changes become observable.

---

## Observations

**The dual-provider pattern works.** Every data access function has two paths — one for Supabase, one for PostgreSQL. The abstraction holds. Client code doesn't care which provider is underneath.

**Seed data matters early.** Having realistic test data from Sprint 67 means Sprints 68+ can test against real scenarios, not just unit tests with mocked data.

**The TIO role progression is clear.** Technical Lead scaffolds. Schema Architect defines entities. Backend Engineer implements state layer. Each sprint maps to a specific role's deliverable and quality criteria.

**Layer order is build order.** Can't build API (Layer 3) until data access (Layer 2) exists. Can't build workflows (Layer 5) until events (Layer 4) exist. The pattern stack isn't just conceptual — it's the actual build sequence.

**The gap between specs and implementation is closing.** We had 27 spec documents from Phase 1-2. Now we have running data access code that matches those specs. The schema files (SQL) are the bridge. Types derive from schemas. Data access implements schemas. Specs describe behavior. The layers stack.

---

**Foundation block complete. Integration block begins.**

*7 sprints, 6 hours, 2,906 lines of code.*
