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
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';

describe('Phase 3: WorkService anomalies', () => {
  let service: WorkService;
  let workLogRepo: any;
  let appRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    workLogRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
    };

    appRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    userRepo = {
      decrement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkService,
        { provide: getRepositoryToken(Checkin), useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(WorkLog), useValue: workLogRepo },
        { provide: getRepositoryToken(JobApplication), useValue: appRepo },
        { provide: getRepositoryToken(Job), useValue: { findOne: jest.fn(), findOneBy: jest.fn(), update: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(EnterpriseCert), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
      ],
    }).compile();

    service = module.get<WorkService>(WorkService);
  });

  it('maps early to early_leave and stores supervisor-targeted anomaly', async () => {
    appRepo.findOne
      .mockResolvedValueOnce({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' })
      .mockResolvedValueOnce({ jobId: 1, workerId: 2, status: 'working' });
    workLogRepo.findOne.mockResolvedValue(null);

    await service.recordAnomaly(99, {
      jobId: 1,
      targetWorkerId: 2,
      anomalyType: 'early',
      anomalyNote: '提前离岗',
      time: '16:00',
      hours: 6,
    });

    expect(workLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      workerId: 2,
      anomalyType: 'early_leave',
      checkOutTime: '16:00',
      hours: 6,
    }));
    expect(userRepo.decrement).toHaveBeenCalledWith({ id: 2 }, 'creditScore', 5);
  });

  it('does not penalize injury anomalies', async () => {
    appRepo.findOne
      .mockResolvedValueOnce({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' })
      .mockResolvedValueOnce({ jobId: 1, workerId: 2, status: 'working' });
    workLogRepo.findOne.mockResolvedValue(null);

    await service.recordAnomaly(99, {
      jobId: 1,
      targetWorkerId: 2,
      anomalyType: 'injury',
      anomalyNote: '轻微受伤',
    });

    expect(userRepo.decrement).not.toHaveBeenCalled();
  });
});
