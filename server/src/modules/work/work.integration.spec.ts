/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';

describe('WorkModule Integration Tests', () => {
  let controller: WorkController;
  let service: WorkService;
  let checkinRepository: any;
  let workLogRepository: any;
  let jobApplicationRepository: any;
  let jobRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    checkinRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    workLogRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    jobApplicationRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      decrement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkController],
      providers: [
        WorkService,
        {
          provide: getRepositoryToken(Checkin),
          useValue: checkinRepository,
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: workLogRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    controller = module.get<WorkController>(WorkController);
    service = module.get<WorkService>(WorkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders Integration', () => {
    it('should return user orders with correct stage', async () => {
      const mockApps = [
        {
          id: 1,
          workerId: 1,
          isSupervisor: 1,
          job: { id: 1, status: 'working', user: { id: 2 } },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(mockApps);

      const result = await controller.getOrders(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].stage).toBe('working');
    });

    it('should return empty array when no orders', async () => {
      jobApplicationRepository.find.mockResolvedValue([]);

      const result = await controller.getOrders(1);

      expect(result).toEqual([]);
    });

    it('should determine settlement stage correctly', async () => {
      const mockApps = [
        {
          id: 1,
          workerId: 1,
          isSupervisor: 1,
          job: { id: 1, status: 'pending_settlement', user: { id: 2 } },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(mockApps);

      const result = await controller.getOrders(1);

      expect(result[0].stage).toBe('settlement');
    });

    it('should determine done stage for settled jobs', async () => {
      const mockApps = [
        {
          id: 1,
          workerId: 1,
          isSupervisor: 1,
          job: { id: 1, status: 'settled', user: { id: 2 } },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(mockApps);

      const result = await controller.getOrders(1);

      expect(result[0].stage).toBe('done');
    });

    it('should determine done stage for closed jobs', async () => {
      const mockApps = [
        {
          id: 1,
          workerId: 1,
          isSupervisor: 1,
          job: { id: 1, status: 'closed', user: { id: 2 } },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(mockApps);

      const result = await controller.getOrders(1);

      expect(result[0].stage).toBe('done');
    });
  });

  describe('getSession Integration', () => {
    it('should return job session with checkins and logs', async () => {
      const mockJob = { id: 1, title: 'Test Job', user: { id: 2 } };
      const mockCheckins = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          checkInAt: new Date(),
          worker: { id: 2 },
        },
      ];
      const mockLogs = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          date: '2026-03-06',
          hours: 8,
          worker: { id: 2 },
        },
      ];
      const mockWorkers = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          status: 'confirmed',
          worker: { id: 2 },
        },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      checkinRepository.find.mockResolvedValue(mockCheckins);
      workLogRepository.find.mockResolvedValue(mockLogs);
      jobApplicationRepository.find.mockResolvedValue(mockWorkers);

      const result = await controller.getSession(1);

      expect(result).toBeDefined();
      expect(result.job).toBeDefined();
      expect(result.checkins).toHaveLength(1);
      expect(result.logs).toHaveLength(1);
      expect(result.workers).toHaveLength(1);
    });

    it('should return null job when not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      const result = await controller.getSession(999);

      expect(result.job).toBeNull();
    });

    it('should filter workers by status', async () => {
      const mockJob = { id: 1, title: 'Test Job', user: { id: 2 } };
      const mockWorkers = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          status: 'confirmed',
          worker: { id: 2 },
        },
        { id: 2, jobId: 1, workerId: 3, status: 'rejected', worker: { id: 3 } },
        { id: 3, jobId: 1, workerId: 4, status: 'working', worker: { id: 4 } },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      checkinRepository.find.mockResolvedValue([]);
      workLogRepository.find.mockResolvedValue([]);
      jobApplicationRepository.find.mockResolvedValue(mockWorkers);

      const result = await controller.getSession(1);

      expect(result.workers).toHaveLength(2);
      expect(
        result.workers.every((w) =>
          ['confirmed', 'working', 'done'].includes(w.status),
        ),
      ).toBe(true);
    });
  });

  describe('checkin Integration', () => {
    it('should create checkin successfully', async () => {
      const mockCheckin = {
        id: 1,
        jobId: 1,
        workerId: 1,
        checkInAt: new Date(),
      };
      const mockJob = { id: 1, status: 'full' };

      checkinRepository.create.mockReturnValue(mockCheckin);
      checkinRepository.save.mockResolvedValue(mockCheckin);
      jobRepository.findOneBy.mockResolvedValue(mockJob);
      jobRepository.update.mockResolvedValue({ affected: 1 });
      jobApplicationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.checkin(1, {
        jobId: 1,
        type: 'location',
        lat: 0,
        lng: 0,
      });

      expect(result).toBeDefined();
      expect(checkinRepository.save).toHaveBeenCalled();
    });

    it('should update job status to working on first checkin', async () => {
      const mockCheckin = {
        id: 1,
        jobId: 1,
        workerId: 1,
        checkInAt: new Date(),
      };
      const mockJob = { id: 1, status: 'full' };

      checkinRepository.create.mockReturnValue(mockCheckin);
      checkinRepository.save.mockResolvedValue(mockCheckin);
      jobRepository.findOneBy.mockResolvedValue(mockJob);
      jobRepository.update.mockResolvedValue({ affected: 1 });
      jobApplicationRepository.update.mockResolvedValue({ affected: 1 });

      await controller.checkin(1, { jobId: 1, type: 'location' });

      expect(jobRepository.update).toHaveBeenCalledWith(1, {
        status: 'working',
      });
    });

    it('should update application status to working', async () => {
      const mockCheckin = {
        id: 1,
        jobId: 1,
        workerId: 1,
        checkInAt: new Date(),
      };
      const mockJob = { id: 1, status: 'full' };

      checkinRepository.create.mockReturnValue(mockCheckin);
      checkinRepository.save.mockResolvedValue(mockCheckin);
      jobRepository.findOneBy.mockResolvedValue(mockJob);
      jobRepository.update.mockResolvedValue({ affected: 1 });
      jobApplicationRepository.update.mockResolvedValue({ affected: 1 });

      await controller.checkin(1, { jobId: 1, type: 'location' });

      expect(jobApplicationRepository.update).toHaveBeenCalledWith(
        { jobId: 1, workerId: 1 },
        { status: 'working' },
      );
    });
  });

  describe('submitLog Integration', () => {
    it('should submit work log successfully', async () => {
      const mockLog = {
        id: 1,
        jobId: 1,
        workerId: 1,
        date: '2026-03-06',
        hours: 8,
      };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);

      const result = await controller.submitLog(1, { jobId: 1, hours: 8 });

      expect(result).toBeDefined();
      expect(workLogRepository.save).toHaveBeenCalled();
    });

    it('should use current date if not provided', async () => {
      const mockLog = {
        id: 1,
        jobId: 1,
        workerId: 1,
        date: expect.any(String),
        hours: 8,
      };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);

      await controller.submitLog(1, { jobId: 1, hours: 8 });

      expect(workLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 1,
          workerId: 1,
          hours: 8,
        }),
      );
    });
  });

  describe('recordAnomaly Integration', () => {
    it('should record anomaly successfully', async () => {
      const mockLog = { id: 1, jobId: 1, workerId: 1, anomalyType: 'absent' };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);
      userRepository.decrement.mockResolvedValue({ affected: 1 });

      const result = await controller.recordAnomaly(1, {
        jobId: 1,
        anomalyType: 'absent',
      });

      expect(result).toBeDefined();
      expect(workLogRepository.save).toHaveBeenCalled();
    });

    it('should deduct credit score for absent', async () => {
      const mockLog = { id: 1, jobId: 1, workerId: 1, anomalyType: 'absent' };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);
      userRepository.decrement.mockResolvedValue({ affected: 1 });

      await controller.recordAnomaly(1, { jobId: 1, anomalyType: 'absent' });

      expect(userRepository.decrement).toHaveBeenCalledWith(
        { id: 1 },
        'creditScore',
        5,
      );
    });

    it('should deduct credit score for early_leave', async () => {
      const mockLog = {
        id: 1,
        jobId: 1,
        workerId: 1,
        anomalyType: 'early_leave',
      };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);
      userRepository.decrement.mockResolvedValue({ affected: 1 });

      await controller.recordAnomaly(1, {
        jobId: 1,
        anomalyType: 'early_leave',
      });

      expect(userRepository.decrement).toHaveBeenCalledWith(
        { id: 1 },
        'creditScore',
        5,
      );
    });

    it('should deduct credit score for late', async () => {
      const mockLog = { id: 1, jobId: 1, workerId: 1, anomalyType: 'late' };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);
      userRepository.decrement.mockResolvedValue({ affected: 1 });

      await controller.recordAnomaly(1, { jobId: 1, anomalyType: 'late' });

      expect(userRepository.decrement).toHaveBeenCalledWith(
        { id: 1 },
        'creditScore',
        2,
      );
    });

    it('should deduct credit score for fraud', async () => {
      const mockLog = { id: 1, jobId: 1, workerId: 1, anomalyType: 'fraud' };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);
      userRepository.decrement.mockResolvedValue({ affected: 1 });

      await controller.recordAnomaly(1, { jobId: 1, anomalyType: 'fraud' });

      expect(userRepository.decrement).toHaveBeenCalledWith(
        { id: 1 },
        'creditScore',
        20,
      );
    });

    it('should not deduct credit score for injury', async () => {
      const mockLog = { id: 1, jobId: 1, workerId: 1, anomalyType: 'injury' };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);

      await controller.recordAnomaly(1, { jobId: 1, anomalyType: 'injury' });

      expect(userRepository.decrement).not.toHaveBeenCalled();
    });

    it('should use targetWorkerId if provided', async () => {
      const mockLog = { id: 1, jobId: 1, workerId: 2, anomalyType: 'absent' };

      workLogRepository.create.mockReturnValue(mockLog);
      workLogRepository.save.mockResolvedValue(mockLog);
      userRepository.decrement.mockResolvedValue({ affected: 1 });

      await controller.recordAnomaly(1, {
        jobId: 1,
        targetWorkerId: 2,
        anomalyType: 'absent',
      });

      expect(userRepository.decrement).toHaveBeenCalledWith(
        { id: 2 },
        'creditScore',
        5,
      );
    });
  });
});
