/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { Attendance } from '../../entities/attendance.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';

describe('JobService', () => {
  let service: JobService;
  let jobRepository: any;
  let keywordRepository: any;
  let jobApplicationRepository: any;
  let userRepository: any;
  let supervisorRepository: any;
  let attendanceRepository: any;
  let workLogRepository: any;
  let workerCertRepository: any;

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    keywordRepository = {
      find: jest.fn(),
    };

    jobApplicationRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    supervisorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    attendanceRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    workLogRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    workerCertRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Supervisor),
          useValue: supervisorRepository,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendanceRepository,
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: workLogRepository,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepository,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeText', () => {
    it('should handle null and undefined', () => {
      expect(service['normalizeText'](null)).toBe('');
      expect(service['normalizeText'](undefined)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(service['normalizeText']('  test  ')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(service['normalizeText']('')).toBe('');
    });
  });

  describe('parseSalaryType', () => {
    it('should parse piece salary type', () => {
      expect(service['parseSalaryType']('piece')).toBe('piece');
      expect(service['parseSalaryType']('按件')).toBe('piece');
    });

    it('should parse hourly salary type', () => {
      expect(service['parseSalaryType']('hourly')).toBe('hourly');
      expect(service['parseSalaryType']('按小时')).toBe('hourly');
    });

    it('should default to hourly for unknown types', () => {
      expect(service['parseSalaryType']('unknown')).toBe('hourly');
    });
  });

  describe('checkKeywords', () => {
    it('should allow text without prohibited keywords', async () => {
      keywordRepository.find.mockResolvedValue([
        { word: 'prohibited' },
        { word: 'banned' },
      ]);

      await expect(
        service['checkKeywords']('This is a normal job'),
      ).resolves.not.toThrow();
    });

    it('should throw error when prohibited keyword found', async () => {
      keywordRepository.find.mockResolvedValue([{ word: 'prohibited' }]);

      await expect(
        service['checkKeywords']('This is prohibited'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should be case sensitive (matches actual implementation)', async () => {
      keywordRepository.find.mockResolvedValue([{ word: 'prohibited' }]);

      // The actual implementation is case-sensitive, so PROHIBITED should not match
      await expect(
        service['checkKeywords']('This is PROHIBITED'),
      ).resolves.not.toThrow();
    });
  });

  describe('list', () => {
    it('should return jobs with pagination', async () => {
      const mockJobs = [
        { id: 1, title: 'Job 1', salary: 100, salaryType: 'hourly' },
      ];

      jobRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockJobs, 1]),
      });

      keywordRepository.find.mockResolvedValue([]);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by keyword', async () => {
      const mockJobs = [];

      jobRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockJobs, 0]),
      });

      keywordRepository.find.mockResolvedValue([]);

      const result = await service.list({
        keyword: 'test',
        page: 1,
        pageSize: 20,
      });

      expect(result.list).toEqual([]);
    });

    it('should handle empty result', async () => {
      jobRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      keywordRepository.find.mockResolvedValue([]);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('detail', () => {
    it('should return job detail', async () => {
      const mockJob = { id: 1, userId: 1, title: 'Test Job', salary: 100 };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.count.mockResolvedValue(5);

      const result = await service.detail(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create job successfully', async () => {
      const dto = {
        title: 'New Job',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-20',
      };

      const mockJob = { id: 1, userId: 1, ...dto };

      keywordRepository.find.mockResolvedValue([]);
      jobRepository.create.mockReturnValue(mockJob);
      jobRepository.save.mockResolvedValue(mockJob);

      const result = await service.create(1, dto);

      expect(result).toBeDefined();
      expect(jobRepository.save).toHaveBeenCalled();
    });

    it('should throw error on keyword violation', async () => {
      const dto = {
        title: 'prohibited job',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-20',
      };

      keywordRepository.find.mockResolvedValue([{ word: 'prohibited' }]);

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update job successfully', async () => {
      const mockJob = { id: 1, userId: 1, title: 'Old Title' };
      const updateDto = { title: 'New Title' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      keywordRepository.find.mockResolvedValue([]);
      jobRepository.save.mockResolvedValue({ ...mockJob, ...updateDto });

      const result = await service.update(1, 1, updateDto);

      expect(result).toBeDefined();
      expect(jobRepository.save).toHaveBeenCalled();
    });

    it('should throw error on unauthorized update', async () => {
      const mockJob = { id: 1, userId: 2, title: 'Old Title' };

      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.update(1, 1, { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(1, 1, { title: 'New Title' }),
      ).rejects.toThrow();
    });
  });

  describe('myJobs', () => {
    it('should return user jobs', async () => {
      const mockJobs = [
        {
          id: 1,
          userId: 1,
          title: 'Job 1',
          salary: 100,
          salaryUnit: '元/时',
          needCount: 5,
          dateStart: '2026-03-10',
          dateEnd: '2026-03-20',
          workHours: '8:00-17:00',
          location: 'Beijing',
          status: 'recruiting',
          createdAt: new Date(),
        },
      ];

      jobRepository.find.mockResolvedValue(mockJobs);
      jobApplicationRepository.count.mockResolvedValue(0);

      const result = await service.myJobs(1);

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should return empty array when no jobs', async () => {
      jobRepository.find.mockResolvedValue([]);

      const result = await service.myJobs(1);

      expect(result.list).toEqual([]);
    });
  });

  describe('checkIn', () => {
    it('should check in successfully', async () => {
      const mockJob = { id: 1, userId: 1 };
      const mockWorker = { id: 2, creditScore: 100 };
      const mockApplication = { id: 1, jobId: 1, workerId: 2, status: 'confirmed' };
      const mockAttendance = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
        checkInTime: new Date(),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      attendanceRepository.findOne.mockResolvedValue(null);
      attendanceRepository.create.mockReturnValue(mockAttendance);
      attendanceRepository.save.mockResolvedValue(mockAttendance);

      const result = await service.checkIn(1, 2);

      expect(result.status).toBe('checked_in');
      expect(attendanceRepository.save).toHaveBeenCalled();
    });

    it('should throw error when already checked in', async () => {
      const mockJob = { id: 1, userId: 1 };
      const mockWorker = { id: 2, creditScore: 100 };
      const mockApplication = { id: 1, jobId: 1, workerId: 2, status: 'confirmed' };
      const mockExisting = { id: 1, jobId: 1, workerId: 2, status: 'checked_in' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      attendanceRepository.findOne.mockResolvedValue(mockExisting);

      await expect(service.checkIn(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when worker not confirmed', async () => {
      const mockJob = { id: 1, userId: 1 };
      const mockWorker = { id: 2, creditScore: 100 };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue(null);

      await expect(service.checkIn(1, 2)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('should check out successfully', async () => {
      const checkInTime = new Date(Date.now() - 3600000); // 1 hour ago
      const mockAttendance = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
        checkInTime,
      };

      attendanceRepository.findOne.mockResolvedValue(mockAttendance);
      attendanceRepository.save.mockResolvedValue({
        ...mockAttendance,
        status: 'checked_out',
        checkOutTime: new Date(),
        workHours: 1,
      });

      const result = await service.checkOut(1, 2);

      expect(result.status).toBe('checked_out');
      expect(result).toHaveProperty('workHours');
      expect(attendanceRepository.save).toHaveBeenCalled();
    });

    it('should throw error when not checked in', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(service.checkOut(1, 2)).rejects.toThrow();
    });
  });

  describe('getAttendances', () => {
    it('should get attendances for job', async () => {
      const mockJob = { id: 1, userId: 1 };
      const mockAttendances = [
        { id: 1, jobId: 1, workerId: 2, status: 'checked_out', workHours: 8 },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      attendanceRepository.find.mockResolvedValue(mockAttendances);

      const result = await service.getAttendances(1, 1);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should throw error when not job owner', async () => {
      const mockJob = { id: 1, userId: 2 };

      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(service.getAttendances(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('applyJob', () => {
    it('should apply job successfully', async () => {
      const mockJob = { id: 1, dateStart: '2026-03-15', dateEnd: '2026-03-15' };
      const mockWorker = { id: 2, role: 'worker' };
      const mockCert = { id: 1, userId: 2, status: 'approved' };
      const mockApplication = { id: 1, jobId: 1, workerId: 2, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      workerCertRepository.findOne.mockResolvedValue(mockCert);
      jobApplicationRepository.findOne.mockResolvedValue(null);
      jobApplicationRepository.find.mockResolvedValue([]);
      jobApplicationRepository.create.mockReturnValue(mockApplication);
      jobApplicationRepository.save.mockResolvedValue(mockApplication);

      const result = await service.applyJob(1, 2);

      expect(result).toEqual(mockApplication);
      expect(jobApplicationRepository.save).toHaveBeenCalled();
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.applyJob(1, 2)).rejects.toThrow('工作不存在');
    });

    it('should throw error when worker not certified', async () => {
      const mockJob = { id: 1 };
      const mockWorker = { id: 2 };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      workerCertRepository.findOne.mockResolvedValue(null);

      await expect(service.applyJob(1, 2)).rejects.toThrow('请先完成实名认证');
    });

    it('should throw error when already applied', async () => {
      const mockJob = { id: 1 };
      const mockWorker = { id: 2 };
      const mockCert = { id: 1, status: 'approved' };
      const mockExisting = { id: 1, jobId: 1, workerId: 2, status: 'pending' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      workerCertRepository.findOne.mockResolvedValue(mockCert);
      jobApplicationRepository.findOne.mockResolvedValue(mockExisting);

      await expect(service.applyJob(1, 2)).rejects.toThrow('您已报名过此工作');
    });

    it('should throw error when time conflict', async () => {
      const mockJob = { id: 1, dateStart: '2026-03-15', dateEnd: '2026-03-15' };
      const mockWorker = { id: 2 };
      const mockCert = { id: 1, status: 'approved' };
      const mockConflict = {
        id: 2,
        jobId: 2,
        workerId: 2,
        status: 'confirmed',
        job: { id: 2, dateStart: '2026-03-15', dateEnd: '2026-03-15', title: 'Conflict Job' },
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      workerCertRepository.findOne.mockResolvedValue(mockCert);
      jobApplicationRepository.findOne.mockResolvedValue(null);
      jobApplicationRepository.find.mockResolvedValue([mockConflict]);

      await expect(service.applyJob(1, 2)).rejects.toThrow('工作时间冲突');
    });
  });
});
