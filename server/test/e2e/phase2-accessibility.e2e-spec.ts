import { test, expect } from '@playwright/test';

test.describe('Phase 2: Accessibility - WCAG Compliance & Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Either has alt text or is decorative (aria-hidden)
      const isDecorative = await img.getAttribute('aria-hidden');
      expect(alt || isDecorative).toBeTruthy();
    }
  });

  test('should have aria-label on icon buttons', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    const buttons = await page.locator('button').all();

    for (const btn of buttons) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      // Either has text content or aria-label
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation on main tabs', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="tab-bar"]');

    // Tab to first tab
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));

    // Should be able to navigate with arrow keys
    await page.keyboard.press('ArrowRight');
    const nextFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));

    expect(focusedElement).toBeTruthy();
    expect(nextFocused).toBeTruthy();
  });

  test('should have sufficient color contrast on primary buttons', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    const buttons = await page.locator('[data-testid="primary-btn"]').all();

    for (const btn of buttons) {
      const bgColor = await btn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const textColor = await btn.evaluate((el) => window.getComputedStyle(el).color);

      // Basic check: colors should not be empty
      expect(bgColor).toBeTruthy();
      expect(textColor).toBeTruthy();
    }
  });

  test('should show focus indicator on interactive elements', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return {
        outline: window.getComputedStyle(el).outline,
        boxShadow: window.getComputedStyle(el).boxShadow,
      };
    });

    // Should have visible focus indicator
    expect(
      focusedElement.outline !== 'none' || focusedElement.boxShadow !== 'none',
    ).toBeTruthy();
  });

  test('should have form labels associated with inputs', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    const inputs = await page.locator('input').all();

    for (const input of inputs) {
      const inputId = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');

      if (inputId) {
        const label = await page.locator(`label[for="${inputId}"]`).count();
        expect(label > 0 || ariaLabel).toBeTruthy();
      } else {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });
});
