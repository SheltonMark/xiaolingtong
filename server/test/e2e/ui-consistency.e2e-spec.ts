import { test, expect } from '@playwright/test';

test.describe('UI Consistency E2E Tests', () => {
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

  test('should not display "all" and "other" categories on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="category-item"]');

    const categories = await page.locator('[data-testid="category-item"]').allTextContents();
    expect(categories).not.toContain('全部');
    expect(categories).not.toContain('其他');
  });

  test('should load data for each category correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="category-item"]');

    const firstCategory = page.locator('[data-testid="category-item"]').first();
    await firstCategory.click();
    await page.waitForTimeout(500);

    const items = await page.locator('[data-testid="item-card"]').count();
    expect(items).toBeGreaterThan(0);
  });

  test('should display formatted time for each chat message', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForSelector('[data-testid="message-item"]');

    const messages = await page.locator('[data-testid="message-item"]').allTextContents();
    messages.forEach(msg => {
      // 验证时间格式: M月D日 HH:MM:SS
      expect(msg).toMatch(/\d{1,2}月\d{1,2}日 \d{2}:\d{2}:\d{2}/);
    });
  });

  test('should display consistent layout between mine and my-applications pages', async ({ page }) => {
    // 在我的应用界面获取布局
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.waitForSelector('[data-testid="app-card"]');
    const appCardLayout = await page.locator('[data-testid="app-card"]').first().boundingBox();

    // 在我的界面获取布局
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-applications"]');
    await page.waitForSelector('[data-testid="app-card"]');
    const mineAppCardLayout = await page.locator('[data-testid="app-card"]').first().boundingBox();

    // 验证高度和宽度相似（允许10px误差）
    if (appCardLayout && mineAppCardLayout) {
      expect(Math.abs(appCardLayout.height - mineAppCardLayout.height)).toBeLessThan(10);
      expect(Math.abs(appCardLayout.width - mineAppCardLayout.width)).toBeLessThan(10);
    }
  });

  test('should display favorites with consistent layout', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-favorites"]');
    await page.waitForSelector('[data-testid="fav-card"]');

    const favCard = page.locator('[data-testid="fav-card"]').first();
    const leftBorder = await favCard.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.borderLeft;
    });

    // 验证没有左边框
    expect(leftBorder).toBe('none');
  });

  test('should format bean balance to two decimal places', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');
    await page.waitForSelector('[data-testid="bean-balance"]');

    const balance = await page.locator('[data-testid="bean-balance"]').textContent();
    const totalIn = await page.locator('[data-testid="total-in"]').textContent();
    const totalOut = await page.locator('[data-testid="total-out"]').textContent();

    expect(balance).toMatch(/^\d+\.\d{2}$/);
    expect(totalIn).toMatch(/^\d+\.\d{2}$/);
    expect(totalOut).toMatch(/^\d+\.\d{2}$/);
  });

  test('should format wallet balance consistently', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/wallet/wallet');
    await page.waitForSelector('[data-testid="balance"]');

    const balance = await page.locator('[data-testid="balance"]').textContent();
    expect(balance).toMatch(/^¥\d+\.\d{2}$/);
  });

  test('should format withdraw history amounts correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');
    await page.waitForSelector('[data-testid="current-balance"]');

    const balance = await page.locator('[data-testid="current-balance"]').textContent();
    const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();

    expect(balance).toMatch(/^\d+\.\d{2}$/);
    expect(totalAmount).toMatch(/^\d+\.\d{2}$/);
  });
});
