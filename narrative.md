# Habitat: Coordination Infrastructure for Cooperatives

*A readable introduction for new audiences*

---

Most organizations can't see their own economic relationships. The accounting tools they rely on were built to track extraction — revenue captured, costs minimized, value concentrated at the top. If you're trying to build something different — a cooperative, a commons project, a mutual aid network — the tools available were designed for a completely different game.

Habitat changes that. It's coordination infrastructure built specifically for organizations that care about *how* value flows, not just *how much*.

## The Gap

When a group of people decides to work together cooperatively, they face immediate practical problems:

**How do we track contributions fairly?** One person puts in capital. Another contributes labor. A third brings expertise. A fourth opens doors through relationships. Traditional accounting sees the first clearly and the rest poorly or not at all.

**How do we allocate surplus?** At the end of the year, there's money left over. Who gets what? Most accounting systems offer two options: pay it to shareholders (extractive) or keep it as retained earnings (opaque). Neither reflects the reality of how a cooperative actually operates.

**How do we stay legally compliant?** Cooperatives organized under Subchapter K (like Colorado LCAs) face rigorous IRS requirements around capital account maintenance and allocation formulas. Most accounting software wasn't built with these rules in mind. The choice becomes: hire expensive specialists or operate in a gray zone hoping the IRS doesn't audit.

**How do we make it legible?** Even if you solve the above problems internally, explaining your economic model to investors, partners, or new members is hard. "We're a cooperative" doesn't tell them how decisions get made or where money flows. Transparency requires infrastructure.

## What Habitat Provides

Habitat is three concentric layers of infrastructure, each building on the one inside it:

### 1. Patronage Accounting

The legal and financial heartbeat of a cooperative. Habitat tracks:
- **Capital accounts** for each member (both book and tax basis, as required by IRC Section 704(b))
- **Contributions** across four categories: labor, capital, revenue brought in, and community participation
- **Allocation formulas** that distribute surplus based on weighted contributions, with thresholds and special allocation rules
- **Period close workflows** that lock quarters, generate Schedule K-1 data, and produce member allocation statements
- **Compliance verification** that checks your setup against safe harbor requirements before the IRS does

This isn't a feature — it's the foundation. Get patronage accounting right and everything else becomes easier. Get it wrong and the IRS will eventually come asking questions you can't answer with a spreadsheet.

### 2. Composable Tools

Patronage accounting requires data from across the organization. Habitat provides three tools that work independently but compose seamlessly:

**Treasury** tracks money — where it comes from, where it goes, and what the balances are at any point in time. It's double-entry accounting with event sourcing, which means every transaction is immutable and you can query historical state at any moment. Book and tax ledgers run in parallel. Capital accounts update automatically.

**People** tracks members and their contributions. When someone logs 40 hours of work or brings in a $5,000 client, that flows into the system. Contributions go through validation and approval workflows. Valuation rules ensure consistency (e.g., all design labor valued at $75/hour). The approved contributions feed Treasury and become inputs to allocation calculations.

**Agreements** handles the formulas, policies, and distribution logic. It takes contribution data from People, financial data from Treasury, and applies the cooperative's allocation formula (e.g., "40% by labor, 30% by revenue, 20% by capital, 10% by community participation"). It orchestrates period close, calculates distributions, and generates member statements.

These three tools are **bounded contexts** in the technical sense — each has its own data model and business logic. They communicate through events on a shared bus. If you only need Treasury, use Treasury. If you need the full patronage system, all three tools work together without friction.

### 3. $CLOUD Credits

The economic substrate of the whole system. $CLOUD is Habitat's unit of account — a prepaid medium minted against USD held for service delivery. Every identity in the Habitat ecosystem (members, ventures, agents, infrastructure) holds a $CLOUD balance.

Using Habitat-built tools consumes small amounts of $CLOUD. Hiring Habitat engineers is denominated in $CLOUD. Running infrastructure provisioned by Habitat draws down $CLOUD balances. The conversion is stable: 1 CLOUD = 10 USDC. Everywhere there's a $CLOUD balance, there's a USD-equivalent value.

The name is intentional: cloud as both technological infrastructure (distributed computing, pooled resources) and natural phenomenon (water cycle, atmospheric commons, life-sustaining and shared). $CLOUD credits make the connection explicit.

Member-investors can stake $CLOUD along a compounding curve — longer lock periods earn higher revenue share. This provides capital access to the cooperative through liquidity commitments. Multi-year deposits deepen the pool, enabling better infrastructure planning.

The system integrates three layers: Stripe (payments), Mercury (banking), and Ethereum (identity and ledger). Fiat flows in, $CLOUD is minted, services are delivered, credits are redeemed. Custodial and orchestrated, which means members interact through the cooperative's interface, not directly with smart contracts.

## Why It Matters

Habitat is built by a Colorado Limited Cooperative Association (RegenHub, doing business as Techne) that needed these tools ourselves. We started with a simple observation: the standard way of building technology — "move fast, break things, exit to shareholders" — often breaks the communities that build it. We wanted a way to build ambitious projects without selling off our values or our ownership.

So we built the infrastructure we needed. And we designed it so any cooperative could use it.

The thesis is this: **the tools an organization uses to track value shape what it can see. What it can see determines whether it extracts or enriches.**

If your accounting system only measures revenue and costs, extraction is all you can manage. If your tools can track contributions across multiple dimensions, apply weighted allocation formulas, maintain separate book and tax ledgers, and generate compliant K-1 schedules, you can manage a cooperative economy.

Habitat makes the Contributive and Mutualistic zones of the Economic Habitat Matrix operable. It's sensory apparatus for economic ecology.

## Who It's For

**Cooperatives** that want to track patronage, maintain 704(b) compliance, and distribute surplus fairly.

**Freelancer collectives** that pool resources, share infrastructure, and want simple tools to track who contributed what.

**Ventures** built by cooperative studios that need Treasury, People, or both but don't need full patronage accounting.

**Municipalities and civic institutions** exploring prepaid infrastructure credits as an alternative to opaque vendor invoicing.

**Anyone building a commons** who needs to make economic relationships legible without extracting from the relationships themselves.

## The Architecture

Habitat follows a pattern stack that applies to all information systems:

1. **Identity** — distinguishing one thing from another (members, accounts, transactions)
2. **State** — recording attributes (balances, contribution amounts, allocation percentages)
3. **Relationship** — connecting identifiable things (which member owns which capital account)
4. **Event** — recording that something happened (transaction posted, period closed, contribution approved)
5. **Flow** — value or information moving between agents (cash in, allocations out, revenue flowing to members)
6. **Constraint** — rules governing valid states and transitions (double-entry balance, period close locks, QIO limits)
7. **View** — presenting information for a purpose (member statements, K-1 schedules, balance sheets)

This isn't invention — it's observation. Every accounting system, every database, every coordination tool decomposes into these patterns. Habitat's contribution is recognizing the patterns clearly enough that composition becomes teachable. The system is complicated (composed of known primitives) but not complex. Complexity arises when it couples with the social and ecological context of an actual cooperative.

The underlying ontology is **REA** (Resource, Event, Agent) — a pattern from academic accounting that maps economic phenomena into three primitives. Every transaction is an event where an agent transfers a resource to another agent. Treasury, People, and Agreements are all REA implementations in different domains. The shared grammar is what enables composition.

Event sourcing means state is derived, not stored. Every change flows through an immutable event log. You can reconstruct any past state by replaying events up to that moment. This provides auditability by default and makes the system debuggable across its entire life.

## Current Status

Habitat is in **Phase 2: Build in Public**. The design specification is complete — all 20 sprints documenting compliance concepts, tool specifications, database schemas, API contracts, and deployment architecture. The public site (the-habitat.org) has 15 pages, interactive demos, and comprehensive documentation. The Economic Habitat Matrix visualization maps 49 organizational archetypes across governance and systemic relationship axes.

The database schemas are implementation-ready. The $CLOUD credit protocol is formalized. The next milestones are legal templates (operating agreement provisions), community onboarding materials, and the first working prototypes.

The code will be open source under the Peer Production License (CopyFarLeft). The system is designed to be adopted by any cooperative, forked by any developer, and extended by any community that finds the primitives useful.

## Getting Involved

If you're a **cooperative** evaluating Habitat for adoption, start with the Patronage Accounting page (the-habitat.org/patronage) and the FAQ. The system is not yet production-ready, but the specifications show what's coming.

If you're a **developer** interested in building, the database schemas and tool specifications are in the GitHub repo (github.com/nou-techne/habitat). Contributions are recognized through the patronage system once it's operational — this is a cooperative project, not an open-source project with corporate backing.

If you're an **investor or funder** exploring cooperative infrastructure, the Thesis page explains the strategic case. Habitat is being built by RegenHub, LCA — a Colorado cooperative with a transparent capital structure and democratic governance.

If you're **just curious**, read the public journal. Every sprint is documented. The repo is the project. The process is the product.

---

**Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.**

Built in public by Techne / RegenHub, LCA  
Where the Great Plains rise to meet the Rockies  
the-habitat.org
