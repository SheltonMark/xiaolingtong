import { test, expect } from '@playwright/test';

test.describe('Phase 2: Internationalization & Formatting - Date, Currency, Numbers', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should display dates in Chinese format (YYYY年MM月DD日)', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="date-display"]');

    const dateText = await page.textContent('[data-testid="date-display"]');
    expect(dateText).toMatch(/\d{4}年\d{2}月\d{2}日/);
  });

  test('should display relative time correctly (刚刚/X分钟前/X小时前)', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForSelector('[data-testid="message-time"]');

    const timeText = await page.textContent('[data-testid="message-time"]');
    expect(
      timeText?.includes('刚刚') ||
        timeText?.includes('分钟前') ||
        timeText?.includes('小时前') ||
        timeText?.includes('天前'),
    ).toBeTruthy();
  });

  test('should format currency with 2 decimal places', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/wallet/wallet');
    await page.waitForSelector('[data-testid="balance-display"]');

    const balanceText = await page.textContent('[data-testid="balance-display"]');
    expect(balanceText).toMatch(/¥\d+\.\d{2}/);
  });

  test('should display large numbers with thousand separators', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/wallet/wallet');
    await page.waitForSelector('[data-testid="transaction-amount"]');

    const amountText = await page.textContent('[data-testid="transaction-amount"]');
    // Check for comma or Chinese thousand separator
    if (amountText && parseInt(amountText.replace(/[^\d]/g, '')) > 999) {
      expect(amountText).toMatch(/\d{1,3}(,|\s)\d{3}/);
    }
  });

  test('should format phone numbers correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="phone-display"]');

    const phoneText = await page.textContent('[data-testid="phone-display"]');
    // Chinese phone format: 1XX XXXX XXXX or similar
    expect(phoneText).toMatch(/1\d{2}\s?\d{4}\s?\d{4}/);
  });

  test('should display status labels in Chinese', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="status-label"]');

    const statusText = await page.textContent('[data-testid="status-label"]');
    const validStatuses = ['进行中', '已完成', '已取消', '待审核', '已发布'];
    expect(validStatuses.some((status) => statusText?.includes(status))).toBeTruthy();
  });

  test('should handle empty/null values with placeholder text', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="optional-field"]');

    const fieldText = await page.textContent('[data-testid="optional-field"]');
    expect(
      fieldText?.includes('未设置') ||
        fieldText?.includes('暂无') ||
        fieldText?.includes('-') ||
        fieldText?.includes('N/A'),
    ).toBeTruthy();
  });
});
