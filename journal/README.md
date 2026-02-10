# Habitat Journal

Sprint versioning journal for the Habitat patronage accounting system.

Each entry documents micro-sprints with structured metadata: sprint number, artifact produced, TIO role association, phase, sprint type, design pattern layer, and key decisions.

## Versioning Schema

Version numbers map to the [Habitat Roadmap](../ROADMAP_PHASE3_2026-02-09.md):

| Version | Phase | Sprints | Description |
|---------|-------|---------|-------------|
| 0.1 | Phase 1: Design | 0–20 | Specification and design documents |
| 0.2 | Phase 2: Implementation Bridge | 21–50 | Schemas, API specs, event topology |
| 0.3.1 | Phase 3: Infrastructure | 51–55 | Deployment architecture, database, API, event bus |
| 0.3.2 | Phase 3: Essential UI | 56–60 | Frontend foundation, dashboard, forms, approvals |
| 0.3.3 | Phase 3: End-to-End Workflows | 61–65 | Cross-context integration and testing |
| 0.3.4 | Phase 3: Compliance & Operations | 66–70 | 704(b) verification, tax reporting, runbooks |
| 1.0 | First Production Allocation | — | Techne/RegenHub Q1 2026 allocation via Habitat |

## Entry Format

Each journal entry includes:
- **Date and conditions** — Seasonal and ecological grounding
- **Sprint metadata** — Number, artifact, phase, type, layer, role
- **Key decisions** — What was decided and why
- **Observations** — Patterns, lessons, connections

## Sprint Types

- `spec` — Specification document
- `schema` — Database or API schema
- `implementation` — Running code
- `infrastructure` — Deployment, CI/CD, monitoring
- `UI` — Frontend components and pages
- `compliance` — Legal, tax, regulatory
- `integration` — Cross-context workflow wiring

## Design Pattern Layers

1. **Identity** — Distinguishing one thing from another
2. **State** — Recording attributes
3. **Relationship** — Connecting identifiable things
4. **Event** — Recording that something happened
5. **Flow** — Value or information moving between agents
6. **Constraint** — Rules governing valid states and transitions
7. **View** — Presenting information for a purpose

## License

Peer Production License (CopyFarLeft)  
See [LICENSE.md](../LICENSE.md)

---

*Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.*
