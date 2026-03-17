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

describe('WorkService', () => {
  let service: WorkService;
  let checkinRepo: any;
  let workLogRepo: any;
  let appRepo: any;
  let jobRepo: any;
  let userRepo: any;
  let entCertRepo: any;

  beforeEach(async () => {
    checkinRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
    };

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

    jobRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    userRepo = {
      decrement: jest.fn(),
    };

    entCertRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkService,
        { provide: getRepositoryToken(Checkin), useValue: checkinRepo },
        { provide: getRepositoryToken(WorkLog), useValue: workLogRepo },
        { provide: getRepositoryToken(JobApplication), useValue: appRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(EnterpriseCert), useValue: entCertRepo },
      ],
    }).compile();

    service = module.get<WorkService>(WorkService);
    entCertRepo.findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('maps supervisor jobs to correct stage in getOrders', async () => {
    appRepo.find.mockResolvedValue([
      { workerId: 9, isSupervisor: 1, job: { id: 1, status: 'pending_settlement', userId: 2, user: { nickname: '企业A' } } },
    ]);

    const result = await service.getOrders(9);

    expect(result[0].stage).toBe('settlement');
    expect(result[0].companyName).toBe('企业A');
  });

  it('allows supervisor to manually check in another worker', async () => {
    appRepo.findOne
      .mockResolvedValueOnce({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' })
      .mockResolvedValueOnce({ jobId: 1, workerId: 2, status: 'confirmed' });
    checkinRepo.findOne.mockResolvedValue(null);
    jobRepo.findOneBy.mockResolvedValue({ id: 1, status: 'full' });
    workLogRepo.findOne.mockResolvedValue(null);

    await service.checkin(99, { jobId: 1, workerId: 2, type: 'manual' });

    expect(checkinRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 1,
      workerId: 2,
      checkInType: 'manual',
    }));
    expect(appRepo.update).toHaveBeenCalledWith(
      { jobId: 1, workerId: 2, status: 'confirmed' },
      { status: 'working' },
    );
  });

  it('allows supervisor to save another worker piece log', async () => {
    appRepo.findOne
      .mockResolvedValueOnce({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' })
      .mockResolvedValueOnce({ jobId: 1, workerId: 2, status: 'working' });
    workLogRepo.findOne.mockResolvedValue(null);

    await service.submitLog(99, { jobId: 1, workerId: 2, pieces: 12 });

    expect(workLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 1,
      workerId: 2,
      pieces: 12,
    }));
  });

  it('upserts attendance report records for supervisor', async () => {
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' });
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 2, status: 'working' },
      { jobId: 1, workerId: 3, status: 'confirmed' },
    ]);
    workLogRepo.findOne.mockResolvedValue(null);

    const result = await service.submitAttendance(99, {
      jobId: 1,
      records: [
        { workerId: 2, attendance: 'normal', checkInTime: '08:05', checkOutTime: '18:00', hours: 8 },
        { workerId: 3, attendance: 'absent', hours: 0 },
      ],
      photos: ['https://img.test/photo-1.jpg'],
    });

    expect(result.count).toBe(2);
    expect(workLogRepo.create).toHaveBeenCalledTimes(2);
  });

  it('returns attendance summary with photos and supervisor info', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 1, title: '装配工', userId: 8, user: { nickname: '企业B' } });
    appRepo.find.mockResolvedValue([
      { workerId: 99, isSupervisor: 1, status: 'working', worker: { id: 99, nickname: '主管' } },
      { workerId: 2, isSupervisor: 0, status: 'working', worker: { id: 2, nickname: '张三' } },
    ]);
    workLogRepo.find.mockResolvedValue([
      {
        workerId: 2,
        hours: 8,
        pieces: 0,
        anomalyType: 'late',
        anomalyNote: '迟到10分钟',
        checkInTime: '08:10',
        checkOutTime: '18:00',
        photoUrls: ['https://img.test/photo-1.jpg'],
        createdAt: new Date('2026-03-17T10:00:00.000Z'),
        updatedAt: new Date('2026-03-17T10:30:00.000Z'),
      },
    ]);
    checkinRepo.find.mockResolvedValue([]);

    const result = await service.getAttendance(1, '2026-03-17');

    expect(result.summary.totalExpected).toBe(2);
    expect(result.records[1].attendance).toBe('late');
    expect(result.photos).toEqual(['https://img.test/photo-1.jpg']);
    expect(result.supervisor.name).toBe('主管');
  });

  it('confirms attendance and advances the workflow', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 1, userId: 8, status: 'working', user: { nickname: '企业B' } });
    workLogRepo.count.mockResolvedValue(2);

    const result = await service.confirmAttendance(8, 1);

    expect(result.message).toContain('进入结算流程');
    expect(jobRepo.update).toHaveBeenCalledWith(1, { status: 'pending_settlement' });
    expect(appRepo.update).toHaveBeenCalledWith(
      { jobId: 1, status: 'working' },
      { status: 'done' },
    );
  });
});
