# Habitat Roadmap

---

## Phase 1: Specification (Sprints 0–20) ✓

The initial roadmap produced 20 specification documents across four sub-phases: Foundation (Treasury MVP), Contribution Recognition (People MVP), Allocation (Agreements MVP), and Extensions. Each sprint produced one complete document. Each built on the last.

<details>
<summary>Phase 1 sprint history</summary>

### Foundation (Treasury MVP)

| Sprint | Focus | Output |
|--------|-------|--------|
| 0 | Project setup | README.md |
| 1 | Context ingestion | Foundational documents indexed |
| 2 | 704(b) compliance mapping | Legal requirements → tool components, gaps identified |
| 3 | Capital account mechanics | Book/tax dual-basis tracking, transaction schema |
| 4 | Chart of accounts | Complete account structure for a Colorado LCA |
| 5 | Transaction model | How value moves: logging, double-entry, event schema |
| 6 | Balance computation | Deriving current state from transaction history |
| 7 | Treasury reporting | Member statements, period summaries, balance sheet |

### Contribution Recognition (People MVP)

| Sprint | Focus | Output |
|--------|-------|--------|
| 8 | Contribution lifecycle | Types, logging, the path from entry to capital account |
| 9 | Valuation rules | How labor, in-kind, and cash contributions are valued |
| 10 | Approval workflow | Pending → approved → applied, authority model |
| 11 | People-Treasury integration | Approved contributions automatically create transactions |

### Allocation (Agreements MVP)

| Sprint | Focus | Output |
|--------|-------|--------|
| 12 | Patronage formula | Weighted calculation: labor, revenue, cash, community |
| 13 | Period close process | Finalize, calculate, lock — the quarter-end workflow |
| 14 | K-1 data assembly | Schedule K-1 output from period close data |
| 15 | Member allocation statements | Human-readable allocation reports |

### Extensions

| Sprint | Focus | Output |
|--------|-------|--------|
| 16 | Service credit integration | Credit issuance/redemption as Treasury revenue |
| 17 | Revaluation events | Book-up/book-down for new member admission |
| 18 | Superfluid mapping | Continuous streams → discrete accounting events |
| 19 | Distribution mechanics | Policy, calculation, execution |
| 20 | Governance controls | Approval workflows, access rules, audit trail |

</details>

---

## Phase 2: Build in Public (Sprints 21+)

Phase 1 produced the specification. Phase 2 makes Habitat real across every dimension — technical depth, protocol formalization, communications, legal, design, and community. The sprints no longer follow a single thread. They draw from five workstreams based on what is most needed.

### Workstreams

**Technical Deepening.** Implementation-ready documentation that bridges specification to code. The artifacts a full-stack engineer would want before writing a line:

- Database schemas (DDL for Supabase/PostgreSQL, derived from specs)
- Entity-relationship diagrams (visual, versioned)
- API contracts (endpoints, events, pub/sub interfaces)
- Sequence diagrams (critical workflows: contribution lifecycle, period close, distribution)
- Data dictionary (every field, every type, every constraint)
- Multi-entity composition protocol (how ventures and studio share infrastructure)
- Interoperability specification (service credit clearing, cross-ENS resolution)

**Protocol and Standards.** Formalizing Habitat as composable infrastructure, not just a tool:

- REA event grammar as open specification
- Service credit protocol (standalone, implementable by any organization)
- Agent integration protocol (query interfaces, event subscriptions, governance constraints)
- Pattern library templates (configuration profiles: freelancer, startup, cooperative, enterprise)
- Matrix scoring methodology (deriving habitat position from accounting data)

**Communications and Design.** A public face beyond a GitHub repo:

- Project narrative (readable, non-technical introduction)
- Visual identity (logo, color system, typography — extending the matrix aesthetic)
- Diagram library (consistent visual language across all documentation)
- Pitch materials (for contributors, cooperatives, investors)
- Build in Public reflections (what was built, what was learned, what changed)
- README as living entry point

**Legal and Compliance.** The accounting system interfaces with legal reality:

- Operating agreement template sections (patronage mechanics, distribution policies, capital account provisions, withdrawal terms)
- Compliance checklist (704(b) safe harbor, QIO provisions, tax reporting obligations)
- Service credit legal analysis (Howey test walkthrough, securities exemptions, state-specific considerations)
- ENS namespace governance resolution (the cooperative document authorizing subname issuance)
- Privacy and data handling policy (member financial data — storage, access, controls)

**Community and Engagement.** Infrastructure needs users:

- Contributor onboarding guide (what to read, where to start, how contributions are recognized)
- Member education materials (plain-language patronage, capital accounts, service credits)
- Feedback protocol (how potential adopters evaluate the spec and provide input)
- Cooperative formation toolkit (what Habitat provides, what you still need, how tools connect to formation documents)
- Discord channels as community surface (#ventures, #operations)

### Sprint Sequence

Each sprint picks from any workstream. Every sprint produces a durable artifact committed to the repo. The README reflects what exists.

| Sprint | Workstream | Deliverable |
|--------|-----------|-------------|
| 21 | Technical | Database schema: Treasury tables (DDL) |
| 22 | Communications | Project narrative: non-technical introduction |
| 23 | Technical | Entity-relationship diagram: full system |
| 24 | Legal | Operating agreement template: patronage provisions |
| 25 | Protocol | REA event grammar: open specification draft |
| 26 | Design | Diagram library: visual language guide |
| 27 | Technical | Sequence diagrams: contribution lifecycle, period close |
| 28 | Community | Contributor onboarding guide |
| 29 | Protocol | Service credit protocol: standalone specification |
| 30 | Communications | Pitch materials: cooperative adoption |

This sequence is a starting point. The roadmap regenerates based on what is learned, what is needed, and what opportunities emerge.

### Directory Structure

```
habitat/
├── spec/              Phase 1 specification documents
├── thesis/            Strategic thinking (Craft of Coordination, Identity as Infrastructure)
├── schema/            Database schemas, DDL, data dictionary
├── diagrams/          ER diagrams, sequence diagrams, visual language
├── protocol/          Open protocol specifications (REA grammar, service credits, agent integration)
├── templates/         Pattern library configuration profiles
├── legal/             Operating agreement sections, compliance checklists, legal analysis
├── community/         Onboarding, education, feedback, formation toolkit
├── comms/             Project narrative, pitch materials, design assets
├── matrix/            Economic Habitat Matrix interactive visualization
└── README.md          Living entry point — always current
```

### Principles

Carried forward from Phase 1, expanded:

- **Each sprint produces a durable artifact.** Committed to the repo, referenced in the README.
- **Workstreams interleave.** No single dimension dominates. Technical, legal, communications, community, and protocol sprints alternate based on need.
- **Implementation-ready.** Technical deliverables target the Supabase + Glide + Make.com stack. A full-stack engineer or a data engineer with rapid-prototyping tools should be able to build from what the repo provides.
- **Retroactive resonance.** When a sprint changes assumptions, prior documents are updated in the same commit.
- **The roadmap regenerates.** When this sequence completes, a new one grows from what was learned.
- **Build in Public.** Every sprint is visible. The repo is the project. The process is the product.

### Open Questions (Carried Forward)

1. Valuation rates per contribution type
2. Approval authority model
3. Minimum participation thresholds
4. Distribution frequency
5. Post-close error correction process
6. Multi-class allocation formulas
7. Blockchain integration timeline
8. Contributor compensation model (retroactive patronage for commons assets)
9. Adoption pathway (which organization type first?)
10. Governance tool scope (embedded vs. standalone)

---

*Updated as sprints complete. Current position: Sprint 20 complete. Phase 2 beginning.*
