# Security Penetration Tests

Security verification tests to ensure no authorization bypasses and security controls work correctly (Layer 6 - Constraint).

## Overview

These tests verify:
- Authentication requirements enforced
- Authorization rules cannot be bypassed
- Role-based access control works
- Resource ownership respected
- SQL injection prevented
- XSS vulnerabilities mitigated
- Rate limiting active
- CSRF protection in place
- Sensitive data not exposed
- Privilege escalation prevented
- Audit logging functional
- Session management secure
- Input validation enforced

## Test File

### `penetration.test.ts`

Comprehensive security penetration test suite.

**Test Suites:**

1. **Authentication Bypasses**
   - Reject queries without auth
   - Reject mutations without auth
   - No forged user IDs

2. **Authorization Bypasses - Role-Based Access**
   - Member cannot access admin ops
   - Member cannot access steward ops
   - Steward can approve contributions
   - Admin has full access

3. **Authorization Bypasses - Resource Ownership**
   - Cannot access other member contributions
   - Can access own contributions
   - Cannot update other member profiles

4. **SQL Injection Prevention**
   - Sanitize user input
   - Use parameterized queries

5. **XSS Prevention**
   - Sanitize HTML in user input

6. **Rate Limiting**
   - Throttle excessive requests

7. **CSRF Protection**
   - Require CSRF token for mutations

8. **Sensitive Data Exposure**
   - No password hashes in responses
   - No unauthorized email access

9. **Privilege Escalation**
   - Cannot self-promote to admin
   - Cannot approve own contributions

10. **Audit Logging**
    - Log sensitive operations

11. **Session Management**
    - Invalidate on logout
    - Reject expired tokens

12. **Input Validation**
    - Reject invalid UUIDs
    - Reject negative amounts
    - Enforce maximum lengths

## Running Tests

```bash
# Run all security tests
pnpm test security

# Run specific suite
pnpm test penetration

# Watch mode
pnpm test security --watch

# Verbose output
pnpm test security --verbose
```

## Test Requirements

### Database

Real PostgreSQL for integration:

```bash
export DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test
```

### Test Users

Tests create users with different roles:
- Member (basic access)
- Steward (can approve contributions)
- Admin (full access)

## Security Model

### Authentication

- All protected operations require authentication
- JWT tokens identify users
- No operations allowed without valid token

### Authorization - Roles

Three roles with hierarchical permissions:

```
Admin
  ├─ All permissions
  ├─ View all members
  └─ Manage system

Steward
  ├─ Approve contributions
  ├─ View pending queue
  └─ Member permissions

Member
  ├─ Submit contributions
  ├─ View own data
  └─ Update own profile
```

### Authorization - Ownership

Resource-level access control:
- Members can only access their own contributions
- Members can only update their own profiles
- Stewards/Admins can access all resources

### SQL Injection Prevention

All queries use parameterized statements:

```typescript
// ❌ Vulnerable
const query = `SELECT * FROM members WHERE email = '${userInput}'`;

// ✅ Safe
const query = 'SELECT * FROM members WHERE email = $1';
pool.query(query, [userInput]);
```

### XSS Prevention

- Backend stores data as-is
- Frontend escapes on render
- No HTML execution in backend

### Rate Limiting

Throttle requests per user/IP:
- Auth endpoints: 5 requests / 15 minutes
- Mutations: 30 requests / minute
- Queries: 100 requests / minute

## Assertions

### Authentication Required

```typescript
it('should reject queries without authentication', async () => {
  const result = await graphql({
    schema,
    source: query,
    contextValue: {}, // No userId
  });
  
  expect(result.data?.me === null || result.errors).toBeTruthy();
});
```

### Role-Based Access

```typescript
it('should reject member access to admin operations', async () => {
  const result = await graphql({
    schema,
    source: adminMutation,
    contextValue: {
      userId: memberUserId,
      role: 'member',
    },
  });
  
  expect(result.errors).toBeDefined();
  expect(result.errors?.[0].message).toMatch(/permission|authorization/i);
});
```

### Resource Ownership

```typescript
it('should reject access to other member contributions', async () => {
  const result = await graphql({
    schema,
    source: query,
    contextValue: {
      userId: memberUserId,
      role: 'member',
    },
  });
  
  expect(result.errors || result.data?.contribution === null).toBeTruthy();
});
```

### SQL Injection Prevention

```typescript
it('should sanitize user input', async () => {
  const maliciousInput = "'; DROP TABLE members; --";
  
  const result = await graphql({
    schema,
    source: query,
    variableValues: { input: maliciousInput },
    contextValue: context,
  });
  
  // Verify table still exists
  const check = await pool.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'members')"
  );
  expect(check.rows[0].exists).toBe(true);
});
```

## Attack Vectors Tested

### 1. Authentication Bypass

**Attack:** Access protected resources without login

**Defense:** All resolvers check for userId in context

**Test:** Verify null/error when no userId provided

### 2. Role Escalation

**Attack:** Member tries to access admin operations

**Defense:** Role-based access control on resolvers

**Test:** Verify member cannot call admin mutations

### 3. Horizontal Privilege Escalation

**Attack:** Member A accesses Member B's data

**Defense:** Ownership checks on resource access

**Test:** Verify member cannot view other member's contributions

### 4. SQL Injection

**Attack:** Malicious input executed as SQL

**Defense:** Parameterized queries everywhere

**Test:** Verify DROP TABLE doesn't execute

### 5. XSS

**Attack:** Script tags in user input

**Defense:** Frontend escaping, no backend execution

**Test:** Verify script tags stored but not executed

### 6. CSRF

**Attack:** Forged requests from malicious site

**Defense:** CSRF tokens on state-changing operations

**Test:** Verify mutations require valid CSRF token

### 7. Brute Force

**Attack:** Rapid login attempts

**Defense:** Rate limiting on auth endpoints

**Test:** Verify 100 requests get throttled

### 8. Information Disclosure

**Attack:** Enumerate users, view sensitive data

**Defense:** Hide sensitive fields, restrict queries

**Test:** Verify password hashes not in schema

### 9. Insecure Direct Object Reference

**Attack:** Access resources by guessing IDs

**Defense:** Ownership + authorization checks

**Test:** Verify cannot access arbitrary contribution IDs

### 10. Session Hijacking

**Attack:** Steal/reuse session tokens

**Defense:** Secure cookies, token expiry, logout invalidation

**Test:** Verify expired tokens rejected

## When Tests Fail

### Authorization Not Enforced

```
Expected result.errors to be defined
Received: undefined (operation succeeded)
```

**Fix:**
- Add @auth directive to schema field
- Add authorization check in resolver
- Verify role checked correctly

### SQL Injection Successful

```
Error: relation "members" does not exist
```

**Fix:**
- Replace string concatenation with parameterized query
- Use query builder with escaping
- Never trust user input

### Sensitive Data Exposed

```
Expected passwordHash to be undefined
Received: "$2b$10$..."
```

**Fix:**
- Remove field from GraphQL schema
- Filter sensitive fields in resolver
- Use separate types for public/private data

## Best Practices

1. **Defense in depth**
   - Multiple layers of security
   - Authentication + Authorization + Input validation

2. **Principle of least privilege**
   - Users get minimum necessary permissions
   - Deny by default, allow explicitly

3. **Never trust user input**
   - Validate everything
   - Sanitize for context
   - Use parameterized queries

4. **Fail securely**
   - Errors should not expose system details
   - Default deny on authorization failures
   - Log security events

5. **Test negative cases**
   - What should fail?
   - Can users do unauthorized things?
   - Can they break the system?

## Security Checklist

Before each release:

- [ ] Authentication required for all protected operations
- [ ] Role-based access control enforced
- [ ] Resource ownership checked
- [ ] SQL injection prevention verified
- [ ] XSS prevention in place
- [ ] Rate limiting active
- [ ] CSRF protection enabled
- [ ] Sensitive data not exposed
- [ ] Privilege escalation prevented
- [ ] Audit logging functional
- [ ] Session management secure
- [ ] Input validation enforced
- [ ] Error messages don't leak info
- [ ] All attack vectors tested

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [GraphQL Security](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
