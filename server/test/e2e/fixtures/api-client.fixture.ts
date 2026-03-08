import { test as base, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

type APIFixtures = {
  apiClient: AxiosInstance;
  authToken: string;
};

export const test = base.extend<APIFixtures>({
  apiClient: async ({ baseURL }, use) => {
    const client = axios.create({
      baseURL: baseURL || 'http://localhost:3000/api',
      validateStatus: () => true,
    });
    await use(client);
  },

  authToken: async ({ apiClient }, use) => {
    const response = await apiClient.post('/auth/login', {
      phone: '13800138000',
      password: 'password123',
    });
    const token = response.data.data?.token || '';
    await use(token);
  },
});

export { expect };
