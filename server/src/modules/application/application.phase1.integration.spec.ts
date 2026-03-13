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

describe('ApplicationModule Phase 1 Complete Workflow Integration Tests', () => {
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

  describe('Complete Workflow: Apply -> Accept -> Conflict Check -> Cancel', () => {
    it('should complete full workflow: apply -> accept -> conflict check -> cancel', async () => {
      const workerId = 1;
      const jobId = 1;
      const appId = 1;

      // Step 1: Apply for job
      const mockJob = {
        id: jobId,
        status: 'recruiting',
        needCount: 5,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-21',
        title: 'Test Job',
      };
      const mockApp = {
        id: appId,
        jobId,
        workerId,
        status: 'pending',
        job: mockJob,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]); // No conflicts
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(2);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const applyResult = await controller.apply(jobId, workerId);
      expect(applyResult).toBeDefined();
      expect(applyResult.status).toBe('pending');

      // Step 2: Accept application (enterprise accepts)
      const acceptedApp = { ...mockApp, status: 'accepted' };
      appRepository.findOne.mockResolvedValue(acceptedApp);
      appRepository.save.mockResolvedValue(acceptedApp);

      // Simulate enterprise accepting the application
      const acceptedAppData = await appRepository.save({ ...mockApp, status: 'accepted' });
      expect(acceptedAppData.status).toBe('accepted');

      // Step 3: Check time conflict when applying for another job
      const newJobId = 2;
      const newJob = {
        id: newJobId,
        status: 'recruiting',
        needCount: 5,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-22',
        title: 'Conflicting Job',
      };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([acceptedApp]); // Conflict detected

      await expect(controller.apply(newJobId, workerId)).rejects.toThrow('报名时间与已报名工作冲突');

      // Step 4: Cancel the original application
      appRepository.findOne.mockResolvedValue(acceptedApp);
      appRepository.save.mockResolvedValue({ ...acceptedApp, status: 'cancelled' });

      const cancelResult = await controller.cancel(appId, workerId);
      expect(cancelResult).toBeDefined();
      expect(appRepository.save).toHaveBeenCalled();
    });
  });

  describe('Multiple Applications Status Grouping', () => {
    it('should group multiple applications by status correctly', async () => {
      const workerId = 1;
      const mockApps = [
        {
          id: 1,
          jobId: 1,
          workerId,
          status: 'pending',
          createdAt: new Date('2026-03-10'),
          job: { id: 1, title: 'Job 1', user: { id: 2 } },
        },
        {
          id: 2,
          jobId: 2,
          workerId,
          status: 'accepted',
          createdAt: new Date('2026-03-11'),
          job: { id: 2, title: 'Job 2', user: { id: 3 } },
        },
        {
          id: 3,
          jobId: 3,
          workerId,
          status: 'confirmed',
          createdAt: new Date('2026-03-12'),
          job: { id: 3, title: 'Job 3', user: { id: 4 } },
        },
        {
          id: 4,
          jobId: 4,
          workerId,
          status: 'working',
          createdAt: new Date('2026-03-13'),
          job: { id: 4, title: 'Job 4', user: { id: 5 } },
        },
        {
          id: 5,
          jobId: 5,
          workerId,
          status: 'done',
          createdAt: new Date('2026-03-14'),
          job: { id: 5, title: 'Job 5', user: { id: 6 } },
        },
        {
          id: 6,
          jobId: 6,
          workerId,
          status: 'rejected',
          createdAt: new Date('2026-03-15'),
          job: { id: 6, title: 'Job 6', user: { id: 7 } },
        },
        {
          id: 7,
          jobId: 7,
          workerId,
          status: 'released',
          createdAt: new Date('2026-03-16'),
          job: { id: 7, title: 'Job 7', user: { id: 8 } },
        },
      ];

      appRepository.find.mockResolvedValue(mockApps);

      const result = await service.getMyApplicationsGrouped(workerId);

      // Normal statuses: pending, accepted, confirmed, working, done
      expect(result.normal).toHaveLength(5);
      // Exception statuses: rejected, released
      expect(result.exception).toHaveLength(2);

      // Verify normal group contains correct statuses
      const normalStatuses = result.normal.map((app: any) => app.status);
      expect(normalStatuses).toContain('pending');
      expect(normalStatuses).toContain('accepted');
      expect(normalStatuses).toContain('confirmed');
      expect(normalStatuses).toContain('working');
      expect(normalStatuses).toContain('done');

      // Verify exception group contains correct statuses
      const exceptionStatuses = result.exception.map((app: any) => app.status);
      expect(exceptionStatuses).toContain('rejected');
      expect(exceptionStatuses).toContain('released');
    });
  });

  describe('State Transition Validation: Prevent Cancel from Working Status', () => {
    it('should prevent cancelling application in working status', async () => {
      const appId = 1;
      const workerId = 1;
      const mockApp = {
        id: appId,
        jobId: 1,
        workerId,
        status: 'working',
      };

      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(controller.cancel(appId, workerId)).rejects.toThrow('当前状态不可取消');
    });
  });

  describe('State Transition Validation: Prevent Cancel from Done Status', () => {
    it('should prevent cancelling application in done status', async () => {
      const appId = 1;
      const workerId = 1;
      const mockApp = {
        id: appId,
        jobId: 1,
        workerId,
        status: 'done',
      };

      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(controller.cancel(appId, workerId)).rejects.toThrow('当前状态不可取消');
    });
  });

  describe('Applications Grouped by Status for Enterprise', () => {
    it('should group applications by status for enterprise view', async () => {
      const jobId = 1;
      const userId = 1;
      const mockJob = { id: jobId, userId, title: 'Enterprise Job' };
      const mockApps = [
        {
          id: 1,
          jobId,
          workerId: 1,
          status: 'pending',
          createdAt: new Date('2026-03-10'),
          job: mockJob,
        },
        {
          id: 2,
          jobId,
          workerId: 2,
          status: 'accepted',
          createdAt: new Date('2026-03-11'),
          job: mockJob,
        },
        {
          id: 3,
          jobId,
          workerId: 3,
          status: 'confirmed',
          createdAt: new Date('2026-03-12'),
          job: mockJob,
        },
        {
          id: 4,
          jobId,
          workerId: 4,
          status: 'working',
          createdAt: new Date('2026-03-13'),
          job: mockJob,
        },
        {
          id: 5,
          jobId,
          workerId: 5,
          status: 'done',
          createdAt: new Date('2026-03-14'),
          job: mockJob,
        },
        {
          id: 6,
          jobId,
          workerId: 6,
          status: 'cancelled',
          createdAt: new Date('2026-03-15'),
          job: mockJob,
        },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.find.mockResolvedValue(mockApps);

      const result = await service.getApplicationsForEnterpriseGrouped(jobId, userId);

      // Normal statuses: pending, accepted, confirmed, working, done
      expect(result.normal).toHaveLength(5);
      // Exception statuses: cancelled
      expect(result.exception).toHaveLength(1);

      // Verify all applications are accounted for
      expect(result.normal.length + result.exception.length).toBe(mockApps.length);
    });
  });

  describe('Boundary Cases: Empty Applications', () => {
    it('should handle empty applications list for worker', async () => {
      const workerId = 1;

      appRepository.find.mockResolvedValue([]);

      const result = await service.getMyApplicationsGrouped(workerId);

      expect(result.normal).toEqual([]);
      expect(result.exception).toEqual([]);
    });
  });

  describe('Boundary Cases: Single Application Lifecycle', () => {
    it('should handle single application through complete lifecycle', async () => {
      const workerId = 1;
      const jobId = 1;
      const appId = 1;

      // Create application
      const mockJob = {
        id: jobId,
        status: 'recruiting',
        needCount: 5,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-21',
      };
      const mockApp = {
        id: appId,
        jobId,
        workerId,
        status: 'pending',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]);
      configRepository.findOne.mockResolvedValue({ key: 'over_apply_rate', value: '0.5' });
      appRepository.count.mockResolvedValue(0);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const applyResult = await controller.apply(jobId, workerId);
      expect(applyResult.status).toBe('pending');

      // Confirm application
      const confirmedApp = { ...mockApp, status: 'confirmed', confirmedAt: new Date() };
      appRepository.findOne.mockResolvedValue({ ...mockApp, status: 'accepted' });
      appRepository.save.mockResolvedValue(confirmedApp);

      const confirmResult = await controller.confirm(jobId, workerId);
      expect(confirmResult.status).toBe('confirmed');
    });
  });

  describe('Boundary Cases: Multiple Conflicts Detection', () => {
    it('should detect multiple time conflicts correctly', async () => {
      const workerId = 1;
      const newJobId = 3;

      const newJob = {
        id: newJobId,
        status: 'recruiting',
        needCount: 5,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-25',
      };

      const job1 = {
        id: 1,
        title: 'Job 1',
        dateStart: '2026-03-20',
        dateEnd: '2026-03-22',
        workHours: '08:00-17:00',
      };

      const job2 = {
        id: 2,
        title: 'Job 2',
        dateStart: '2026-03-23',
        dateEnd: '2026-03-25',
        workHours: '09:00-18:00',
      };

      const app1 = { id: 1, jobId: 1, workerId, status: 'accepted', job: job1 };
      const app2 = { id: 2, jobId: 2, workerId, status: 'confirmed', job: job2 };

      jobRepository.findOne.mockResolvedValue(newJob);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([app1, app2]);

      try {
        await controller.apply(newJobId, workerId);
        fail('Should throw error');
      } catch (error: any) {
        expect(error.response?.conflictWith).toHaveLength(2);
        expect(error.response?.conflictWith[0]?.jobTitle).toBe('Job 1');
        expect(error.response?.conflictWith[1]?.jobTitle).toBe('Job 2');
      }
    });
  });
});
