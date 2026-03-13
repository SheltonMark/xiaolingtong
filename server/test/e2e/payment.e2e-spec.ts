import { test, expect } from './fixtures/api-client.fixture';

test.describe('Payment Module E2E', () => {
  test('should create payment order', async ({ apiClient, authToken }) => {
    const response = await apiClient.post(
      '/payments/orders',
      {
        amount: 100,
        description: 'Test Payment',
        type: 'unlock_post',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(201);
    expect(response.data.data).toHaveProperty('orderId');
    expect(response.data.data).toHaveProperty('paymentUrl');
  });

  test('should get wallet balance', async ({ apiClient, authToken }) => {
    const response = await apiClient.get('/wallet/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('balance');
    expect(typeof response.data.data.balance).toBe('number');
  });

  test('should get wallet transactions', async ({ apiClient, authToken }) => {
    const response = await apiClient.get('/wallet/transactions', {
      params: { page: 1, limit: 10 },
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data.items)).toBe(true);
  });

  test('should unlock post with beans', async ({ apiClient, authToken }) => {
    // 先创建一个 post
    const postResponse = await apiClient.post(
      '/posts',
      {
        title: 'Unlock Test',
        description: 'Test',
        category: 'procurement',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    const postId = postResponse.data.data.postId;

    // 解锁 post
    const response = await apiClient.post(
      `/posts/${postId}/unlock`,
      {
        beanAmount: 10,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(200);
  });
});
