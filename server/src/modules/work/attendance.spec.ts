import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkService } from './work.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { User } from '../../entities/user.entity';

describe('AttendanceManagement', () => {
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

  describe('recordAttendance', () => {
    it('should record attendance for worker', async () => {
      const applicationId = 1;
      const workerId = 1;

      const app = {
        id: applicationId,
        workerId,
        status: 'working',
        attendance: null,
      } as any;

      jest.spyOn(appRepo, 'findOne').mockResolvedValue(app);
      jest.spyOn(appRepo, 'save').mockResolvedValue({
        ...app,
        attendance: { checkedIn: true, checkedInAt: new Date() }
      });

      const result = await service.recordAttendance(applicationId, workerId);

      expect(result.attendance).toBeDefined();
      expect(result.attendance.checkedIn).toBe(true);
    });

    it('should return attendance status for job', async () => {
      const jobId = 1;

      const applications = [
        { id: 1, status: 'working', attendance: { checkedIn: true, checkedInAt: new Date() } },
        { id: 2, status: 'working', attendance: { checkedIn: false } },
        { id: 3, status: 'working', attendance: null },
      ] as any;

      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.getAttendanceStatus(jobId);

      expect(result.totalWorkers).toBe(3);
      expect(result.checkedIn).toBe(1);
      expect(result.notCheckedIn).toBe(2);
    });

    it('should confirm work start', async () => {
      const jobId = 1;

      const applications = [
        { id: 1, status: 'working', attendance: { checkedIn: true } },
        { id: 2, status: 'working', attendance: { checkedIn: true } },
      ] as any;

      jest.spyOn(appRepo, 'find').mockResolvedValue(applications);

      const result = await service.confirmWorkStart(jobId);

      expect(result.confirmedCount).toBe(2);
      expect(result.status).toBe('confirmed');
    });
  });
});
