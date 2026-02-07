# Approval Workflow

*Sprint 10 — Building on: [Valuation Rules](valuation-rules.md)*

---

## Overview

Sprint 8 defined the contribution lifecycle. Sprint 9 defined how contributions are valued. This document defines who can approve contributions and how — the authority model governing Stage 2 (Pending Review).

Approval is governance in miniature. Every approved contribution increases a member's capital account, which increases their patronage allocation, which increases their economic power in the cooperative. The approval process must balance three tensions:

- **Speed vs. rigor** — members should see contributions reflected quickly, but not without verification
- **Trust vs. accountability** — cooperatives run on trust, but trust without structure becomes vulnerability
- **Simplicity vs. control** — the process must be learnable in minutes, not hours

## Approval Models

The system supports three models, configurable per organization. Most organizations will start with the simplest and evolve as they grow.

### Model 1: Single Admin

One designated person approves all contributions.

```
Member logs contribution → Admin reviews → Approved/Rejected
```

**Best for:** Small organizations (under 10 members), early-stage cooperatives, organizations where one person handles operations.

**Advantages:** Fast, simple, clear accountability.
**Risks:** Bottleneck if admin is unavailable. Single point of failure for integrity.

**Configuration:**
```
approval_model: single_admin
admin_id: {member_id}
backup_admin_id: {member_id}  (optional, activated when admin is unavailable)
```

### Model 2: Role-Based

Members with specific roles can approve contributions within their domain.

```
Member logs engineering contribution → Engineering lead reviews → Approved/Rejected
Member logs community contribution → Community lead reviews → Approved/Rejected
```

**Best for:** Medium organizations (10–50 members), organizations with distinct operational domains.

**Advantages:** Domain expertise applied to review. Distributes workload. No single bottleneck.
**Risks:** Role boundaries may be ambiguous. Requires clear domain assignments.

**Configuration:**
```
approval_model: role_based
roles:
  - role: engineering_lead
    approves: [labor:engineering, labor:design]
    members: [{member_id}, ...]
  - role: operations_lead
    approves: [labor:operations, labor:admin, community:*]
    members: [{member_id}]
  - role: finance_lead
    approves: [cash, in_kind, revenue]
    members: [{member_id}]
```

**Constraint:** A member cannot approve their own contributions. If the designated approver is also the contributor, the contribution escalates to another role or to the fallback approver.

### Model 3: Peer Validation

Contributions require approval from one or more peers, with optional thresholds.

```
Member logs contribution → N peers review → Threshold met → Approved
                                          → Threshold not met → Escalated
```

**Best for:** Larger cooperatives, organizations with strong democratic culture, high-trust environments where distributed accountability is preferred.

**Advantages:** Most democratic. Distributed trust. Harder to game.
**Risks:** Slower. Requires active participation from members. Can stall if peers don't review.

**Configuration:**
```
approval_model: peer_validation
required_approvals: 2
eligible_approvers: all_members | same_role | designated_reviewers
self_approval: false
timeout_days: 7
timeout_action: escalate_to_admin | auto_approve | auto_reject
```

## Auto-Approval Rules

Some contributions are routine enough that manual approval adds friction without value. The system supports configurable auto-approval:

| Rule | Example | Rationale |
|------|---------|-----------|
| **Type-based** | Cash contributions auto-approve | Bank deposit is its own verification |
| **Amount threshold** | Labor under 4 hours/week auto-approves | Routine work doesn't need review |
| **Recurring** | Standing weekly commitment auto-approves | Pre-approved in agreement terms |
| **Source-verified** | Revenue from integrated billing system | System-generated, not self-reported |

Auto-approved contributions skip Stage 2 but are flagged as `auto_approved` in the status history. They remain subject to periodic audit review and can be reversed through the standard correction process (Sprint 5).

```
auto_approval_rules:
  - type: cash
    action: auto_approve
  - type: labor
    max_quantity: 4
    unit: hours
    period: week
    action: auto_approve
  - type: revenue
    source: billing_system
    action: auto_approve
```

## The Approval Interface

### Reviewer Queue

Reviewers see a queue of pending contributions, sorted by age (oldest first):

```
Pending Contributions — 7 awaiting review

Date       Member      Type        Qty    Est. Value   Age
─────────────────────────────────────────────────────────────
Feb 3     Alice Chen   Labor       6h      $600       4 days  ⚠️
Feb 4     Bob Park     Community   2h      $100       3 days
Feb 5     Carol Wu     Labor       4h      $400       2 days
Feb 5     Alice Chen   In-kind     1       $800       2 days
Feb 6     Bob Park     Labor       5h      $500       1 day
Feb 6     Dave Rao     Labor       3h      $300       1 day
Feb 7     Carol Wu     Community   2h      $100       today
```

The ⚠️ flag appears when a contribution has been pending longer than a configurable threshold (default: 3 days). Stale contributions degrade member trust — the system should actively surface them.

### Reviewer Actions

For each pending contribution:

- **Approve** — one click. Contribution moves to Valued (Stage 4).
- **Approve with adjustment** — change quantity or add notes before approving. Original quantity preserved in history.
- **Reject** — requires a reason (free text). Member is notified with the reason.
- **Request clarification** — adds a comment and notifies the member. Status stays `pending`.
- **Bulk approve** — select multiple contributions and approve in one action. Available for routine items.

### Member View

Members see their own contributions with current status:

```
My Contributions — Q1 2026

Date       Type        Description              Qty    Status      Value
──────────────────────────────────────────────────────────────────────────
Feb 3     Labor       API integration work      6h     ✅ Applied   $600
Feb 5     Labor       Member portal design      4h     ⏳ Pending   —
Feb 5     In-kind     Standing desk donated     1      ⏳ Pending   —
Feb 7     Community   Governance meeting        2h     📝 Logged    —
```

Members can see the status of every contribution but cannot see other members' contributions or approval details.

## Escalation

When the normal approval flow stalls, the system escalates:

| Trigger | Action |
|---------|--------|
| Contribution pending > timeout threshold | Notify reviewer + backup |
| Reviewer is the contributor (self-approval blocked) | Route to next eligible reviewer |
| No eligible reviewer available | Escalate to admin / fallback role |
| Disputed valuation | Flag for management review |
| Contribution exceeds value threshold | Require additional approval (dual-sign) |

**Value thresholds for dual approval:**

```
dual_approval_threshold: 5000  (contributions valued over $5,000 require two approvers)
```

This catches large in-kind contributions or unusual labor claims that warrant additional scrutiny without slowing down routine approvals.

## Audit Trail

Every approval action is recorded:

```
ApprovalEvent
├── id
├── contribution_id
├── action          (approve | reject | clarify | adjust | escalate | auto_approve)
├── actor_id        (reviewer who took the action, or "system" for auto)
├── timestamp
├── reason          (required for reject, optional for others)
├── adjustments     (if quantity was changed: original_qty, adjusted_qty, reason)
└── metadata
```

The audit trail answers: who approved what, when, and why. For 704(b) compliance, this documentation of contemporaneous review supports the "substantial economic effect" requirement — allocations are based on verified contributions, not unchecked self-reporting.

## Notifications

The system notifies relevant parties at each stage transition:

| Event | Notified |
|-------|----------|
| Contribution logged | Designated reviewer(s) |
| Contribution approved | Contributing member |
| Contribution rejected | Contributing member (with reason) |
| Clarification requested | Contributing member |
| Contribution stale (> threshold) | Reviewer + backup |
| Period closing soon | All members with unlogged/pending contributions |

Notifications should be lightweight — a message in the member's preferred channel (app notification, email, Telegram), not a wall of text. The goal is awareness, not interruption.

## Connection to Next Sprint

Sprint 11 (People-Treasury Integration) will close the loop: when a contribution reaches `approved` and `valued` status, how exactly does it generate Treasury transactions? This is the event bridge between People and Treasury — the point where the two composable tools communicate.

---

*Sprint 10 | February 8, 2026 | Habitat*
