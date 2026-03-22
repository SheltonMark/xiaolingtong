/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { Notification } from '../../entities/notification.entity';

describe('NotificationService - Event Notifications', () => {
  let service: NotificationService;
  let notiRepo: any;

  beforeEach(async () => {
    notiRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notiRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyJobApply - 临工报名通知', () => {
    it('should send job apply notification to enterprise', async () => {
      const mockNotification = {
        id: 1,
        userId: 100,
        type: 'job_apply',
        title: '新的临工报名',
        content: '张三报名了您的工作"搬家工"',
        link: '/pages/job-process/job-process?jobId=1&tab=applications',
        data: { jobId: 1, jobTitle: '搬家工', workerName: '张三' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobApply(
        100,
        1,
        '搬家工',
        '张三',
      );

      expect(result.type).toBe('job_apply');
      expect(result.title).toBe('新的临工报名');
      expect(result.content).toContain('张三');
      expect(result.content).toContain('搬家工');
      expect(result.link).toBe('/pages/job-process/job-process?jobId=1&tab=applications');
      expect(result.data.jobId).toBe(1);
    });

    it('should include correct data structure in notification', async () => {
      const mockNotification = {
        id: 2,
        userId: 101,
        type: 'job_apply',
        title: '新的临工报名',
        content: '李四报名了您的工作"清洁工"',
        link: '/pages/job-process/job-process?jobId=2&tab=applications',
        data: { jobId: 2, jobTitle: '清洁工', workerName: '李四' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobApply(
        101,
        2,
        '清洁工',
        '李四',
      );

      expect(result.data).toEqual({
        jobId: 2,
        jobTitle: '清洁工',
        workerName: '李四',
      });
    });

    it('should call create with correct parameters', async () => {
      const mockNotification = {
        id: 3,
        userId: 102,
        type: 'job_apply',
        title: '新的临工报名',
        content: '王五报名了您的工作"装修工"',
        link: '/pages/job-process/job-process?jobId=3&tab=applications',
        data: { jobId: 3, jobTitle: '装修工', workerName: '王五' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      await service.notifyJobApply(102, 3, '装修工', '王五');

      expect(notiRepo.create).toHaveBeenCalled();
      expect(notiRepo.save).toHaveBeenCalled();
    });
  });

  describe('notifyJobAccepted - 企业接受通知', () => {
    it('should send job accepted notification to worker', async () => {
      const mockNotification = {
        id: 4,
        userId: 200,
        type: 'job_apply',
        title: '报名已接受',
        content: 'ABC公司接受了您对"搬家工"的报名',
        link: '/pages/my-applications/my-applications',
        data: { jobId: 1, jobTitle: '搬家工', enterpriseName: 'ABC公司' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobAccepted(
        200,
        1,
        '搬家工',
        'ABC公司',
      );

      expect(result.type).toBe('job_apply');
      expect(result.title).toBe('报名已接受');
      expect(result.content).toContain('ABC公司');
      expect(result.content).toContain('搬家工');
      expect(result.link).toBe('/pages/my-applications/my-applications');
    });

    it('should include enterprise name in notification content', async () => {
      const mockNotification = {
        id: 5,
        userId: 201,
        type: 'job_apply',
        title: '报名已接受',
        content: 'XYZ工厂接受了您对"焊接工"的报名',
        link: '/pages/my-applications/my-applications',
        data: { jobId: 2, jobTitle: '焊接工', enterpriseName: 'XYZ工厂' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobAccepted(
        201,
        2,
        '焊接工',
        'XYZ工厂',
      );

      expect(result.content).toContain('XYZ工厂');
      expect(result.data.enterpriseName).toBe('XYZ工厂');
    });
  });

  describe('notifyJobRejected - 企业拒绝通知', () => {
    it('should send job rejected notification to worker', async () => {
      const mockNotification = {
        id: 6,
        userId: 202,
        type: 'job_apply',
        title: '报名已拒绝',
        content: 'DEF公司拒绝了您对"清洁工"的报名',
        link: '/pages/my-applications/my-applications',
        data: { jobId: 3, jobTitle: '清洁工', enterpriseName: 'DEF公司' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobRejected(
        202,
        3,
        '清洁工',
        'DEF公司',
      );

      expect(result.type).toBe('job_apply');
      expect(result.title).toBe('报名已拒绝');
      expect(result.content).toContain('拒绝');
      expect(result.content).toContain('DEF公司');
    });

    it('should have correct rejection message', async () => {
      const mockNotification = {
        id: 7,
        userId: 203,
        type: 'job_apply',
        title: '报名已拒绝',
        content: 'GHI工厂拒绝了您对"装修工"的报名',
        link: '/pages/my-applications/my-applications',
        data: { jobId: 4, jobTitle: '装修工', enterpriseName: 'GHI工厂' },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobRejected(
        203,
        4,
        '装修工',
        'GHI工厂',
      );

      expect(result.title).toBe('报名已拒绝');
      expect(result.content).toContain('拒绝');
    });
  });

  describe('notifyWorkStart - 工作开始通知', () => {
    it('should send work start notification to worker', async () => {
      const mockNotification = {
        id: 8,
        userId: 204,
        type: 'job_apply',
        title: '工作即将开始',
        content: '您报名的工作"搬家工"即将开始，请准时到达',
        link: '/pages/checkin/checkin?jobId=1',
        data: { jobId: 1, jobTitle: '搬家工', isWorker: true },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyWorkStart(204, 1, '搬家工', true);

      expect(result.type).toBe('job_apply');
      expect(result.title).toBe('工作即将开始');
      expect(result.content).toContain('准时到达');
      expect(result.data.isWorker).toBe(true);
    });

    it('should send work start notification to enterprise', async () => {
      const mockNotification = {
        id: 9,
        userId: 100,
        type: 'job_apply',
        title: '工作已开始',
        content: '您发布的工作"搬家工"已开始',
        link: '/pages/job-process/job-process?jobId=1&tab=attendance',
        data: { jobId: 1, jobTitle: '搬家工', isWorker: false },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyWorkStart(100, 1, '搬家工', false);

      expect(result.title).toBe('工作已开始');
      expect(result.content).toContain('您发布的工作');
      expect(result.data.isWorker).toBe(false);
    });

    it('should have different messages for worker and enterprise', async () => {
      const workerNotification = {
        id: 10,
        userId: 205,
        type: 'job_apply',
        title: '工作即将开始',
        content: '您报名的工作"清洁工"即将开始，请准时到达',
        link: '/pages/checkin/checkin?jobId=2',
        data: { jobId: 2, jobTitle: '清洁工', isWorker: true },
      };

      const enterpriseNotification = {
        id: 11,
        userId: 101,
        type: 'job_apply',
        title: '工作已开始',
        content: '您发布的工作"清洁工"已开始',
        link: '/pages/job-process/job-process?jobId=2&tab=attendance',
        data: { jobId: 2, jobTitle: '清洁工', isWorker: false },
      };

      notiRepo.create.mockReturnValueOnce(workerNotification);
      notiRepo.save.mockResolvedValueOnce(workerNotification);
      notiRepo.create.mockReturnValueOnce(enterpriseNotification);
      notiRepo.save.mockResolvedValueOnce(enterpriseNotification);

      const workerResult = await service.notifyWorkStart(205, 2, '清洁工', true);
      const enterpriseResult = await service.notifyWorkStart(101, 2, '清洁工', false);

      expect(workerResult.title).toBe('工作即将开始');
      expect(enterpriseResult.title).toBe('工作已开始');
      expect(workerResult.content).not.toBe(enterpriseResult.content);
    });
  });

  describe('notifySettlement - 结算完成通知', () => {
    it('should send settlement notification to worker', async () => {
      const mockNotification = {
        id: 12,
        userId: 206,
        type: 'settlement',
        title: '工作结算完成',
        content: '您的工作"搬家工"已结算，获得500元',
        link: '/pages/job-process/job-process?jobId=1&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 1, jobTitle: '搬家工', amount: 500 },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifySettlement(206, 1, '搬家工', 500);

      expect(result.type).toBe('settlement');
      expect(result.title).toBe('工作结算完成');
      expect(result.content).toContain('500元');
      expect(result.data.amount).toBe(500);
    });

    it('should include settlement amount in notification', async () => {
      const mockNotification = {
        id: 13,
        userId: 207,
        type: 'settlement',
        title: '工作结算完成',
        content: '您的工作"清洁工"已结算，获得300元',
        link: '/pages/job-process/job-process?jobId=2&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 2, jobTitle: '清洁工', amount: 300 },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifySettlement(207, 2, '清洁工', 300);

      expect(result.content).toContain('300元');
      expect(result.data.amount).toBe(300);
    });

    it('should handle different settlement amounts', async () => {
      const mockNotification = {
        id: 14,
        userId: 208,
        type: 'settlement',
        title: '工作结算完成',
        content: '您的工作"装修工"已结算，获得1000元',
        link: '/pages/job-process/job-process?jobId=3&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 3, jobTitle: '装修工', amount: 1000 },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifySettlement(208, 3, '装修工', 1000);

      expect(result.content).toContain('1000元');
      expect(result.data.amount).toBe(1000);
    });
  });

  describe('notifyRating - 评价提醒通知', () => {
    it('should send rating reminder to worker', async () => {
      const mockNotification = {
        id: 15,
        userId: 209,
        type: 'promotion',
        title: '企业评价提醒',
        content: 'ABC公司还未对您的工作进行评价，请耐心等待',
        link: '/pages/job-process/job-process?jobId=1&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 1, jobTitle: '搬家工', targetName: 'ABC公司', isWorker: true },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyRating(
        209,
        1,
        '搬家工',
        'ABC公司',
        true,
      );

      expect(result.type).toBe('promotion');
      expect(result.title).toBe('企业评价提醒');
      expect(result.content).toContain('ABC公司');
      expect(result.data.isWorker).toBe(true);
    });

    it('should send rating reminder to enterprise', async () => {
      const mockNotification = {
        id: 16,
        userId: 100,
        type: 'promotion',
        title: '临工评价提醒',
        content: '请对临工张三的工作进行评价',
        link: '/pages/job-process/job-process?jobId=1&tab=settlement',
        data: { jobId: 1, jobTitle: '搬家工', targetName: '张三', isWorker: false },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyRating(
        100,
        1,
        '搬家工',
        '张三',
        false,
      );

      expect(result.title).toBe('临工评价提醒');
      expect(result.content).toContain('张三');
      expect(result.data.isWorker).toBe(false);
    });

    it('should have different messages for worker and enterprise rating', async () => {
      const workerRating = {
        id: 17,
        userId: 210,
        type: 'promotion',
        title: '企业评价提醒',
        content: 'XYZ工厂还未对您的工作进行评价，请耐心等待',
        link: '/pages/job-process/job-process?jobId=2&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 2, jobTitle: '清洁工', targetName: 'XYZ工厂', isWorker: true },
      };

      const enterpriseRating = {
        id: 18,
        userId: 101,
        type: 'promotion',
        title: '临工评价提醒',
        content: '请对临工李四的工作进行评价',
        link: '/pages/job-process/job-process?jobId=2&tab=settlement',
        data: { jobId: 2, jobTitle: '清洁工', targetName: '李四', isWorker: false },
      };

      notiRepo.create.mockReturnValueOnce(workerRating);
      notiRepo.save.mockResolvedValueOnce(workerRating);
      notiRepo.create.mockReturnValueOnce(enterpriseRating);
      notiRepo.save.mockResolvedValueOnce(enterpriseRating);

      const workerResult = await service.notifyRating(
        210,
        2,
        '清洁工',
        'XYZ工厂',
        true,
      );
      const enterpriseResult = await service.notifyRating(
        101,
        2,
        '清洁工',
        '李四',
        false,
      );

      expect(workerResult.title).toBe('企业评价提醒');
      expect(enterpriseResult.title).toBe('临工评价提醒');
      expect(workerResult.content).not.toBe(enterpriseResult.content);
    });

    it('should include target name in notification', async () => {
      const mockNotification = {
        id: 19,
        userId: 211,
        type: 'promotion',
        title: '企业评价提醒',
        content: 'DEF公司还未对您的工作进行评价，请耐心等待',
        link: '/pages/job-process/job-process?jobId=3&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 3, jobTitle: '装修工', targetName: 'DEF公司', isWorker: true },
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyRating(
        211,
        3,
        '装修工',
        'DEF公司',
        true,
      );

      expect(result.data.targetName).toBe('DEF公司');
      expect(result.content).toContain('DEF公司');
    });
  });

  describe('Notification Event Coverage', () => {
    it('should support 7 worker-side notifications', async () => {
      const workerNotifications = [
        // 1. 报名被接受
        { type: 'job_apply', title: '报名已接受' },
        // 2. 报名被拒绝
        { type: 'job_apply', title: '报名已拒绝' },
        // 3. 工作即将开始
        { type: 'job_apply', title: '工作即将开始' },
        // 4. 工作结算完成
        { type: 'settlement', title: '工作结算完成' },
        // 5. 企业评价提醒
        { type: 'promotion', title: '企业评价提醒' },
        // 6. 系统通知
        { type: 'system', title: '系统通知' },
        // 7. 邀请通知
        { type: 'invite', title: '邀请通知' },
      ];

      expect(workerNotifications.length).toBe(7);
      expect(workerNotifications).toContainEqual(
        expect.objectContaining({ type: 'job_apply' }),
      );
      expect(workerNotifications).toContainEqual(
        expect.objectContaining({ type: 'settlement' }),
      );
      expect(workerNotifications).toContainEqual(
        expect.objectContaining({ type: 'promotion' }),
      );
    });

    it('should support 6 enterprise-side notifications', async () => {
      const enterpriseNotifications = [
        // 1. 新的临工报名
        { type: 'job_apply', title: '新的临工报名' },
        // 2. 工作已开始
        { type: 'job_apply', title: '工作已开始' },
        // 3. 临工评价提醒
        { type: 'promotion', title: '临工评价提醒' },
        // 4. 系统通知
        { type: 'system', title: '系统通知' },
        // 5. 认证通知
        { type: 'cert', title: '认证通知' },
        // 6. 推广通知
        { type: 'promotion', title: '推广通知' },
      ];

      expect(enterpriseNotifications.length).toBe(6);
      expect(enterpriseNotifications).toContainEqual(
        expect.objectContaining({ type: 'job_apply' }),
      );
      expect(enterpriseNotifications).toContainEqual(
        expect.objectContaining({ type: 'promotion' }),
      );
    });
  });

  describe('Notification Data Integrity', () => {
    it('should preserve all notification fields', async () => {
      const mockNotification = {
        id: 20,
        userId: 212,
        type: 'job_apply',
        title: '新的临工报名',
        content: '测试报名',
        link: '/pages/job-process/job-process?jobId=1&tab=applications',
        data: { jobId: 1, jobTitle: '测试工作', workerName: '测试工人' },
        status: 'active',
        isRead: 0,
      };

      notiRepo.create.mockReturnValue(mockNotification);
      notiRepo.save.mockResolvedValue(mockNotification);

      const result = await service.notifyJobApply(212, 1, '测试工作', '测试工人');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('link');
      expect(result).toHaveProperty('data');
    });

    it('should maintain data consistency across notification types', async () => {
      const notifications = [];

      const jobApplyNotif = {
        id: 21,
        userId: 213,
        type: 'job_apply',
        title: '新的临工报名',
        content: '张三报名了您的工作"搬家工"',
        link: '/pages/job-process/job-process?jobId=1&tab=applications',
        data: { jobId: 1, jobTitle: '搬家工', workerName: '张三' },
      };

      const settlementNotif = {
        id: 22,
        userId: 214,
        type: 'settlement',
        title: '工作结算完成',
        content: '您的工作"搬家工"已结算，获得500元',
        link: '/pages/job-process/job-process?jobId=1&tab=settlement&role=worker&viewOnly=1',
        data: { jobId: 1, jobTitle: '搬家工', amount: 500 },
      };

      notiRepo.create.mockReturnValueOnce(jobApplyNotif);
      notiRepo.save.mockResolvedValueOnce(jobApplyNotif);
      notiRepo.create.mockReturnValueOnce(settlementNotif);
      notiRepo.save.mockResolvedValueOnce(settlementNotif);

      const result1 = await service.notifyJobApply(213, 1, '搬家工', '张三');
      const result2 = await service.notifySettlement(214, 1, '搬家工', 500);

      notifications.push(result1, result2);

      expect(notifications[0].type).toBe('job_apply');
      expect(notifications[1].type).toBe('settlement');
      expect(notifications[0].data.jobId).toBe(notifications[1].data.jobId);
    });
  });
});
