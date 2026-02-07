# Composable Organization Tools
## Conceptual Design and Systems Methodology

### Document Purpose

This document describes data patterns and system relationships for a suite of organizational tools. It is implementation-agnostic: the patterns can be realized through low-code platforms, custom application development, or hybrid approaches. The goal is clarity on what the system does and how components relate, not how to build it.

---

## Part 1: Foundational Concepts

### The REA Ontology

All tools share a common conceptual foundation derived from Resources, Events, and Agents (REA) accounting theory.

**Resources** are things of value that the organization cares about tracking. Resources have types (financial, temporal, intellectual, physical, social), units of measurement, and attributes. Examples: dollars in a bank account, hours of labor, ownership stakes, reputation scores.

**Events** are occurrences that affect resources. Events have timestamps, participants, and effects. Events are immutable once recorded. The event log is the source of truth; current state is derived by processing events. Examples: a contribution logged, an allocation calculated, a distribution executed.

**Agents** are entities that participate in events. Agents can be individuals, organizations, roles, or systems. Agents have identities, attributes, and relationships to other agents. Examples: a member, a project, an investor, an automated process.

This ontology provides the conceptual glue between tools. Each tool extends the foundation with domain-specific concepts while maintaining compatibility through the shared primitives.

### Event Sourcing

The system stores events rather than current state. This design choice has implications:

**Auditability.** Every change is recorded with who, what, and when. The complete history is always available.

**Derivability.** Current state (balances, stakes, allocations) is computed from events. Multiple views of the same data are possible without duplication.

**Temporality.** Questions like "what was the balance on March 15?" are answerable by replaying events up to that point.

**Correctability.** Errors are corrected by recording new events (adjustments, reversals), not by modifying history.

### Modularity and Composition

Each tool is a bounded context with clear responsibilities. Tools communicate through events, not shared databases or tight coupling. This enables:

**Independent deployment.** Tools can run together or separately.

**Incremental adoption.** Organizations start with one tool, add others as needed.

**Substitutability.** A tool can be replaced without affecting others, as long as it honors the event contracts.

**Configuration over code.** The same tool serves different organizational types through configuration of its parameters, not modification of its logic.

---

## Part 2: Tool Domains

### Treasury

**Purpose:** Track flows of value in and out of the organization.

**Core Concepts:**

*Account* - A container for a resource type, owned by an agent. Accounts have types (asset, liability, equity, revenue, expense) that determine their behavior in financial reports. Accounts can be hierarchical (chart of accounts).

*Transaction* - A balanced set of entries affecting multiple accounts. The sum of all entries in a transaction must equal zero (double-entry principle). Transactions reference the event that caused them.

*Entry* - A single line in a transaction: one account, one amount (positive or negative).

*Balance* - The current quantity of a resource in an account, derived by summing all entries affecting that account.

*Period* - A time boundary for aggregation and reporting. Periods can be open (accepting new transactions) or closed (locked for reporting).

**Key Invariants:**
- Every transaction balances to zero
- Closed periods cannot accept new transactions
- Balances are always derivable from entries

**Inputs:** Transaction events from other tools or external sources
**Outputs:** Balance queries, financial reports, period summaries

### People

**Purpose:** Track contributors, their stakes, and their value creation.

**Core Concepts:**

*Profile* - An agent record with attributes relevant to organizational participation: contact information, skills, preferences, status.

*Role* - A named set of capabilities and responsibilities. Roles can be assigned to profiles with time bounds.

*Stake* - A quantity representing ownership, membership, or participation rights. Stakes have types (equity, patronage, tokens) and may have vesting schedules.

*Contribution* - A record of value provided by an agent. Contributions have types (labor, cash, intellectual property, in-kind, community), quantities, and valuations. Contributions require approval before affecting downstream calculations.

*Valuation Rule* - A formula for converting contribution quantities to comparable units (typically currency). Rules vary by contribution type and may change over time.

**Key Invariants:**
- Contributions require approval before affecting stakes or allocations
- Valuation rules are versioned; contributions use the rule in effect at contribution time
- Stakes can only be transferred through explicit transfer events

**Inputs:** Contribution logging from agents, approval decisions from administrators
**Outputs:** Contribution summaries, stake positions, profile queries

### Agreements

**Purpose:** Encode relationships and terms between parties.

**Core Concepts:**

*Agreement* - A binding arrangement between parties with defined terms. Agreements have lifecycles: draft, active, suspended, terminated.

*Party* - An agent bound by an agreement, with a defined role in that agreement (member, investor, service provider).

*Term* - A condition or rule within an agreement. Terms have types (allocation, distribution, contribution requirement, governance) and may include formulas.

*Formula* - A calculation specification that can be evaluated given inputs. Formulas reference data from other tools (contributions from People, balances from Treasury).

*Calculation* - The result of evaluating a formula for a specific period. Calculations can be previewed (draft), finalized, or applied (triggering downstream effects).

**Key Invariants:**
- Agreements require all parties to acknowledge before activation
- Term formulas must reference only available data sources
- Applied calculations are immutable; corrections require new calculations

**Inputs:** Agreement definitions, party acknowledgments, calculation triggers
**Outputs:** Calculation results, term evaluations, agreement status

---

## Part 3: Data Relationships

### Cross-Tool References

Tools reference each other's data through stable identifiers, not direct data access.

**Treasury references People:** Accounts are owned by agents (profiles). Transactions may be attributed to agents.

**Treasury references Agreements:** Distributions may be governed by agreement terms. Allocation transactions may result from agreement calculations.

**People references Treasury:** Contribution valuations may affect account balances (capital accounts). Stake values may derive from treasury positions.

**People references Agreements:** Contribution requirements may be defined in agreement terms. Stake grants may result from agreement execution.

**Agreements references People:** Parties are agent profiles. Allocation formulas reference contribution data.

**Agreements references Treasury:** Distribution terms reference account balances. Calculation results may trigger treasury transactions.

### The Event Flow

Events flow between tools through a publish-subscribe pattern:

1. **Origin tool** records an event and publishes it
2. **Subscribing tools** receive the event and process it according to their logic
3. **Derived events** may be published as a result

Example flow for contribution approval:
1. People records `contribution.approved` event
2. Treasury subscribes, creates transaction crediting contributor's capital account
3. Treasury publishes `transaction.recorded` event
4. Agreements may subscribe to update allocation calculations

### Identifier Strategy

All entities have stable, globally unique identifiers (UUIDs recommended). References between tools use these identifiers, not internal database keys.

Cross-references are validated at event processing time: if Treasury receives an event referencing an unknown agent, it queries People to resolve or rejects the event.

---

## Part 4: State and Lifecycle

### Entity Lifecycles

**Account (Treasury):**
```
Created → Active → Archived
```
Archived accounts retain history but reject new transactions.

**Transaction (Treasury):**
```
Pending → Recorded → Reconciled
         ↘ Voided
```
Voided transactions are offset by reversal entries, not deleted.

**Profile (People):**
```
Invited → Active → Departed
```
Departed profiles retain history and may be reactivated.

**Contribution (People):**
```
Draft → Pending → Approved → Applied
                ↘ Rejected
```
Applied contributions have affected downstream state (capital accounts, allocations).

**Agreement (Agreements):**
```
Draft → Active → Suspended → Terminated
         ↗___________↙
```
Suspended agreements can be reactivated; terminated agreements cannot.

**Calculation (Agreements):**
```
Draft → Final → Applied
```
Draft calculations can be recomputed; final calculations are locked; applied calculations have triggered effects.

### Period Management

Periods provide temporal boundaries for reporting and calculations.

**Open periods** accept new events. Organizations typically have one open period per time unit (month, quarter).

**Closing a period** triggers:
1. Validation that all pending items are resolved
2. Generation of period-end calculations
3. Lock preventing new events in that period
4. Opening of the next period

**Reopening a period** (if allowed) requires administrative override and creates an audit trail.

---

## Part 5: Calculation Patterns

### Allocation Calculation

The core cooperative economics calculation: distribute a quantity among parties based on their relative contributions.

**Inputs:**
- Pool amount (what's being allocated)
- Parties (who receives allocation)
- Contribution data per party (from People)
- Allocation formula (from Agreements)

**Formula Structure:**
```
For each party:
  1. Gather contribution values by type
  2. Apply weights to each contribution type
  3. Sum weighted values = party's weighted score

Total weighted score = sum of all parties' weighted scores

For each party:
  Allocation percentage = party weighted score / total weighted score
  Allocated amount = pool amount × allocation percentage
```

**Configurable Parameters:**
- Weights per contribution type (e.g., 40% labor, 30% revenue, 20% cash, 10% community)
- Minimum threshold (parties below X% receive zero)
- Normalization method (proportional, tiered, capped)

### Balance Derivation

Account balances are derived, not stored.

**Method:**
```
Balance(account, point_in_time) =
  Sum of all entries where:
    - entry.account = account
    - entry.transaction.occurred_at <= point_in_time
    - entry.transaction.status != voided
```

For efficiency, implementations may cache balances and update incrementally, but the derivation formula remains the source of truth.

### Valuation Conversion

Non-cash contributions need conversion to comparable units.

**Method:**
```
Value(contribution) =
  contribution.quantity × valuation_rule(contribution.type, contribution.occurred_at).rate
```

Valuation rules are time-bounded. The rule in effect at contribution time applies, even if rules have since changed.

---

## Part 6: Integration Patterns

### External System Integration

**Bank feeds:** Transaction data from financial institutions flows into Treasury as pending transactions requiring reconciliation.

**Accounting software:** Period-end data exports in standard formats (journal entries, trial balances) for external accounting systems.

**Identity providers:** Profile data may sync with external identity systems (OAuth, SAML) for authentication.

**Blockchain/smart contracts:** Events may trigger on-chain transactions; on-chain events may be ingested as system events.

### API Patterns

**Query APIs** retrieve current state: balances, profiles, agreement status. These are read-only and cacheable.

**Command APIs** submit events: log contribution, record transaction, create agreement. These are write operations that may fail validation.

**Subscription APIs** stream events to subscribers: webhooks, server-sent events, or message queues. These enable real-time integration.

### Bulk Operations

**Import:** Batch creation of entities or events from external sources. Imports are atomic (all succeed or all fail) and generate audit records.

**Export:** Bulk extraction of data for external use. Exports respect access controls and may be filtered by time range or entity type.

**Migration:** Moving data between system instances. Migrations preserve identifiers and event history.

---

## Part 7: Configuration and Customization

### Organization-Level Configuration

Each organization instance configures:
- **Chart of accounts:** Account hierarchy and types for Treasury
- **Contribution types:** Categories and valuation rules for People
- **Member classes:** Profile categories with different privileges
- **Allocation formulas:** Weighted calculations for Agreements
- **Period schedule:** Monthly, quarterly, or custom periods
- **Approval workflows:** Who can approve what

### Multi-Tenancy

The system supports multiple organizations with isolation:
- **Data isolation:** Each organization's data is separate
- **Configuration isolation:** Each organization has independent settings
- **Access isolation:** Users see only their organization's data

Implementations may achieve isolation through separate databases, schema separation, or row-level filtering.

### Extension Points

**Custom contribution types:** Organizations define types beyond the defaults, with custom valuation rules.

**Custom formulas:** The formula language supports organization-defined calculations, not just built-in allocation.

**Custom reports:** Report templates can be created per organization.

**Webhooks:** Organizations configure endpoints to receive events of interest.

---

## Part 8: Quality Attributes

### Accuracy
Financial calculations must be exact. Use decimal arithmetic with sufficient precision (recommend minimum 8 decimal places for intermediate calculations, 2 for currency display).

### Auditability
Every state change traces to an event. Every event traces to an actor. The complete history of any entity is reconstructable.

### Availability
Event ingestion should be highly available; query capabilities may have different availability requirements. Consider separation of write and read paths.

### Consistency
Within a tool, strong consistency: reads reflect all prior writes. Across tools, eventual consistency: events propagate with bounded delay.

### Performance
Balance derivation and allocation calculation can be expensive. Implementations should consider caching strategies, incremental computation, and background processing for complex calculations.

### Security
- Authentication: Verify identity of all actors
- Authorization: Enforce access rules per entity and operation
- Encryption: Protect data in transit and at rest
- Audit: Log all access and modifications

---

## Part 9: Implementation Guidance

### Low-Code Approach

Suitable for: rapid prototyping, small organizations, limited engineering resources

**Data layer:** Managed database service (Supabase, Airtable, Google Sheets with structure)
**Logic layer:** Workflow automation (Make.com, Zapier, n8n) for event processing; spreadsheet formulas or simple scripts for calculations
**Interface layer:** No-code app builders (Glide, Softr, Retool) for user interfaces

**Tradeoffs:** Faster to build, harder to scale, limited customization, potential vendor lock-in

### Custom Development Approach

Suitable for: production systems, larger organizations, specific requirements

**Data layer:** PostgreSQL or similar relational database with application-managed schema
**Logic layer:** Application code in chosen language/framework; domain logic as testable modules
**Interface layer:** Web application with API backend; mobile apps if needed

**Tradeoffs:** More control, higher initial investment, requires engineering capacity

### Hybrid Approach

Start low-code to validate patterns, migrate to custom as needs clarify:

1. **Prototype phase:** Low-code tools prove the patterns work
2. **Validation phase:** Real usage reveals actual requirements
3. **Migration phase:** Custom implementation of validated patterns
4. **Iteration phase:** Continuous improvement with full control

---

## Appendices

### Glossary

**Agent:** An entity that participates in events (person, organization, role, system)
**Allocation:** Distribution of a quantity among parties based on relative contribution
**Capital Account:** An equity account tracking a member's economic stake in the organization
**Contribution:** A record of value provided by an agent to the organization
**Event:** An immutable record of something that happened, with timestamp and effects
**Event Sourcing:** Design pattern where state is derived from a sequence of events
**Patronage:** Participation in cooperative activities that determines benefit allocation
**Period:** A time boundary for aggregation, reporting, and calculations
**REA:** Resources, Events, and Agents - an accounting ontology
**Resource:** Something of value that the organization tracks
**Stake:** A quantity representing ownership or participation rights
**Term:** A condition or rule within an agreement
**Transaction:** A balanced set of accounting entries affecting multiple accounts

### Further Reading

- McCarthy, W. E. (1982). "The REA Accounting Model: A Generalized Framework for Accounting Systems in a Shared Data Environment"
- Fowler, M. (2005). "Event Sourcing" (martinfowler.com)
- Evans, E. (2003). "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vernon, V. (2013). "Implementing Domain-Driven Design"

---

*This document describes patterns, not prescriptions. Implementations will vary based on context, constraints, and capabilities.*
