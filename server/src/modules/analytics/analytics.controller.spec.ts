import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  JobStatsDto,
  WorkerStatsDto,
  PlatformStatsDto,
  TimelineStatsDto,
} from './analytics.dto';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockJobStats: JobStatsDto = {
    jobId: 1,
    title: 'Test Job',
    publishedAt: new Date('2026-03-01'),
    completedCount: 5,
    averageRating: 4.5,
    totalApplications: 10,
  };

  const mockWorkerStats: WorkerStatsDto = {
    workerId: 1,
    nickname: 'Test Worker',
    completedJobs: 15,
    totalIncome: 5000,
    averageRating: 4.8,
    totalRatings: 20,
  };

  const mockPlatformStats: PlatformStatsDto = {
    totalJobs: 100,
    totalIncome: 50000,
    activeUsers: 500,
    totalWorkers: 300,
    totalEnterprises: 200,
    averagePlatformRating: 4.6,
  };

  const mockTimelineStats: TimelineStatsDto = {
    period: 'daily',
    date: '2026-03-13',
    jobsPublished: 10,
    jobsCompleted: 8,
    totalIncome: 2000,
    newUsers: 5,
    averageRating: 4.5,
  };

  beforeEach(async () => {
    analyticsService = {
      getJobStats: jest.fn(),
      getWorkerStats: jest.fn(),
      getPlatformStats: jest.fn(),
      getTimelineStats: jest.fn(),
    } as jest.Mocked<AnalyticsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: analyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  describe('GET /analytics/jobs/:jobId', () => {
    it('should successfully retrieve job statistics', async () => {
      analyticsService.getJobStats.mockResolvedValue(mockJobStats);

      const result = await controller.getJobStats(1);

      expect(analyticsService.getJobStats).toHaveBeenCalledWith(1);
      expect(result.jobId).toBe(1);
      expect(result.title).toBe('Test Job');
      expect(result.averageRating).toBe(4.5);
      expect(result.totalApplications).toBe(10);
    });

    it('should throw NotFoundException when job does not exist', async () => {
      analyticsService.getJobStats.mockRejectedValue(
        new NotFoundException('Job with ID 999 not found'),
      );

      await expect(controller.getJobStats(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(analyticsService.getJobStats).toHaveBeenCalledWith(999);
    });

    it('should return job stats with zero ratings', async () => {
      const statsWithoutRatings = {
        ...mockJobStats,
        averageRating: 0,
        totalApplications: 0,
      };
      analyticsService.getJobStats.mockResolvedValue(statsWithoutRatings);

      const result = await controller.getJobStats(2);

      expect(result.averageRating).toBe(0);
      expect(result.totalApplications).toBe(0);
    });
  });

  describe('GET /analytics/workers/:workerId', () => {
    it('should successfully retrieve worker statistics', async () => {
      analyticsService.getWorkerStats.mockResolvedValue(mockWorkerStats);

      const result = await controller.getWorkerStats(1);

      expect(analyticsService.getWorkerStats).toHaveBeenCalledWith(1);
      expect(result.workerId).toBe(1);
      expect(result.nickname).toBe('Test Worker');
      expect(result.completedJobs).toBe(15);
      expect(result.averageRating).toBe(4.8);
    });

    it('should throw NotFoundException when worker does not exist', async () => {
      analyticsService.getWorkerStats.mockRejectedValue(
        new NotFoundException('Worker with ID 999 not found'),
      );

      await expect(controller.getWorkerStats(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(analyticsService.getWorkerStats).toHaveBeenCalledWith(999);
    });

    it('should return worker stats with zero completed jobs', async () => {
      const newWorkerStats = {
        ...mockWorkerStats,
        completedJobs: 0,
        totalIncome: 0,
      };
      analyticsService.getWorkerStats.mockResolvedValue(newWorkerStats);

      const result = await controller.getWorkerStats(2);

      expect(result.completedJobs).toBe(0);
      expect(result.totalIncome).toBe(0);
    });

    it('should return worker stats with high rating', async () => {
      const topWorkerStats = { ...mockWorkerStats, averageRating: 5.0 };
      analyticsService.getWorkerStats.mockResolvedValue(topWorkerStats);

      const result = await controller.getWorkerStats(3);

      expect(result.averageRating).toBe(5.0);
    });
  });

  describe('GET /analytics/platform', () => {
    it('should successfully retrieve platform statistics', async () => {
      analyticsService.getPlatformStats.mockResolvedValue(mockPlatformStats);

      const result = await controller.getPlatformStats();

      expect(analyticsService.getPlatformStats).toHaveBeenCalled();
      expect(result.totalJobs).toBe(100);
      expect(result.activeUsers).toBe(500);
      expect(result.totalWorkers).toBe(300);
      expect(result.totalEnterprises).toBe(200);
      expect(result.averagePlatformRating).toBe(4.6);
    });

    it('should return platform stats with correct user distribution', async () => {
      const stats = {
        ...mockPlatformStats,
        totalWorkers: 350,
        totalEnterprises: 150,
      };
      analyticsService.getPlatformStats.mockResolvedValue(stats);

      const result = await controller.getPlatformStats();

      expect(result.totalWorkers).toBe(350);
      expect(result.totalEnterprises).toBe(150);
      expect(result.totalWorkers + result.totalEnterprises).toBe(500);
    });

    it('should return platform stats with zero income', async () => {
      const stats = { ...mockPlatformStats, totalIncome: 0 };
      analyticsService.getPlatformStats.mockResolvedValue(stats);

      const result = await controller.getPlatformStats();

      expect(result.totalIncome).toBe(0);
    });
  });

  describe('GET /analytics/timeline', () => {
    it('should successfully retrieve daily timeline statistics', async () => {
      analyticsService.getTimelineStats.mockResolvedValue(mockTimelineStats);

      const result = await controller.getTimelineStats('daily', '2026-03-13');

      expect(analyticsService.getTimelineStats).toHaveBeenCalledWith(
        'daily',
        '2026-03-13',
      );
      expect(result.period).toBe('daily');
      expect(result.jobsPublished).toBe(10);
      expect(result.newUsers).toBe(5);
    });

    it('should successfully retrieve weekly timeline statistics', async () => {
      const weeklyStats = { ...mockTimelineStats, period: 'weekly' as const };
      analyticsService.getTimelineStats.mockResolvedValue(weeklyStats);

      const result = await controller.getTimelineStats('weekly', '2026-03-13');

      expect(analyticsService.getTimelineStats).toHaveBeenCalledWith(
        'weekly',
        '2026-03-13',
      );
      expect(result.period).toBe('weekly');
    });

    it('should successfully retrieve monthly timeline statistics', async () => {
      const monthlyStats = { ...mockTimelineStats, period: 'monthly' as const };
      analyticsService.getTimelineStats.mockResolvedValue(monthlyStats);

      const result = await controller.getTimelineStats('monthly', '2026-03-13');

      expect(analyticsService.getTimelineStats).toHaveBeenCalledWith(
        'monthly',
        '2026-03-13',
      );
      expect(result.period).toBe('monthly');
    });

    it('should use default date when date parameter is not provided', async () => {
      analyticsService.getTimelineStats.mockResolvedValue(mockTimelineStats);

      await controller.getTimelineStats('daily');

      expect(analyticsService.getTimelineStats).toHaveBeenCalledWith(
        'daily',
        expect.any(String),
      );
    });

    it('should use default period when period parameter is not provided', async () => {
      analyticsService.getTimelineStats.mockResolvedValue(mockTimelineStats);

      await controller.getTimelineStats();

      expect(analyticsService.getTimelineStats).toHaveBeenCalledWith(
        'daily',
        expect.any(String),
      );
    });

    it('should throw BadRequestException for invalid period', async () => {
      analyticsService.getTimelineStats.mockRejectedValue(
        new BadRequestException('Invalid period: invalid'),
      );

      await expect(
        controller.getTimelineStats('invalid' as any, '2026-03-13'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return timeline stats with zero jobs published', async () => {
      const emptyStats = {
        ...mockTimelineStats,
        jobsPublished: 0,
        jobsCompleted: 0,
      };
      analyticsService.getTimelineStats.mockResolvedValue(emptyStats);

      const result = await controller.getTimelineStats('daily', '2026-03-13');

      expect(result.jobsPublished).toBe(0);
      expect(result.jobsCompleted).toBe(0);
    });
  });
});
