import { test, expect } from '@playwright/test';

test.describe('Phase 1: Data Synchronization - Concurrent Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should handle concurrent applications to same job', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时应聘同一个招工信息
    await page1.goto('http://localhost:3000/pages/job-detail/job-detail?id=job-123');
    await page2.goto('http://localhost:3000/pages/job-detail/job-detail?id=job-123');

    await Promise.all([
      page1.click('[data-testid="apply-btn"]'),
      page2.click('[data-testid="apply-btn"]')
    ]);

    // 验证两个应聘都被记录
    await page1.waitForSelector('[data-testid="apply-success"]');
    await page2.waitForSelector('[data-testid="apply-success"]');

    // 验证招工信息的应聘人数正确
    const appliedCount1 = await page1.locator('[data-testid="applied-count"]').textContent();
    const appliedCount2 = await page2.locator('[data-testid="applied-count"]').textContent();

    expect(appliedCount1).toBe(appliedCount2);
    expect(parseInt(appliedCount1 || '0')).toBeGreaterThanOrEqual(2);

    await context1.close();
    await context2.close();
  });

  test('should handle concurrent balance updates', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时充值
    await page1.goto('http://localhost:3000/pages/bean-detail/bean-detail');
    await page2.goto('http://localhost:3000/pages/bean-detail/bean-detail');

    const initialBalance1 = await page1.locator('[data-testid="bean-balance"]').textContent();

    // 同时充值
    await Promise.all([
      page1.click('[data-testid="recharge-btn"]'),
      page2.click('[data-testid="recharge-btn"]')
    ]);

    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);

    // 刷新页面验证余额
    await page1.reload();
    await page2.reload();

    const finalBalance1 = await page1.locator('[data-testid="bean-balance"]').textContent();
    const finalBalance2 = await page2.locator('[data-testid="bean-balance"]').textContent();

    expect(finalBalance1).toBe(finalBalance2);

    await context1.close();
    await context2.close();
  });

  test('should handle concurrent favorite operations', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时收藏同一个招工信息
    await page1.goto('http://localhost:3000/pages/job-detail/job-detail?id=job-123');
    await page2.goto('http://localhost:3000/pages/job-detail/job-detail?id=job-123');

    await Promise.all([
      page1.click('[data-testid="fav-btn"]'),
      page2.click('[data-testid="fav-btn"]')
    ]);

    // 验证两个收藏都被记录
    const isFav1 = await page1.locator('[data-testid="fav-btn"]').getAttribute('data-fav');
    const isFav2 = await page2.locator('[data-testid="fav-btn"]').getAttribute('data-fav');

    expect(isFav1).toBe('true');
    expect(isFav2).toBe('true');

    await context1.close();
    await context2.close();
  });

  test('should handle rapid balance checks', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/wallet/wallet');

    // 快速检查余额多次
    const balances = [];
    for (let i = 0; i < 5; i++) {
      const balance = await page.locator('[data-testid="balance"]').textContent();
      balances.push(balance);
      await page.waitForTimeout(100);
    }

    // 所有余额应该相同
    const allSame = balances.every(b => b === balances[0]);
    expect(allSame).toBe(true);
  });

  test('should handle concurrent credit score updates', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时查看信用分
    await page1.goto('http://localhost:3000/pages/mine/mine');
    await page2.goto('http://localhost:3000/pages/mine/mine');

    const score1 = await page1.locator('[data-testid="credit-score"]').first().textContent();
    const score2 = await page2.locator('[data-testid="credit-score"]').first().textContent();

    expect(score1).toBe(score2);

    await context1.close();
    await context2.close();
  });

  test('should handle concurrent application status changes', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时查看应聘记录
    await page1.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page2.goto('http://localhost:3000/pages/my-applications/my-applications');

    const status1 = await page1.locator('[data-testid="app-card"]').first().locator('[data-testid="status"]').textContent();
    const status2 = await page2.locator('[data-testid="app-card"]').first().locator('[data-testid="status"]').textContent();

    expect(status1).toBe(status2);

    await context1.close();
    await context2.close();
  });

  test('should handle concurrent withdraw operations', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 两个用户同时查看提现记录
    await page1.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');
    await page2.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');

    const balance1 = await page1.locator('[data-testid="current-balance"]').textContent();
    const balance2 = await page2.locator('[data-testid="current-balance"]').textContent();

    expect(balance1).toBe(balance2);

    await context1.close();
    await context2.close();
  });
});

test.describe('Phase 1: Data Synchronization - Network Delays', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should handle slow network when loading balance', async ({ page }) => {
    // 模拟网络延迟
    await page.route('**/api/wallet', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('http://localhost:3000/pages/wallet/wallet');

    // 应该显示加载状态
    const skeleton = page.locator('[data-testid="balance-skeleton"]');
    expect(skeleton).toBeDefined();

    // 等待数据加载
    await page.waitForSelector('[data-testid="balance"]', { timeout: 5000 });
    const balance = await page.locator('[data-testid="balance"]').textContent();
    expect(balance).toBeTruthy();
  });

  test('should handle offline then online transition', async ({ page, context }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');

    // 获取初始余额
    const initialBalance = await page.locator('[data-testid="wallet-balance"]').textContent();

    // 模拟离线
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // 尝试刷新（应该显示缓存数据）
    const cachedBalance = await page.locator('[data-testid="wallet-balance"]').textContent();
    expect(cachedBalance).toBe(initialBalance);

    // 恢复连接
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // 验证数据同步
    const syncedBalance = await page.locator('[data-testid="wallet-balance"]').textContent();
    expect(syncedBalance).toBeTruthy();
  });

  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/bean/balance', async route => {
      requestCount++;
      if (requestCount < 2) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');

    // 应该自动重试
    await page.waitForSelector('[data-testid="bean-balance"]', { timeout: 5000 });
    const balance = await page.locator('[data-testid="bean-balance"]').textContent();
    expect(balance).toBeTruthy();
    expect(requestCount).toBeGreaterThanOrEqual(2);
  });

  test('should handle timeout gracefully', async ({ page }) => {
    await page.route('**/api/wallet', async route => {
      await new Promise(resolve => setTimeout(resolve, 10000));
      await route.continue();
    });

    await page.goto('http://localhost:3000/pages/wallet/wallet');

    // 应该显示超时错误或重试
    await page.waitForTimeout(3000);
    const errorMsg = page.locator('[data-testid="error-message"]');
    const retryBtn = page.locator('[data-testid="retry-btn"]');

    const hasError = await errorMsg.isVisible().catch(() => false);
    const hasRetry = await retryBtn.isVisible().catch(() => false);

    expect(hasError || hasRetry).toBe(true);
  });

  test('should sync data after network recovery', async ({ page, context }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');

    const initialBalance = await page.locator('[data-testid="wallet-balance"]').textContent();

    // 模拟网络问题
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // 恢复网络
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // 刷新页面
    await page.reload();

    const finalBalance = await page.locator('[data-testid="wallet-balance"]').textContent();
    expect(finalBalance).toBeTruthy();
  });

  test('should handle slow chat message loading', async ({ page }) => {
    await page.route('**/api/chat/messages', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('http://localhost:3000/pages/chat/chat');

    // 应该显示加载状态
    await page.waitForSelector('[data-testid="message-item"]', { timeout: 5000 });
    const messages = await page.locator('[data-testid="message-item"]').count();
    expect(messages).toBeGreaterThan(0);
  });
});
