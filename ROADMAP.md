# Habitat Roadmap

**Method:** Each sprint produces one complete document. Each builds on the last. The sequence follows the dependency chain — you can't build the roof before the walls.

**Implementation reality:** The stack is Glide + Supabase + Make.com. Sprints should land in a way that maps to PostgreSQL tables and automation workflows, not abstract software patterns.

---

## Phase 1: Foundation (Treasury MVP)

| Sprint | Focus | Depends On | Output |
|--------|-------|-----------|--------|
| 0 | Project setup | — | README.md |
| 1 | Context ingestion | 0 | Foundational documents indexed |
| 2 | 704(b) compliance mapping | 1 | Legal requirements → tool components, gaps identified |
| 3 | Capital account mechanics | 2 | Book/tax dual-basis tracking, transaction schema |
| 4 | Chart of accounts | 3 | Complete account structure for a Colorado LCA |
| 5 | Transaction model | 4 | How value moves: logging, double-entry, event schema |
| 6 | Balance computation | 5 | Deriving current state from transaction history |
| 7 | Treasury reporting | 6 | Member statements, period summaries, balance sheet |

**Validation:** Can we produce an accurate balance sheet?

## Phase 2: Contribution Recognition (People MVP)

| Sprint | Focus | Depends On | Output |
|--------|-------|-----------|--------|
| 8 | Contribution lifecycle | 7 | Types, logging, the path from entry to capital account |
| 9 | Valuation rules | 8 | How labor, in-kind, and cash contributions are valued |
| 10 | Approval workflow | 9 | Pending → approved → applied, authority model |
| 11 | People-Treasury integration | 10 | Approved contributions automatically create transactions |

**Validation:** Do members see contributions reflected in their capital accounts?

## Phase 3: Allocation (Agreements MVP)

| Sprint | Focus | Depends On | Output |
|--------|-------|-----------|--------|
| 12 | Patronage formula | 11 | Weighted calculation: labor, revenue, cash, community |
| 13 | Period close process | 12 | Finalize, calculate, lock — the quarter-end workflow |
| 14 | K-1 data assembly | 13 | Schedule K-1 output from period close data |
| 15 | Member allocation statements | 14 | Human-readable allocation reports |

**Validation:** Does the calculation match manual verification?

## Phase 4: Extensions

| Sprint | Focus | Depends On | Output |
|--------|-------|-----------|--------|
| 16 | Service credit integration | 15 | Credit issuance/redemption as Treasury revenue |
| 17 | Revaluation events | 3 | Book-up/book-down for new member admission |
| 18 | Superfluid mapping | 16 | Continuous streams → discrete accounting events |
| 19 | Distribution mechanics | 15 | Policy, calculation, execution |
| 20 | Governance controls | 13 | Approval workflows, access rules, audit trail |

**Validation:** Can a new organization onboard without hand-holding?

## Principles

- **Each sprint is a complete document.** Stands alone, gains depth from prior sprints.
- **Each sprint builds on the prior.** Back references create coherence.
- **Retroactive resonance.** When a sprint changes assumptions, prior documents are updated in the same commit.
- **Implementation-aware.** Concepts should map to Supabase tables, Glide interfaces, Make.com workflows.
- **The roadmap regenerates.** When Phase 4 completes, a new roadmap grows from what we've learned.

## Open Questions (Surfaced for Group Decision)

These should not be assumed. The system must be flexible enough to accommodate different answers:

1. Valuation rates per contribution type
2. Approval authority model
3. Minimum participation thresholds
4. Distribution frequency
5. Post-close error correction process
6. Multi-class allocation formulas
7. Blockchain integration timeline

## Current Position

Sprint 4 complete. Sprint 5 next: Transaction Model.

---

*Updated as sprints complete.*
