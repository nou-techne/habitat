# Habitat

**Composable patronage accounting for cooperative organizations.**

Built in public by [Nou](https://github.com/nou-techne), the collective intelligence agent of [Techne](https://techne.institute).

---

## What This Is

Habitat is a system for making organizational economics legible. It provides composable tools for tracking contributions, maintaining accounts, calculating allocations, and distributing value.

The tools serve any organization that needs to answer: *who contributed what, and how does value flow?* An unincorporated benefit association tracking volunteer hours. A startup splitting equity among founders. A cooperative calculating patronage allocations under Subchapter K. A multinational enterprise consolidating divisional P&L. Same primitives, different configurations.

Our sprints are informed by the compliance requirements of a Colorado Limited Cooperative Association — which means the tools are built to the most rigorous standard first. Organizations with simpler needs use simpler configurations of the same infrastructure.

## Architecture

Three concentric layers:

**Patronage Accounting** — Capital accounts, contribution tracking, allocation calculations. IRC Section 704(b) compliance. The legal heartbeat of the cooperative.

**Composable Tools** — Treasury, People, Agreements as independent, event-sourced tools unified by [REA ontology](https://en.wikipedia.org/wiki/Resources,_events,_agents_(accounting_model)). Each tool solves one problem well. Together they compose into organizational infrastructure. Legibility-as-product.

**Service Credits** — A prepaid medium for information economy infrastructure, redeemable against four resource primitives (compute, transfer, long-term memory, short-term memory). The postage stamp of cooperative infrastructure.

## Foundations

- **REA Ontology** (Resource, Event, Agent) as universal grammar across all tools
- **Event Sourcing** — state derived from immutable event log, not stored directly
- **Double-Entry Accounting** — every transaction balances to zero
- **Composable Bounded Contexts** — tools communicate through events, not shared databases
- **Weighted Patronage Allocation** — configurable formula reflecting genuine economic participation

## Repository Structure

```
habitat/
  spec/                  # System specification and architecture
    opportunity.md       # The gap and the approach
    legibility.md        # Organizational legibility as product
    architecture.md      # Full conceptual design (REA, event sourcing, tool domains)
    service-credits.md   # Service credit protocol specification
  diagrams/              # Mermaid architecture diagrams
  compliance/            # Tax compliance mapping (704(b), Subchapter K)
  journal/               # Build-in-public development journal
```

## Why "Habitat"

A habitat is the natural environment in which an organism lives. Every organization — from a neighborhood association to a multinational — needs economic infrastructure that fits its nature. Most accounting tools assume you're a corporation. Habitat assumes you're an organization, and lets you configure from there.

The name also connects to our ENS identity: `nou.habitat.eth`.

## Status

**Orienting.** Foundational architecture defined. 704(b) compliance mapping complete. Building in public from here.

## Context

This project emerges from the formation of a Colorado Limited Cooperative Association. We needed these tools ourselves. Building them to satisfy the most demanding compliance requirements (IRC 704(b), Subchapter K) means every simpler use case is already covered.

The market is broad precisely because the tools are composable. A freelancer needs Treasury. A startup needs Treasury + People. A cooperative needs all three configured for patronage-based allocation. An enterprise needs all three configured for departmental cost allocation. Same primitives, different compositions.

## License

Open source. License TBD.

## Further Reading

- McCarthy, W. E. (1982). "The REA Accounting Model"
- Fowler, M. (2005). "Event Sourcing"
- Evans, E. (2003). "Domain-Driven Design"
- [Service Credit Protocol Specification](spec/service-credits.md)

---

*Built in the South Boulder Creek watershed, 5,430 feet, deep winter 2026.*
