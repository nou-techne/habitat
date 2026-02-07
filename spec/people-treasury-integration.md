# People-Treasury Integration

*Sprint 11 — Building on: [Approval Workflow](approval-workflow.md)*

---

## Overview

This sprint closes the loop between People and Treasury — the two composable tools that, until now, have been specified independently. When a contribution is approved and valued (People), it must generate transactions that credit the member's capital account (Treasury). This is the event bridge.

The integration pattern matters beyond this specific case. It demonstrates how bounded contexts communicate in the Habitat architecture: through published events, not shared databases. People doesn't write to Treasury's tables. It publishes an event. Treasury subscribes, interprets, and acts. Either tool can be replaced, extended, or used independently without breaking the other.

This completes Phase 2. After this sprint, we can answer the validation question: *Do members see their contributions reflected in their capital accounts?*

## The Event Bridge

```
People                          Event Bus                         Treasury
──────                          ─────────                         ────────
Contribution approved     →   contribution.approved         →   (no action yet)
Valuation applied         →   contribution.valued           →   Create transactions
                                                                 ├── Book basis entry
                                                                 ├── Tax basis entry
                                                                 └── 704(c) layer (if needed)
Transaction posted        ←   contribution.applied          ←   Confirm posting
```

### Event: `contribution.valued`

Published by People when a contribution has been both approved and valued. This is the trigger for Treasury.

```
{
  "event_type": "contribution.valued",
  "event_id": "uuid",
  "timestamp": "2026-02-15T14:30:00Z",
  "payload": {
    "contribution_id": "uuid",
    "member_id": "uuid",
    "type": "labor",
    "date": "2026-02-14",
    "period_id": "2026-Q1",
    "quantity": 6,
    "unit": "hours",
    "description": "API integration work",
    "valuation": {
      "rule_id": "uuid",
      "book_value": 600.00,
      "tax_value": 0.00,
      "currency": "USD"
    }
  }
}
```

### Treasury Response

On receiving `contribution.valued`, Treasury:

1. **Validates** — member exists, period is open, amounts are positive
2. **Determines accounts** — maps contribution type to the correct asset account
3. **Creates book basis transaction** — debit asset, credit member's book capital (3100-{member})
4. **Creates tax basis transaction** — debit asset, credit member's tax capital (3200-{member}), if tax_value > 0
5. **Creates 704(c) layer** — if book_value ≠ tax_value, records the difference in 3400-{asset}
6. **Posts transactions** — status moves to `posted`
7. **Publishes `contribution.applied`** — confirms to People that the capital account effect is complete

### Event: `contribution.applied`

Published by Treasury after transactions are posted.

```
{
  "event_type": "contribution.applied",
  "event_id": "uuid",
  "timestamp": "2026-02-15T14:30:02Z",
  "payload": {
    "contribution_id": "uuid",
    "transaction_ids": {
      "book": "uuid",
      "tax": "uuid",
      "section_704c": "uuid or null"
    },
    "book_balance_after": 8200.00,
    "tax_balance_after": 7250.00
  }
}
```

People receives this and updates the contribution's status to `applied`, storing the transaction IDs for the audit trail.

## Account Mapping

Treasury needs to know which asset account to debit for each contribution type:

| Contribution Type | Asset Account | Rationale |
|-------------------|--------------|-----------|
| Cash | 1110 Operating Checking (or 1510 Crypto) | Direct deposit to bank or wallet |
| Labor | 1900 Other Assets → "Contributed Services" | Intangible — creates asset recognition |
| In-kind (equipment) | 1410–1430 (appropriate fixed asset) | Physical asset received |
| In-kind (supplies) | 5320 Office Supplies (expense, not asset) | Consumed immediately |
| Revenue attribution | 1200 Receivables or 1110 Cash | Revenue already recorded; attribution affects allocation, not asset accounts |
| Community | 1900 Other Assets → "Contributed Services" | Same treatment as labor |

**Labor and community — the asset question:** When a member contributes labor, what asset does the organization receive? In traditional accounting, contributed services are recognized only if they create or enhance a nonfinancial asset or require specialized skills. For 704(b) book purposes, the operating agreement can define labor contributions as creating capital account credit regardless of GAAP treatment. The system supports both approaches through configuration.

**Revenue attribution — special case:** Revenue-type contributions don't create new transactions in the traditional sense. The revenue already exists in Treasury (recorded when the sale or service occurred). The contribution record in People attributes that revenue to a specific member for patronage calculation purposes. The event bridge for revenue attribution updates the contribution's metadata with the linked Treasury transaction rather than creating new entries.

## Failure Handling

The event bridge can fail. The system handles failures without losing data:

| Failure | Handling |
|---------|---------|
| Treasury rejects (invalid member, closed period) | `contribution.rejected` event published; People reverts to `valued` status with error detail |
| Treasury unavailable | Event queued for retry; People shows `applying` status |
| Partial failure (book posted, tax failed) | Book transaction reversed; both retried as unit |
| Duplicate event (retry after timeout) | Treasury checks idempotency key (contribution_id); ignores duplicate |

**Idempotency:** Every `contribution.valued` event includes the contribution_id. Treasury uses this as an idempotency key — if a transaction already exists for this contribution_id, the event is acknowledged but no new transaction is created. This makes retries safe.

## Reconciliation

The integration must be verifiable. Reconciliation runs periodically (recommended: daily) and checks:

| Check | Query | Expected |
|-------|-------|----------|
| All applied contributions have Treasury transactions | People contributions with status `applied` → verify transaction_ids exist in Treasury | 100% match |
| All contribution transactions trace to contributions | Treasury transactions with event_type `contribution` → verify contribution_id exists in People | 100% match |
| Book value matches | People contribution.book_value = Treasury book transaction amount | Exact match |
| Tax value matches | People contribution.tax_value = Treasury tax transaction amount | Exact match |
| No orphan transactions | Treasury contribution transactions without matching People records | Zero orphans |

Discrepancies trigger alerts and are resolved through the standard adjustment process — new correcting transactions, never modifications to existing records.

## Implementation: Supabase + Make.com

The event bridge maps to the current stack:

**Supabase:** Both People and Treasury tables live in the same PostgreSQL instance. The "event bus" can be implemented as:
- A database trigger on the contributions table that fires when status changes to `valued`
- An `events` table that stores published events for audit and replay
- A PostgreSQL function that creates the Treasury transactions

**Make.com:** For organizations preferring low-code:
- A webhook triggers when contribution status changes
- Make.com scenario maps the contribution to Treasury entries
- Confirmation webhook updates contribution status to `applied`

**Either approach preserves the architectural principle:** People and Treasury communicate through events, not direct table manipulation. Even if they share a database today, the event boundary means they can be separated later without architectural change.

## The Complete Flow

Putting Sprints 8–11 together, the full contribution-to-capital-account path:

```
Member logs 6 hours of engineering work (Sprint 8)
  ↓
Reviewer approves the contribution (Sprint 10)
  ↓
System applies valuation rule: 6h × $100/hr = $600 book, $0 tax (Sprint 9)
  ↓
People publishes contribution.valued event (Sprint 11)
  ↓
Treasury creates transactions:
  Book: Debit 1900 Contributed Services $600 / Credit 3100-{member} $600
  Tax:  (no entry — $0 tax value)
  ↓
Treasury publishes contribution.applied event
  ↓
People updates contribution status to applied
  ↓
Member's capital account statement shows +$600 (Sprint 7)
```

From logging to ledger. Thirty seconds to log, minutes to approve, milliseconds to apply.

## Phase 2 Validation

With Sprints 8–11 complete, the Contribution layer can answer its validation question:

**Do members see their contributions reflected in their capital accounts?**

Yes, if:
- [x] Contributions are logged by members with type, quantity, and description (Sprint 8)
- [x] Contributions are valued at documented rates (Sprint 9)
- [x] Contributions are approved through a configured authority model (Sprint 10)
- [x] Approved, valued contributions generate Treasury transactions via event bridge (Sprint 11)
- [x] Member capital statements reflect the resulting balance changes (Sprint 7)

The pipeline is complete. Phase 3 (Allocation) can now build on a foundation of verified, valued, capital-account-integrated contributions.

## Connection to Next Sprint

Sprint 12 (Patronage Formula) begins Phase 3. With contributions flowing into capital accounts, the system can now calculate how net income is allocated to members based on their patronage — the weighted formula that turns "who contributed what" into "who receives what share of the surplus."

---

*Sprint 11 | February 8, 2026 | Habitat*
