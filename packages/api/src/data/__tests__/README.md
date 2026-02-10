# Data Access Layer Tests

Unit tests for all data access modules (Treasury, People, Agreements).

## Sprint 68 Deliverable

Test coverage for Layer 2 (State):
- **Treasury**: Account CRUD, balanced transactions, period management
- **People**: Member CRUD, contribution state machine, patronage summaries
- **Agreements**: Allocation lifecycle, distributions, capital account updates

## Test Strategy

### Mock vs. Integration

**Current:** Tests use mock database clients for fast unit testing.

**Future:** Integration tests should use:
- **Testcontainers** for PostgreSQL (real database in Docker)
- **Supabase local** for Supabase provider testing

### State Machine Testing

**People contributions** have a strict state machine:
```
draft → submitted → approved/rejected
```

Tests verify:
- Valid transitions succeed
- Invalid transitions throw errors
- Each transition updates expected fields (submittedAt, reviewedAt)

**Allocations** follow:
```
draft → proposed → approved → executed
```

Tests verify governance workflow and status tracking.

### Balance Validation

**Treasury transactions** must balance:
```
sum(debits) = sum(credits)
```

Tests verify:
- Balanced transactions succeed
- Unbalanced transactions throw errors
- Double-entry integrity maintained

### Data Consistency

Tests verify referential integrity:
- Contributions reference valid members
- Transactions reference valid accounts and periods
- Distributions reference valid allocations

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test treasury.test.ts

# Watch mode
pnpm test --watch

# Coverage report
pnpm test --coverage
```

## Coverage Goals

- **Line coverage:** >80% for all data access modules
- **Branch coverage:** >75% for state machines
- **Critical paths:** 100% (transaction balance, state transitions)

## Test Database Setup

For integration tests (future):

```bash
# Start PostgreSQL via Docker
docker run -d \
  --name habitat-test-db \
  -e POSTGRES_DB=habitat_test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  postgres:14

# Run migrations
DATABASE_PROVIDER=postgres \
DB_HOST=localhost \
DB_PORT=5433 \
DB_NAME=habitat_test \
DB_PASSWORD=test \
pnpm migrate

# Run integration tests
pnpm test:integration
```

## Known Limitations

**Current mock tests** do not verify:
- Actual SQL query syntax
- Database constraint enforcement
- Transaction rollback behavior
- Concurrency/race conditions

**Recommendation:** Add integration tests with real databases for Sprint 102-105 (Layer testing sprints).

## TIO Quality Criteria

Per QA & Test Engineer role:
- ✓ All public functions have tests
- ✓ State transitions validated
- ✓ Error cases covered
- ✓ Edge cases documented
- ⚠ Integration with real database (deferred to Sprint 102)

---

Part of Habitat v0.3.3 — Foundation block testing
