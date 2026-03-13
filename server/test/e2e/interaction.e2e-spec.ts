import { test, expect } from './fixtures/api-client.fixture';

test.describe('User Interaction E2E', () => {
  test('should add post to favorites', async ({ apiClient, authToken }) => {
    const postResponse = await apiClient.post(
      '/posts',
      {
        title: 'Favorite Test',
        description: 'Test',
        category: 'procurement',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    const postId = postResponse.data.data.postId;

    const response = await apiClient.post(
      `/favorites`,
      {
        postId,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(201);
  });

  test('should get user favorites', async ({ apiClient, authToken }) => {
    const response = await apiClient.get('/favorites', {
      params: { page: 1, limit: 10 },
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('items');
  });

  test('should send message', async ({ apiClient, authToken }) => {
    const response = await apiClient.post(
      '/messages',
      {
        recipientId: 'user123',
        content: 'Test message',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(201);
    expect(response.data.data).toHaveProperty('messageId');
  });

  test('should get user messages', async ({ apiClient, authToken }) => {
    const response = await apiClient.get('/messages', {
      params: { page: 1, limit: 20 },
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data.items)).toBe(true);
  });

  test('should rate user', async ({ apiClient, authToken }) => {
    const response = await apiClient.post(
      '/ratings',
      {
        targetUserId: 'user123',
        score: 5,
        comment: 'Great seller',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(201);
  });

  test('should get user profile', async ({ apiClient, authToken }) => {
    const response = await apiClient.get('/users/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('userId');
    expect(response.data.data).toHaveProperty('nickname');
  });

  test('should update user profile', async ({ apiClient, authToken }) => {
    const response = await apiClient.put(
      '/users/profile',
      {
        nickname: 'Updated Name',
        bio: 'Updated bio',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(200);
  });
});
