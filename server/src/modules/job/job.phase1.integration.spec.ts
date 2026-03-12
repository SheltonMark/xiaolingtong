import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Keyword } from '../../entities/keyword.entity';

describe('Phase 1 Integration Tests', () => {
  let service: JobService;
  let jobRepo: Repository<Job>;
  let appRepo: Repository<JobApplication>;
  let userRepo: Repository<User>;
  let keywordRepo: Repository<Keyword>;

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    jobRepo = module.get<Repository<Job>>(getRepositoryToken(Job));
    appRepo = module.get<Repository<JobApplication>>(getRepositoryToken(JobApplication));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    keywordRepo = module.get<Repository<Keyword>>(getRepositoryToken(Keyword));
  });

  describe('Complete workflow', () => {
    it('should handle time conflict check during application', async () => {
      const workerId = 1;
      const jobId = 2;

      const newJob = {
        id: jobId,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '16:00-18:00',
      } as Job;

      const existingJob = {
        id: 1,
        title: '搬家工',
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      const existingApp = {
        jobId: 1,
        workerId,
        status: 'confirmed',
        job: existingJob,
      } as JobApplication;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(newJob);
      jest.spyOn(appRepo, 'find').mockResolvedValue([existingApp]);

      const conflicts = await service.checkTimeConflict(workerId, jobId);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].jobId).toBe(1);
    });

    it('should allow application when no time conflict', async () => {
      const workerId = 1;
      const jobId = 2;

      const newJob = {
        id: jobId,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '18:00-20:00',
      } as Job;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(newJob);
      jest.spyOn(appRepo, 'find').mockResolvedValue([]);
      jest.spyOn(appRepo, 'create').mockReturnValue({
        jobId,
        workerId,
        status: 'pending',
      } as any);
      jest.spyOn(appRepo, 'save').mockResolvedValue({
        id: 1,
        jobId,
        workerId,
        status: 'pending',
      } as any);

      const result = await service.applyJob(jobId, workerId);

      expect(result.status).toBe('pending');
    });

    it('should calculate correct penalty for cancellation', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 2小时前取消
      const cancelledAt = new Date('2026-03-20T06:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty.creditDeduction).toBe(10);
      expect(penalty.restrictionDays).toBe(1);
    });

    it('should cancel application and deduct credits', async () => {
      const applicationId = 1;
      const workerId = 1;

      const job = {
        id: 1,
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      const app = {
        id: applicationId,
        jobId: 1,
        workerId,
        status: 'confirmed',
        job,
      } as JobApplication;

      const worker = {
        id: workerId,
        creditScore: 100,
      } as User;

      jest.spyOn(appRepo, 'findOne').mockResolvedValue(app);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(worker);
      jest.spyOn(appRepo, 'save').mockResolvedValue({ ...app, status: 'cancelled' });
      jest.spyOn(userRepo, 'save').mockResolvedValue(worker);

      const result = await service.cancelApplication(applicationId, workerId);

      expect(result.status).toBe('cancelled');
      expect(result.penalty).toBeDefined();
    });

    it('should format status display for worker', async () => {
      const workerId = 1;

      const applications = [
        {
          id: 1,
          status: 'pending',
          job: { id: 1, title: 'Job 1' },
          job: { id: 1, title: 'Job 1' },
        },
        {
          id: 2,
          status: 'confirmed',
          job: { id: 2, title: 'Job 2' },
        },
        {
          id: 3,
          status: 'rejected',
          job: { id: 3, title: 'Job 3' },
        },
      ] as any;

      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getMyApplicationsGrouped(workerId);

      expect(result.normal.pending).toHaveLength(1);
      expect(result.normal.confirmed).toHaveLength(1);
      expect(result.exception.rejected).toHaveLength(1);
    });

    it('should group applications by status category', async () => {
      const workerId = 1;

      const applications = [
        { id: 1, status: 'pending', job: { id: 1 } },
        { id: 2, status: 'confirmed', job: { id: 2 } },
        { id: 3, status: 'working', job: { id: 3 } },
        { id: 4, status: 'done', job: { id: 4 } },
        { id: 5, status: 'rejected', job: { id: 5 } },
        { id: 6, status: 'released', job: { id: 6 } },
        { id: 7, status: 'cancelled', job: { id: 7 } },
      ] as any;

      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getMyApplicationsGrouped(workerId);

      expect(result.normal.pending).toHaveLength(1);
      expect(result.normal.confirmed).toHaveLength(1);
      expect(result.normal.working).toHaveLength(1);
      expect(result.normal.done).toHaveLength(1);
      expect(result.exception.rejected).toHaveLength(1);
      expect(result.exception.released).toHaveLength(1);
      expect(result.exception.cancelled).toHaveLength(1);
    });
  });
});
