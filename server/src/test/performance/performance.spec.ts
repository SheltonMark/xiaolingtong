/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app.module';

describe('Performance Benchmarks', () => {
  let app: INestApplication;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup: Create test user
    const response = await app.get('/auth/register').send({
      openid: 'perf_test_user',
      nickname: 'Performance Test',
      role: 'worker',
    });

    token = response.body.token;
    userId = response.body.userId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Query Performance', () => {
    it('should list jobs in < 200ms', async () => {
      const start = performance.now();

      const response = await app
        .get('/jobs')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, pageSize: 100 });

      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it('should search jobs in < 300ms', async () => {
      const start = performance.now();

      const response = await app
        .get('/jobs')
        .set('Authorization', `Bearer ${token}`)
        .query({ keyword: 'construction', page: 1, pageSize: 50 });

      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300);
    });

    it('should get notifications in < 150ms', async () => {
      const start = performance.now();

      const response = await app
        .get('/notification')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, pageSize: 50 });

      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(150);
    });

    it('should get user history in < 250ms', async () => {
      const start = performance.now();

      const response = await app
        .get('/work/history')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, pageSize: 100 });

      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(250);
    });

    it('should aggregate analytics in < 500ms', async () => {
      const start = performance.now();

      const response = await app
        .get('/jobs/analytics')
        .set('Authorization', `Bearer ${token}`);

      const duration = performance.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle 10 concurrent list requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        app
          .get('/jobs')
          .set('Authorization', `Bearer ${token}`)
          .query({ page: 1, pageSize: 20 }),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
      expect(duration).toBeLessThan(1000);
    });

    it('should handle 5 concurrent job applications', async () => {
      const jobIds = [1, 2, 3, 4, 5];
      const promises = jobIds.map((jobId) =>
        app
          .post(`/jobs/${jobId}/apply`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      responses.forEach((response) => {
        expect([200, 400, 409]).toContain(response.status);
      });
      expect(duration).toBeLessThan(2000);
    });

    it('should handle 3 concurrent payment operations', async () => {
      const settlementIds = [1, 2, 3];
      const promises = settlementIds.map((id) =>
        app
          .post(`/settlement/${id}/pay`)
          .set('Authorization', `Bearer ${token}`)
          .send({}),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      responses.forEach((response) => {
        expect([200, 400, 403]).toContain(response.status);
      });
      expect(duration).toBeLessThan(3000);
    });

    it('should handle 5 concurrent file uploads', async () => {
      const promises = Array.from({ length: 5 }, () =>
        app
          .post('/upload')
          .set('Authorization', `Bearer ${token}`)
          .field('file', Buffer.from('test content')),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      responses.forEach((response) => {
        expect([200, 400]).toContain(response.status);
      });
      expect(duration).toBeLessThan(5000);
    });

    it('should handle 10 concurrent messages', async () => {
      const promises = Array.from({ length: 10 }, () =>
        app.post('/chat/send').set('Authorization', `Bearer ${token}`).send({
          recipientId: 1,
          content: 'Test message',
        }),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      responses.forEach((response) => {
        expect([200, 400]).toContain(response.status);
      });
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under high concurrent list load', async () => {
      const concurrency = 20;
      const promises = Array.from({ length: concurrency }, () =>
        app
          .get('/jobs')
          .set('Authorization', `Bearer ${token}`)
          .query({ page: 1, pageSize: 50 }),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(concurrency * 0.9);
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain performance under high concurrent search load', async () => {
      const concurrency = 15;
      const promises = Array.from({ length: concurrency }, () =>
        app
          .get('/jobs')
          .set('Authorization', `Bearer ${token}`)
          .query({ keyword: 'test', page: 1, pageSize: 50 }),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(concurrency * 0.9);
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain performance under high concurrent create load', async () => {
      const concurrency = 10;
      const promises = Array.from({ length: concurrency }, () =>
        app.post('/jobs').set('Authorization', `Bearer ${token}`).send({
          title: 'Test Job',
          description: 'Test',
          salary: 100,
          salaryType: 'hour',
          requiredWorkers: 5,
        }),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      const successCount = responses.filter((r) => r.status === 200).length;
      expect(successCount).toBeGreaterThan(concurrency * 0.8);
      expect(duration).toBeLessThan(5000);
    });

    it('should maintain performance under high concurrent update load', async () => {
      const concurrency = 10;
      const jobIds = Array.from({ length: concurrency }, (_, i) => i + 1);
      const promises = jobIds.map((jobId) =>
        app.put(`/jobs/${jobId}`).set('Authorization', `Bearer ${token}`).send({
          title: 'Updated Job',
          salary: 120,
        }),
      );

      const start = performance.now();
      const responses = await Promise.all(promises);
      const duration = performance.now() - start;

      const successCount = responses.filter((r) =>
        [200, 400, 403].includes(r.status),
      ).length;
      expect(successCount).toBeGreaterThan(concurrency * 0.8);
      expect(duration).toBeLessThan(5000);
    });

    it('should monitor memory usage during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const promises = Array.from({ length: 50 }, () =>
        app
          .get('/jobs')
          .set('Authorization', `Bearer ${token}`)
          .query({ page: 1, pageSize: 20 }),
      );

      await Promise.all(promises);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

      // Memory increase should be reasonable (< 50MB for 50 requests)
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});
