import { test, expect } from '@playwright/test';

test.describe('Navigation and Interaction E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟登录状态
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should navigate to job detail when clicking application from my-applications', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.waitForSelector('[data-testid="app-card"]');

    const appCard = page.locator('[data-testid="app-card"]').first();
    const jobId = await appCard.getAttribute('data-id');

    await appCard.click();
    await page.waitForURL(`**/job-detail/job-detail?id=${jobId}`);

    expect(page.url()).toContain(`id=${jobId}`);
  });

  test('should navigate to job detail when clicking application from mine page', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-applications"]');
    await page.waitForSelector('[data-testid="app-card"]');

    const appCard = page.locator('[data-testid="app-card"]').first();
    const jobId = await appCard.getAttribute('data-id');

    await appCard.click();
    await page.waitForURL(`**/job-detail/job-detail?id=${jobId}`);

    expect(page.url()).toContain(`id=${jobId}`);
  });

  test('should navigate to bean detail when clicking bean balance', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="bean-btn"]');
    await page.waitForURL('**/bean-detail/bean-detail');

    expect(page.url()).toContain('bean-detail');
  });

  test('should navigate to wallet when clicking wallet balance', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="wallet-btn"]');
    await page.waitForURL('**/wallet/wallet');

    expect(page.url()).toContain('wallet');
  });

  test('should navigate to settings when clicking settings button', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="settings-btn"]');
    await page.waitForURL('**/settings/settings');

    expect(page.url()).toContain('settings');
  });

  test('should navigate to favorite detail when clicking favorite item', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-favorites"]');
    await page.waitForSelector('[data-testid="fav-card"]');

    const favCard = page.locator('[data-testid="fav-card"]').first();
    const targetId = await favCard.getAttribute('data-id');
    const targetType = await favCard.getAttribute('data-type');

    await favCard.click();

    // 根据类型验证导航
    if (targetType === 'job') {
      await page.waitForURL(`**/job-detail/job-detail?id=${targetId}`);
    } else if (targetType === 'post') {
      await page.waitForURL(`**/post-detail/post-detail?id=${targetId}`);
    }

    expect(page.url()).toContain(targetId);
  });

  test('should navigate to job detail from favorite in my-applications', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.click('[data-testid="tab-favorites"]');
    await page.waitForSelector('[data-testid="fav-card"]');

    const favCard = page.locator('[data-testid="fav-card"]').first();
    const targetId = await favCard.getAttribute('data-id');

    await favCard.click();
    await page.waitForURL(`**/job-detail/job-detail?id=${targetId}`);

    expect(page.url()).toContain(`id=${targetId}`);
  });
});
