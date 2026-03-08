import { test, expect } from './fixtures/api-client.fixture';

test.describe('Post Module E2E', () => {
  test('should create new post', async ({ apiClient, authToken }) => {
    const response = await apiClient.post('/posts', {
      title: 'Test Post',
      description: 'Test Description',
      category: 'procurement',
      budget: 5000,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toHaveProperty('postId');
  });

  test('should search posts by keyword', async ({ apiClient }) => {
    const response = await apiClient.get('/posts/search', {
      params: { keyword: 'test', category: 'procurement' },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  test('should filter posts by category', async ({ apiClient }) => {
    const response = await apiClient.get('/posts', {
      params: { category: 'factory_inventory', page: 1, limit: 10 },
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('items');
    expect(response.data.data).toHaveProperty('total');
  });

  test('should get post details', async ({ apiClient }) => {
    // 先创建一个 post
    const createResponse = await apiClient.post('/posts', {
      title: 'Detail Test',
      description: 'Test',
      category: 'procurement',
    });

    const postId = createResponse.data.data.postId;

    // 获取详情
    const response = await apiClient.get(`/posts/${postId}`);

    expect(response.status).toBe(200);
    expect(response.data.data.postId).toBe(postId);
  });

  test('should update post', async ({ apiClient, authToken }) => {
    const createResponse = await apiClient.post('/posts', {
      title: 'Update Test',
      description: 'Test',
      category: 'procurement',
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const postId = createResponse.data.data.postId;

    const response = await apiClient.put(`/posts/${postId}`, {
      title: 'Updated Title',
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
  });

  test('should delete post', async ({ apiClient, authToken }) => {
    const createResponse = await apiClient.post('/posts', {
      title: 'Delete Test',
      description: 'Test',
      category: 'procurement',
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const postId = createResponse.data.data.postId;

    const response = await apiClient.delete(`/posts/${postId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
  });
});
