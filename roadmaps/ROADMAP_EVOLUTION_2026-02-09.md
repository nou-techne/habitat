# Roadmap Evolution — February 9, 2026

## Context
The interface sprint queue has been exhausted. The Habitat public site is complete with 15 pages, interactive demos, dark mode, accessibility controls, search, and comprehensive design polish. All recommendations from the design audit have been implemented. The current focus in HEARTBEAT.md (extending the homepage and public site with interactive elements) is complete.

Phase 1 (Sprints 0-20) delivered the full specification. The recent interface work (Sprints 21+) delivered the public communication layer. The question now: what adds the most value next?

## Gap Analysis (Retroactive — What's Missing or Broken?)

### 1. Implementation Bridge
**Gap:** The specification exists, but there's no clear path from documents to running code. No database schemas. No API contracts. No deployment guide. A full-stack engineer reading the repo would struggle to start building.

**Impact:** High. Without implementation artifacts, the spec remains theoretical. Adoption requires buildable infrastructure.

### 2. Protocol Formalization
**Gap:** REA is referenced throughout but never formalized as a standalone specification. $CLOUD credits are described in concept docs but lack a protocol spec that another cooperative could implement independently.

**Impact:** Medium-High. Without formal protocols, Habitat remains a Techne-specific tool rather than composable cooperative infrastructure.

### 3. Legal Completeness
**Gap:** Compliance concepts exist, but no operating agreement templates, no formation guide, no legal analysis of $CLOUD credits under securities law. A cooperative can read about patronage accounting but can't use the documents to form their entity.

**Impact:** High. Legal infrastructure is required for real-world adoption. Without it, early adopters bear all formation risk.

### 4. Community Onboarding
**Gap:** The site is beautiful but doesn't answer: "I want to use this. What do I do next?" No contributor guide. No adoption pathway. No feedback protocol.

**Impact:** Medium. Limits who can engage with the project beyond passive reading.

### 5. Narrative Accessibility
**Gap:** The thesis and technical docs exist, but there's no readable 1,500-word introduction for someone who just heard about Habitat at a conference. No pitch deck. No one-pager.

**Impact:** Medium. Creates friction for anyone trying to explain the project to others.

## Opportunity Scan (Proactive — What Adds Most Value Next?)

### High Value, High Impact

**1. Treasury Database Schema (DDL)**
- Bridges specification to implementation
- Provides concrete starting point for engineers
- Demonstrates the event-sourcing architecture in actual SQL
- Enables prototype development
- **Effort:** 1-2 sprints (schema + indexes + constraints + migrations)

**2. $CLOUD Credit Protocol Specification**
- Formalizes the four-primitive model as implementable standard
- Enables interoperability (multiple cooperatives issuing credits against shared grammar)
- Positions Habitat as protocol, not just tool
- Creates adoption pathway beyond full patronage system
- **Effort:** 1-2 sprints

**3. Operating Agreement Template (Patronage Provisions)**
- Provides legal foundation for LCA adoption
- Bridges compliance concepts to formation documents
- Demonstrates 704(b) mechanics in contract language
- High-value artifact for early adopters
- **Effort:** 2-3 sprints (patronage, capital accounts, distributions, withdrawal)

### Medium Value, High Clarity

**4. Project Narrative (1,500 words, non-technical)**
- Readable introduction for new audiences
- Shareable artifact for conferences, conversations
- Complements technical documentation
- **Effort:** 1 sprint

**5. Contributor Onboarding Guide**
- Lowers barrier to participation
- Makes "how to help" explicit
- Creates feedback loop for improving the project
- **Effort:** 1 sprint

**6. REA Event Grammar Specification**
- Formalizes the foundational ontology
- Enables cross-tool interoperability
- Positions REA as shared language for cooperative tech
- **Effort:** 2 sprints

### Lower Priority (Valuable but not urgent)

- Visual identity (logo, brand assets) — site is already visually coherent
- Diagram library — diagrams exist, formalizing the visual language is polish
- Pitch materials — needed for fundraising/partnership, not core to project completion
- Cooperative formation toolkit — valuable after legal templates exist

## Evolved Roadmap

### Immediate Priority (Next 5 Sprints)

Focus on **Implementation Bridge + Protocol Formalization**. These create the most value for actual adoption.

| Sprint | Workstream | Deliverable |
|--------|-----------|-------------|
| 39 | Technical | Treasury database schema (tables, indexes, constraints) |
| 40 | Technical | Treasury database schema (migrations, seed data, documentation) |
| 41 | Protocol | $CLOUD credit protocol specification (standalone) |
| 42 | Communications | Project narrative (1,500-word introduction) |
| 43 | Community | Contributor onboarding guide |

### Secondary Focus (Sprints 44-50)

**Legal + Technical Depth**

| Sprint | Workstream | Deliverable |
|--------|-----------|-------------|
| 44 | Legal | Operating agreement template: patronage mechanics |
| 45 | Legal | Operating agreement template: capital accounts & distributions |
| 46 | Technical | People database schema (members, contributions, approvals) |
| 47 | Technical | Agreements database schema (allocations, periods, distributions) |
| 48 | Protocol | REA event grammar specification |
| 49 | Technical | API specification (GraphQL schema, queries, mutations) |
| 50 | Technical | Event bus specification (pub/sub, event catalog, routing) |

### Principles (Unchanged)

- Each sprint produces a durable artifact committed to the repo
- Work alternates across workstreams based on what's most valuable
- Technical deliverables target implementation-ready (not conceptual)
- The roadmap regenerates as work reveals new needs

## Decision: Next Sprint

**Sprint 39: Treasury Database Schema (Tables, Indexes, Constraints)**

This is the highest-value next step. It:
- Bridges specification to implementation
- Demonstrates event sourcing in concrete SQL
- Provides starting point for prototype development
- Validates the transaction model and balance computation approach
- Creates foundation for People and Agreements schemas

The schema will target PostgreSQL (Supabase-compatible) with:
- Event-sourced transaction log
- Materialized views for balances
- Double-entry bookkeeping constraints
- Capital account tracking (book and tax basis)
- Temporal queries
- Audit trail

This work begins now.
