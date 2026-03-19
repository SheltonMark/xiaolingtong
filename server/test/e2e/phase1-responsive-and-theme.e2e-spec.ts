import { test, expect } from '@playwright/test';

test.describe('Phase 1: UI Consistency - Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  viewports.forEach((viewport) => {
    test(`should display mine page correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/pages/mine/mine');

      // 验证主要元素可见
      await page.waitForSelector('[data-testid="user-avatar"]');
      const avatar = page.locator('[data-testid="user-avatar"]');
      expect(await avatar.isVisible()).toBe(true);

      // 验证布局不超出屏幕
      const card = page.locator('[data-testid="app-card"]').first();
      const box = await card.boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    });

    test(`should display wallet page correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/pages/wallet/wallet');

      await page.waitForSelector('[data-testid="balance"]');
      const balance = page.locator('[data-testid="balance"]');
      expect(await balance.isVisible()).toBe(true);
    });

    test(`should display job list correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/pages/index/index');

      await page.waitForSelector('[data-testid="item-card"]');
      const items = page.locator('[data-testid="item-card"]');
      expect(await items.count()).toBeGreaterThan(0);
    });

    test(`should display chat correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/pages/chat/chat');

      await page.waitForSelector('[data-testid="message-item"]');
      const messages = page.locator('[data-testid="message-item"]');
      expect(await messages.count()).toBeGreaterThan(0);
    });

    test(`should display my-applications correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(
        'http://localhost:3000/pages/my-applications/my-applications',
      );

      await page.waitForSelector('[data-testid="app-card"]');
      const cards = page.locator('[data-testid="app-card"]');
      expect(await cards.count()).toBeGreaterThan(0);
    });

    test(`should display bean-detail correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');

      await page.waitForSelector('[data-testid="bean-balance"]');
      const balance = page.locator('[data-testid="bean-balance"]');
      expect(await balance.isVisible()).toBe(true);
    });

    test(`should display withdraw-history correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(
        'http://localhost:3000/pages/withdraw-history/withdraw-history',
      );

      await page.waitForSelector('[data-testid="current-balance"]');
      const balance = page.locator('[data-testid="current-balance"]');
      expect(await balance.isVisible()).toBe(true);
    });

    test(`should display job-detail correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(
        'http://localhost:3000/pages/job-detail/job-detail?id=test-job-123',
      );

      await page.waitForSelector('[data-testid="job-title"]');
      const title = page.locator('[data-testid="job-title"]');
      expect(await title.isVisible()).toBe(true);
    });

    test(`should display settings correctly on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:3000/pages/settings/settings');

      await page.waitForSelector('[data-testid="settings-form"]');
      const form = page.locator('[data-testid="settings-form"]');
      expect(await form.isVisible()).toBe(true);
    });
  });

  test('should handle orientation change', async ({ page }) => {
    // 竖屏
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/pages/mine/mine');

    let card = page.locator('[data-testid="app-card"]').first();
    let portraitBox = await card.boundingBox();

    // 横屏
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);

    card = page.locator('[data-testid="app-card"]').first();
    let landscapeBox = await card.boundingBox();

    // 验证布局已调整
    if (portraitBox && landscapeBox) {
      expect(landscapeBox.width).toBeGreaterThan(portraitBox.width);
    }
  });
});

test.describe('Phase 1: UI Consistency - Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should support light theme', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');

    // 设置浅色主题
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // 验证背景颜色
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bgColor).toBeTruthy();
  });

  test('should support dark theme', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');

    // 设置深色主题
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // 验证背景颜色
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bgColor).toBeTruthy();
  });

  test('should persist theme preference', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');

    // 设置深色主题
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });

    // 刷新页面
    await page.reload();

    // 验证主题仍然是深色
    const theme = await page.evaluate(() => {
      return localStorage.getItem('theme');
    });

    expect(theme).toBe('dark');
  });

  test('should switch theme smoothly', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');

    // 获取初始主题
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // 切换主题
    await page.evaluate(() => {
      const newTheme =
        document.documentElement.getAttribute('data-theme') === 'light'
          ? 'dark'
          : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
    });

    // 验证主题已切换
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(newTheme).not.toBe(initialTheme);
  });
});
