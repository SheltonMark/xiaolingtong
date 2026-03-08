/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app.module';

describe('E2E: Complete User Workflows', () => {
  let app: INestApplication;
  let workerToken: string;
  let enterpriseToken: string;
  let workerId: number;
  let enterpriseId: number;
  let jobId: number;
  let applicationId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Worker Job Application Workflow', () => {
    it('should register worker and obtain token', async () => {
      const response = await app
        .get('/auth/register')
        .send({
          openid: 'worker_openid_123',
          nickname: 'Worker User',
          role: 'worker',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('userId');

      workerToken = response.body.token;
      workerId = response.body.userId;
    });

    it('should browse available jobs', async () => {
      const response = await app
        .get('/jobs')
        .set('Authorization', `Bearer ${workerToken}`)
        .query({ page: 1, pageSize: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(Array.isArray(response.body.list)).toBe(true);
    });

    it('should apply for a job', async () => {
      // First create a job as enterprise
      const jobResponse = await app
        .post('/jobs')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({
          title: 'Construction Work',
          description: 'Building construction',
          salary: 100,
          salaryType: 'hour',
          requiredWorkers: 5,
        });

      jobId = jobResponse.body.id;

      // Then apply as worker
      const response = await app
        .post(`/jobs/${jobId}/apply`)
        .set('Authorization', `Bearer ${workerToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('applicationId');

      applicationId = response.body.applicationId;
    });

    it('should check in to work', async () => {
      const response = await app
        .post('/work/checkin')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          jobId,
          type: 'location',
          lat: 39.9,
          lng: 116.4,
          photoUrl: 'https://example.com/photo.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checkInAt');
    });

    it('should submit work log', async () => {
      const response = await app
        .post('/work/submit-log')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          jobId,
          hours: 8,
          pieces: 0,
          date: new Date().toISOString().slice(0, 10),
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    it('should receive payment', async () => {
      const response = await app
        .get(`/settlement/${jobId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('workerTotal');
    });

    it('should rate enterprise', async () => {
      const response = await app
        .post('/rating')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          jobId,
          enterpriseId,
          score: 5,
          tags: ['professional', 'punctual'],
          content: 'Great experience working here',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    it('should view work history', async () => {
      const response = await app
        .get('/work/history')
        .set('Authorization', `Bearer ${workerToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(Array.isArray(response.body.list)).toBe(true);
    });
  });

  describe('Enterprise Job Management Workflow', () => {
    it('should register enterprise and obtain token', async () => {
      const response = await app
        .get('/auth/register')
        .send({
          openid: 'enterprise_openid_456',
          nickname: 'Enterprise User',
          role: 'enterprise',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');

      enterpriseToken = response.body.token;
      enterpriseId = response.body.userId;
    });

    it('should post a job', async () => {
      const response = await app
        .post('/jobs')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({
          title: 'Factory Assembly',
          description: 'Assembly line work',
          salary: 80,
          salaryType: 'hour',
          requiredWorkers: 10,
          location: 'Beijing',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');

      jobId = response.body.id;
    });

    it('should review job applications', async () => {
      const response = await app
        .get(`/jobs/${jobId}/applications`)
        .set('Authorization', `Bearer ${enterpriseToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(Array.isArray(response.body.list)).toBe(true);
    });

    it('should confirm workers', async () => {
      const response = await app
        .put(`/jobs/${jobId}/confirm-worker`)
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({
          applicationId,
          status: 'confirmed',
        });

      expect(response.status).toBe(200);
    });

    it('should monitor job progress', async () => {
      const response = await app
        .get(`/work/session/${jobId}`)
        .set('Authorization', `Bearer ${enterpriseToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('job');
      expect(response.body).toHaveProperty('checkins');
      expect(response.body).toHaveProperty('logs');
    });

    it('should create settlement', async () => {
      const response = await app
        .post(`/settlement/${jobId}`)
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('settlementId');
    });

    it('should view job analytics', async () => {
      const response = await app
        .get('/jobs/analytics')
        .set('Authorization', `Bearer ${enterpriseToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalJobs');
      expect(response.body).toHaveProperty('totalWorkers');
    });
  });

  describe('Messaging Workflow', () => {
    it('should send message between users', async () => {
      const response = await app
        .post('/chat/send')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          recipientId: enterpriseId,
          content: 'Hello, interested in the job',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('messageId');
    });

    it('should retrieve conversation history', async () => {
      const response = await app
        .get(`/chat/conversation/${enterpriseId}`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should mark messages as read', async () => {
      const response = await app
        .put('/chat/read-all')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it('should list conversations', async () => {
      const response = await app
        .get('/chat/conversations')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(Array.isArray(response.body.list)).toBe(true);
    });

    it('should receive notifications for new messages', async () => {
      const response = await app
        .get('/notification')
        .set('Authorization', `Bearer ${workerToken}`)
        .query({ type: 'message' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
    });
  });

  describe('Dispute Resolution Workflow', () => {
    it('should create a dispute report', async () => {
      const response = await app
        .post('/report')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          targetId: enterpriseId,
          type: 'payment_dispute',
          description: 'Payment not received',
          evidence: ['https://example.com/evidence.jpg'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reportId');
    });

    it('should view report status', async () => {
      const response = await app
        .get('/report')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
    });

    it('should receive dispute resolution notification', async () => {
      const response = await app
        .get('/notification')
        .set('Authorization', `Bearer ${workerToken}`)
        .query({ type: 'dispute' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
    });
  });

  describe('Promotion Usage Workflow', () => {
    it('should apply promotion code', async () => {
      const response = await app
        .post('/promotion/apply-code')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          code: 'WELCOME20',
          targetId: jobId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('discountAmount');
    });

    it('should view active promotions', async () => {
      const response = await app
        .get('/promotion/active')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(Array.isArray(response.body.list)).toBe(true);
    });

    it('should track promotion usage', async () => {
      const response = await app
        .get('/promotion/usage')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsed');
      expect(response.body).toHaveProperty('totalSaved');
    });
  });

  describe('Rating and Feedback Workflow', () => {
    it('should submit rating with tags', async () => {
      const response = await app
        .post('/rating')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          jobId,
          enterpriseId,
          score: 4,
          tags: ['good_pay', 'safe_environment'],
          content: 'Good working conditions',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    it('should view ratings received', async () => {
      const response = await app
        .get('/rating/received')
        .set('Authorization', `Bearer ${enterpriseToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('averageScore');
    });

    it('should update user reputation', async () => {
      const response = await app
        .get('/user/profile')
        .set('Authorization', `Bearer ${workerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('reputation');
      expect(response.body).toHaveProperty('totalRatings');
    });
  });

  describe('Notification Delivery Workflow', () => {
    it('should receive job application notification', async () => {
      const response = await app
        .get('/notification')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .query({ type: 'application' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
    });

    it('should mark notification as read', async () => {
      const response = await app
        .put('/notification/read')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({
          notificationId: 1,
        });

      expect(response.status).toBe(200);
    });

    it('should mark all notifications as read', async () => {
      const response = await app
        .put('/notification/read-all')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it('should list notifications with pagination', async () => {
      const response = await app
        .get('/notification')
        .set('Authorization', `Bearer ${enterpriseToken}`)
        .query({ page: 1, pageSize: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });
  });
});
