/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Keyword } from '../../entities/keyword.entity';
import { Supervisor } from '../../entities/supervisor.entity';

describe('SupervisorSelection', () => {
  let service: JobService;
  let jobRepository: any;
  let userRepository: any;
  let jobApplicationRepository: any;
  let keywordRepository: any;
  let supervisorRepository: any;

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    jobApplicationRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    keywordRepository = {
      find: jest.fn(),
    };

    supervisorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(Supervisor),
          useValue: supervisorRepository,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectSupervisor', () => {
    it('should select supervisor with valid credentials', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1; // 企业用户

      const mockJob = { id: jobId, userId, status: 'recruiting' };
      const mockWorker = {
        id: workerId,
        creditScore: 95,
        totalOrders: 10,
      };
      const mockApplication = {
        id: 1,
        jobId,
        workerId,
        status: 'accepted',
        isSupervisor: 0,
        confirmedAt: null,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      userRepository.findOne.mockResolvedValue(mockWorker);
      supervisorRepository.findOne.mockResolvedValue(null);
      supervisorRepository.create.mockReturnValue({
        jobId,
        supervisorId: workerId,
        status: 'active',
        supervisoryFee: 0,
        managedWorkerCount: 0,
      });
      supervisorRepository.save.mockResolvedValue({
        id: 1,
        jobId,
        supervisorId: workerId,
        status: 'active',
        supervisoryFee: 0,
        managedWorkerCount: 0,
      });
      jobApplicationRepository.save.mockResolvedValue({
        ...mockApplication,
        status: 'confirmed',
        isSupervisor: 1,
        confirmedAt: expect.any(Date),
      });

      const result = await service.selectSupervisor(jobId, workerId, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(result.isSupervisor).toBe(1);
      expect(supervisorRepository.create).toHaveBeenCalledWith({
        jobId,
        supervisorId: workerId,
        status: 'active',
        supervisoryFee: 0,
        managedWorkerCount: 0,
      });
      expect(supervisorRepository.save).toHaveBeenCalled();
      expect(jobApplicationRepository.save).toHaveBeenCalled();
    });

    it('should reject supervisor with low credit score', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockWorker = {
        id: workerId,
        creditScore: 90, // < 95
        totalOrders: 10,
      };
      const mockApplication = {
        id: 1,
        jobId,
        workerId,
        status: 'accepted',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        service.selectSupervisor(jobId, workerId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject supervisor with insufficient order count', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockWorker = {
        id: workerId,
        creditScore: 95,
        totalOrders: 5, // < 10
      };
      const mockApplication = {
        id: 1,
        jobId,
        workerId,
        status: 'accepted',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        service.selectSupervisor(jobId, workerId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if application not found or not in accepted status', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.selectSupervisor(jobId, workerId, userId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if user does not have permission to manage job', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;
      const otherUserId = 999;

      const mockJob = { id: jobId, userId: otherUserId };

      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.selectSupervisor(jobId, workerId, userId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if job not found', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;

      jobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.selectSupervisor(jobId, workerId, userId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if worker not found', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockApplication = {
        id: 1,
        jobId,
        workerId,
        status: 'accepted',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.selectSupervisor(jobId, workerId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle edge case with exactly minimum requirements', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockWorker = {
        id: workerId,
        creditScore: 95, // exactly 95
        totalOrders: 10, // exactly 10
      };
      const mockApplication = {
        id: 1,
        jobId,
        workerId,
        status: 'accepted',
        isSupervisor: 0,
        confirmedAt: null,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      userRepository.findOne.mockResolvedValue(mockWorker);
      supervisorRepository.findOne.mockResolvedValue(null);
      supervisorRepository.create.mockReturnValue({
        jobId,
        supervisorId: workerId,
        status: 'active',
        supervisoryFee: 0,
        managedWorkerCount: 0,
      });
      supervisorRepository.save.mockResolvedValue({
        id: 1,
        jobId,
        supervisorId: workerId,
        status: 'active',
        supervisoryFee: 0,
        managedWorkerCount: 0,
      });
      jobApplicationRepository.save.mockResolvedValue({
        ...mockApplication,
        status: 'confirmed',
        isSupervisor: 1,
        confirmedAt: expect.any(Date),
      });

      const result = await service.selectSupervisor(jobId, workerId, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
      expect(result.isSupervisor).toBe(1);
    });
  });
});
