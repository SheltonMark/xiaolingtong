/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Rating } from '../../entities/rating.entity';
import { JobApplication } from '../../entities/job-application.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let jobRepository: any;
  let userRepository: any;
  let workLogRepository: any;
  let ratingRepository: any;
  let jobApplicationRepository: any;

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    workLogRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    ratingRepository = {
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jobApplicationRepository = {
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: workLogRepository,
        },
        {
          provide: getRepositoryToken(Rating),
          useValue: ratingRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getJobStats', () => {
    it('should return job statistics successfully', async () => {
      const jobId = 1;
      const mockJob = {
        id: jobId,
        title: 'Test Job',
        userId: 1,
        createdAt: new Date('2026-03-01'),
      };

      const mockRatings = [
        { score: 5, jobId },
        { score: 4, jobId },
        { score: 5, jobId },
      ];

      const mockApplications = [
        { id: 1, jobId, status: 'accepted' },
        { id: 2, jobId, status: 'rejected' },
        { id: 3, jobId, status: 'accepted' },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      ratingRepository.find.mockResolvedValue(mockRatings);
      jobApplicationRepository.find.mockResolvedValue(mockApplications);

      const result = await service.getJobStats(jobId);

      expect(result).toBeDefined();
      expect(result.jobId).toBe(jobId);
      expect(result.title).toBe('Test Job');
      expect(result.averageRating).toBe(4.67);
      expect(result.totalApplications).toBe(3);
      expect(jobRepository.findOne).toHaveBeenCalledWith({ where: { id: jobId } });
    });

    it('should throw NotFoundException when job does not exist', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.getJobStats(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle job with no ratings', async () => {
      const jobId = 1;
      const mockJob = {
        id: jobId,
        title: 'Test Job',
        userId: 1,
        createdAt: new Date('2026-03-01'),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      ratingRepository.find.mockResolvedValue([]);
      jobApplicationRepository.find.mockResolvedValue([]);

      const result = await service.getJobStats(jobId);

      expect(result.averageRating).toBe(0);
      expect(result.totalApplications).toBe(0);
    });
  });

  describe('getWorkerStats', () => {
    it('should return worker statistics successfully', async () => {
      const workerId = 1;
      const mockWorker = {
        id: workerId,
        nickname: 'Test Worker',
        role: 'worker',
      };

      const mockWorkLogs = [
        { jobId: 1, workerId, hours: 8 },
        { jobId: 2, workerId, hours: 8 },
      ];

      const mockRatings = [
        { score: 5, ratedId: workerId },
        { score: 4, ratedId: workerId },
      ];

      userRepository.findOne.mockResolvedValue(mockWorker);
      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      ratingRepository.find.mockResolvedValue(mockRatings);

      const result = await service.getWorkerStats(workerId);

      expect(result).toBeDefined();
      expect(result.workerId).toBe(workerId);
      expect(result.nickname).toBe('Test Worker');
      expect(result.completedJobs).toBe(2);
      expect(result.averageRating).toBe(4.5);
      expect(result.totalRatings).toBe(2);
    });

    it('should throw NotFoundException when worker does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getWorkerStats(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle worker with no work logs', async () => {
      const workerId = 1;
      const mockWorker = {
        id: workerId,
        nickname: 'Test Worker',
        role: 'worker',
      };

      userRepository.findOne.mockResolvedValue(mockWorker);
      workLogRepository.find.mockResolvedValue([]);
      ratingRepository.find.mockResolvedValue([]);

      const result = await service.getWorkerStats(workerId);

      expect(result.completedJobs).toBe(0);
      expect(result.totalIncome).toBe(0);
      expect(result.averageRating).toBe(0);
    });
  });

  describe('getPlatformStats', () => {
    it('should return platform statistics successfully', async () => {
      const mockJobs = [
        { id: 1, status: 'settled' },
        { id: 2, status: 'settled' },
        { id: 3, status: 'recruiting' },
      ];

      const mockUsers = [
        { id: 1, role: 'worker', createdAt: new Date() },
        { id: 2, role: 'enterprise', createdAt: new Date() },
        { id: 3, role: 'worker', createdAt: new Date() },
      ];

      const mockRatings = [
        { score: 5 },
        { score: 4 },
        { score: 5 },
      ];

      jobRepository.find.mockResolvedValue(mockJobs);
      jobRepository.count.mockResolvedValue(3);
      userRepository.find.mockResolvedValue(mockUsers);
      userRepository.count.mockResolvedValue(3);
      ratingRepository.find.mockResolvedValue(mockRatings);

      const result = await service.getPlatformStats();

      expect(result).toBeDefined();
      expect(result.totalJobs).toBe(3);
      expect(result.totalWorkers).toBe(2);
      expect(result.totalEnterprises).toBe(1);
      expect(result.averagePlatformRating).toBe(4.67);
    });

    it('should handle platform with no data', async () => {
      jobRepository.find.mockResolvedValue([]);
      jobRepository.count.mockResolvedValue(0);
      userRepository.find.mockResolvedValue([]);
      userRepository.count.mockResolvedValue(0);
      ratingRepository.find.mockResolvedValue([]);

      const result = await service.getPlatformStats();

      expect(result.totalJobs).toBe(0);
      expect(result.totalWorkers).toBe(0);
      expect(result.totalEnterprises).toBe(0);
      expect(result.averagePlatformRating).toBe(0);
    });
  });

  describe('getTimelineStats', () => {
    it('should return daily timeline statistics', async () => {
      const period = 'daily';
      const date = '2026-03-13';

      const mockJobs = [
        { id: 1, createdAt: new Date('2026-03-13T10:00:00'), status: 'recruiting' },
        { id: 2, createdAt: new Date('2026-03-13T14:00:00'), status: 'recruiting' },
      ];

      const mockSettledJobs = [
        { id: 3, status: 'settled', updatedAt: new Date('2026-03-13T15:00:00') },
      ];

      const mockUsers = [
        { id: 1, createdAt: new Date('2026-03-13T09:00:00') },
        { id: 2, createdAt: new Date('2026-03-13T11:00:00') },
      ];

      const mockRatings = [
        { score: 5, createdAt: new Date('2026-03-13T12:00:00') },
        { score: 4, createdAt: new Date('2026-03-13T13:00:00') },
      ];

      jobRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockJobs),
      });

      userRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      });

      ratingRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockRatings),
      });

      const result = await service.getTimelineStats(period, date);

      expect(result).toBeDefined();
      expect(result.period).toBe('daily');
      expect(result.date).toBe(date);
      expect(result.jobsPublished).toBe(2);
      expect(result.newUsers).toBe(2);
      expect(result.averageRating).toBe(4.5);
    });

    it('should return weekly timeline statistics', async () => {
      const period = 'weekly';
      const date = '2026-03-13';

      jobRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      userRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      ratingRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getTimelineStats(period, date);

      expect(result.period).toBe('weekly');
    });

    it('should return monthly timeline statistics', async () => {
      const period = 'monthly';
      const date = '2026-03-13';

      jobRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      userRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      ratingRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getTimelineStats(period, date);

      expect(result.period).toBe('monthly');
    });

    it('should throw BadRequestException for invalid period', async () => {
      await expect(service.getTimelineStats('invalid' as any, '2026-03-13')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Edge cases and data accuracy', () => {
    it('should calculate average rating correctly with decimal precision', async () => {
      const jobId = 1;
      const mockJob = {
        id: jobId,
        title: 'Test Job',
        userId: 1,
        createdAt: new Date('2026-03-01'),
      };

      const mockRatings = [
        { score: 5, jobId },
        { score: 3, jobId },
        { score: 4, jobId },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      ratingRepository.find.mockResolvedValue(mockRatings);
      jobApplicationRepository.find.mockResolvedValue([]);

      const result = await service.getJobStats(jobId);

      expect(result.averageRating).toBe(4);
    });

    it('should handle large numbers in platform statistics', async () => {
      const mockJobs = Array(1000)
        .fill(null)
        .map((_, i) => ({ id: i, status: 'settled' }));

      const mockUsers = Array(500)
        .fill(null)
        .map((_, i) => ({ id: i, role: i % 2 === 0 ? 'worker' : 'enterprise' }));

      jobRepository.find.mockResolvedValue(mockJobs);
      jobRepository.count.mockResolvedValue(1000);
      userRepository.find.mockResolvedValue(mockUsers);
      userRepository.count.mockResolvedValue(500);
      ratingRepository.find.mockResolvedValue([]);

      const result = await service.getPlatformStats();

      expect(result.totalJobs).toBe(1000);
      expect(result.totalWorkers).toBe(250);
      expect(result.totalEnterprises).toBe(250);
    });
  });
});
