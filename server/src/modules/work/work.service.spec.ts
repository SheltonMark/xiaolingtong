/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkService } from './work.service';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';

describe('WorkService', () => {
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
      update: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<WorkService>(WorkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrders', () => {
    it('should return user orders', async () => {
      const mockWorkLogs = [
        {
          id: 1,
          workerId: 1,
          jobId: 1,
          date: '2026-03-15',
          hours: 8,
          pieces: 0,
          photoUrls: [],
          anomalyType: 'normal',
          anomalyNote: '',
        },
      ];

      const mockApps = [
        {
          id: 1,
          workerId: 1,
          jobId: 1,
          status: 'working',
          createdAt: new Date(),
          confirmedAt: new Date(),
          job: {
            id: 1,
            title: 'Test Job',
            location: 'Test Location',
            salary: 100,
            salaryUnit: '元/时',
            salaryType: 'hourly',
            user: { id: 2, name: 'Company', nickname: 'Company', avatarUrl: '' }
          },
        },
      ];

      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      jobApplicationRepository.find.mockResolvedValue(mockApps);

      const result = await service.getOrders(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].status).toBe('working');
    });

    it('should return empty array when no work logs', async () => {
      workLogRepository.find.mockResolvedValue([]);

      const result = await service.getOrders(1);

      expect(result).toEqual([]);
    });

    it('should determine correct stage', async () => {
      const mockWorkLogs = [
        {
          id: 1,
          workerId: 1,
          jobId: 1,
          date: '2026-03-15',
          hours: 8,
          pieces: 0,
          photoUrls: [],
          anomalyType: 'normal',
          anomalyNote: '',
        },
      ];

      const mockApps = [
        {
          id: 1,
          workerId: 1,
          jobId: 1,
          status: 'done',
          createdAt: new Date(),
          confirmedAt: new Date(),
          job: {
            id: 1,
            title: 'Test Job',
            location: 'Test Location',
            salary: 100,
            salaryUnit: '元/时',
            salaryType: 'hourly',
            user: { id: 2, name: 'Company', nickname: 'Company', avatarUrl: '' }
          },
        },
      ];

      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      jobApplicationRepository.find.mockResolvedValue(mockApps);

      const result = await service.getOrders(1);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('done');
      expect(result[0].hours).toBe(8);
    });
  });

  describe('getSession', () => {
    it('should return job session', async () => {
      const mockJob = { id: 1, title: 'Test Job', user: { id: 2 } };

      jobRepository.findOne.mockResolvedValue(mockJob);
      checkinRepository.find.mockResolvedValue([]);
      workLogRepository.find.mockResolvedValue([]);
      jobApplicationRepository.find.mockResolvedValue([]);

      const result = await service.getSession(1);

      expect(result).toBeDefined();
      expect(result.job).toBeDefined();
    });

    it('should return null when job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      const result = await service.getSession(999);

      expect(result.job).toBeNull();
    });
  });
});
