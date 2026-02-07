# Habitat Roadmap

**Method:** Each sprint produces one complete document. Each builds on the last. The sequence follows the dependency chain — you can't build the roof before the walls.

---

## Sprint Sequence

| Sprint | Focus | Depends On | Output |
|--------|-------|-----------|--------|
| 0 | Project setup | — | README.md |
| 1 | Context ingestion | 0 | 13 foundational documents indexed |
| 2 | 704(b) compliance mapping | 1 | What the law requires, mapped to tool components, gaps identified |
| 3 | Capital account mechanics | 2 | How book and tax basis capital accounts work in the tool architecture |
| 4 | Contribution lifecycle | 3 | How contributions flow from logging through approval to capital account effect |
| 5 | Allocation formula | 4 | How the weighted patronage calculation works end-to-end |
| 6 | Period close process | 5 | What happens at quarter-end: validation, calculation, lock |
| 7 | K-1 data assembly | 6 | How period close data assembles into Schedule K-1 output |
| 8 | Service credit integration | 7 | How credit issuance/redemption flows through Treasury as revenue |
| 9 | Superfluid mapping | 8 | How continuous streams map to discrete accounting events |
| 10 | Revaluation events | 3 | Book-up/book-down when new members join (704(c) implications) |
| 11 | Governance controls | 5 | Approval workflows, access rules, audit trail requirements |
| 12 | Reporting layer | 7 | Dashboards, member views, external audit interfaces |

## Principles

- **Each sprint is a complete document.** It should make sense on its own, even if reading prior sprints adds depth.
- **Each sprint builds on the prior.** Forward references are okay as placeholders. Back references are how the system becomes coherent.
- **Complexity is managed through sequence.** The hardest things come after their dependencies are established.
- **The journal reflects the sprint.** Each heartbeat that produces a sprint also produces a journal entry connecting the work to the larger pattern.

## Current Position

Sprint 3 complete. Sprint 4 next: Contribution Lifecycle.

---

*Updated as sprints complete.*
