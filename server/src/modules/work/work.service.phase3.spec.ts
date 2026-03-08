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

describe('Phase 3: WorkService - Checkin, Logs, and Anomalies', () => {
  let service: WorkService;
  let checkinRepo: any;
  let workLogRepo: any;
  let appRepo: any;
  let jobRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    checkinRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    workLogRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    appRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    jobRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      decrement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkService,
        {
          provide: getRepositoryToken(Checkin),
          useValue: checkinRepo,
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: workLogRepo,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: appRepo,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<WorkService>(WorkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkin', () => {
    it('should create and save a checkin record', async () => {
      const dto = { jobId: 1, type: 'location', lat: 39.9, lng: 116.4 };
      const checkinEntity = { id: 1, workerId: 5, ...dto, checkInAt: new Date() };

      checkinRepo.create.mockReturnValue(checkinEntity);
      checkinRepo.save.mockResolvedValue(checkinEntity);
      jobRepo.findOneBy.mockResolvedValue({ id: 1, status: 'full' });
      jobRepo.update.mockResolvedValue({ affected: 1 });
      appRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.checkin(5, dto);

      expect(checkinRepo.create).toHaveBeenCalled();
      expect(checkinRepo.save).toHaveBeenCalled();
      expect(result).toEqual(checkinEntity);
    });

    it('should update job status to "working" on first checkin', async () => {
      const dto = { jobId: 1, type: 'location', lat: 39.9, lng: 116.4 };
      const checkinEntity = { id: 1, workerId: 5, ...dto, checkInAt: new Date() };

      checkinRepo.create.mockReturnValue(checkinEntity);
      checkinRepo.save.mockResolvedValue(checkinEntity);
      jobRepo.findOneBy.mockResolvedValue({ id: 1, status: 'full' });
      jobRepo.update.mockResolvedValue({ affected: 1 });
      appRepo.update.mockResolvedValue({ affected: 1 });

      await service.checkin(5, dto);

      expect(jobRepo.update).toHaveBeenCalledWith(1, { status: 'working' });
    });

    it('should NOT update job status when already "working"', async () => {
      const dto = { jobId: 1, type: 'location', lat: 39.9, lng: 116.4 };
      const checkinEntity = { id: 1, workerId: 5, ...dto, checkInAt: new Date() };

      checkinRepo.create.mockReturnValue(checkinEntity);
      checkinRepo.save.mockResolvedValue(checkinEntity);
      jobRepo.findOneBy.mockResolvedValue({ id: 1, status: 'working' });
      appRepo.update.mockResolvedValue({ affected: 1 });

      await service.checkin(5, dto);

      expect(jobRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('submitLog', () => {
    it('should create and save a work log with hours and pieces', async () => {
      const dto = { jobId: 1, hours: 8, pieces: 10 };
      const logEntity = { id: 1, workerId: 5, ...dto, date: '2026-03-08' };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);

      const result = await service.submitLog(5, dto);

      expect(workLogRepo.create).toHaveBeenCalled();
      expect(workLogRepo.save).toHaveBeenCalled();
      expect(result).toEqual(logEntity);
    });

    it('should default date to today when dto.date not provided', async () => {
      const dto = { jobId: 1, hours: 8, pieces: 10 };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);

      await service.submitLog(5, dto);

      const createCall = workLogRepo.create.mock.calls[0][0];
      expect(createCall.date).toBeDefined();
      expect(typeof createCall.date).toBe('string');
    });
  });

  describe('recordAnomaly', () => {
    it('should create anomaly log with anomalyType and note', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'absent',
        anomalyNote: 'Worker did not show up',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      const result = await service.recordAnomaly(5, dto);

      expect(workLogRepo.create).toHaveBeenCalled();
      expect(workLogRepo.save).toHaveBeenCalled();
      expect(result).toEqual(logEntity);
    });

    it('should decrement creditScore by 5 for "absent"', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'absent',
        anomalyNote: 'Absent',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: 5 },
        'creditScore',
        5,
      );
    });

    it('should decrement creditScore by 20 for "fraud"', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'fraud',
        anomalyNote: 'Fraudulent activity',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: 5 },
        'creditScore',
        20,
      );
    });

    it('should NOT call decrement for "injury" (penalty=0)', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'injury',
        anomalyNote: 'Worker injured',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).not.toHaveBeenCalled();
    });

    it('should decrement creditScore by 5 for "early_leave"', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'early_leave',
        anomalyNote: 'Left early',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: 5 },
        'creditScore',
        5,
      );
    });

    it('should decrement creditScore by 2 for "late"', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'late',
        anomalyNote: 'Arrived late',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: 5 },
        'creditScore',
        2,
      );
    });

    it('should use targetWorkerId when provided', async () => {
      const dto = {
        jobId: 1,
        targetWorkerId: 10,
        anomalyType: 'absent',
        anomalyNote: 'Target worker absent',
      };
      const logEntity = { id: 1, workerId: 10, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: 10 },
        'creditScore',
        5,
      );
    });

    it('should use current workerId when targetWorkerId not provided', async () => {
      const dto = {
        jobId: 1,
        anomalyType: 'fraud',
        anomalyNote: 'Fraud detected',
      };
      const logEntity = { id: 1, workerId: 5, ...dto };

      workLogRepo.create.mockReturnValue(logEntity);
      workLogRepo.save.mockResolvedValue(logEntity);
      userRepo.decrement.mockResolvedValue({ affected: 1 });

      await service.recordAnomaly(5, dto);

      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: 5 },
        'creditScore',
        20,
      );
    });
  });
});
