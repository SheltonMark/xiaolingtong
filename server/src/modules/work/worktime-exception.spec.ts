import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkService } from './work.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { User } from '../../entities/user.entity';

describe('WorktimeAndException', () => {
  let service: WorkService;
  let appRepo: Repository<JobApplication>;
  let jobRepo: Repository<Job>;
  let checkinRepo: Repository<Checkin>;
  let workLogRepo: Repository<WorkLog>;
  let userRepo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkService,
        {
          provide: getRepositoryToken(JobApplication),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Job),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Checkin),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            decrement: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkService>(WorkService);
    appRepo = module.get<Repository<JobApplication>>(getRepositoryToken(JobApplication));
    jobRepo = module.get<Repository<Job>>(getRepositoryToken(Job));
    checkinRepo = module.get<Repository<Checkin>>(getRepositoryToken(Checkin));
    workLogRepo = module.get<Repository<WorkLog>>(getRepositoryToken(WorkLog));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('recordWorktime', () => {
    it('should record hourly worktime', async () => {
      const applicationId = 1;
      const workerId = 1;

      const workLog = {
        id: 1,
        applicationId,
        workerId,
        worktimeType: 'hourly',
        hours: 8,
        amount: 800,
        createdAt: new Date(),
      };

      jest.spyOn(workLogRepo, 'create').mockReturnValue(workLog as any);
      jest.spyOn(workLogRepo, 'save').mockResolvedValue(workLog as any);

      const result = await service.recordWorktime(applicationId, workerId, {
        worktimeType: 'hourly',
        hours: 8,
        amount: 800,
      });

      expect(result.worktimeType).toBe('hourly');
      expect(result.hours).toBe(8);
    });

    it('should record piece worktime', async () => {
      const applicationId = 1;
      const workerId = 1;

      const workLog = {
        id: 1,
        applicationId,
        workerId,
        worktimeType: 'piece',
        pieces: 100,
        amount: 500,
        createdAt: new Date(),
      };

      jest.spyOn(workLogRepo, 'create').mockReturnValue(workLog as any);
      jest.spyOn(workLogRepo, 'save').mockResolvedValue(workLog as any);

      const result = await service.recordWorktime(applicationId, workerId, {
        worktimeType: 'piece',
        pieces: 100,
        amount: 500,
      });

      expect(result.worktimeType).toBe('piece');
      expect(result.pieces).toBe(100);
    });
  });

  describe('reportException', () => {
    it('should report absence exception and deduct credits', async () => {
      const applicationId = 1;
      const workerId = 1;

      const workLog = {
        id: 1,
        applicationId,
        workerId,
        anomalyType: 'absent',
        description: 'Worker did not show up',
        createdAt: new Date(),
      };

      jest.spyOn(workLogRepo, 'create').mockReturnValue(workLog as any);
      jest.spyOn(workLogRepo, 'save').mockResolvedValue(workLog as any);
      jest.spyOn(userRepo, 'decrement').mockResolvedValue({} as any);

      const result = await service.reportException(applicationId, workerId, {
        anomalyType: 'absent',
        description: 'Worker did not show up',
      });

      expect(result.anomalyType).toBe('absent');
      expect(userRepo.decrement).toHaveBeenCalled();
    });

    it('should report early leave exception', async () => {
      const applicationId = 1;
      const workerId = 1;

      const workLog = {
        id: 1,
        applicationId,
        workerId,
        anomalyType: 'early_leave',
        description: 'Worker left early',
        createdAt: new Date(),
      };

      jest.spyOn(workLogRepo, 'create').mockReturnValue(workLog as any);
      jest.spyOn(workLogRepo, 'save').mockResolvedValue(workLog as any);
      jest.spyOn(userRepo, 'decrement').mockResolvedValue({} as any);

      const result = await service.reportException(applicationId, workerId, {
        anomalyType: 'early_leave',
        description: 'Worker left early',
      });

      expect(result.anomalyType).toBe('early_leave');
    });

    it('should report fraud exception with high penalty', async () => {
      const applicationId = 1;
      const workerId = 1;

      const workLog = {
        id: 1,
        applicationId,
        workerId,
        anomalyType: 'fraud',
        description: 'Worktime fraud detected',
        createdAt: new Date(),
      };

      jest.spyOn(workLogRepo, 'create').mockReturnValue(workLog as any);
      jest.spyOn(workLogRepo, 'save').mockResolvedValue(workLog as any);
      jest.spyOn(userRepo, 'decrement').mockResolvedValue({} as any);

      const result = await service.reportException(applicationId, workerId, {
        anomalyType: 'fraud',
        description: 'Worktime fraud detected',
      });

      expect(result.anomalyType).toBe('fraud');
      // Fraud should have 20 point penalty
      expect(userRepo.decrement).toHaveBeenCalledWith(
        { id: workerId },
        'creditScore',
        20
      );
    });

    it('should support uploading photos with exception', async () => {
      const applicationId = 1;
      const workerId = 1;

      const workLog = {
        id: 1,
        applicationId,
        workerId,
        anomalyType: 'injury',
        description: 'Worker injury on site',
        photos: ['photo1.jpg', 'photo2.jpg'],
        createdAt: new Date(),
      };

      jest.spyOn(workLogRepo, 'create').mockReturnValue(workLog as any);
      jest.spyOn(workLogRepo, 'save').mockResolvedValue(workLog as any);

      const result = await service.reportException(applicationId, workerId, {
        anomalyType: 'injury',
        description: 'Worker injury on site',
        photos: ['photo1.jpg', 'photo2.jpg'],
      });

      expect(result.photos).toHaveLength(2);
    });
  });

  describe('getExceptionTypes', () => {
    it('should return all exception types', () => {
      const types = service.getExceptionTypes();

      expect(types).toContain('absent');
      expect(types).toContain('early_leave');
      expect(types).toContain('late');
      expect(types).toContain('injury');
      expect(types).toContain('fraud');
    });
  });

  describe('getPenaltyForException', () => {
    it('should return correct penalty for each exception type', () => {
      expect(service.getPenaltyForException('absent')).toBe(5);
      expect(service.getPenaltyForException('early_leave')).toBe(5);
      expect(service.getPenaltyForException('late')).toBe(2);
      expect(service.getPenaltyForException('injury')).toBe(0);
      expect(service.getPenaltyForException('fraud')).toBe(20);
    });
  });
});
