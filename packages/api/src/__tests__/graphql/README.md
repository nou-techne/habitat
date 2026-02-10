# GraphQL Contract Tests

Contract tests for GraphQL API (Layer 3 - Relationship), verifying that queries, mutations, and authorization rules work correctly.

## Test Files

### `schema.test.ts`

Tests GraphQL schema structure and completeness.

**Validates:**
- Query type has all required fields
- Mutation type has all required fields
- Object types are defined correctly
- Enum types have correct values
- Input types exist for mutations
- Pagination types (PageInfo, Connection types)
- Directives are used correctly (@auth, @requireRole)
- Field arguments (pagination, filters)
- Timestamp formatting (String for ISO 8601)
- ID type usage for identifiers
- Non-null modifiers on required fields
- Schema completeness (all spec'd operations)
- Valid GraphQL syntax

**Example:**
```typescript
it('should have contribution queries', () => {
  expect(schemaString).toContain('contribution(id: ID!): Contribution');
  expect(schemaString).toContain('contributions(');
  expect(schemaString).toContain('memberContributions(memberId: ID!');
  expect(schemaString).toContain('pendingContributions');
});
```

### `resolvers.test.ts`

Tests GraphQL resolvers with real data and database interactions.

**Tests:**
- **Query Resolvers:**
  - `me` - Current user
  - `member` - Single member by ID
  - `members` - Paginated member list
  - `period` - Single period by ID
  - `currentPeriod` - Active period
  - `contribution` - Single contribution by ID
  - `memberContributions` - Member's contributions
  - `pendingContributions` - Contributions awaiting approval

- **Mutation Resolvers:**
  - `createContribution` - Create new contribution
  - `approveContribution` - Approve pending contribution
  - Input validation
  - Error handling

- **Authorization Rules:**
  - Authentication required for protected operations
  - Role-based access control (member, steward, admin)
  - Owner-based access control (own data vs others)

- **Pagination:**
  - Correct PageInfo calculation
  - hasNextPage / hasPreviousPage
  - Empty result handling
  - Limit and offset parameters

- **Error Handling:**
  - User-friendly error messages
  - No internal error exposure
  - Validation errors

**Example:**
```typescript
it('should return paginated members', async () => {
  const query = `
    query($limit: Int, $offset: Int) {
      members(limit: $limit, offset: $offset) {
        items { id email }
        pageInfo { total hasNextPage hasPreviousPage }
      }
    }
  `;
  
  const result = await graphql({
    schema,
    source: query,
    variableValues: { limit: 10, offset: 0 },
    contextValue: { userId, role: 'admin' },
  });
  
  expect(result.errors).toBeUndefined();
  expect(result.data?.members.items).toBeInstanceOf(Array);
});
```

## Running Tests

```bash
# Run all GraphQL tests
pnpm test graphql

# Run specific test file
pnpm test schema.test
pnpm test resolvers.test

# Watch mode
pnpm test graphql --watch

# With coverage
pnpm test graphql --coverage
```

## Test Requirements

### Database

Resolver tests require a test database:

```bash
export DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test
```

### Schema Applied

Database schema must exist:

```bash
psql $DATABASE_URL < schema/01_treasury_core.sql
psql $DATABASE_URL < schema/02_people_core.sql
# ... etc
```

### Test Data

Resolver tests create and clean up test data automatically:
- Test member
- Test allocation period
- Test contributions

## Authorization Testing

### Roles

- **member** - Basic member access
- **steward** - Can approve contributions
- **admin** - Full access

### Context Object

```typescript
const context = {
  userId: 'member-uuid',
  role: 'member',
};
```

### Testing Auth Rules

```typescript
it('should reject unauthenticated queries', async () => {
  const result = await graphql({
    schema,
    source: query,
    contextValue: {}, // No userId
  });
  
  expect(result.errors).toBeDefined();
});

it('should restrict member from admin operations', async () => {
  const context = { userId, role: 'member' };
  
  const result = await graphql({
    schema,
    source: adminMutation,
    contextValue: context,
  });
  
  expect(result.errors).toBeDefined();
  expect(result.errors[0].message).toMatch(/permission|authorization/i);
});
```

## Pagination Testing

All list queries should support pagination:

```graphql
query {
  members(limit: 10, offset: 0) {
    items {
      id
      email
    }
    pageInfo {
      total
      hasNextPage
      hasPreviousPage
    }
  }
}
```

### PageInfo Fields

- `total` - Total count of items (all pages)
- `hasNextPage` - Boolean, true if more results exist
- `hasPreviousPage` - Boolean, true if offset > 0

### Testing Pagination

```typescript
it('should respect limit parameter', async () => {
  const result = await graphql({
    schema,
    source: query,
    variableValues: { limit: 2 },
    contextValue: context,
  });
  
  expect(result.data?.members.items.length).toBeLessThanOrEqual(2);
});

it('should calculate hasNextPage correctly', async () => {
  const result = await graphql({
    schema,
    source: query,
    variableValues: { limit: 1, offset: 0 },
    contextValue: context,
  });
  
  const { total, hasNextPage } = result.data?.members.pageInfo;
  expect(hasNextPage).toBe(total > 1);
});
```

## Error Handling

### Expected Errors

Tests should verify proper error handling:

```typescript
it('should return validation errors', async () => {
  const result = await graphql({
    schema,
    source: mutation,
    variableValues: { input: { /* missing required fields */ } },
    contextValue: context,
  });
  
  expect(result.errors).toBeDefined();
  expect(result.errors[0].message).toMatch(/required/i);
});
```

### Error Sanitization

Internal errors should not expose sensitive details:

```typescript
it('should not expose internal errors', async () => {
  const result = await graphql({
    schema,
    source: query,
    variableValues: { id: 'invalid-format' },
    contextValue: context,
  });
  
  if (result.errors) {
    expect(result.errors[0].message).not.toMatch(/pg_|postgres|database/i);
  }
});
```

## When Tests Fail

### Schema Mismatch

```
Expected schemaString to contain 'memberContributions'
```

**Fix:** Add missing query/mutation to schema definition.

### Resolver Returns Wrong Data

```
Expected result.data.member.id to be 'uuid-123'
Received: null
```

**Fix:** Check resolver implementation, database query, or test data.

### Authorization Not Enforced

```
Expected result.errors to be defined
Received: undefined (operation succeeded)
```

**Fix:** Add @auth or @requireRole directive to schema field.

### Pagination Incorrect

```
Expected pageInfo.hasNextPage to be true
Received: false
```

**Fix:** Check pagination logic in resolver, verify total count calculation.

## Maintenance

### Adding New Queries

1. **Define in schema**
   ```graphql
   type Query {
     newQuery(id: ID!): NewType
   }
   ```

2. **Add schema test**
   ```typescript
   it('should have newQuery', () => {
     expect(schemaString).toContain('newQuery');
   });
   ```

3. **Implement resolver**
   ```typescript
   Query: {
     newQuery: async (_, { id }, context) => {
       // Implementation
     },
   }
   ```

4. **Add resolver test**
   ```typescript
   it('should return data from newQuery', async () => {
     const result = await graphql({ ... });
     expect(result.data?.newQuery).toBeDefined();
   });
   ```

### Adding New Mutations

Same pattern as queries, plus:

5. **Test input validation**
   ```typescript
   it('should validate newMutation input', async () => {
     const result = await graphql({
       schema,
       source: mutation,
       variableValues: { input: {} }, // Empty input
       contextValue: context,
     });
     expect(result.errors).toBeDefined();
   });
   ```

6. **Test authorization**
   ```typescript
   it('should require appropriate role for newMutation', async () => {
     const result = await graphql({
       schema,
       source: mutation,
       contextValue: { userId, role: 'member' }, // Insufficient role
     });
     expect(result.errors).toBeDefined();
   });
   ```

### Updating Existing Operations

When modifying queries or mutations:

1. Update schema definition
2. Update resolver implementation
3. Update schema tests
4. Update resolver tests
5. Verify all affected tests pass

## Best Practices

1. **Test happy path and error cases**
   - Valid input → success
   - Invalid input → error
   - Missing auth → error
   - Insufficient permissions → error

2. **Use real database for resolver tests**
   - Don't mock database calls
   - Test actual SQL queries
   - Verify data relationships

3. **Clean up test data**
   - Use beforeEach/afterEach hooks
   - Delete created records
   - Avoid test pollution

4. **Test authorization thoroughly**
   - Every role combination
   - Owner vs non-owner access
   - Authenticated vs unauthenticated

5. **Verify pagination edge cases**
   - Empty results
   - Single page
   - Multiple pages
   - Offset beyond total

6. **Check error messages**
   - User-friendly
   - Not too technical
   - No sensitive data

## Integration with CI/CD

```yaml
# .github/workflows/ci.yml
test-graphql:
  services:
    postgres:
      image: postgres:15-alpine
  steps:
    - name: Run GraphQL tests
      run: pnpm test graphql
```

## FAQ

**Q: Why test schema structure separately from resolvers?**
A: Schema tests catch definition issues without database. Resolver tests verify implementation.

**Q: Should I mock database calls in resolver tests?**
A: No. Use test database to verify real queries work correctly.

**Q: How do I test subscriptions?**
A: Create separate test file for subscriptions with WebSocket client.

**Q: What about performance testing?**
A: Contract tests verify correctness. Use separate load tests for performance.

**Q: How do I test complex authorization logic?**
A: Create test cases for every role + permission combination.

## References

- [GraphQL Testing Best Practices](https://graphql.org/learn/validation/)
- [Apollo Server Testing](https://www.apollographql.com/docs/apollo-server/testing/testing/)
- [Vitest Documentation](https://vitest.dev/)
