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
import { WorkStart } from '../../entities/work-start.entity';

describe('WorkService', () => {
  let service: WorkService;
  let checkinRepo: any;
  let workLogRepo: any;
  let appRepo: any;
  let jobRepo: any;
  let userRepo: any;
  let entCertRepo: any;
  let workStartRepo: any;

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

    workStartRepo = {
      findOne: jest.fn(),
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => payload),
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
        { provide: getRepositoryToken(WorkStart), useValue: workStartRepo },
      ],
    }).compile();

    service = module.get<WorkService>(WorkService);
    entCertRepo.findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
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
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 8, 10, 0));
    appRepo.findOne
      .mockResolvedValueOnce({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' })
      .mockResolvedValueOnce({ jobId: 1, workerId: 2, status: 'confirmed' });
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 99, isSupervisor: 1, status: 'working', worker: { id: 99, nickname: '主管' } },
      { jobId: 1, workerId: 2, isSupervisor: 0, status: 'confirmed', worker: { id: 2, nickname: '张三' } },
    ]);
    checkinRepo.findOne.mockResolvedValue(null);
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'full',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-20',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业A' },
    });
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
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'working',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '浼佷笟A' },
    });

    await service.submitLog(99, { jobId: 1, workerId: 2, pieces: 12 });

    expect(workLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 1,
      workerId: 2,
      pieces: 12,
    }));
  });

  it('returns overtime checkout metadata when check-out exceeds the flexible window', async () => {
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 2, status: 'working' });
    workLogRepo.findOne.mockResolvedValue(null);
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'working',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业A' },
    });

    const result = await service.submitLog(2, {
      jobId: 1,
      workerId: 2,
      hours: 9,
      checkOutTime: '19:40',
    });

    expect(result.checkoutMeta.status).toBe('overtime');
    expect(result.checkoutMeta.requiresEnterpriseConfirm).toBe(true);
    expect(result.checkoutMeta.overtimeMinutes).toBe(100);
  });

  it('quick-checks out with server time and auto-calculated hours', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 17, 58, 27));
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 2, status: 'working' });
    workLogRepo.findOne.mockResolvedValue(null);
    checkinRepo.findOne.mockResolvedValue({
      id: 11,
      jobId: 1,
      workerId: 2,
      checkInAt: new Date(2026, 2, 18, 8, 12, 0),
    });
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'working',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业A' },
    });

    const result = await service.quickCheckout(2, {
      jobId: 1,
      workerId: 2,
    });

    expect(result.checkOutTime).toBe('17:58:27');
    expect(result.checkInTime).toBe('08:12:00');
    expect(result.hours).toBeCloseTo(9.77, 2);
    expect(result.checkedOut).toBe(true);
    expect(workLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      checkOutTime: '17:58:27',
      checkInTime: '08:12:00',
    }));
  });

  it('updates inline attendance status and note', async () => {
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 2, status: 'working' });
    workLogRepo.findOne.mockResolvedValue({
      id: 6,
      jobId: 1,
      workerId: 2,
      date: '2026-03-18',
      anomalyType: 'normal',
      anomalyNote: '',
    });

    const result = await service.updateLogStatus(2, {
      jobId: 1,
      workerId: 2,
      attendanceStatus: 'injury',
      statusNote: '手部受伤',
    });

    expect(result.attendanceStatus).toBe('injury');
    expect(result.statusSource).toBe('manual');
    expect(workLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      anomalyType: 'injury',
      anomalyNote: '手部受伤',
    }));
  });

  it('upserts attendance report records for supervisor', async () => {
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 99, isSupervisor: 1, status: 'working' });
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 2, status: 'working' },
      { jobId: 1, workerId: 3, status: 'confirmed' },
    ]);
    workLogRepo.findOne.mockResolvedValue(null);
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'working',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '浼佷笟A' },
    });

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

  it('clears derived early-leave state when checkout time is adjusted back into the normal window', async () => {
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 2, status: 'working' });
    const existingLog = {
      id: 10,
      jobId: 1,
      workerId: 2,
      date: '2026-03-18',
      anomalyType: 'early_leave',
      checkOutTime: '17:00',
      hours: 8,
      pieces: 0,
      photoUrls: [],
    };
    workLogRepo.findOne.mockResolvedValue(existingLog);
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'working',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '浼佷笟A' },
    });

    const result = await service.submitLog(2, {
      jobId: 1,
      workerId: 2,
      hours: 8,
      checkOutTime: '18:10',
    });

    expect(workLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      anomalyType: 'normal',
      checkOutTime: '18:10',
    }));
    expect(result.checkoutMeta.status).toBe('normal');
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

  it('blocks worker checkin before the allowed time window', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 7, 0, 0));
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 2, status: 'confirmed' });
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 9, isSupervisor: 1, status: 'working', worker: { id: 9, nickname: '主管' } },
      { jobId: 1, workerId: 2, isSupervisor: 0, status: 'confirmed', worker: { id: 2, nickname: '张三' } },
    ]);
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'full',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业A' },
    });

    await expect(service.checkin(2, { jobId: 1, type: 'location' })).rejects.toThrow('未到签到时间');
  });

  it('blocks worker checkin when no supervisor is assigned', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 8, 10, 0));
    appRepo.findOne.mockResolvedValue({ jobId: 1, workerId: 2, status: 'confirmed' });
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 2, isSupervisor: 0, status: 'confirmed', worker: { id: 2, nickname: '张三' } },
    ]);
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      status: 'full',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-18',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业A' },
    });

    await expect(service.checkin(2, { jobId: 1, type: 'location' })).rejects.toThrow('企业尚未设置临工管理员');
  });

  it('returns checkin guard metadata in session response', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 7, 15, 0));
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      title: '装配工',
      status: 'full',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-20',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业B' },
    });
    checkinRepo.find.mockResolvedValue([]);
    workLogRepo.find.mockResolvedValue([]);
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 99, isSupervisor: 1, status: 'working', worker: { id: 99, nickname: '主管' } },
      { jobId: 1, workerId: 2, isSupervisor: 0, status: 'confirmed', worker: { id: 2, nickname: '张三' } },
    ]);

    const result = await service.getSession(1, 2);

    expect(result.hasSupervisor).toBe(true);
    expect(result.canCheckin).toBe(false);
    expect(result.checkinBlockedCode).toBe('too_early');
    expect(result.checkinBlockedReason).toContain('未到签到时间');
    expect(result.startTime).toBe('08:00');
    expect(result.isSupervisor).toBe(false);
  });

  it('returns checkout rule metadata in session response', async () => {
    jobRepo.findOne.mockResolvedValue({
      id: 1,
      title: '装配工',
      status: 'working',
      dateStart: '2026-03-18',
      dateEnd: '2026-03-20',
      workHours: '08:00-18:00',
      userId: 8,
      user: { nickname: '企业B' },
    });
    checkinRepo.find.mockResolvedValue([]);
    workLogRepo.find.mockResolvedValue([]);
    appRepo.find.mockResolvedValue([
      { jobId: 1, workerId: 99, isSupervisor: 1, status: 'working', worker: { id: 99, nickname: '主管' } },
      { jobId: 1, workerId: 2, isSupervisor: 0, status: 'working', worker: { id: 2, nickname: '张三' } },
    ]);
    workStartRepo.findOne.mockResolvedValue(null);

    const result = await service.getSession(1, 2);

    expect(result.checkoutRule.plannedCheckOutTime).toBe('18:00');
    expect(result.checkoutRule.checkoutWindowStartTime).toBe('17:30');
    expect(result.checkoutRule.checkoutWindowEndTime).toBe('19:00');
    expect(result.summary.presentCount).toBe(0);
    expect(result.sessionWorkers.some((item: any) => item.displayName === '张三')).toBe(true);
  });

  it('maps session workers correctly when repository ids are returned as strings', async () => {
    jobRepo.findOne.mockResolvedValue({
      id: 17,
      title: '测试工单',
      status: 'working',
      dateStart: '2026-03-22',
      dateEnd: '2026-03-22',
      workHours: '09:12-09:20',
      userId: 8,
      user: { nickname: '企业B' },
    });
    checkinRepo.find.mockResolvedValue([
      {
        id: '3',
        jobId: '17',
        workerId: '12',
        checkInAt: new Date(2026, 2, 22, 10, 5, 0),
        worker: { id: '12', name: '张三' },
      },
    ]);
    workLogRepo.find.mockResolvedValue([
      {
        id: '3',
        jobId: '17',
        workerId: '12',
        date: '2026-03-22',
        hours: '8.00',
        anomalyType: 'normal',
        anomalyNote: '',
        checkInTime: '10:05',
        checkOutTime: '18:00',
      },
    ]);
    appRepo.find.mockResolvedValue([
      { jobId: '17', workerId: '12', isSupervisor: 1, status: 'working', worker: { id: '12', name: '张三' } },
    ]);
    workStartRepo.findOne.mockResolvedValue(null);

    const result = await service.getSession(17, 12);

    expect(result.sessionWorkers[0]).toEqual(expect.objectContaining({
      workerId: 12,
      displayName: '张三',
      checkInTime: '10:05',
      checkOutTime: '18:00',
      checkedOut: true,
    }));
    expect(result.summary.checkedOutCount).toBe(1);
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
