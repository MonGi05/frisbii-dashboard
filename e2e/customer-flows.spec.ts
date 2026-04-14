import { test as base, expect } from '@playwright/test';
import { mockFrisbiiApi } from './mocks/mock-api.setup';

// Wrap the base test: if running under the 'chromium-mocked' project,
// intercept all API calls before each test. Live project is untouched.
const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    if (testInfo.project.name === 'chromium-mocked') {
      await mockFrisbiiApi(context);
    }
    await use(context);
  },
});

test.describe('Customer list', () => {
  test('loads and displays customers', async ({ page }) => {
    await page.goto('/');

    // Root route redirects to /customers
    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByTestId('page-title')).toHaveText('Customers');

    // Table renders with at least one row from the API
    const firstRow = page.getByTestId('customer-table').locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
  });

  test('search filters results', async ({ page }) => {
    await page.goto('/customers');
    const firstRow = page.getByTestId('customer-table').locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const searchInput = page.getByTestId('customer-search-input');
    // Use a query unlikely to match anything to verify the empty state
    await searchInput.fill('zzz_nonexistent_handle_zzz');
    await expect(page.getByTestId('no-customers')).toBeVisible({ timeout: 5_000 });

    // Clear search restores the original list
    await page.getByTestId('search-clear-btn').click();
    const restoredRow = page.getByTestId('customer-table').locator('tbody tr').first();
    await expect(restoredRow).toBeVisible();
  });
});

test.describe('Customer detail', () => {
  test('navigates from list and shows detail sections', async ({ page }) => {
    await page.goto('/customers');
    const firstRow = page.getByTestId('customer-table').locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // URL changes to /customers/:handle
    await expect(page).toHaveURL(/\/customers\/.+/);

    // Breadcrumb and info card render
    await expect(page.getByTestId('breadcrumb')).toBeVisible();
    await expect(page.getByTestId('customer-info-card')).toBeVisible();
    await expect(page.getByTestId('customer-name')).not.toBeEmpty();

    // Subscriptions and invoices sections render (tables may be empty)
    await expect(page.getByTestId('subscriptions-section')).toBeVisible();
    await expect(page.getByTestId('invoices-section')).toBeVisible();
  });
});
