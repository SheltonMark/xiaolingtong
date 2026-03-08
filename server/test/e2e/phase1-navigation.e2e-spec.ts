import { test, expect } from '@playwright/test';

test.describe('Phase 1: Navigation - Back Button Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should navigate back from job detail to list', async ({ page }) => {
    // 进入列表
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="item-card"]');

    // 进入详情
    await page.click('[data-testid="item-card"]');
    await page.waitForURL('**/job-detail/**');

    // 点击返回
    await page.click('[data-testid="back-btn"]');
    await page.waitForURL('**/index/index');

    expect(page.url()).toContain('index');
  });

  test('should navigate back from mine to index', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.click('[data-testid="tab-mine"]');
    await page.waitForURL('**/mine/mine');

    // 点击返回
    await page.click('[data-testid="back-btn"]');
    await page.waitForURL('**/index/index');

    expect(page.url()).toContain('index');
  });

  test('should navigate back from wallet to mine', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="wallet-btn"]');
    await page.waitForURL('**/wallet/wallet');

    // 点击返回
    await page.click('[data-testid="back-btn"]');
    await page.waitForURL('**/mine/mine');

    expect(page.url()).toContain('mine');
  });

  test('should navigate back from bean-detail to mine', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="bean-btn"]');
    await page.waitForURL('**/bean-detail/bean-detail');

    // 点击返回
    await page.click('[data-testid="back-btn"]');
    await page.waitForURL('**/mine/mine');

    expect(page.url()).toContain('mine');
  });

  test('should navigate back from settings to mine', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="settings-btn"]');
    await page.waitForURL('**/settings/settings');

    // 点击返回
    await page.click('[data-testid="back-btn"]');
    await page.waitForURL('**/mine/mine');

    expect(page.url()).toContain('mine');
  });

  test('should restore scroll position on back', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');

    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // 进入详情
    await page.click('[data-testid="item-card"]');
    await page.waitForURL('**/job-detail/**');

    // 返回
    await page.click('[data-testid="back-btn"]');
    await page.waitForURL('**/index/index');

    // 验证滚动位置（可能不完全相同，但应该接近）
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollBefore - scrollAfter)).toBeLessThan(100);
  });
});

test.describe('Phase 1: Navigation - Deep Linking', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should access job detail directly via deep link', async ({ page }) => {
    const jobId = 'test-job-123';
    await page.goto(`http://localhost:3000/pages/job-detail/job-detail?id=${jobId}`);

    await page.waitForSelector('[data-testid="job-title"]');
    const title = page.locator('[data-testid="job-title"]');
    expect(await title.isVisible()).toBe(true);
  });

  test('should access wallet directly via deep link', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/wallet/wallet');

    await page.waitForSelector('[data-testid="balance"]');
    const balance = page.locator('[data-testid="balance"]');
    expect(await balance.isVisible()).toBe(true);
  });

  test('should access bean-detail directly via deep link', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');

    await page.waitForSelector('[data-testid="bean-balance"]');
    const balance = page.locator('[data-testid="bean-balance"]');
    expect(await balance.isVisible()).toBe(true);
  });

  test('should access my-applications directly via deep link', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');

    await page.waitForSelector('[data-testid="app-card"]');
    const cards = page.locator('[data-testid="app-card"]');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('should access withdraw-history directly via deep link', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');

    await page.waitForSelector('[data-testid="current-balance"]');
    const balance = page.locator('[data-testid="current-balance"]');
    expect(await balance.isVisible()).toBe(true);
  });

  test('should handle invalid job id in deep link', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/job-detail/job-detail?id=invalid-id');

    // 应该显示错误或加载失败
    const errorMsg = page.locator('[data-testid="error-message"]');
    const notFound = page.locator('[data-testid="not-found"]');

    const hasError = await errorMsg.isVisible().catch(() => false);
    const hasNotFound = await notFound.isVisible().catch(() => false);

    expect(hasError || hasNotFound).toBe(true);
  });
});
