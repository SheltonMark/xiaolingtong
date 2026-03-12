import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Keyword } from '../../entities/keyword.entity';

describe('TimeConflictCheck', () => {
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

  describe('checkTimeConflict', () => {
    it('should return empty array when no conflicts', async () => {
      const workerId = 1;
      const jobId = 2;

      const newJob = {
        id: jobId,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(newJob);
      jest.spyOn(appRepo, 'find').mockResolvedValue([]);

      const result = await service.checkTimeConflict(workerId, jobId);

      expect(result).toEqual([]);
    });

    it('should detect conflict when applying for overlapping job on same day', async () => {
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

      const result = await service.checkTimeConflict(workerId, jobId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        jobId: 1,
        jobTitle: '搬家工',
        dateRange: '2026-03-20~2026-03-20',
        workHours: '08:00-17:00',
      });
    });

    it('should not detect conflict when time slots do not overlap', async () => {
      const workerId = 1;
      const jobId = 2;

      const newJob = {
        id: jobId,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '18:00-20:00',
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

      const result = await service.checkTimeConflict(workerId, jobId);

      expect(result).toEqual([]);
    });

    it('should detect conflict when dates overlap', async () => {
      const workerId = 1;
      const jobId = 2;

      const newJob = {
        id: jobId,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-21',
        workHours: '08:00-17:00',
      } as Job;

      const existingJob = {
        id: 1,
        title: '搬家工',
        dateStart: '2026-03-19',
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

      const result = await service.checkTimeConflict(workerId, jobId);

      expect(result).toHaveLength(1);
    });

    it('should check only accepted, confirmed, and working applications', async () => {
      const workerId = 1;
      const jobId = 2;

      const newJob = {
        id: jobId,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(newJob);
      jest.spyOn(appRepo, 'find').mockResolvedValue([]);

      await service.checkTimeConflict(workerId, jobId);

      expect(appRepo.find).toHaveBeenCalledWith({
        where: {
          workerId,
          status: expect.objectContaining({
            _value: expect.arrayContaining(['accepted', 'confirmed', 'working']),
          }),
        },
        relations: ['job'],
      });
    });
  });
});
