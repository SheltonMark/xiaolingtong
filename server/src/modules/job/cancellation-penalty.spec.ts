import { NotificationTriggerService } from '../notification/notification-trigger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Keyword } from '../../entities/keyword.entity';

describe('CancellationPenalty', () => {
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
        {
          provide: NotificationTriggerService,
          useValue: {
            notifyApplicationSubmitted: jest.fn(),
            notifyNewApplication: jest.fn(),
            notifyApplicationAccepted: jest.fn(),
            notifyApplicationRejected: jest.fn(),
            notifyApplicationCancelled: jest.fn(),
            notifyApplicationCancelledEnterprise: jest.fn(),
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

  describe('calculateCancellationPenalty', () => {
    it('should return no penalty when cancelled > 24h before work', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 2天前取消
      const cancelledAt = new Date('2026-03-18T10:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty).toEqual({
        creditDeduction: 0,
        restrictionDays: 0,
        message: '无惩罚'
      });
    });

    it('should deduct 5 credits when cancelled 12-24h before work', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 22小时前取消
      const cancelledAt = new Date('2026-03-19T10:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty).toEqual({
        creditDeduction: 5,
        restrictionDays: 0,
        message: '扣信用分5分'
      });
    });

    it('should deduct 10 credits + 24h restriction when cancelled 0-12h before work', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 2小时前取消
      const cancelledAt = new Date('2026-03-20T06:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty).toEqual({
        creditDeduction: 10,
        restrictionDays: 1,
        message: '扣信用分10分，限制报名24小时'
      });
    });

    it('should deduct 20 credits + 7d restriction when cancelled after work starts', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 工作已开始1小时
      const cancelledAt = new Date('2026-03-20T09:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty).toEqual({
        creditDeduction: 20,
        restrictionDays: 7,
        message: '扣信用分20分，限制报名7天'
      });
    });

    it('should handle edge case: exactly 24h before work', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 恰好24小时前
      const cancelledAt = new Date('2026-03-19T08:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty.creditDeduction).toBe(0);
    });

    it('should handle edge case: exactly 12h before work', () => {
      const job = {
        dateStart: '2026-03-20',
        workHours: '08:00-17:00',
      } as Job;

      // 恰好12小时前
      const cancelledAt = new Date('2026-03-19T20:00:00');

      const penalty = service.calculateCancellationPenalty(job, cancelledAt);

      expect(penalty.creditDeduction).toBe(5);
    });
  });
});
