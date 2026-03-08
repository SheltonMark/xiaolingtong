import { test, expect } from '@playwright/test';

test.describe('Phase 2: Error Handling & Recovery - Error Pages & Retry Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should show error state when API returns 500', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForTimeout(1000);

    const errorMessage = await page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
  });

  test('should show not-found state for invalid job id', async ({ page }) => {
    await page.route('**/api/job/99999', (route) => {
      route.abort('failed');
    });

    await page.goto('http://localhost:3000/pages/job-detail/job-detail?id=99999');
    await page.waitForTimeout(1000);

    const notFoundMessage = await page.locator('[data-testid="not-found-message"]');
    await expect(notFoundMessage).toBeVisible();
  });

  test('should show retry button on network error', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForTimeout(500);

    const retryButton = await page.locator('[data-testid="retry-btn"]');
    await expect(retryButton).toBeVisible();

    await retryButton.click();
    await page.waitForTimeout(500);

    // After retry, content should load
    const content = await page.locator('[data-testid="content"]');
    await expect(content).toBeVisible();
  });

  test('should redirect to login when token is invalid', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForURL('**/login/**');

    expect(page.url()).toContain('login');
  });

  test('should show empty state when list is empty', async ({ page }) => {
    await page.route('**/api/conversations', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForTimeout(500);

    const emptyState = await page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();

    const emptyMessage = await emptyState.textContent();
    expect(emptyMessage).toContain('暂无');
  });

  test('should recover gracefully after error', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount <= 2) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForTimeout(500);

    // Should show error
    const errorMessage = await page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();

    // Click retry multiple times
    const retryButton = await page.locator('[data-testid="retry-btn"]');
    await retryButton.click();
    await page.waitForTimeout(500);
    await retryButton.click();
    await page.waitForTimeout(500);

    // Eventually should recover
    const content = await page.locator('[data-testid="content"]');
    await expect(content).toBeVisible();
  });
});
