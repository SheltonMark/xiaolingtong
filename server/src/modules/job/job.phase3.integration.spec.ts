/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { RatingService } from '../rating/rating.service';
import { DisputeService } from '../dispute/dispute.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { Attendance } from '../../entities/attendance.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Rating } from '../../entities/rating.entity';
import { Dispute } from '../../entities/dispute.entity';

describe('JobModule Phase 3 Integration Tests - Rating, Dispute & Analytics', () => {
  let jobService: JobService;
  let ratingService: RatingService;
  let disputeService: DisputeService;
  let analyticsService: AnalyticsService;

  let jobRepository: any;
  let keywordRepository: any;
  let jobApplicationRepository: any;
  let userRepository: any;
  let supervisorRepository: any;
  let attendanceRepository: any;
  let workLogRepository: any;
  let ratingRepository: any;
  let disputeRepository: any;

  // Mock data
  const mockEnterprise = {
    id: 1,
    nickname: 'Test Enterprise',
    role: 'enterprise',
    creditScore: 100,
    totalOrders: 50,
    phone: '13800000000',
  };

  const mockWorker = {
    id: 2,
    nickname: 'Test Worker',
    role: 'worker',
    creditScore: 98,
    totalOrders: 15,
    phone: '13800000001',
  };

  const mockWorker2 = {
    id: 3,
    nickname: 'Test Worker 2',
    role: 'worker',
    creditScore: 85,
    totalOrders: 5,
    phone: '13800000002',
  };

  const mockJob = {
    id: 1,
    userId: 1,
    title: 'Test Job',
    salary: 100,
    salaryType: 'hourly',
    needCount: 5,
    location: 'Beijing',
    status: 'recruiting',
    dateStart: '2026-03-20',
    dateEnd: '2026-03-21',
    createdAt: new Date('2026-03-13'),
  };

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    keywordRepository = {
      find: jest.fn(),
    };

    jobApplicationRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    supervisorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    attendanceRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    workLogRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    ratingRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    disputeRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        RatingService,
        DisputeService,
        AnalyticsService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Supervisor),
          useValue: supervisorRepository,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendanceRepository,
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
          provide: getRepositoryToken(Dispute),
          useValue: disputeRepository,
        },
      ],
    }).compile();

    jobService = module.get<JobService>(JobService);
    ratingService = module.get<RatingService>(RatingService);
    disputeService = module.get<DisputeService>(DisputeService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rating System Integration Tests', () => {
    it('should create a rating from worker to enterprise', async () => {
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 2,
        ratedId: 1,
        raterRole: 'worker',
        score: 5,
        comment: 'Great job',
        tags: ['professional', 'reliable'],
        isAnonymous: false,
        status: 'pending',
        createdAt: new Date(),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await ratingService.createRating(1, 2, 1, 'worker', {
        score: 5,
        comment: 'Great job',
        tags: ['professional', 'reliable'],
      });

      expect(result.id).toBe(1);
      expect(result.status).toBe('pending');
      expect(result.score).toBe(5);
    });

    it('should create a rating from enterprise to worker', async () => {
      const mockRating = {
        id: 2,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'enterprise',
        score: 4,
        comment: 'Good performance',
        tags: ['hardworking'],
        isAnonymous: false,
        status: 'pending',
        createdAt: new Date(),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockEnterprise);
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await ratingService.createRating(1, 1, 2, 'enterprise', {
        score: 4,
        comment: 'Good performance',
        tags: ['hardworking'],
      });

      expect(result.id).toBe(2);
      expect(result.raterRole).toBe('enterprise');
      expect(result.score).toBe(4);
    });

    it('should approve rating and update user credit score', async () => {
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 2,
        ratedId: 1,
        raterRole: 'worker',
        score: 5,
        comment: 'Great job',
        status: 'pending',
      };

      const updatedRating = { ...mockRating, status: 'approved' };
      const updatedUser = { ...mockEnterprise, creditScore: 50 };

      ratingRepository.findOne.mockResolvedValue(mockRating);
      ratingRepository.save.mockResolvedValue(updatedRating);
      ratingRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgScore: 5, count: 1 }),
      });
      userRepository.findOne.mockResolvedValue(mockEnterprise);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await ratingService.approveRating(1);

      expect(result.status).toBe('approved');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should reject rating', async () => {
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 2,
        ratedId: 1,
        status: 'pending',
      };

      const rejectedRating = { ...mockRating, status: 'rejected' };

      ratingRepository.findOne.mockResolvedValue(mockRating);
      ratingRepository.save.mockResolvedValue(rejectedRating);

      const result = await ratingService.rejectRating(1);

      expect(result.status).toBe('rejected');
    });

    it('should get ratings for a user with pagination', async () => {
      const mockRatings = [
        {
          id: 1,
          ratedId: 1,
          score: 5,
          status: 'approved',
        },
        {
          id: 2,
          ratedId: 1,
          score: 4,
          status: 'approved',
        },
      ];

      ratingRepository.findAndCount.mockResolvedValue([mockRatings, 2]);

      const result = await ratingService.getRatings(1, 1, 10);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });
  });

  describe('Dispute Handling Integration Tests', () => {
    it('should create a dispute from worker to enterprise', async () => {
      const mockDispute = {
        id: 1,
        jobId: 1,
        complainantId: 2,
        respondentId: 1,
        type: 'payment',
        description: 'Payment not received',
        evidence: ['screenshot1.jpg'],
        status: 'open',
        createdAt: new Date(),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockEnterprise);
      disputeRepository.create.mockReturnValue(mockDispute);
      disputeRepository.save.mockResolvedValue(mockDispute);

      const result = await disputeService.createDispute(2, {
        jobId: 1,
        respondentId: 1,
        type: 'payment',
        description: 'Payment not received',
        evidence: ['screenshot1.jpg'],
      });

      expect(result.id).toBe(1);
      expect(result.status).toBe('open');
      expect(result.type).toBe('payment');
    });

    it('should create a dispute from enterprise to worker', async () => {
      const mockDispute = {
        id: 2,
        jobId: 1,
        complainantId: 1,
        respondentId: 2,
        type: 'quality',
        description: 'Poor work quality',
        evidence: [],
        status: 'open',
        createdAt: new Date(),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      disputeRepository.create.mockReturnValue(mockDispute);
      disputeRepository.save.mockResolvedValue(mockDispute);

      const result = await disputeService.createDispute(1, {
        jobId: 1,
        respondentId: 2,
        type: 'quality',
        description: 'Poor work quality',
      });

      expect(result.id).toBe(2);
      expect(result.complainantId).toBe(1);
      expect(result.respondentId).toBe(2);
    });

    it('should resolve dispute with complainant win', async () => {
      const mockDispute = {
        id: 1,
        jobId: 1,
        complainantId: 2,
        respondentId: 1,
        type: 'payment',
        status: 'open',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'complainant_win',
        compensationAmount: 500,
        resolutionNotes: 'Payment confirmed',
      };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue(resolvedDispute);

      const result = await disputeService.resolveDispute(1, {
        resolution: 'complainant_win',
        compensationAmount: 500,
        resolutionNotes: 'Payment confirmed',
      });

      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('complainant_win');
      expect(result.compensationAmount).toBe(500);
    });

    it('should resolve dispute with respondent win', async () => {
      const mockDispute = {
        id: 2,
        jobId: 1,
        complainantId: 1,
        respondentId: 2,
        type: 'quality',
        status: 'open',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'respondent_win',
        resolutionNotes: 'Work quality acceptable',
      };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue(resolvedDispute);

      const result = await disputeService.resolveDispute(2, {
        resolution: 'respondent_win',
        resolutionNotes: 'Work quality acceptable',
      });

      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('respondent_win');
    });

    it('should resolve dispute with settlement', async () => {
      const mockDispute = {
        id: 3,
        jobId: 1,
        complainantId: 2,
        respondentId: 1,
        type: 'behavior',
        status: 'open',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'settlement',
        compensationAmount: 250,
        resolutionNotes: 'Both parties agreed to settlement',
      };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue(resolvedDispute);

      const result = await disputeService.resolveDispute(3, {
        resolution: 'settlement',
        compensationAmount: 250,
        resolutionNotes: 'Both parties agreed to settlement',
      });

      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('settlement');
      expect(result.compensationAmount).toBe(250);
    });

    it('should get disputes by user as complainant', async () => {
      const mockDisputes = [
        {
          id: 1,
          complainantId: 2,
          respondentId: 1,
          status: 'open',
        },
      ];

      disputeRepository.find.mockResolvedValue(mockDisputes);

      const result = await disputeService.getDisputesByUser(2, 'complainant', 1, 10);

      expect(result.length).toBe(1);
      expect(result[0].complainantId).toBe(2);
    });

    it('should update dispute status', async () => {
      const mockDispute = {
        id: 1,
        status: 'open',
      };

      const updatedDispute = { ...mockDispute, status: 'in_progress' };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue(updatedDispute);

      const result = await disputeService.updateDisputeStatus(1, 'in_progress');

      expect(result.status).toBe('in_progress');
    });
  });

  describe('Analytics Integration Tests', () => {
    it('should get job statistics', async () => {
      const mockRatings = [
        { score: 5 },
        { score: 4 },
        { score: 5 },
      ];

      const mockApplications = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      ratingRepository.find.mockResolvedValue(mockRatings);
      jobApplicationRepository.find.mockResolvedValue(mockApplications);

      const result = await analyticsService.getJobStats(1);

      expect(result.jobId).toBe(1);
      expect(result.title).toBe('Test Job');
      expect(result.averageRating).toBe(4.67);
      expect(result.totalApplications).toBe(3);
    });

    it('should get worker statistics', async () => {
      const mockWorkLogs = [
        { id: 1, workerId: 2 },
        { id: 2, workerId: 2 },
      ];

      const mockRatings = [
        { score: 5 },
        { score: 4 },
      ];

      userRepository.findOne.mockResolvedValue(mockWorker);
      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      ratingRepository.find.mockResolvedValue(mockRatings);

      const result = await analyticsService.getWorkerStats(2);

      expect(result.workerId).toBe(2);
      expect(result.nickname).toBe('Test Worker');
      expect(result.completedJobs).toBe(2);
      expect(result.averageRating).toBe(4.5);
      expect(result.totalRatings).toBe(2);
    });

    it('should get platform statistics', async () => {
      const mockUsers = [mockEnterprise, mockWorker, mockWorker2];
      const mockRatings = [
        { score: 5 },
        { score: 4 },
        { score: 3 },
      ];

      userRepository.find.mockResolvedValue(mockUsers);
      ratingRepository.find.mockResolvedValue(mockRatings);
      jobRepository.count.mockResolvedValue(10);
      userRepository.count.mockResolvedValueOnce(3);

      const result = await analyticsService.getPlatformStats();

      expect(result.totalJobs).toBe(10);
      expect(result.activeUsers).toBe(3);
      expect(result.totalWorkers).toBe(2);
      expect(result.totalEnterprises).toBe(1);
      expect(result.averagePlatformRating).toBe(4);
    });

    it('should get timeline statistics for daily period', async () => {
      const mockJobs = [mockJob];
      const mockUsers = [mockWorker];
      const mockRatings = [{ score: 5 }];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockJobs),
      };

      jobRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
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

      const result = await analyticsService.getTimelineStats('daily', '2026-03-13');

      expect(result.period).toBe('daily');
      expect(result.jobsPublished).toBe(1);
      expect(result.newUsers).toBe(1);
      expect(result.averageRating).toBe(5);
    });

    it('should get timeline statistics for weekly period', async () => {
      const mockJobs = [mockJob];
      const mockUsers = [];
      const mockRatings = [];

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

      const result = await analyticsService.getTimelineStats('weekly', '2026-03-13');

      expect(result.period).toBe('weekly');
      expect(result.jobsPublished).toBe(1);
      expect(result.newUsers).toBe(0);
      expect(result.averageRating).toBe(0);
    });

    it('should get timeline statistics for monthly period', async () => {
      const mockJobs = [mockJob];
      const mockUsers = [mockWorker];
      const mockRatings = [{ score: 4 }];

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

      const result = await analyticsService.getTimelineStats('monthly', '2026-03-13');

      expect(result.period).toBe('monthly');
      expect(result.jobsPublished).toBe(1);
      expect(result.newUsers).toBe(1);
      expect(result.averageRating).toBe(4);
    });
  });

  describe('Permission & Authorization Tests', () => {
    it('should prevent self-rating', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        ratingService.createRating(1, 2, 2, 'worker', {
          score: 5,
          comment: 'Test',
        }),
      ).rejects.toThrow('不能评价自己');
    });

    it('should prevent self-dispute', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockEnterprise);

      await expect(
        disputeService.createDispute(1, {
          jobId: 1,
          respondentId: 1,
          type: 'payment',
          description: 'Test',
        }),
      ).rejects.toThrow('Cannot dispute yourself');
    });

    it('should prevent invalid rating score', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        ratingService.createRating(1, 2, 1, 'worker', {
          score: 6,
          comment: 'Test',
        }),
      ).rejects.toThrow('评分必须在1-5之间');
    });
  });

  describe('End-to-End Workflow Tests', () => {
    it('should complete full workflow: job → rating → dispute resolution', async () => {
      // Step 1: Create rating
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 2,
        ratedId: 1,
        status: 'pending',
        score: 5,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const rating = await ratingService.createRating(1, 2, 1, 'worker', {
        score: 5,
        comment: 'Great',
      });

      expect(rating.status).toBe('pending');

      // Step 2: Approve rating
      const approvedRating = { ...mockRating, status: 'approved' };
      ratingRepository.findOne.mockResolvedValue(mockRating);
      ratingRepository.save.mockResolvedValue(approvedRating);
      ratingRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgScore: 5, count: 1 }),
      });
      userRepository.save.mockResolvedValue(mockEnterprise);

      const approved = await ratingService.approveRating(1);
      expect(approved.status).toBe('approved');

      // Step 3: Create dispute if needed
      const mockDispute = {
        id: 1,
        jobId: 1,
        complainantId: 1,
        respondentId: 2,
        status: 'open',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      disputeRepository.create.mockReturnValue(mockDispute);
      disputeRepository.save.mockResolvedValue(mockDispute);

      const dispute = await disputeService.createDispute(1, {
        jobId: 1,
        respondentId: 2,
        type: 'quality',
        description: 'Test',
      });

      expect(dispute.status).toBe('open');

      // Step 4: Resolve dispute
      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'settlement',
      };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue(resolvedDispute);

      const resolved = await disputeService.resolveDispute(1, {
        resolution: 'settlement',
        compensationAmount: 100,
      });

      expect(resolved.status).toBe('resolved');
    });

    it('should complete analytics workflow: collect data → generate stats', async () => {
      // Step 1: Get job stats
      const mockRatings = [{ score: 5 }, { score: 4 }];
      const mockApplications = [{ id: 1 }, { id: 2 }];

      jobRepository.findOne.mockResolvedValue(mockJob);
      ratingRepository.find.mockResolvedValue(mockRatings);
      jobApplicationRepository.find.mockResolvedValue(mockApplications);

      const jobStats = await analyticsService.getJobStats(1);
      expect(jobStats.averageRating).toBe(4.5);

      // Step 2: Get worker stats
      const mockWorkLogs = [{ id: 1 }];
      userRepository.findOne.mockResolvedValue(mockWorker);
      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      ratingRepository.find.mockResolvedValue(mockRatings);

      const workerStats = await analyticsService.getWorkerStats(2);
      expect(workerStats.completedJobs).toBe(1);

      // Step 3: Get platform stats
      const mockUsers = [mockEnterprise, mockWorker];
      userRepository.find.mockResolvedValue(mockUsers);
      ratingRepository.find.mockResolvedValue(mockRatings);
      jobRepository.count.mockResolvedValue(10);
      userRepository.count.mockResolvedValueOnce(2);

      const platformStats = await analyticsService.getPlatformStats();
      expect(platformStats.totalJobs).toBe(10);
      expect(platformStats.activeUsers).toBe(2);
    });
  });
});
