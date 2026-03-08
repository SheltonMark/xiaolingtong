import { test, expect } from '@playwright/test';

test.describe('Phase 2: Real-time Updates - WebSocket & Live Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should show new message in real time', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForSelector('[data-testid="chat-container"]');

    // Simulate incoming message
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('message', {
          detail: {
            type: 'new_message',
            data: { id: 1, content: 'Real-time message', senderId: 2 },
          },
        }),
      );
    });

    await page.waitForSelector('[data-testid="message-item"]');
    const messageText = await page.textContent('[data-testid="message-item"]');
    expect(messageText).toContain('Real-time message');
  });

  test('should update unread count when new message arrives', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    const initialBadge = await page.textContent('[data-testid="unread-badge"]');

    // Simulate incoming message
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('message', {
          detail: {
            type: 'new_message',
            data: { id: 1, content: 'New message', senderId: 2, isRead: false },
          },
        }),
      );
    });

    await page.waitForTimeout(500);
    const updatedBadge = await page.textContent('[data-testid="unread-badge"]');
    expect(updatedBadge).not.toEqual(initialBadge);
  });

  test('should show online status indicator', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForSelector('[data-testid="chat-header"]');

    // Simulate user online status
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('user-status', {
          detail: { userId: 2, status: 'online' },
        }),
      );
    });

    const statusIndicator = await page.locator('[data-testid="online-indicator"]');
    await expect(statusIndicator).toBeVisible();
  });

  test('should reconnect after connection drop', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForSelector('[data-testid="chat-container"]');

    // Simulate connection drop
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-lost'));
    });

    await page.waitForTimeout(500);

    // Simulate reconnection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-restored'));
    });

    const reconnectMessage = await page.locator('[data-testid="reconnect-message"]');
    await expect(reconnectMessage).not.toBeVisible();
  });

  test('should queue messages when offline', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');

    // Simulate offline
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-lost'));
    });

    // Try to send message
    await page.fill('[data-testid="message-input"]', 'Offline message');
    await page.click('[data-testid="send-btn"]');

    // Message should be queued
    const queuedMessage = await page.locator('[data-testid="queued-message"]');
    await expect(queuedMessage).toBeVisible();
  });

  test('should sync messages after reconnect', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');

    // Simulate offline
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('connection-lost'));
    });

    // Simulate reconnection with new messages
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('sync-messages', {
          detail: {
            messages: [
              { id: 1, content: 'Synced message 1', senderId: 2 },
              { id: 2, content: 'Synced message 2', senderId: 2 },
            ],
          },
        }),
      );
    });

    await page.waitForTimeout(500);
    const messages = await page.locator('[data-testid="message-item"]').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');

    // Simulate user typing
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('user-typing', {
          detail: { userId: 2, isTyping: true },
        }),
      );
    });

    const typingIndicator = await page.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible();
  });

  test('should handle multiple concurrent messages', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');

    // Simulate multiple messages arriving concurrently
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(
          new CustomEvent('message', {
            detail: {
              type: 'new_message',
              data: { id: i, content: `Message ${i}`, senderId: 2 },
            },
          }),
        );
      }
    });

    await page.waitForTimeout(500);
    const messages = await page.locator('[data-testid="message-item"]').count();
    expect(messages).toBeGreaterThanOrEqual(5);
  });
});
