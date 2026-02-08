# Governance Controls

*Sprint 20 — The Constraint Layer across the entire system*

---

## Overview

Every prior sprint has deferred a question to this one: who is allowed to do this, and under what conditions? Contributions require approval (Sprint 10). Distributions require authorization (Sprint 19). Period close requires sign-off (Sprint 13). K-1 assembly requires access control (Sprint 14). The identity namespace requires issuance governance.

This sprint does not introduce new economic mechanics. It specifies the Constraint layer — Layer 6 of the pattern stack — applied uniformly across Treasury, People, and Agreements. Governance controls determine what actions are valid, who may perform them, under what conditions, and how every decision is recorded.

## Principles

**Least privilege.** Every actor starts with no permissions. Access is granted explicitly, scoped narrowly, and revocable.

**Separation of duties.** No single actor should control both the initiation and approval of a high-value action. The person who logs a contribution should not be the person who approves it. The person who calculates an allocation should not be the person who authorizes the distribution.

**Auditability over automation.** Every state change records who did it, when, why, and under what authority. The system prefers a slower process with a clear trail over a fast process with gaps in the record.

**Governance is data.** Permissions, roles, policies, and decisions are not configuration buried in application settings. They are first-class entities in the system — queryable, auditable, versioned.

## Role Model

Roles define what an actor may do. Actors are People records — human members, agents, or service accounts — identified by their `{name}.habitat.eth` subname or internal member ID.

### Base Roles

| Role | Scope | Description |
|------|-------|-------------|
| **Member** | Own records | View own capital account, contributions, allocations, statements |
| **Contributor** | People | Log contributions, view contribution status |
| **Reviewer** | People | Approve/reject contributions within delegated categories |
| **Treasurer** | Treasury | Post transactions, run reports, manage accounts |
| **Allocator** | Agreements | Calculate patronage, run period close, generate K-1 data |
| **Administrator** | System-wide | Configure policies, manage roles, issue ENS subnames |
| **Auditor** | Read-only, all | View everything, modify nothing. For external accountants and compliance review |
| **Agent** | Delegated | Programmatic actor with scoped permissions (e.g., `nou.habitat.eth`) |

### Role Assignment

```
RoleAssignment
├── id
├── actor_id                (member / agent)
├── actor_ens               ({name}.habitat.eth)
├── role
├── scope                   (tool: treasury | people | agreements | all)
├── constraints             (category limits, amount thresholds, time bounds)
├── granted_by
├── granted_at
├── expires_at              (nullable — permanent if null)
├── revoked_at              (nullable)
├── revoked_by              (nullable)
└── reason
```

Roles are assigned, not assumed. Every assignment records who granted it and why. Roles can be time-bounded (expires_at) for temporary delegations — a member covering for someone on leave, a contractor given access for a specific engagement.

### Composite Roles

For convenience, composite roles bundle base roles:

| Composite | Includes | Typical holder |
|-----------|----------|----------------|
| **Operations Steward** | Contributor, Reviewer, Treasurer, Administrator | Primary operations person |
| **Board Member** | Member, Reviewer (all categories), read-only Treasury | Governance body member |
| **Full Member** | Member, Contributor | Standard cooperative member |

Composites are sugar — the system enforces base roles. A composite assignment creates individual base role records, each independently revocable.

## Permission Matrix

Each action in the system maps to required roles and conditions:

### Treasury Actions

| Action | Required Role | Conditions | Dual Control |
|--------|--------------|------------|--------------|
| View own capital account | Member | — | No |
| View all capital accounts | Treasurer, Auditor | — | No |
| Post journal entry | Treasurer | Below auto-post threshold | No |
| Post journal entry (high value) | Treasurer | Above threshold | Yes — second Treasurer or Administrator |
| Reverse posted entry | Treasurer | Must provide reason | Yes |
| Run reports | Treasurer, Auditor | — | No |
| Export data | Treasurer, Auditor | Logged | No |
| Configure accounts | Administrator | — | No |

### People Actions

| Action | Required Role | Conditions | Dual Control |
|--------|--------------|------------|--------------|
| Log own contribution | Contributor | Within open period | No |
| Log contribution for another | Reviewer | Within open period, with reason | No |
| Approve contribution | Reviewer | Not own contribution, within delegated category | No |
| Approve contribution (high value) | Reviewer | Above threshold | Yes — second Reviewer |
| Set valuation rates | Administrator | With effective date and notice period | No |
| Override valuation | Administrator | Must provide justification | Yes |

### Agreements Actions

| Action | Required Role | Conditions | Dual Control |
|--------|--------------|------------|--------------|
| Calculate trial allocation | Allocator | Period in Closing status | No |
| Finalize allocation | Allocator | After review period | Yes — Administrator or Board |
| Execute distribution | Treasurer | Approved allocation exists | Yes — Allocator confirms amounts |
| Run period close | Allocator | Pre-close checklist complete | No |
| Lock period | Administrator | Period in Closed status | Yes |
| Reopen locked period | Administrator | Emergency only | Yes — Board approval + reason |
| Generate K-1 data | Allocator, Auditor | Period locked | No |
| Issue ENS subname | Administrator | Member admission approved | Yes |
| Revoke ENS subname | Administrator | Member withdrawal processed | Yes |

### Threshold Configuration

Thresholds that trigger dual control are configurable per organization:

```
GovernanceThresholds
├── high_value_transaction      ($5,000 default)
├── high_value_contribution     ($2,500 default)
├── distribution_approval       (always dual — not configurable)
├── period_lock                 (always dual — not configurable)
├── ens_issuance               (always dual — not configurable)
└── emergency_reopen           (always dual + board — not configurable)
```

Some actions are unconditionally dual-control: distributions, period locks, namespace changes, and emergency reopens. These are the actions with the highest consequence for the cooperative's economic and governance integrity.

## Policy Engine

Governance policies are first-class records, not application configuration:

```
GovernancePolicy
├── id
├── name                    ("Contribution Approval Policy")
├── domain                  (treasury | people | agreements | identity | system)
├── rules[]
│   ├── action              ("approve_contribution")
│   ├── condition            ("amount > 2500")
│   ├── required_role        ("reviewer")
│   ├── dual_control         (true)
│   ├── escalation           ("administrator after 72h")
│   └── notification         ("notify all reviewers")
├── effective_date
├── approved_by
├── version
└── supersedes              (prior policy id, nullable)
```

Policies are versioned. When a policy changes, the prior version is preserved and linked. Any action taken under a policy records which version was in effect at the time. This creates a complete governance history: not just what happened, but what rules governed the decision.

## Audit Trail

Every state change in the system produces an audit record:

```
AuditEntry
├── id
├── timestamp
├── actor_id
├── actor_ens
├── action                  ("post_journal_entry", "approve_contribution", ...)
├── domain                  (treasury | people | agreements | identity)
├── target_id               (the record being acted on)
├── target_type             (transaction | contribution | allocation | member | ...)
├── detail                  (JSON — action-specific data)
├── policy_id               (which governance policy authorized this)
├── policy_version
├── dual_control_actor      (nullable — the second approver)
├── ip_address              (nullable)
└── session_id              (nullable — links to authentication session)
```

### Audit Properties

**Append-only.** Audit entries are never modified or deleted. They are insert-only records in a separate table (or schema) with restricted write access.

**Tamper-evident.** Each entry includes a hash of the prior entry, creating a chain. Any modification to historical records breaks the chain and is detectable.

```
AuditEntry.hash = SHA-256(
  previous_entry.hash +
  timestamp +
  actor_id +
  action +
  target_id +
  detail
)
```

**Queryable.** The audit trail is not a log file. It is a structured, indexed table that supports queries like:
- "Show all actions by this actor in the last 30 days"
- "Show all dual-control approvals for distributions"
- "Show all policy changes and who approved them"
- "Show the complete history of this contribution from logging to capital account application"

**Exportable.** For external auditors, the audit trail exports as a signed package: the entries, their hashes, and the chain verification, in a format that can be independently validated.

## Agent Governance

Agents (`nou.habitat.eth` and future programmatic actors) operate under the same role model as human members, with additional constraints:

| Constraint | Rationale |
|------------|-----------|
| No self-approval | An agent cannot approve its own actions |
| Scoped permissions | Agent roles are narrower than human equivalents |
| Rate limiting | Maximum actions per time period |
| Human escalation | Actions above agent threshold require human approval |
| Session logging | All agent actions include session context |

```
AgentPolicy
├── agent_id
├── agent_ens                (nou.habitat.eth)
├── max_actions_per_hour     (50)
├── max_transaction_amount   ($500)
├── allowed_actions[]        (["log_contribution", "run_report", "calculate_allocation"])
├── prohibited_actions[]     (["post_journal_entry", "execute_distribution", "issue_subname"])
├── escalation_threshold     ($100 — above this, queue for human review)
└── supervisor_id            (human member who oversees this agent)
```

Agents are useful for automation — logging stream samples from Superfluid, running scheduled reports, calculating trial allocations. But they must not be able to move value or change governance without human oversight. The escalation threshold ensures that agents do routine work autonomously and flag exceptions for human judgment.

## Access Control for Views

Sprint 7 defined four access levels for reports. Governance controls enforce them:

| Level | Sees | Role Required |
|-------|------|---------------|
| **Member** | Own capital account, own contributions, own allocations, own statements | Member |
| **Manager** | All member data, all reports, operational dashboards | Treasurer, Allocator |
| **Accountant** | Everything Manager sees + export capability + tax data | Auditor |
| **Administrator** | Everything + policy configuration + role management + audit trail | Administrator |

View-level access control is enforced at the query layer (Supabase Row Level Security), not the application layer. A member's Glide interface physically cannot render data they are not authorized to see — the rows are filtered before they reach the client.

## Implementation Notes

**Supabase Row Level Security (RLS):** Every table has RLS policies matching the permission matrix. Policies reference the actor's role assignments and the governance thresholds.

**Make.com approval workflows:** Dual-control actions trigger Make.com scenarios that notify the required second approver, wait for their response, and either proceed or block. Timeout triggers escalation.

**Glide interface:** Role determines which screens and actions are visible. A Member sees their dashboard. A Treasurer sees the full accounting interface. An Auditor sees everything but with all write actions disabled.

**Audit table:** Separate Supabase schema (`audit`) with its own RLS: insert-only for the application, read-only for Auditor and Administrator roles. No delete or update permissions granted to any role.

## Connection to the Pattern Stack

This sprint completes the initial roadmap by specifying Layer 6 (Constraint) as a system-wide concern rather than a feature within individual tools. The Constraint layer touches every prior sprint:

- Contributions (Sprint 8–11): approval workflows, reviewer authority, valuation oversight
- Allocations (Sprint 12–14): calculation authorization, period close sign-off, K-1 access
- Distributions (Sprint 19): dual-control execution, cash sufficiency enforcement
- Identity (Strategy): subname issuance and revocation governance
- Reporting (Sprint 7): access levels enforced through RLS

When governance becomes a standalone composable tool (post-roadmap), these controls will externalize into a Governance primitive that any other tool can reference. For now, they are embedded in the system as cross-cutting policy.

---

*Sprint 20 | February 8, 2026 | Habitat*
