/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';

describe('ApplicationModule Integration Tests', () => {
  let controller: ApplicationController;
  let service: ApplicationService;
  let appRepository: any;
  let jobRepository: any;
  let userRepository: any;
  let configRepository: any;

  beforeEach(async () => {
    appRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    configRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        ApplicationService,
        {
          provide: getRepositoryToken(JobApplication),
          useValue: appRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(SysConfig),
          useValue: configRepository,
        },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
    service = module.get<ApplicationService>(ApplicationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply Integration', () => {
    it('should apply for job successfully', async () => {
      const mockJob = { id: 1, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-21' };
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]); // 无冲突
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await controller.apply(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(controller.apply(999, 1)).rejects.toThrow();
    });

    it('should throw error when job not recruiting', async () => {
      const mockJob = { id: 1, status: 'closed', needCount: 5 };

      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(controller.apply(1, 1)).rejects.toThrow();
    });

    it('should throw error when already applied', async () => {
      const mockJob = { id: 1, status: 'recruiting', needCount: 5 };
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(controller.apply(1, 1)).rejects.toThrow();
    });

    it('should throw error when over-application limit reached', async () => {
      const mockJob = { id: 1, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-21' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]); // 无冲突
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(8); // 5 * (1 + 0.5) = 7.5, ceil = 8

      await expect(controller.apply(1, 1)).rejects.toThrow();
    });

    it('should use default over-apply rate when config not found', async () => {
      const mockJob = { id: 1, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-21' };
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]); // 无冲突
      configRepository.findOne.mockResolvedValue(null);
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await controller.apply(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    // 时间冲突检查测试用例
    it('should throw error when time conflicts with accepted application', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-22' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-21', dateEnd: '2026-03-23', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'accepted', job: existingJob };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([existingApp]); // 有冲突

      await expect(controller.apply(2, 1)).rejects.toThrow('报名时间与已报名工作冲突');
    });

    it('should throw error when time conflicts with confirmed application', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-22' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-21', dateEnd: '2026-03-23', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'confirmed', job: existingJob };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([existingApp]); // 有冲突

      await expect(controller.apply(2, 1)).rejects.toThrow('报名时间与已报名工作冲突');
    });

    it('should throw error when time conflicts with working application', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-22' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-21', dateEnd: '2026-03-23', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'working', job: existingJob };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([existingApp]); // 有冲突

      await expect(controller.apply(2, 1)).rejects.toThrow('报名时间与已报名工作冲突');
    });

    it('should allow apply when no time conflict', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-25', dateEnd: '2026-03-26' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-20', dateEnd: '2026-03-22', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'accepted', job: existingJob };
      const mockApp = { id: 2, jobId: 2, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([existingApp]); // 无冲突（日期不重叠）
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await controller.apply(2, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should allow apply when existing application is rejected', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-22' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-20', dateEnd: '2026-03-22', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'rejected', job: existingJob };
      const mockApp = { id: 2, jobId: 2, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]); // 被拒绝的应用不检查
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await controller.apply(2, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should allow apply when existing application is cancelled', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-22' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-20', dateEnd: '2026-03-22', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'cancelled', job: existingJob };
      const mockApp = { id: 2, jobId: 2, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]); // 已取消的应用不检查
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await controller.apply(2, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should return conflict details when time conflicts', async () => {
      const newJob = { id: 2, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-22' };
      const existingJob = { id: 1, title: 'Job 1', dateStart: '2026-03-21', dateEnd: '2026-03-23', workHours: '08:00-17:00' };
      const existingApp = { id: 1, jobId: 1, workerId: 1, status: 'accepted', job: existingJob };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([existingApp]);

      try {
        await controller.apply(2, 1);
        fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('报名时间与已报名工作冲突');
        expect(error.response?.conflictWith).toBeDefined();
        expect(error.response?.conflictWith[0]?.jobTitle).toBe('Job 1');
      }
    });

    it('should handle multiple time conflicts', async () => {
      const newJob = { id: 3, status: 'recruiting', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-25' };
      const job1 = { id: 1, title: 'Job 1', dateStart: '2026-03-20', dateEnd: '2026-03-22', workHours: '08:00-17:00' };
      const job2 = { id: 2, title: 'Job 2', dateStart: '2026-03-23', dateEnd: '2026-03-25', workHours: '09:00-18:00' };
      const app1 = { id: 1, jobId: 1, workerId: 1, status: 'accepted', job: job1 };
      const app2 = { id: 2, jobId: 2, workerId: 1, status: 'confirmed', job: job2 };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([app1, app2]);

      try {
        await controller.apply(3, 1);
        fail('Should throw error');
      } catch (error: any) {
        expect(error.response?.conflictWith).toHaveLength(2);
      }
    });
  });

  describe('confirm Integration', () => {
    it('should confirm application successfully', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'accepted', confirmedAt: null };

      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({ ...mockApp, status: 'confirmed', confirmedAt: new Date() });

      const result = await controller.confirm(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should throw error when application not found', async () => {
      appRepository.findOne.mockResolvedValue(null);

      await expect(controller.confirm(1, 1)).rejects.toThrow();
    });

    it('should throw error when application not accepted', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(controller.confirm(1, 1)).rejects.toThrow();
    });
  });

  describe('myApplications Integration', () => {
    it('should return paginated applications', async () => {
      const mockApps = [
        { id: 1, jobId: 1, workerId: 1, status: 'pending', job: { id: 1, title: 'Job 1', user: { id: 2 } } },
      ];

      appRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockApps, 1]),
      });

      const result = await controller.myApplications(1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      const mockApps = [
        { id: 1, jobId: 1, workerId: 1, status: 'confirmed', job: { id: 1, title: 'Job 1', user: { id: 2 } } },
      ];

      appRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockApps, 1]),
      });

      const result = await controller.myApplications(1, { status: 'confirmed', page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should return empty list when no applications', async () => {
      appRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await controller.myApplications(1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('cancel Integration', () => {
    it('should cancel application successfully', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({ ...mockApp, status: 'cancelled' });

      const result = await controller.cancel(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should throw error when application not found', async () => {
      appRepository.findOne.mockResolvedValue(null);

      await expect(controller.cancel(999, 1)).rejects.toThrow();
    });

    it('should throw error when not application owner', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 2, status: 'pending' };

      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(controller.cancel(1, 1)).rejects.toThrow();
    });

    it('should throw error when application cannot be cancelled', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'working' };

      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(controller.cancel(1, 1)).rejects.toThrow();
    });

    it('should allow cancelling accepted applications', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'accepted' };

      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({ ...mockApp, status: 'cancelled' });

      const result = await controller.cancel(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });

    it('should allow cancelling confirmed applications', async () => {
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'confirmed' };

      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({ ...mockApp, status: 'cancelled' });

      const result = await controller.cancel(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });
  });

  describe('getMyApplicationsGrouped Integration', () => {
    it('should group applications by normal and exception status', async () => {
      const mockApps = [
        { id: 1, jobId: 1, workerId: 1, status: 'pending', createdAt: new Date(), job: { id: 1, user: { id: 2 } } },
        { id: 2, jobId: 2, workerId: 1, status: 'accepted', createdAt: new Date(), job: { id: 2, user: { id: 3 } } },
        { id: 3, jobId: 3, workerId: 1, status: 'rejected', createdAt: new Date(), job: { id: 3, user: { id: 4 } } },
        { id: 4, jobId: 4, workerId: 1, status: 'released', createdAt: new Date(), job: { id: 4, user: { id: 5 } } },
      ];

      appRepository.find.mockResolvedValue(mockApps);

      const result = await service.getMyApplicationsGrouped(1);

      expect(result.normal).toHaveLength(2);
      expect(result.exception).toHaveLength(2);
      expect(result.normal[0].displayStatus).toBeDefined();
      expect(result.normal[0].statusColor).toBeDefined();
      expect(result.exception[0].displayStatus).toBeDefined();
      expect(result.exception[0].statusColor).toBeDefined();
    });

    it('should include displayStatus for each application', async () => {
      const mockApps = [
        { id: 1, jobId: 1, workerId: 1, status: 'confirmed', createdAt: new Date(), job: { id: 1, user: { id: 2 } } },
      ];

      appRepository.find.mockResolvedValue(mockApps);

      const result = await service.getMyApplicationsGrouped(1);

      expect(result.normal[0].displayStatus).toBe('已入选');
      expect(result.normal[0].statusColor).toBe('green');
    });

    it('should return empty groups when no applications', async () => {
      appRepository.find.mockResolvedValue([]);

      const result = await service.getMyApplicationsGrouped(1);

      expect(result.normal).toEqual([]);
      expect(result.exception).toEqual([]);
    });
  });

  describe('getApplicationsForEnterpriseGrouped Integration', () => {
    it('should group applications by normal and exception status for enterprise', async () => {
      const mockJob = { id: 1, userId: 1, title: 'Job 1' };
      const mockApps = [
        { id: 1, jobId: 1, workerId: 1, status: 'pending', createdAt: new Date(), job: mockJob },
        { id: 2, jobId: 1, workerId: 2, status: 'accepted', createdAt: new Date(), job: mockJob },
        { id: 3, jobId: 1, workerId: 3, status: 'cancelled', createdAt: new Date(), job: mockJob },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.find.mockResolvedValue(mockApps);

      const result = await service.getApplicationsForEnterpriseGrouped(1, 1);

      expect(result.normal).toHaveLength(2);
      expect(result.exception).toHaveLength(1);
      expect(result.normal[0].displayStatus).toBeDefined();
      expect(result.exception[0].displayStatus).toBeDefined();
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.getApplicationsForEnterpriseGrouped(999, 1)).rejects.toThrow('招工信息不存在');
    });

    it('should throw error when user is not job owner', async () => {
      const mockJob = { id: 1, userId: 2, title: 'Job 1' };

      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(service.getApplicationsForEnterpriseGrouped(1, 1)).rejects.toThrow('无权查看');
    });
  });
});
