import { test, expect } from '@playwright/test';

test.describe('Data Synchronization E2E Tests', () => {
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

  test('should sync wallet balance between mine and wallet pages', async ({ page }) => {
    // 进入我的界面
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="wallet-balance"]');
    const mineBalance = await page.locator('[data-testid="wallet-balance"]').textContent();

    // 点击钱包按钮
    await page.click('[data-testid="wallet-btn"]');
    await page.waitForURL('**/wallet/wallet');
    await page.waitForSelector('[data-testid="balance-display"]');

    // 获取钱包界面余额
    const walletBalance = await page.locator('[data-testid="balance-display"]').textContent();

    // 验证一致性
    expect(mineBalance?.trim()).toBe(walletBalance?.trim());
  });

  test('should display consistent credit score in two locations', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="credit-score"]');

    // 获取两处信用分
    const creditScores = await page.locator('[data-testid="credit-score"]').allTextContents();

    expect(creditScores.length).toBeGreaterThanOrEqual(2);
    expect(creditScores[0]).toBe(creditScores[1]);
  });

  test('should display bean balance with two decimal places', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');
    await page.waitForSelector('[data-testid="bean-balance"]');

    const balance = await page.locator('[data-testid="bean-balance"]').textContent();
    expect(balance).toMatch(/^\d+\.\d{2}$/);
  });

  test('should display current balance in withdraw history', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');
    await page.waitForSelector('[data-testid="current-balance"]');

    const balance = await page.locator('[data-testid="current-balance"]').textContent();
    expect(balance).toMatch(/^\d+\.\d{2}$/);
  });

  test('should persist favorite status across navigation', async ({ page }) => {
    // 进入招工详情
    await page.goto('http://localhost:3000/pages/job-detail/job-detail?id=test-job-123');
    await page.waitForSelector('[data-testid="fav-btn"]');

    // 收藏
    const favBtn = page.locator('[data-testid="fav-btn"]');
    await favBtn.click();
    await page.waitForTimeout(500);

    let isFav = await favBtn.getAttribute('data-fav');
    expect(isFav).toBe('true');

    // 返回首页
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForTimeout(500);

    // 重新进入招工详情
    await page.goto('http://localhost:3000/pages/job-detail/job-detail?id=test-job-123');
    await page.waitForSelector('[data-testid="fav-btn"]');

    // 验证收藏状态仍然保持
    isFav = await favBtn.getAttribute('data-fav');
    expect(isFav).toBe('true');
  });

  test('should sync avatar between mine and settings pages', async ({ page }) => {
    // 在我的界面获取头像
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="user-avatar"]');
    const mineAvatar = await page.locator('[data-testid="user-avatar"]').getAttribute('src');

    // 进入设置界面
    await page.click('[data-testid="settings-btn"]');
    await page.waitForURL('**/settings/settings');
    await page.waitForSelector('[data-testid="user-avatar"]');

    // 获取设置界面头像
    const settingsAvatar = await page.locator('[data-testid="user-avatar"]').getAttribute('src');

    // 验证一致性
    expect(mineAvatar).toBe(settingsAvatar);
  });

  test('should display complete application information', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.waitForSelector('[data-testid="app-card"]');

    const appCard = page.locator('[data-testid="app-card"]').first();
    const location = await appCard.locator('[data-testid="location"]').textContent();
    const description = await appCard.locator('[data-testid="description"]').textContent();

    expect(location).toBeTruthy();
    expect(description).toBeTruthy();
  });
});
