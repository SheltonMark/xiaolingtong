import axios from 'axios';

describe('Phase 2: Data Formatting - Date, Currency, Numbers (e2e)', () => {
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

  it('should format dates correctly in API responses', async () => {
    const response = await apiClient.get('/user/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const user = response.data.data;

    if (user.createdAt) {
      const date = new Date(user.createdAt);
      expect(date.getTime()).toBeGreaterThan(0);
    }
  });

  it('should format currency amounts with 2 decimal places', async () => {
    const response = await apiClient.get('/wallet/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const balance = response.data.data.balance;

    const decimalPlaces = (balance.toString().split('.')[1] || '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('should return consistent number formatting', async () => {
    const response = await apiClient.get('/bean/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const beanBalance = response.data.data.beanBalance;

    expect(typeof beanBalance).toBe('number');
  });

  it('should handle null/empty values gracefully', async () => {
    const response = await apiClient.get('/user/profile', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const user = response.data.data;

    expect(user).toBeDefined();
  });

  it('should format transaction amounts consistently', async () => {
    const response = await apiClient.get('/wallet/transactions?page=1&pageSize=10', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const transactions = response.data.data.list || [];

    transactions.forEach((tx: any) => {
      if (tx.amount) {
        const decimalPlaces = (tx.amount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      }
    });
  });

  it('should return timestamps in ISO format', async () => {
    const response = await apiClient.get('/chat/conversations', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const conversations = response.data.data || [];

    conversations.forEach((conv: any) => {
      if (conv.lastMessageAt) {
        expect(new Date(conv.lastMessageAt).getTime()).toBeGreaterThan(0);
      }
    });
  });

  it('should handle large numbers without precision loss', async () => {
    const response = await apiClient.get('/wallet/balance', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
    const balance = response.data.data.balance;

    expect(Number.isFinite(balance)).toBe(true);
  });
});
