import axios from 'axios';

describe('Phase 2: Error Handling & Recovery - API Error Responses (e2e)', () => {
  const baseURL = 'http://localhost:3000/api';
  let apiClient: any;
  let authToken: string;

  beforeAll(async () => {
    apiClient = axios.create({
      baseURL,
      validateStatus: () => true,
    });

    const loginResponse = await apiClient.post('/auth/login', {
      phone: '13800138000',
      password: 'password123',
    });
    authToken = loginResponse.data.data?.token || '';
  });

  it('should return 400 for invalid request parameters', async () => {
    const response = await apiClient.post(
      '/chat/message',
      {
        conversationId: 'invalid',
        type: 'text',
        content: 'Test',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(400);
  });

  it('should return 401 for missing authentication', async () => {
    const response = await apiClient.get('/user/profile');

    expect(response.status).toBe(401);
  });

  it('should return 403 for unauthorized access', async () => {
    const response = await apiClient.get(
      '/chat/messages/99999?page=1&pageSize=10',
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status).toBe(403);
  });

  it('should return 404 for non-existent resource', async () => {
    const response = await apiClient.get('/user/99999', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(404);
  });

  it('should return error message with details', async () => {
    const response = await apiClient.post(
      '/chat/message',
      {
        conversationId: 1,
        type: 'text',
        content: '',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('message');
  });

  it('should handle concurrent requests gracefully', async () => {
    const promises = Array.from({ length: 10 }, () =>
      apiClient.get('/user/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    );

    const results = await Promise.all(promises);

    results.forEach((response: any) => {
      expect(response.status).toBe(200);
    });
  });

  it('should validate request body schema', async () => {
    const response = await apiClient.post(
      '/chat/message',
      {
        type: 'text',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(400);
  });

  it('should handle empty response gracefully', async () => {
    const response = await apiClient.get('/chat/conversations', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it('should return consistent error format', async () => {
    const response = await apiClient.get('/user/profile');

    expect(response.status).toBe(401);
    expect(response.data).toHaveProperty('message');
  });
});
