# Contract Tests

Contract tests verify that TypeScript types and database schema remain aligned, preventing drift between code and database.

## What Are Contract Tests?

Contract tests validate the "contract" between different parts of the system:
- **Type ↔ Schema:** TypeScript types match database table definitions
- **API ↔ Types:** GraphQL schema matches TypeScript types
- **Events ↔ Handlers:** Event payload types match handler expectations

## Why Contract Tests?

Without contract tests, drift can occur:
```typescript
// TypeScript type says this is required
interface Member {
  email: string;  // Not nullable
}

// But database allows NULL
CREATE TABLE members (
  email VARCHAR(255) NULL  -- Nullable!
);
```

Contract tests catch this mismatch automatically.

## Test Files

### `schema-alignment.test.ts`

Verifies database schema matches TypeScript types.

**Tests:**
- Column names match type properties
- Data types match (uuid ↔ UUID, varchar ↔ string, etc.)
- Nullability matches (nullable vs required)
- Enum values match
- Foreign key relationships exist
- Indexes cover foreign keys
- Numeric precision for monetary values
- Timestamp types (timestamptz everywhere)
- No undocumented columns

**Example:**
```typescript
it('should have all required columns with correct types', async () => {
  const columns = await getTableColumns('allocation_periods');
  
  expect(columns.id.type).toBe('uuid');
  expect(columns.id.nullable).toBe(false);
  expect(columns.name.type).toBe('character varying');
  expect(columns.name.nullable).toBe(false);
});
```

### `type-completeness.test.ts`

Verifies TypeScript type exports are complete and correct.

**Tests:**
- All types are exported
- Enum values are correct
- Type structures have required fields
- Nullability is correct
- Index exports include all types
- Type documentation exists

**Example:**
```typescript
it('should export AllocationPeriod type', () => {
  expect(TreasuryTypes.AllocationPeriod).toBeDefined();
});

it('should have required fields', () => {
  const period: AllocationPeriod = {
    id: '...',
    name: 'Q1 2026',
    start_date: new Date(),
    end_date: new Date(),
    // ... all required fields
  };
});
```

## Running Contract Tests

```bash
# Run all contract tests
pnpm test contract

# Run specific contract test file
pnpm test schema-alignment
pnpm test type-completeness

# Run with coverage
pnpm test contract --coverage

# Watch mode
pnpm test contract --watch
```

## Test Requirements

### Database Connection

Contract tests require a test database:

```bash
# Set DATABASE_URL
export DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test

# Or create .env.test
echo "DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test" > .env.test
```

### Schema Must Be Applied

Tests expect database schema to exist:

```bash
# Apply schema to test database
psql $DATABASE_URL < schema/01_treasury_core.sql
psql $DATABASE_URL < schema/02_people_core.sql
psql $DATABASE_URL < schema/03_agreements_core.sql
# ... etc
```

## When Tests Fail

### Column Type Mismatch

```
Expected columns.email.type to be 'character varying'
Received: 'text'
```

**Fix:** Update either TypeScript type or database schema to match.

### Missing Column

```
Expected columns to include 'ens_name'
Received: undefined
```

**Fix:** Add column to database schema or remove from TypeScript type.

### Enum Value Mismatch

```
Expected enum to contain 'archived'
Received: ['open', 'closed']
```

**Fix:** Add missing enum value to database or TypeScript.

### Foreign Key Missing

```
Expected foreign key contributions.member_id → members(id)
Not found
```

**Fix:** Add foreign key constraint to schema.

## Maintenance

### Adding New Types

When adding a new database table or TypeScript type:

1. **Create the type**
   ```typescript
   export interface NewType {
     id: UUID;
     name: string;
     created_at: Timestamp;
   }
   ```

2. **Create the table**
   ```sql
   CREATE TABLE new_types (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

3. **Add contract tests**
   ```typescript
   describe('new_types table', () => {
     it('should have all required columns with correct types', async () => {
       // Test column alignment
     });
   });
   ```

### Updating Existing Types

When modifying a type or schema:

1. Update TypeScript type
2. Create migration for database
3. Update contract tests if needed
4. Run tests to verify alignment

### Schema Changes

Always update contract tests when:
- Adding/removing columns
- Changing column types
- Adding/removing enum values
- Adding/removing constraints
- Adding/removing indexes

## Best Practices

1. **Run before migrations**
   - Verify current state before changing schema
   - Catch drift before making changes

2. **Run in CI/CD**
   - Fail build if types and schema don't match
   - Prevent deployment of mismatched code

3. **Keep tests DRY**
   - Use helper functions for common checks
   - Share column verification logic

4. **Test both directions**
   - Type → Schema (all type fields exist in DB)
   - Schema → Type (no undocumented columns)

5. **Version with schema**
   - Update contract tests in same commit as schema changes
   - Keep tests synchronized with migrations

## Integration with CI/CD

```yaml
# .github/workflows/ci.yml
test:
  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_DB: habitat_test
        POSTGRES_USER: habitat_test
        POSTGRES_PASSWORD: test_password
  
  steps:
    - uses: actions/checkout@v4
    - name: Apply schema
      run: psql $DATABASE_URL < schema/*.sql
    - name: Run contract tests
      run: pnpm test contract
```

## FAQ

**Q: Why do contract tests need a real database?**
A: To introspect actual schema. Mocking wouldn't catch real drift.

**Q: Should I mock the database for unit tests?**
A: Yes. Contract tests verify integration. Unit tests can mock.

**Q: How often should contract tests run?**
A: Every commit in CI. Before every migration locally.

**Q: What if types and schema don't match?**
A: Decide which is correct, update the other, update test.

**Q: Can I skip contract tests?**
A: Not recommended. They're the only automated way to catch drift.

## References

- [Contract Testing Pattern](https://martinfowler.com/bliki/ContractTest.html)
- [Database Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
- [TypeScript Type Testing](https://github.com/SamVerschueren/tsd)
