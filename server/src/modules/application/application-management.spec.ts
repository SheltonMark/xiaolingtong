/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApplicationService } from './application.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ApplicationService - Applicant Management', () => {
  let service: ApplicationService;
  let appRepository: any;
  let jobRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    appRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: getRepositoryToken(JobApplication), useValue: appRepository },
        { provide: getRepositoryToken(Job), useValue: jobRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(require('../../entities/sys-config.entity').SysConfig),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
  });

  describe('getJobApplications', () => {
    it('should get all applications for a job', async () => {
      const jobId = 1;
      const userId = 1;
      const mockJob = { id: jobId, userId };
      const mockApplications = [
        {
          id: 1,
          jobId,
          workerId: 2,
          status: 'pending',
          createdAt: new Date(),
          worker: {
            id: 2,
            name: '张三',
            creditScore: 95,
            completedJobs: 10,
            averageRating: 4.5,
          },
        },
        {
          id: 2,
          jobId,
          workerId: 3,
          status: 'pending',
          createdAt: new Date(),
          worker: {
            id: 3,
            name: '李四',
            creditScore: 90,
            completedJobs: 8,
            averageRating: 4.0,
          },
        },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.find.mockResolvedValue(mockApplications);

      const result = await service.getJobApplications(jobId, userId);

      expect(result.list).toHaveLength(2);
      expect(result.list[0].worker.name).toBe('张三');
      expect(result.list[1].worker.name).toBe('李四');
    });

    it('should throw error if job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.getJobApplications(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user is not job owner', async () => {
      const mockJob = { id: 1, userId: 1 };
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(service.getJobApplications(1, 2)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty list if no applications', async () => {
      const jobId = 1;
      const userId = 1;
      const mockJob = { id: jobId, userId };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.find.mockResolvedValue([]);

      const result = await service.getJobApplications(jobId, userId);

      expect(result.list).toHaveLength(0);
    });
  });

  describe('acceptApplication', () => {
    it('should accept a pending application', async () => {
      const jobId = 1;
      const appId = 1;
      const userId = 1;
      const mockJob = { id: jobId, userId };
      const mockApp = {
        id: appId,
        jobId,
        status: 'pending',
        acceptedAt: null,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({
        ...mockApp,
        status: 'accepted',
        acceptedAt: new Date(),
      });

      const result = await service.acceptApplication(jobId, appId, userId);

      expect(result.status).toBe('accepted');
      expect(result.acceptedAt).toBeDefined();
    });

    it('should throw error if job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acceptApplication(1, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user is not job owner', async () => {
      const mockJob = { id: 1, userId: 1 };
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.acceptApplication(1, 1, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if application not found', async () => {
      const mockJob = { id: 1, userId: 1 };
      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acceptApplication(1, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if application is not pending', async () => {
      const mockJob = { id: 1, userId: 1 };
      const mockApp = { id: 1, jobId: 1, status: 'rejected' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(
        service.acceptApplication(1, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectApplication', () => {
    it('should reject a pending application', async () => {
      const jobId = 1;
      const appId = 1;
      const userId = 1;
      const mockJob = { id: jobId, userId };
      const mockApp = {
        id: appId,
        jobId,
        status: 'pending',
        rejectedAt: null,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({
        ...mockApp,
        status: 'rejected',
        rejectedAt: new Date(),
      });

      const result = await service.rejectApplication(jobId, appId, userId);

      expect(result.status).toBe('rejected');
      expect(result.rejectedAt).toBeDefined();
    });

    it('should throw error if job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rejectApplication(1, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user is not job owner', async () => {
      const mockJob = { id: 1, userId: 1 };
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.rejectApplication(1, 1, 2),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if application not found', async () => {
      const mockJob = { id: 1, userId: 1 };
      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rejectApplication(1, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if application is not pending', async () => {
      const mockJob = { id: 1, userId: 1 };
      const mockApp = { id: 1, jobId: 1, status: 'accepted' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.findOne.mockResolvedValue(mockApp);

      await expect(
        service.rejectApplication(1, 1, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Complete Workflow', () => {
    it('should handle complete accept workflow', async () => {
      const jobId = 1;
      const appId = 1;
      const userId = 1;

      // Step 1: Get applications
      const mockJob = { id: jobId, userId };
      const mockApplications = [
        {
          id: appId,
          jobId,
          workerId: 2,
          status: 'pending',
          createdAt: new Date(),
          worker: {
            id: 2,
            name: '张三',
            creditScore: 95,
            completedJobs: 10,
            averageRating: 4.5,
          },
        },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.find.mockResolvedValue(mockApplications);

      const listResult = await service.getJobApplications(jobId, userId);
      expect(listResult.list).toHaveLength(1);
      expect(listResult.list[0].status).toBe('pending');

      // Step 2: Accept application
      const mockApp = mockApplications[0];
      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({
        ...mockApp,
        status: 'accepted',
        acceptedAt: new Date(),
      });

      const acceptResult = await service.acceptApplication(jobId, appId, userId);
      expect(acceptResult.status).toBe('accepted');
    });

    it('should handle complete reject workflow', async () => {
      const jobId = 1;
      const appId = 1;
      const userId = 1;

      // Step 1: Get applications
      const mockJob = { id: jobId, userId };
      const mockApplications = [
        {
          id: appId,
          jobId,
          workerId: 2,
          status: 'pending',
          createdAt: new Date(),
          worker: {
            id: 2,
            name: '李四',
            creditScore: 85,
            completedJobs: 5,
            averageRating: 3.5,
          },
        },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      appRepository.find.mockResolvedValue(mockApplications);

      const listResult = await service.getJobApplications(jobId, userId);
      expect(listResult.list).toHaveLength(1);

      // Step 2: Reject application
      const mockApp = mockApplications[0];
      appRepository.findOne.mockResolvedValue(mockApp);
      appRepository.save.mockResolvedValue({
        ...mockApp,
        status: 'rejected',
        rejectedAt: new Date(),
      });

      const rejectResult = await service.rejectApplication(jobId, appId, userId);
      expect(rejectResult.status).toBe('rejected');
    });
  });
});
