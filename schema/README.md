# Habitat Database Schemas

Implementation-ready DDL for Habitat's patronage accounting system. Designed for PostgreSQL 14+ (Supabase-compatible).

## Schema Files

Numbered for dependency order. Run in sequence.

| File | Description | Dependencies |
|------|-------------|--------------|
| `01_treasury_core.sql` | Core Treasury tables: events, accounts, transactions, entries, periods | None |
| `02_treasury_migrations.sql` | Migration templates: 704(c) layers, minimum gain, QIO/DRO, audit trail, event replay | 01 |
| `03_treasury_seed_data.sql` | Development seed data: sample periods, accounts, transactions | 01 |
| `04_people_core.sql` | People tool: members, contributions, valuations, approvals | 01 |
| `05_agreements_core.sql` | Agreements tool: allocations, formulas, distributions | 01, 04 |

**Status:** Sprint 40 complete (`01_treasury_core.sql`, `02_treasury_migrations.sql`, `03_treasury_seed_data.sql`). Additional files planned for Sprints 46-47.

## Architecture Overview

### Event Sourcing
All state changes flow through the `events` table. Entity tables (accounts, transactions, members) are materialized views derived from event replay. This provides:
- **Immutability:** Events never change; state is recomputed
- **Audit trail:** Complete history of every change
- **Temporal queries:** Reconstruct state at any point in time
- **Debugging:** Replay events to understand how system reached current state

### Double-Entry Accounting
Every transaction must balance to zero. Enforced by:
- `transaction_entries` table with debit/credit direction
- Database constraint trigger `check_transaction_balance`
- Deferred constraint (checked at transaction commit)

### Book and Tax Ledgers
Separate ledgers for book (GAAP) and tax (IRC 704(b)) accounting:
- `ledger` column on accounts and transactions
- Parallel charts of accounts
- Capital accounts track both bases

### Materialized Views
Performance optimization for balance queries:
- `account_balances`: Current balance snapshot
- `period_account_balances`: Historical period balances
- Refresh via `refresh_treasury_views()` after batch operations

## Usage

### Setup
```bash
# Create database
createdb habitat

# Run schemas in order
psql habitat < schema/01_treasury_core.sql

# Optional: Load seed data for development/testing
psql habitat < schema/03_treasury_seed_data.sql
```

### Applying Migrations

Production migrations should use a migration tool (e.g., Flyway, Liquibase, or custom). The patterns in `02_treasury_migrations.sql` are templates demonstrating:

- How to add 704(c) layer tracking
- How to add minimum gain tracking (IRC Reg 1.704-2)
- How to add QIO/DRO tracking (IRC Reg 1.704-1(b)(2)(ii)(d))
- How to create audit log views
- How to perform event replay (rebuild state from events)

**Migration discipline:**
1. Write migration with rollback script
2. Test migration + rollback on staging database
3. Apply to production with transaction boundaries
4. Verify integrity checks pass after migration
5. Refresh materialized views

### Event Replay

If materialized state becomes corrupted or schema changes require rebuild:

```sql
-- Caution: this clears all derived state
psql habitat < schema/02_treasury_migrations.sql  # Run EVENT REPLAY SCRIPT section

-- Or manually:
BEGIN;
TRUNCATE accounts, transactions, transaction_entries, periods CASCADE;
-- Application replays events from the events table
REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
REFRESH MATERIALIZED VIEW CONCURRENTLY period_account_balances;
COMMIT;
```

### Posting a Transaction

Transactions post through event sourcing:

```sql
-- 1. Record event
INSERT INTO events (aggregate_type, aggregate_id, event_type, event_data) VALUES (
    'transaction',
    gen_random_uuid(),
    'TransactionRecorded',
    '{"transaction_date": "2026-02-13", "ledger": "book", "entries": [...]}'::jsonb
);

-- 2. Event handler materializes transaction
INSERT INTO transactions (...) VALUES (...);
INSERT INTO transaction_entries (...) VALUES (...);

-- 3. Refresh views (batch operation)
SELECT refresh_treasury_views();
```

In production, event handlers run automatically via triggers or message bus subscribers.

### Querying Balances

```sql
-- Current balance for all accounts
SELECT * FROM account_balances ORDER BY account_number;

-- Book vs tax basis for member capital accounts
SELECT 
    account_name,
    ledger,
    balance
FROM account_balances
WHERE account_type = 'equity' 
  AND account_name LIKE '%Capital%'
ORDER BY account_name, ledger;

-- Period-end balances for a specific quarter
SELECT * FROM period_account_balances
WHERE period_id = 'q1-2026-uuid'
ORDER BY account_number;
```

### Temporal Queries

Reconstruct state at any point in time:

```sql
-- Replay events up to specific date
SELECT * FROM events 
WHERE occurred_at <= '2026-02-01'
ORDER BY sequence_number;

-- Compute balance as of date
SELECT 
    a.account_id,
    SUM(CASE 
        WHEN te.direction = 'debit' THEN te.amount
        WHEN te.direction = 'credit' THEN -te.amount
    END) AS balance_at_date
FROM accounts a
JOIN transaction_entries te ON a.account_id = te.account_id
JOIN transactions t ON te.transaction_id = t.transaction_id
WHERE t.transaction_date <= '2026-02-01'
  AND t.transaction_status = 'recorded'
GROUP BY a.account_id;
```

## Design Principles

### 1. Events Are Immutable
Never UPDATE or DELETE from the `events` table. To correct errors:
- Record a compensating event (void + new transaction)
- Update materialized entity tables
- Event log remains complete history

### 2. Constraints at Database Level
Business rules enforced by:
- Foreign keys (referential integrity)
- CHECK constraints (valid data ranges)
- Custom triggers (double-entry balance, period close locks)

Database constraints are the last line of defense. Application logic should prevent invalid operations, but the database guarantees correctness.

### 3. Materialized Views for Performance
Reading from event log is slow. Materialized views provide:
- Fast balance queries
- Period-end snapshots
- Pre-computed aggregations

Trade-off: Views must be refreshed after writes. In production:
- Batch operations: manual refresh after batch complete
- Real-time: auto-refresh via triggers (use carefully, impacts write performance)

### 4. Ledger Separation
Book and tax accounting use the same table structures but separate rows:
- Simplifies schema (no parallel table sets)
- Easy to query either ledger independently
- Supports 704(c) layers (future: `704c_layer_id` column)

## Seed Data

The `03_treasury_seed_data.sql` file provides a working set of sample data for development and testing:

**Periods:**
- Q1 2026, Q2 2026 (quarters, open)
- Jan 2026, Feb 2026 (months, closed)

**Chart of Accounts:**
- Book ledger: complete chart with assets, liabilities, equity, revenue, expenses
- Tax ledger: member capital accounts (for 704(b) tracking)
- Member capital accounts for 4 members: Alice, Bob, Carol, David

**Sample Transactions:**
1. Alice initial cash contribution: $5,000
2. Bob initial cash contribution: $8,000
3. Space revenue: $3,500
4. $CLOUD credit sale: 100 CLOUD ($1,000)
5. Rent expense: $4,200

**Verification included:**
- Double-entry balance check (should sum to zero)
- Account balance report
- Member capital account balances
- Cash position summary

After loading seed data, you can immediately query balances, test period close, and prototype allocation calculations.

## Testing Strategy

### Unit Tests (Application Layer)
- Event serialization/deserialization
- Balance calculation logic
- Period close workflow

### Integration Tests (Database Layer)
- Insert events → verify materialized entities correct
- Post transaction → verify balances update
- Attempt invalid transaction → verify constraint rejects
- Temporal query → verify historical accuracy

### Compliance Tests
- Post contribution → verify book and tax capital accounts match (or diverge per 704(c) rules)
- Close period → verify period status prevents new transactions
- Allocate patronage → verify debits = credits, member capital accounts sum correctly

## Future Enhancements

Planned for later sprints:

- **704(c) layer tracking:** Column on capital accounts for reverse 704(c) layers
- **Minimum gain tracking:** Table for partnership minimum gain computation
- **QIO/DRO tracking:** Qualified income offset and deficit restoration obligations per member
- **Audit log materialized view:** Human-readable change history
- **Performance indexes:** Additional covering indexes based on query patterns
- **Partitioning:** Partition `events` table by time range for very large cooperatives

## References

- **Event Sourcing:** Martin Fowler, "Event Sourcing" (martinfowler.com)
- **Double-Entry Accounting:** Pacioli, *Summa de Arithmetica* (1494)
- **PostgreSQL Documentation:** [postgresql.org/docs](https://www.postgresql.org/docs/current/)
- **IRC Section 704(b):** Capital account maintenance requirements
- **Habitat Specification:** [../spec/](../spec/) — conceptual design documents

---

**Maintainer:** Nou · Techne / RegenHub, LCA
**Last Updated:** February 9, 2026 (Sprint 39)
