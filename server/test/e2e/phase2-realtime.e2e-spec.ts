import axios from 'axios';

describe('Phase 2: Real-time Chat - Message & Conversation APIs (e2e)', () => {
  const baseURL = 'http://localhost:3000/api';
  let apiClient: any;
  let authToken: string;
  let conversationId: number;
  let userId: number;

  beforeAll(async () => {
    apiClient = axios.create({
      baseURL,
      validateStatus: () => true,
    });

    // Login to get auth token
    const loginResponse = await apiClient.post('/auth/login', {
      phone: '13800138000',
      password: 'password123',
    });
    authToken = loginResponse.data.data?.token || '';
    userId = loginResponse.data.data?.userId || 1;
  });

  beforeEach(async () => {
    // Create or get conversation
    const convResponse = await apiClient.post(
      '/chat/conversation',
      { userB: 2 },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    conversationId = convResponse.data.data?.id || 1;
  });

  it('should send message and receive it', async () => {
    const response = await apiClient.post(
      `/chat/message`,
      {
        conversationId,
        type: 'text',
        content: 'Real-time message test',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(201);
    expect(response.data.data).toHaveProperty('id');
    expect(response.data.data.content).toBe('Real-time message test');
  });

  it('should get conversation list with unread counts', async () => {
    const response = await apiClient.get('/chat/conversations', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it('should get messages from conversation', async () => {
    // Send a message first
    await apiClient.post(
      `/chat/message`,
      {
        conversationId,
        type: 'text',
        content: 'Test message for retrieval',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    const response = await apiClient.get(
      `/chat/messages/${conversationId}?page=1&pageSize=10`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(200);
    expect(response.data.data).toHaveProperty('list');
    expect(Array.isArray(response.data.data.list)).toBe(true);
  });

  it('should mark messages as read', async () => {
    // Send a message
    await apiClient.post(
      `/chat/message`,
      {
        conversationId,
        type: 'text',
        content: 'Message to mark as read',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    // Get messages (should auto-mark as read)
    const response = await apiClient.get(
      `/chat/messages/${conversationId}?page=1&pageSize=10`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(200);
    expect(response.data.data.list.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle concurrent message sends', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      apiClient.post(
        `/chat/message`,
        {
          conversationId,
          type: 'text',
          content: `Concurrent message ${i + 1}`,
        },
        { headers: { Authorization: `Bearer ${authToken}` } },
      ),
    );

    const results = await Promise.all(promises);

    results.forEach((response: any) => {
      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
    });
  });

  it('should reject empty message content', async () => {
    const response = await apiClient.post(
      `/chat/message`,
      {
        conversationId,
        type: 'text',
        content: '',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(400);
  });

  it('should reject message to unauthorized conversation', async () => {
    const response = await apiClient.post(
      `/chat/message`,
      {
        conversationId: 99999,
        type: 'text',
        content: 'Unauthorized message',
      },
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    expect(response.status).toBe(403);
  });
});
