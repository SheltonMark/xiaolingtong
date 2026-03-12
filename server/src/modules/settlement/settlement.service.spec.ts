import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettlementService } from './settlement.service';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';

describe('SettlementService', () => {
  let service: SettlementService;
  let jobRepo: Repository<Job>;
  let appRepo: Repository<JobApplication>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        {
          provide: getRepositoryToken(Job),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
    jobRepo = module.get<Repository<Job>>(getRepositoryToken(Job));
    appRepo = module.get<Repository<JobApplication>>(getRepositoryToken(JobApplication));
  });

  describe('getSettlementDashboard', () => {
    it('should return grouped jobs by status', async () => {
      const userId = 1;
      const jobs = [
        { id: 1, userId, status: 'recruiting', title: 'Job 1', salary: 100, salaryUnit: '元/时', needCount: 5, dateStart: '2026-03-20', dateEnd: '2026-03-20', createdAt: new Date() },
        { id: 2, userId, status: 'full', title: 'Job 2', salary: 150, salaryUnit: '元/时', needCount: 10, dateStart: '2026-03-21', dateEnd: '2026-03-21', createdAt: new Date() },
      ] as any;

      jest.spyOn(jobRepo, 'find').mockResolvedValue(jobs);
      jest.spyOn(appRepo, 'count').mockResolvedValue(5);

      const result = await service.getSettlementDashboard(userId);

      expect(result.recruiting).toHaveLength(1);
      expect(result.full).toHaveLength(1);
      expect(result.recruiting[0].title).toBe('Job 1');
    });
  });

  describe('getJobApplications', () => {
    it('should return applications grouped by status', async () => {
      const jobId = 1;
      const userId = 1;

      const job = { id: jobId, userId } as any;
      const applications = [
        { id: 1, jobId, status: 'pending', worker: { id: 1, nickname: 'Worker 1', phone: '13800138000', creditScore: 95, totalOrders: 10 }, createdAt: new Date() },
        { id: 2, jobId, status: 'accepted', worker: { id: 2, nickname: 'Worker 2', phone: '13800138001', creditScore: 98, totalOrders: 15 }, createdAt: new Date() },
      ] as any;

      jest.spyOn(jobRepo, 'findOne').mockResolvedValue(job);
      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getJobApplications(jobId, userId);

      expect(result.pending).toHaveLength(1);
      expect(result.accepted).toHaveLength(1);
      expect(result.pending[0].workerName).toBe('Worker 1');
    });
  });

  describe('getSettlementRecords', () => {
    it('should return settlement records for completed jobs', async () => {
      const userId = 1;

      const jobs = [
        {
          id: 1,
          userId,
          title: 'Job 1',
          salary: 100,
          salaryType: 'hourly',
          applications: [
            { status: 'done' },
            { status: 'done' },
          ],
          createdAt: new Date(),
        },
      ] as any;

      jest.spyOn(jobRepo, 'find').mockResolvedValue(jobs);

      const result = await service.getSettlementRecords(userId);

      expect(result).toHaveLength(1);
      expect(result[0].completedCount).toBe(2);
      expect(result[0].totalAmount).toBe(1600); // 100 * 8 * 2
    });
  });
});
