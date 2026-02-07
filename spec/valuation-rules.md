# Valuation Rules

*Sprint 9 — Building on: [Contribution Lifecycle](contribution-lifecycle.md)*

---

## Overview

Sprint 8 defined the five-stage contribution lifecycle. Stage 4 (Valued) is where non-cash contributions become dollar amounts. This document specifies how that conversion works.

Valuation is where accounting meets politics. The rate assigned to an hour of engineering versus an hour of community building reflects what the organization values, not just what the market prices. A cooperative that pays engineers $150/hour and community organizers $30/hour is making a statement about its priorities — and that statement flows directly into patronage allocations, which flow into capital accounts, which flow into economic power.

The system must handle this with precision (exact calculations) and flexibility (configurable by the organization). It takes no position on what rates should be. It ensures that whatever rates are chosen, they are applied consistently, documented transparently, and auditable historically.

## Rule Structure

A valuation rule maps a contribution type to a dollar value:

```
ValuationRule
├── id                  (uuid)
├── name                (human-readable: "Engineering Labor Rate")
├── contribution_type   (labor | in_kind | community | revenue)
├── method              (rate | fixed | market | custom)
├── parameters
│   ├── rate            (dollars per unit, for rate method)
│   ├── unit            (hours | units | each)
│   ├── fixed_amount    (for fixed method)
│   └── custom_formula  (for custom method — expression evaluated at valuation time)
├── effective_date      (when this rule takes effect)
├── supersedes          (id of the rule this replaces, if any)
├── approved_by         (who authorized this rate)
├── approved_at         (when)
├── rationale           (why this rate was chosen — documented business purpose)
└── is_active           (boolean)
```

### Valuation Methods

**Rate:** Dollar amount per unit. The most common method. An hour of labor at $75/hour, a community meeting at $50/hour.

**Fixed:** Flat dollar amount regardless of quantity. Used for discrete contributions: "organized the quarterly event" = $200 regardless of hours.

**Market:** Fair market value determined at contribution time. Used for in-kind contributions. Requires documentation of how FMV was established (comparable sales, appraiser, blue book value).

**Custom:** An evaluated expression for complex cases. For example, revenue attribution might use a formula: `revenue_generated × attribution_percentage`. The formula is stored as a string and evaluated with the contribution's data as input.

## Rate Categories

Most organizations will define rates by contribution category, not by individual contribution. A typical cooperative rate structure:

```
Labor Rates
├── Engineering / Development       $100/hour
├── Design / Creative               $100/hour
├── Operations / Administration      $75/hour
├── Business Development             $75/hour
└── General Labor                    $50/hour

Community Rates
├── Governance (board, committees)   $50/hour
├── Mentoring / Training             $50/hour
├── Event Organization               $50/hour
└── Community Outreach               $40/hour

In-Kind
└── (Market method — FMV per item)

Revenue Attribution
└── (Custom — actual revenue × agreed percentage)

Cash
└── (No valuation rule needed — face value)
```

**Design decision: flat rates vs. member-specific rates.** The system supports both. Flat rates (same rate for all members doing the same type of work) are simpler and more egalitarian. Member-specific rates (reflecting experience, market rate, or negotiated terms) are more complex but may be necessary for organizations with diverse member types.

The choice is organizational, not technical. The system stores it either way. For 704(b) compliance, the key requirement is that whatever rate structure is used, it has documented business purpose (substantiality test from Sprint 2) and is applied consistently within the documented rules.

## Rate Lifecycle

Rates change. The system tracks rate history through versioning, not modification:

```
Rule v1: Engineering Labor = $75/hour   (effective 2026-01-01)
Rule v2: Engineering Labor = $100/hour  (effective 2026-04-01, supersedes v1)
```

**Key principle:** A contribution is valued at the rate in effect on the date the contribution occurred, not the date it was valued. If a member logs 10 hours of engineering in March (at $75/hour) but the contribution isn't approved until April (when the rate is $100/hour), it is valued at $75/hour.

This prevents rate changes from retroactively altering contribution values, which would undermine both the audit trail and member trust.

### Rate Change Process

1. **Proposed:** New rate submitted with rationale and effective date
2. **Notice period:** Members notified of proposed change (recommended: 30 days before effective date)
3. **Approved:** Authorized person or body approves (per governance configuration)
4. **Effective:** New rule becomes active on its effective date; old rule becomes inactive
5. **Documented:** Full history preserved — old rates are never deleted

The notice period matters for fairness. If a member is planning to contribute significant labor, they should know the rate before they do the work, not after.

## Valuation for Dual-Basis Tracking

Most contributions have identical book and tax values. The exceptions:

| Type | Book Basis | Tax Basis | When They Diverge |
|------|-----------|-----------|-------------------|
| Cash | Amount | Amount | Never |
| Labor | Rate × hours | $0 (generally) | Always — labor contributions typically have no tax basis under partnership law |
| In-kind (property) | FMV | Contributor's cost basis | When FMV ≠ cost basis |
| Revenue | Amount | Amount | Never |
| Community | Rate × hours | $0 (generally) | Same as labor |

**Labor and community contributions — the tax basis question:** Under general partnership tax rules, services contributed to a partnership do not create tax basis. The 704(b) book capital account increases (reflecting economic value), but the tax capital account may not (reflecting that no taxable event occurred). This creates a book/tax divergence that must be tracked.

However, this is one of the Open Questions requiring legal counsel and group decision. Some cooperatives treat labor contributions differently under their operating agreements. The system must be configurable:

- **Option A:** Labor valued at $0 for tax, rate × hours for book (conservative, standard treatment)
- **Option B:** Labor valued at rate × hours for both book and tax (if agreement supports guaranteed payment treatment under § 707(c))
- **Option C:** Custom split (configurable per contribution type)

The default should be Option A, with the ability to configure per organization.

## Edge Cases

### Disputed Valuations

A member may disagree with the rate applied to their contribution. The system supports:

1. Member flags contribution as "valuation disputed"
2. Original valuation stands until resolved (contributions remain in `valued` status)
3. Resolution options: adjust rate (creates new valuation record), adjust quantity, add context/rationale, uphold original
4. Resolution is documented in the contribution's status history

### Partial Contributions

A single session of work might span multiple contribution types: 2 hours engineering + 1 hour mentoring. The system handles this as two separate contribution records, each valued at its own rate. Members should be encouraged to log by type, not by session.

### In-Kind Valuation Documentation

FMV for in-kind contributions requires supporting evidence:

| Value Range | Required Documentation |
|-------------|----------------------|
| Under $250 | Member's reasonable estimate with description |
| $250–$5,000 | Comparable sales data or market research |
| Over $5,000 | Independent appraisal recommended |

These thresholds are configurable. For 704(b) compliance, the key is that FMV determinations are contemporaneous (made at contribution time, not retroactively) and documented.

### Cryptocurrency Contributions

Digital asset contributions use the market method with price at time of contribution (or a reasonable averaging period, per organizational policy). The system records:
- Token type and quantity
- Price source (exchange, oracle, API)
- USD equivalent at contribution time (book basis)
- Member's cost basis in the token (tax basis)
- Any 704(c) layer created

## Connection to Next Sprint

Sprint 10 (Approval Workflow) will define who can approve contributions and how — the authority model that governs Stage 2 of the lifecycle. Valuation rules determine *what* a contribution is worth; approval determines *whether* it counts at all.

---

*Sprint 9 | February 8, 2026 | Habitat*
