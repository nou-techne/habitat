# UI End-to-End Tests

Playwright E2E tests for critical user journeys (Layer 7 - View).

## Overview

Tests complete workflows from the user's perspective:
- Authentication and authorization
- Contribution submission
- Approval workflows
- Period management
- Allocation viewing
- Real-time updates
- Error handling
- Responsive design
- Accessibility

## Test Files

### `critical-flow.spec.ts`

Complete user journey tests.

**Test Suites:**

1. **Critical User Journey**
   - Complete flow: Login → Submit → Approve → Close → View Allocation
   - Member cannot access admin operations
   - Member cannot access steward operations
   - Member can view own contributions
   - Steward can approve contributions
   - Admin can close periods

2. **Error Handling**
   - Invalid login credentials
   - Network errors
   - Validation errors on forms

3. **Responsive Design**
   - Mobile viewport
   - Responsive tables

4. **Real-Time Updates**
   - Contribution status updates via polling

5. **Accessibility**
   - Heading hierarchy
   - Form accessibility
   - Keyboard navigation

## Running Tests

```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run all E2E tests
pnpm test:e2e

# Run in UI mode (interactive)
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test critical-flow

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test --debug

# Run on specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit

# Generate test report
pnpm exec playwright show-report
```

## Test Configuration

### `playwright.config.ts`

Configuration settings:
- Test directory: `./e2e`
- Base URL: `http://localhost:3000` (configurable via `BASE_URL`)
- Browsers: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- Retries on CI: 2
- Parallel execution (except on CI)
- Reports: HTML, JSON, JUnit
- Trace on first retry
- Screenshot on failure
- Video on failure
- Auto-start dev server

## Test Data

### Test Users

Three test users with different roles:

```typescript
// Member (basic access)
const MEMBER_EMAIL = 'member@habitat.test';
const MEMBER_PASSWORD = 'test123';

// Steward (can approve contributions)
const STEWARD_EMAIL = 'steward@habitat.test';
const STEWARD_PASSWORD = 'test123';

// Admin (full access)
const ADMIN_EMAIL = 'admin@habitat.test';
const ADMIN_PASSWORD = 'test123';
```

These users should exist in the test database with the correct roles.

### Test Database

Tests should run against a test database, not production:

```bash
export DATABASE_URL=postgres://habitat:habitat@localhost:5432/habitat_test
```

Seed the test database with test users before running E2E tests.

## Critical User Journey

### Phase 1: Member Submits Contribution

```
1. Navigate to /login
2. Enter member credentials
3. Submit login form
4. Wait for redirect to /dashboard
5. Navigate to /contributions/new
6. Select contribution type (labor/capital/property)
7. Enter amount
8. Enter description
9. Submit form
10. Wait for success toast
11. Verify contribution appears in list
12. Verify status is "Pending"
13. Logout
```

### Phase 2: Steward Approves Contribution

```
1. Login as steward
2. Navigate to /approvals
3. Verify pending queue has contributions
4. Find the test contribution
5. Click approve button
6. Confirm in modal
7. Wait for success toast
8. Verify contribution removed from pending queue
9. Logout
```

### Phase 3: Admin Closes Period

```
1. Login as admin
2. Navigate to /patronage
3. Find open period
4. Verify period has contributions
5. Click close period button
6. View summary in modal
7. Confirm close
8. Wait for success toast
9. Verify status changed to "Closed"
10. Click calculate allocations
11. Confirm calculation
12. Wait for calculation complete
13. Logout
```

### Phase 4: Member Views Allocation

```
1. Login as member
2. Navigate to /patronage
3. Find closed period
4. Click view allocation button
5. Verify allocation modal appears
6. Verify allocation amount displayed
7. Verify patronage score displayed
8. Verify contribution included
9. Close modal
10. Navigate to /dashboard
11. Verify capital account balance updated
12. Logout
```

## Helpers

### `login(page, email, password)`

Logs in a user:

```typescript
await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
```

### `logout(page)`

Logs out current user:

```typescript
await logout(page);
```

### `submitContribution(page, type, amount, description)`

Submits a contribution:

```typescript
await submitContribution(
  page,
  'labor',
  '100.00',
  'Test contribution'
);
```

### `approveContribution(page, contributionId)`

Approves a contribution:

```typescript
await approveContribution(page, contributionId);
```

### `closePeriod(page, periodId)`

Closes an allocation period:

```typescript
await closePeriod(page, periodId);
```

## Selectors

Tests use `data-testid` attributes for stable selectors:

```typescript
// Good (stable)
page.locator('[data-testid="approve-button"]')

// Avoid (brittle)
page.locator('button.btn-primary')
page.locator('text=Approve')
```

### Required Test IDs

Components should include these test IDs:

**Authentication:**
- `user-menu` - User menu button
- `logout-button` - Logout button

**Contributions:**
- `contributions-table` - Contributions list table
- `status` - Contribution status badge

**Approvals:**
- `pending-queue` - Pending approvals list
- `pending-count` - Number of pending approvals
- `approve-button` - Approve button
- `approval-modal` - Approval confirmation modal
- `confirm-approve` - Confirm approval button

**Periods:**
- `period-card` - Period card
- `period-status` - Period status badge
- `close-period-button` - Close period button
- `close-period-modal` - Close period modal
- `close-period-summary` - Summary in close modal
- `confirm-close-period` - Confirm close button
- `calculate-allocations-button` - Calculate allocations button
- `confirm-calculate` - Confirm calculation button
- `view-allocation-button` - View allocation button

**Allocations:**
- `allocation-modal` - Allocation details modal
- `allocation-amount` - Allocation amount
- `patronage-score` - Patronage score
- `contributions-included` - List of included contributions

**Dashboard:**
- `capital-account-balance` - Capital account balance

**General:**
- `toast` - Toast notification
- `error-message` - Error message
- `mobile-menu-button` - Mobile menu button
- `mobile-nav` - Mobile navigation menu

## Assertions

### Page Navigation

```typescript
await page.waitForURL('/dashboard');
await expect(page).toHaveURL(/dashboard/);
```

### Element Visibility

```typescript
await expect(page.locator('[data-testid="approve-button"]')).toBeVisible();
await expect(page.locator('[data-testid="approve-button"]')).not.toBeVisible();
```

### Text Content

```typescript
await expect(page.locator('h1')).toContainText(/dashboard/i);
await expect(page.locator('[data-testid="status"]')).toContainText('Approved');
```

### Attribute Values

```typescript
await expect(page.locator('input')).toHaveAttribute('id', 'email');
const contributionId = await row.getAttribute('data-contribution-id');
```

### Count

```typescript
const count = await page.locator('[data-testid="pending-queue"] tr').count();
expect(count).toBeGreaterThan(0);
```

## Multi-User Testing

Tests can simulate multiple users interacting with the system:

```typescript
// User 1 (default page)
await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);

// User 2 (new context)
const stewardContext = await browser.newContext();
const stewardPage = await stewardContext.newPage();
await login(stewardPage, STEWARD_EMAIL, STEWARD_PASSWORD);

// Both users interact with the system
// ...

// Cleanup
await stewardContext.close();
```

## Real-Time Updates

Tests can verify real-time updates via polling:

```typescript
// User 1 submits contribution
await submitContribution(page, 'labor', '100.00', 'Test');

// User 2 approves (in parallel)
// ...

// User 1's page updates (via polling)
await expect(page.locator('[data-testid="status"]')).toContainText(
  'Approved',
  { timeout: 15000 } // Wait up to 15 seconds for polling
);
```

## Error Handling

Tests verify error states:

```typescript
// Invalid credentials
await page.fill('input[name="email"]', 'invalid@test.com');
await page.fill('input[name="password"]', 'wrong');
await page.click('button[type="submit"]');

await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid/i);
```

## Responsive Design

Tests verify mobile viewports:

```typescript
await page.setViewportSize({ width: 375, height: 667 });

await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
```

## Accessibility

Tests verify accessibility:

```typescript
// Heading hierarchy
await expect(page.locator('h1')).toBeVisible();

// Form labels
const emailInput = page.locator('input[name="email"]');
const emailLabel = page.locator('label[for="email"]');
await expect(emailLabel).toBeVisible();

// Keyboard navigation
await page.keyboard.press('Tab');
await page.keyboard.type('email@test.com');
await page.keyboard.press('Enter');
```

## Debugging

### UI Mode

Interactive mode to debug tests:

```bash
pnpm exec playwright test --ui
```

### Debug Mode

Step through tests:

```bash
pnpm exec playwright test --debug
```

### Headed Mode

See browser:

```bash
pnpm exec playwright test --headed
```

### Trace Viewer

View recorded trace:

```bash
pnpm exec playwright show-trace trace.zip
```

### Screenshots

Captured on failure in `test-results/` directory.

### Videos

Captured on failure in `test-results/` directory.

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Playwright
  run: pnpm exec playwright install --with-deps

- name: Run E2E tests
  run: pnpm test:e2e
  env:
    BASE_URL: http://localhost:3000

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Best Practices

1. **Use data-testid attributes**
   - Stable selectors
   - Independent of styling

2. **Test user journeys, not implementation**
   - Focus on what users do
   - Don't test internal state

3. **Keep tests independent**
   - Each test should work alone
   - Don't depend on other tests

4. **Use helper functions**
   - Reduce duplication
   - Easier to maintain

5. **Wait for elements properly**
   - Use `waitForURL()`
   - Use `expect().toBeVisible()`
   - Don't use arbitrary `wait()`

6. **Test error cases**
   - Invalid input
   - Network failures
   - Authorization errors

7. **Test across browsers**
   - Chrome, Firefox, Safari
   - Mobile viewports

8. **Test accessibility**
   - Keyboard navigation
   - Screen reader support
   - WCAG compliance

## When Tests Fail

### Element Not Found

```
Error: Locator [data-testid="approve-button"] not visible
```

**Check:**
- Is test ID present in component?
- Is element conditionally rendered?
- Is user authorized to see it?
- Did page fully load?

### Timeout

```
Error: Timeout 30000ms exceeded
```

**Check:**
- Is server running?
- Is database seeded?
- Is API responding?
- Increase timeout if needed

### Assertion Failed

```
Expected "Pending"
Received "Approved"
```

**Check:**
- Is test data clean?
- Did previous test affect state?
- Is timing issue (wait for update)?

## References

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
