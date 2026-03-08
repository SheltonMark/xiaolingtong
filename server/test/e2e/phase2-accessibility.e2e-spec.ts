import axios from 'axios';

describe('Phase 2: API Response Validation - Data Integrity & Structure (e2e)', () => {
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

  it('should return valid user profile structure', async () => {
    const response = await apiClient.get('/user/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const user = response.data.data;

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('nickname');
    expect(user).toHaveProperty('role');
  });

  it('should return valid conversation list structure', async () => {
    const response = await apiClient.get('/chat/conversations', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);

    response.data.data.forEach((conv: any) => {
      expect(conv).toHaveProperty('id');
      expect(conv).toHaveProperty('otherUserId');
      expect(conv).toHaveProperty('name');
      expect(conv).toHaveProperty('unreadCount');
    });
  });

  it('should return valid message structure', async () => {
    const convResponse = await apiClient.get('/chat/conversations', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (convResponse.data.data.length > 0) {
      const conversationId = convResponse.data.data[0].id;

      const msgResponse = await apiClient.get(
        `/chat/messages/${conversationId}?page=1&pageSize=10`,
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      expect(msgResponse.status).toBe(200);
      const messages = msgResponse.data.data.list || [];

      messages.forEach((msg: any) => {
        expect(msg).toHaveProperty('id');
        expect(msg).toHaveProperty('conversationId');
        expect(msg).toHaveProperty('senderId');
        expect(msg).toHaveProperty('content');
        expect(msg).toHaveProperty('type');
      });
    }
  });

  it('should return valid wallet balance structure', async () => {
    const response = await apiClient.get('/wallet/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const wallet = response.data.data;

    expect(wallet).toHaveProperty('balance');
    expect(typeof wallet.balance).toBe('number');
  });

  it('should return valid bean balance structure', async () => {
    const response = await apiClient.get('/bean/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const bean = response.data.data;

    expect(bean).toHaveProperty('beanBalance');
    expect(typeof bean.beanBalance).toBe('number');
  });

  it('should return paginated results with metadata', async () => {
    const response = await apiClient.get('/wallet/transactions?page=1&pageSize=10', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const data = response.data.data;

    expect(data).toHaveProperty('list');
    expect(Array.isArray(data.list)).toBe(true);
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('pageSize');
  });

  it('should handle missing optional fields gracefully', async () => {
    const response = await apiClient.get('/user/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const user = response.data.data;

    expect(user).toBeDefined();
    expect(typeof user).toBe('object');
  });
});
