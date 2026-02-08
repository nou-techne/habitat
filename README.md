# Habitat

**Composable accounting tools for organizations of every kind.**

Built in public by [Nou](https://github.com/nou-techne), the collective intelligence agent of [Techne](https://techne.institute).

---

## What This Is

Habitat is coordination infrastructure for organizations that distribute governance and enrich their ecosystems.

It provides composable tools — Treasury, People, Agreements — for tracking contributions, maintaining accounts, calculating allocations, and distributing value. The tools serve any organization that needs to answer: *who contributed what, and how does value flow?*

An unincorporated benefit association tracking volunteer hours. A startup splitting equity among founders. A cooperative calculating patronage allocations under Subchapter K. A multinational enterprise consolidating divisional P&L. Same primitives, different configurations.

Our sprints are informed by the compliance requirements of a Colorado Limited Cooperative Association — which means the tools are built to the most rigorous standard first. Organizations with simpler needs use simpler configurations of the same infrastructure.

**[Read the integrated thesis →](thesis/integrated-thesis.md)** — how compositional fluency, onchain coordination primitives, and ecosystem compounding converge in a venture studio built for makers who care about how they build, not just what they build.

## Architecture

Three concentric layers:

**Patronage Accounting** — Capital accounts, contribution tracking, allocation calculations. IRC Section 704(b) compliance. The legal heartbeat of the cooperative.

**Composable Tools** — Independent, event-sourced tools unified by [REA ontology](https://en.wikipedia.org/wiki/Resources,_events,_agents_(accounting_model)). Each tool solves one problem well. Together they compose into organizational infrastructure. Legibility-as-product.

**Service Credits** — A prepaid medium for information economy infrastructure, redeemable against four resource primitives (compute, transfer, long-term memory, short-term memory). The postage stamp of cooperative infrastructure.

### Tool Suite

The first three tools make organizational economics legible. The next five make organizational capacity legible.

```
Treasury ─── People ─── Agreements        Foundation (specified)
    │            │           │
 Registry    Governance     │             Medium-term
    │            │           │
    └────── Ventures ───────┘
                │
            Credits                        Ecosystem
                │
            Signals
```

**Foundation** — specified, entering implementation-readiness phase:

| Tool | Purpose |
|------|---------|
| **Treasury** | Double-entry accounting, capital accounts, balance computation, reporting |
| **People** | Contribution lifecycle, valuation, approval workflows, member identity |
| **Agreements** | Patronage formulas, period close, allocation, distribution, K-1 assembly |

**Medium-term** — the next tools to build:

| Tool | Purpose |
|------|---------|
| **Governance** | Proposals, votes, delegations, quorum rules, decision history. The Constraint layer as a standalone composable primitive — every other tool checks Governance for authority |
| **Registry** | Assets, intellectual property, licenses, physical space, data sets. Treasury tracks value in accounts; Registry tracks value in things. For the studio: the pattern library as commons inventory |
| **Ventures** | Formation, pattern decomposition, resource allocation, equity alignment, graduation. Where the 1% reciprocity commitment lives — tracked, visible, flowing back through Treasury |

**Ecosystem** — tools that work across organizational boundaries:

| Tool | Purpose |
|------|---------|
| **Credits** | Service credit issuance, transfer, redemption, rate cards, clearing between cooperatives. The first tool that must compose across organizations |
| **Signals** | Pattern recognition across all tools. Organizational health scoring. The Economic Habitat Matrix made operational — deriving an organization's ecological position from its own data |

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

Organizations exist within economic ecosystems. Their behavior can be mapped along two axes: **governance orientation** (does the entity concentrate or disperse decision-making?) and **systemic relationship** (does it deplete or enrich the habitat it operates within?).

**[Explore the Economic Habitat Matrix →](https://nou-techne.github.io/habitat/matrix/)**

The matrix maps 49 organizational archetypes across seven ecological zones — from Symbiotic (inseparable co-flourishing) to Parasitic (host-killing extraction). Every organization occupies a position. Most don't know where.

Most accounting tools are designed for the competitive zone of this matrix. They track extraction well and contribution poorly. An organization that wants to operate as a contributor — a cooperative, a benefit corporation, a community land trust, a platform cooperative — finds that the tools available to it were built for a different ecological niche.

Habitat makes the contributive and mutualistic zones operable. The tools an organization uses to track value shape what it can see, and what it can see determines whether it extracts or enriches. Habitat is economic sensory apparatus: it helps organizations perceive their relationship to the ecosystems they inhabit, and act accordingly.

## Identity: habitat.eth

Coordination infrastructure requires an identity layer that is public, composable, and self-sovereign. `habitat.eth` provides this through ENS subnames: `{name}.habitat.eth` for members, ventures, agents, and infrastructure.

Each subname carries the full pattern stack. The name itself is Identity. Text records carry State (role, skills, join date). The subname→parent relationship is membership. Onchain transactions create Event history. Superfluid streams and service credits route as Flows. Issuance and revocation enforce Constraints through cooperative governance. ENS-aware interfaces render the View.

The social graph lives on Ethereum — readable by any application, controlled by the name holders, curated by the cooperative. No platform dependency. No central identity authority. Scales across cooperatives through bilateral recognition, not centralized coordination.

**[Read: Identity as Infrastructure →](thesis/identity-as-infrastructure.md)**

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
