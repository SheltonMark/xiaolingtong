import { test, expect } from './fixtures/api-client.fixture';

test.describe('Auth Module E2E', () => {
  test('should register new user', async ({ apiClient }) => {
    const response = await apiClient.post('/auth/register', {
      phone: '13800138001',
      password: 'password123',
      nickname: 'Test User',
    });

    expect(response.status).toBe(201);
    expect(response.data.data).toHaveProperty('userId');
    expect(response.data.data).toHaveProperty('token');
  });

  test('should login with valid credentials', async ({ apiClient }) => {
    const response = await apiClient.post('/auth/login', {
      phone: '13800138000',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('token');
  });

  test('should fail login with invalid credentials', async ({ apiClient }) => {
    const response = await apiClient.post('/auth/login', {
      phone: '13800138000',
      password: 'wrongpassword',
    });

    expect(response.status).toBe(401);
  });

  test('should refresh token', async ({ apiClient, authToken }) => {
    const response = await apiClient.post(
      '/auth/refresh',
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('token');
  });
});
