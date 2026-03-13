import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { Attendance } from '../../entities/attendance.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Supervisor } from '../../entities/supervisor.entity';

describe('AttendanceManagement', () => {
  let service: JobService;
  let jobRepository: any;
  let userRepository: any;
  let attendanceRepository: any;

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    attendanceRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const keywordRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const appRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    const supervisorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendanceRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: appRepository,
        },
        {
          provide: getRepositoryToken(Supervisor),
          useValue: supervisorRepository,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  describe('checkIn', () => {
    it('should check in successfully', async () => {
      const jobId = 1;
      const workerId = 2;

      const mockJob = { id: jobId, status: 'recruiting' };
      const mockWorker = { id: workerId };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      attendanceRepository.findOne.mockResolvedValue(null);
      attendanceRepository.create.mockReturnValue({
        jobId,
        workerId,
        status: 'checked_in',
        checkInTime: new Date(),
      });
      attendanceRepository.save.mockResolvedValue({
        id: 1,
        jobId,
        workerId,
        status: 'checked_in',
        checkInTime: new Date(),
      });

      const result = await service.checkIn(jobId, workerId);

      expect(result).toBeDefined();
      expect(result.status).toBe('checked_in');
      expect(attendanceRepository.save).toHaveBeenCalled();
    });

    it('should reject if already checked in', async () => {
      const jobId = 1;
      const workerId = 2;

      const mockJob = { id: jobId };
      const mockWorker = { id: workerId };
      const existingAttendance = { id: 1, status: 'checked_in' };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      attendanceRepository.findOne.mockResolvedValue(existingAttendance);

      await expect(service.checkIn(jobId, workerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if job not found', async () => {
      const jobId = 1;
      const workerId = 2;

      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.checkIn(jobId, workerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if worker not found', async () => {
      const jobId = 1;
      const workerId = 2;

      const mockJob = { id: jobId };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.checkIn(jobId, workerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkOut', () => {
    it('should check out successfully', async () => {
      const jobId = 1;
      const workerId = 2;
      const checkInTime = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago

      const mockAttendance = {
        id: 1,
        jobId,
        workerId,
        status: 'checked_in',
        checkInTime,
        checkOutTime: null,
      };

      attendanceRepository.findOne.mockResolvedValue(mockAttendance);
      attendanceRepository.save.mockResolvedValue({
        ...mockAttendance,
        status: 'checked_out',
        checkOutTime: new Date(),
        workHours: 8,
      });

      const result = await service.checkOut(jobId, workerId);

      expect(result).toBeDefined();
      expect(result.status).toBe('checked_out');
      expect(result.workHours).toBe(8);
    });

    it('should calculate work hours correctly', async () => {
      const jobId = 1;
      const workerId = 2;
      const checkInTime = new Date(Date.now() - 5.5 * 60 * 60 * 1000); // 5.5 hours ago

      const mockAttendance = {
        id: 1,
        jobId,
        workerId,
        status: 'checked_in',
        checkInTime,
        checkOutTime: null,
      };

      attendanceRepository.findOne.mockResolvedValue(mockAttendance);
      attendanceRepository.save.mockResolvedValue({
        ...mockAttendance,
        status: 'checked_out',
        checkOutTime: new Date(),
        workHours: 5.5,
      });

      const result = await service.checkOut(jobId, workerId);

      expect(result.workHours).toBe(5.5);
    });

    it('should reject if not checked in', async () => {
      const jobId = 1;
      const workerId = 2;

      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(service.checkOut(jobId, workerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAttendances', () => {
    it('should get attendances for job', async () => {
      const jobId = 1;

      const mockAttendances = [
        { id: 1, jobId, workerId: 2, status: 'checked_out', workHours: 8 },
        { id: 2, jobId, workerId: 3, status: 'checked_in', workHours: 0 },
      ];

      attendanceRepository.find.mockResolvedValue(mockAttendances);

      const result = await service.getAttendances(jobId);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('checked_out');
      expect(result[1].status).toBe('checked_in');
    });

    it('should return empty array if no attendances', async () => {
      const jobId = 1;

      attendanceRepository.find.mockResolvedValue([]);

      const result = await service.getAttendances(jobId);

      expect(result).toHaveLength(0);
    });

    it('should include worker relations', async () => {
      const jobId = 1;

      const mockAttendances = [
        {
          id: 1,
          jobId,
          workerId: 2,
          status: 'checked_out',
          worker: { id: 2, nickname: 'Worker 1' },
        },
      ];

      attendanceRepository.find.mockResolvedValue(mockAttendances);

      const result = await service.getAttendances(jobId);

      expect(result[0].worker).toBeDefined();
      expect(result[0].worker.nickname).toBe('Worker 1');
    });
  });
});
