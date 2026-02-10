/**
 * Critical User Journey E2E Tests
 * 
 * Complete flow:
 * Login → Submit Contribution → Approve → Period Close → View Allocation
 * 
 * Layer 7 (View) validation
 */

import { test, expect, type Page } from '@playwright/test';

// Test users
const MEMBER_EMAIL = 'member@habitat.test';
const MEMBER_PASSWORD = 'test123';
const STEWARD_EMAIL = 'steward@habitat.test';
const STEWARD_PASSWORD = 'test123';
const ADMIN_EMAIL = 'admin@habitat.test';
const ADMIN_PASSWORD = 'test123';

/**
 * Helper: Login as user
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');
}

/**
 * Helper: Logout
 */
async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/login');
}

/**
 * Helper: Submit contribution
 */
async function submitContribution(
  page: Page,
  type: 'labor' | 'capital' | 'property',
  amount: string,
  description: string
) {
  await page.goto('/contributions/new');
  
  // Select contribution type
  await page.selectOption('select[name="contributionType"]', type);
  
  // Enter amount
  await page.fill('input[name="amount"]', amount);
  
  // Enter description
  await page.fill('textarea[name="description"]', description);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for success toast
  await expect(page.locator('[data-testid="toast"]')).toContainText(/submitted/i);
  
  // Wait for redirect to contributions list
  await page.waitForURL('/contributions');
}

/**
 * Helper: Approve contribution
 */
async function approveContribution(page: Page, contributionId: string) {
  await page.goto('/approvals');
  
  // Find contribution in pending queue
  const row = page.locator(`[data-contribution-id="${contributionId}"]`);
  await expect(row).toBeVisible();
  
  // Click approve button
  await row.locator('[data-testid="approve-button"]').click();
  
  // Confirm in modal
  await page.click('[data-testid="confirm-approve"]');
  
  // Wait for success toast
  await expect(page.locator('[data-testid="toast"]')).toContainText(/approved/i);
}

/**
 * Helper: Close period
 */
async function closePeriod(page: Page, periodId: string) {
  await page.goto('/patronage');
  
  // Find period
  const periodCard = page.locator(`[data-period-id="${periodId}"]`);
  await expect(periodCard).toBeVisible();
  
  // Click close period button
  await periodCard.locator('[data-testid="close-period-button"]').click();
  
  // Confirm in modal
  await page.click('[data-testid="confirm-close-period"]');
  
  // Wait for success toast
  await expect(page.locator('[data-testid="toast"]')).toContainText(/closed/i);
  
  // Wait for period status to update
  await expect(periodCard.locator('[data-testid="period-status"]')).toContainText('Closed');
}

test.describe('Critical User Journey', () => {
  test('complete flow: login → submit → approve → close → view allocation', async ({ page, browser }) => {
    // Phase 1: Member logs in and submits contribution
    await test.step('Member submits contribution', async () => {
      await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
      
      // Verify dashboard loads
      await expect(page.locator('h1')).toContainText(/dashboard/i);
      
      // Submit labor contribution
      await submitContribution(
        page,
        'labor',
        '100.00',
        'E2E test contribution - labor hours on patronage system'
      );
      
      // Verify contribution appears in list
      await expect(page.locator('[data-testid="contributions-table"]')).toContainText('E2E test contribution');
      
      // Verify status is "Pending"
      await expect(
        page.locator('[data-testid="contributions-table"] tbody tr:first-child [data-testid="status"]')
      ).toContainText('Pending');
      
      await logout(page);
    });
    
    // Phase 2: Steward approves contribution
    await test.step('Steward approves contribution', async () => {
      // Open new context for steward
      const stewardContext = await browser.newContext();
      const stewardPage = await stewardContext.newPage();
      
      await login(stewardPage, STEWARD_EMAIL, STEWARD_PASSWORD);
      
      // Navigate to approvals
      await stewardPage.goto('/approvals');
      
      // Verify pending queue has contributions
      const pendingCount = await stewardPage.locator('[data-testid="pending-count"]').textContent();
      expect(parseInt(pendingCount || '0')).toBeGreaterThan(0);
      
      // Find the E2E test contribution
      const testContribution = stewardPage.locator(
        '[data-testid="pending-queue"] tr:has-text("E2E test contribution")'
      );
      await expect(testContribution).toBeVisible();
      
      // Get contribution ID
      const contributionId = await testContribution.getAttribute('data-contribution-id');
      expect(contributionId).toBeTruthy();
      
      // Approve it
      await testContribution.locator('[data-testid="approve-button"]').click();
      
      // Modal should appear
      await expect(stewardPage.locator('[data-testid="approval-modal"]')).toBeVisible();
      
      // Confirm approval
      await stewardPage.click('[data-testid="confirm-approve"]');
      
      // Wait for success
      await expect(stewardPage.locator('[data-testid="toast"]')).toContainText(/approved/i);
      
      // Verify contribution removed from pending queue
      await expect(testContribution).not.toBeVisible();
      
      await logout(stewardPage);
      await stewardContext.close();
    });
    
    // Phase 3: Admin closes period
    await test.step('Admin closes period', async () => {
      const adminContext = await browser.newContext();
      const adminPage = await adminContext.newPage();
      
      await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
      
      // Navigate to patronage
      await adminPage.goto('/patronage');
      
      // Find the current open period
      const openPeriod = adminPage.locator('[data-testid="period-card"][data-status="open"]').first();
      await expect(openPeriod).toBeVisible();
      
      // Get period ID
      const periodId = await openPeriod.getAttribute('data-period-id');
      expect(periodId).toBeTruthy();
      
      // Verify period has contributions
      const contributionsCount = await openPeriod
        .locator('[data-testid="contributions-count"]')
        .textContent();
      expect(parseInt(contributionsCount || '0')).toBeGreaterThan(0);
      
      // Close the period
      await openPeriod.locator('[data-testid="close-period-button"]').click();
      
      // Modal appears
      await expect(adminPage.locator('[data-testid="close-period-modal"]')).toBeVisible();
      
      // Show summary
      await expect(adminPage.locator('[data-testid="close-period-summary"]')).toContainText(
        /contributions/i
      );
      
      // Confirm close
      await adminPage.click('[data-testid="confirm-close-period"]');
      
      // Wait for success
      await expect(adminPage.locator('[data-testid="toast"]')).toContainText(/closed/i);
      
      // Wait for status update
      await expect(openPeriod.locator('[data-testid="period-status"]')).toContainText('Closed');
      
      // Calculate allocations button should appear
      await expect(openPeriod.locator('[data-testid="calculate-allocations-button"]')).toBeVisible();
      
      // Click calculate allocations
      await openPeriod.locator('[data-testid="calculate-allocations-button"]').click();
      
      // Confirm calculation
      await adminPage.click('[data-testid="confirm-calculate"]');
      
      // Wait for calculation to complete
      await expect(adminPage.locator('[data-testid="toast"]')).toContainText(/calculated/i);
      
      await logout(adminPage);
      await adminContext.close();
    });
    
    // Phase 4: Member views allocation
    await test.step('Member views allocation', async () => {
      await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
      
      // Navigate to patronage
      await page.goto('/patronage');
      
      // Find closed period
      const closedPeriod = page.locator('[data-testid="period-card"][data-status="closed"]').first();
      await expect(closedPeriod).toBeVisible();
      
      // View allocation details
      await closedPeriod.locator('[data-testid="view-allocation-button"]').click();
      
      // Allocation modal appears
      await expect(page.locator('[data-testid="allocation-modal"]')).toBeVisible();
      
      // Verify allocation data
      await expect(page.locator('[data-testid="allocation-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="patronage-score"]')).toBeVisible();
      
      // Verify contribution included
      await expect(page.locator('[data-testid="contributions-included"]')).toContainText(
        'E2E test contribution'
      );
      
      // Close modal
      await page.click('[data-testid="close-modal"]');
      
      // Check dashboard for updated capital account
      await page.goto('/dashboard');
      
      // Capital account should reflect allocation
      const capitalAccountBalance = await page
        .locator('[data-testid="capital-account-balance"]')
        .textContent();
      expect(parseFloat(capitalAccountBalance?.replace(/[^0-9.]/g, '') || '0')).toBeGreaterThan(0);
      
      await logout(page);
    });
  });
  
  test('member cannot access admin operations', async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Try to navigate to admin-only page
    await page.goto('/patronage');
    
    // Close period button should not be visible to members
    const closePeriodButton = page.locator('[data-testid="close-period-button"]');
    await expect(closePeriodButton).not.toBeVisible();
    
    await logout(page);
  });
  
  test('member cannot access steward operations', async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Try to navigate to approvals page
    await page.goto('/approvals');
    
    // Should redirect to unauthorized or dashboard
    await expect(page).toHaveURL(/unauthorized|dashboard/);
    
    await logout(page);
  });
  
  test('member can view own contributions', async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    await page.goto('/contributions');
    
    // Should see contributions table
    await expect(page.locator('[data-testid="contributions-table"]')).toBeVisible();
    
    // Should have at least one contribution
    const rows = page.locator('[data-testid="contributions-table"] tbody tr');
    await expect(rows.first()).toBeVisible();
    
    await logout(page);
  });
  
  test('steward can approve contributions', async ({ page }) => {
    await login(page, STEWARD_EMAIL, STEWARD_PASSWORD);
    
    await page.goto('/approvals');
    
    // Approvals page should load
    await expect(page.locator('h1')).toContainText(/approvals/i);
    
    // Pending queue should be visible
    await expect(page.locator('[data-testid="pending-queue"]')).toBeVisible();
    
    await logout(page);
  });
  
  test('admin can close periods', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    
    await page.goto('/patronage');
    
    // Close period buttons should be visible for admins
    const openPeriods = page.locator('[data-testid="period-card"][data-status="open"]');
    const firstPeriod = openPeriods.first();
    
    if ((await openPeriods.count()) > 0) {
      await expect(firstPeriod.locator('[data-testid="close-period-button"]')).toBeVisible();
    }
    
    await logout(page);
  });
});

test.describe('Error Handling', () => {
  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid|incorrect/i);
    
    // Should stay on login page
    await expect(page).toHaveURL(/login/);
  });
  
  test('should handle network errors gracefully', async ({ page, context }) => {
    // Simulate offline
    await context.setOffline(true);
    
    await page.goto('/login');
    
    await page.fill('input[name="email"]', MEMBER_EMAIL);
    await page.fill('input[name="password"]', MEMBER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Should show network error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network|connection/i);
    
    // Restore connection
    await context.setOffline(false);
  });
  
  test('should handle validation errors on contribution form', async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    await page.goto('/contributions/new');
    
    // Try to submit without filling form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();
    
    // Try negative amount
    await page.fill('input[name="amount"]', '-100');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('[data-testid="amount-error"]')).toContainText(/positive|greater/i);
    
    await logout(page);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Dashboard should load
    await expect(page.locator('h1')).toContainText(/dashboard/i);
    
    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Click mobile menu
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Menu should open
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    await logout(page);
  });
  
  test('should display tables responsively', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    await page.goto('/contributions');
    
    // Table should be visible (may be scrollable)
    await expect(page.locator('[data-testid="contributions-table"]')).toBeVisible();
    
    await logout(page);
  });
});

test.describe('Real-Time Updates', () => {
  test('should show real-time contribution status updates', async ({ page, browser }) => {
    // Member submits contribution
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    await submitContribution(page, 'labor', '50.00', 'Real-time test contribution');
    
    // Stay on contributions page
    await page.goto('/contributions');
    
    // In parallel, steward approves
    const stewardContext = await browser.newContext();
    const stewardPage = await stewardContext.newPage();
    await login(stewardPage, STEWARD_EMAIL, STEWARD_PASSWORD);
    await stewardPage.goto('/approvals');
    
    const testContribution = stewardPage.locator(
      '[data-testid="pending-queue"] tr:has-text("Real-time test contribution")'
    );
    
    if ((await testContribution.count()) > 0) {
      await testContribution.locator('[data-testid="approve-button"]').click();
      await stewardPage.click('[data-testid="confirm-approve"]');
      
      // Wait for success
      await expect(stewardPage.locator('[data-testid="toast"]')).toContainText(/approved/i);
    }
    
    await stewardContext.close();
    
    // Member's page should update (via polling)
    // Wait for status to change from Pending to Approved
    await expect(
      page.locator('[data-testid="contributions-table"] tr:has-text("Real-time test contribution") [data-testid="status"]')
    ).toContainText('Approved', { timeout: 15000 });
    
    await logout(page);
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await login(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    
    // Check for h1
    await expect(page.locator('h1')).toBeVisible();
    
    await logout(page);
  });
  
  test('should have accessible forms', async ({ page }) => {
    await page.goto('/login');
    
    // Labels should be associated with inputs
    const emailInput = page.locator('input[name="email"]');
    const emailLabel = page.locator('label[for="email"]');
    
    await expect(emailLabel).toBeVisible();
    await expect(emailInput).toHaveAttribute('id', 'email');
  });
  
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form
    await page.keyboard.press('Tab'); // Focus email
    await page.keyboard.type(MEMBER_EMAIL);
    
    await page.keyboard.press('Tab'); // Focus password
    await page.keyboard.type(MEMBER_PASSWORD);
    
    await page.keyboard.press('Tab'); // Focus submit button
    await page.keyboard.press('Enter'); // Submit
    
    // Should login
    await page.waitForURL('/dashboard');
  });
});
