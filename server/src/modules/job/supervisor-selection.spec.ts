import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Keyword } from '../../entities/keyword.entity';
import { NotificationTriggerService } from '../notification/notification-trigger.service';

describe('SupervisorSelection', () => {
  let service: JobService;
  let jobRepo: Repository<Job>;
  let appRepo: Repository<JobApplication>;
  let userRepo: Repository<User>;
  let keywordRepo: Repository<Keyword>;
  let notificationTrigger: any;

  beforeEach(async () => {
    notificationTrigger = {
      notifyApplicationSubmitted: jest.fn(),
      notifyNewApplication: jest.fn(),
      notifyApplicationAccepted: jest.fn(),
      notifyApplicationRejected: jest.fn(),
      notifyApplicationCancelled: jest.fn(),
      notifyApplicationCancelledEnterprise: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: NotificationTriggerService,
          useValue: notificationTrigger,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    jobRepo = module.get<Repository<Job>>(getRepositoryToken(Job));
    appRepo = module.get<Repository<JobApplication>>(getRepositoryToken(JobApplication));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    keywordRepo = module.get<Repository<Keyword>>(getRepositoryToken(Keyword));
  });

  describe('getEligibleSupervisors', () => {
    it('should return eligible supervisors with credit >= 95 and orders >= 10', async () => {
      const jobId = 1;
      const userId = 1;

      const job = { id: jobId, userId } as Job;

      const applications = [
        {
          id: 1,
          jobId,
          status: 'accepted',
          worker: { id: 1, nickname: 'Worker 1', creditScore: 95, totalOrders: 10, phone: '13800138000' },
        },
        {
          id: 2,
          jobId,
          status: 'accepted',
          worker: { id: 2, nickname: 'Worker 2', creditScore: 98, totalOrders: 15, phone: '13800138001' },
        },
        {
          id: 3,
          jobId,
          status: 'accepted',
          worker: { id: 3, nickname: 'Worker 3', creditScore: 90, totalOrders: 20, phone: '13800138002' },
        },
      ] as any;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(job);
      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getEligibleSupervisors(jobId, userId);

      expect(result).toHaveLength(2);
      expect(result[0].creditScore).toBeGreaterThanOrEqual(95);
      expect(result[0].totalOrders).toBeGreaterThanOrEqual(10);
    });

    it('should return empty array when no eligible supervisors', async () => {
      const jobId = 1;
      const userId = 1;

      const job = { id: jobId, userId } as Job;

      const applications = [
        {
          id: 1,
          jobId,
          status: 'accepted',
          worker: { id: 1, nickname: 'Worker 1', creditScore: 90, totalOrders: 5, phone: '13800138000' },
        },
      ] as any;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(job);
      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getEligibleSupervisors(jobId, userId);

      expect(result).toHaveLength(0);
    });

    it('should include both accepted and confirmed status workers', async () => {
      const jobId = 1;
      const userId = 1;

      const job = { id: jobId, userId } as Job;

      const applications = [
        {
          id: 1,
          jobId,
          status: 'accepted',
          worker: { id: 1, nickname: 'Worker 1', creditScore: 95, totalOrders: 10, phone: '13800138000' },
        },
        {
          id: 2,
          jobId,
          status: 'confirmed',
          worker: { id: 2, nickname: 'Worker 2', creditScore: 98, totalOrders: 15, phone: '13800138001' },
        },
      ] as any;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(job);
      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getEligibleSupervisors(jobId, userId);

      expect(result).toHaveLength(2);
    });
  });
});
