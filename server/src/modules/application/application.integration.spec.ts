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
      const mockJob = { id: 1, status: 'recruiting', needCount: 5 };
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
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
      const mockJob = { id: 1, status: 'recruiting', needCount: 5 };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(8); // 5 * (1 + 0.5) = 7.5, ceil = 8

      await expect(controller.apply(1, 1)).rejects.toThrow();
    });

    it('should use default over-apply rate when config not found', async () => {
      const mockJob = { id: 1, status: 'recruiting', needCount: 5 };
      const mockApp = { id: 1, jobId: 1, workerId: 1, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      configRepository.findOne.mockResolvedValue(null);
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await controller.apply(1, 1);

      expect(result).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
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
});
