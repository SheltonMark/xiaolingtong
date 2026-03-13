import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { Attendance } from '../../entities/attendance.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WorkLogManagement', () => {
  let service: JobService;
  let jobRepository: any;
  let userRepository: any;
  let workLogRepository: any;
  let keywordRepository: any;
  let appRepository: any;
  let supervisorRepository: any;
  let attendanceRepository: any;

  beforeEach(async () => {
    jobRepository = { findOne: jest.fn() };
    userRepository = { findOne: jest.fn() };
    workLogRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    keywordRepository = { find: jest.fn() };
    appRepository = {};
    supervisorRepository = {};
    attendanceRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: getRepositoryToken(Job), useValue: jobRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(WorkLog), useValue: workLogRepository },
        { provide: getRepositoryToken(Keyword), useValue: keywordRepository },
        { provide: getRepositoryToken(JobApplication), useValue: appRepository },
        { provide: getRepositoryToken(Supervisor), useValue: supervisorRepository },
        { provide: getRepositoryToken(Attendance), useValue: attendanceRepository },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  describe('recordWorkLog', () => {
    it('should record work log successfully', async () => {
      const jobId = 1;
      const workerId = 2;
      const date = '2026-03-13';
      const hours = 8;
      const pieces = 100;

      const mockJob = { id: jobId };
      const mockWorker = { id: workerId };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      workLogRepository.create.mockReturnValue({
        jobId,
        workerId,
        date,
        hours,
        pieces,
        anomalyType: 'normal',
      });
      workLogRepository.save.mockResolvedValue({
        id: 1,
        jobId,
        workerId,
        date,
        hours,
        pieces,
        anomalyType: 'normal',
        createdAt: new Date(),
      });

      const result = await service.recordWorkLog(jobId, workerId, date, hours, pieces);

      expect(result).toBeDefined();
      expect(result.anomalyType).toBe('normal');
      expect(workLogRepository.save).toHaveBeenCalled();
    });

    it('should reject if job not found', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.recordWorkLog(1, 2, '2026-03-13', 8, 100)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if worker not found', async () => {
      const mockJob = { id: 1 };
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.recordWorkLog(1, 2, '2026-03-13', 8, 100)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if work hours invalid', async () => {
      const mockJob = { id: 1 };
      const mockWorker = { id: 2 };
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(service.recordWorkLog(1, 2, '2026-03-13', -1, 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if work hours exceed 24', async () => {
      const mockJob = { id: 1 };
      const mockWorker = { id: 2 };
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(service.recordWorkLog(1, 2, '2026-03-13', 25, 100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject if piece count negative', async () => {
      const mockJob = { id: 1 };
      const mockWorker = { id: 2 };
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(service.recordWorkLog(1, 2, '2026-03-13', 8, -1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getWorkLogs', () => {
    it('should get work logs for job', async () => {
      const jobId = 1;
      const mockLogs = [
        { id: 1, jobId, workerId: 2, date: '2026-03-13', hours: 8, anomalyType: 'normal' },
        { id: 2, jobId, workerId: 3, date: '2026-03-12', hours: 6, anomalyType: 'normal' },
      ];

      workLogRepository.find.mockResolvedValue(mockLogs);

      const result = await service.getWorkLogs(jobId);

      expect(result).toHaveLength(2);
      expect(result[0].anomalyType).toBe('normal');
    });

    it('should return empty array if no work logs', async () => {
      workLogRepository.find.mockResolvedValue([]);

      const result = await service.getWorkLogs(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('confirmWorkLog', () => {
    it('should confirm work log successfully', async () => {
      const mockLog = { id: 1, anomalyType: 'normal' };
      workLogRepository.findOne.mockResolvedValue(mockLog);
      workLogRepository.save.mockResolvedValue({ ...mockLog });

      const result = await service.confirmWorkLog(1);

      expect(result).toBeDefined();
      expect(workLogRepository.save).toHaveBeenCalled();
    });

    it('should reject if work log not found', async () => {
      workLogRepository.findOne.mockResolvedValue(null);

      await expect(service.confirmWorkLog(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateWorkLogAnomaly', () => {
    it('should update work log anomaly type', async () => {
      const mockLog = { id: 1, anomalyType: 'normal' };
      workLogRepository.findOne.mockResolvedValue(mockLog);
      workLogRepository.save.mockResolvedValue({ ...mockLog, anomalyType: 'early_leave' });

      const result = await service.updateWorkLogAnomaly(1, 'early_leave', 'Left early');

      expect(result.anomalyType).toBe('early_leave');
      expect(workLogRepository.save).toHaveBeenCalled();
    });

    it('should reject if work log not found', async () => {
      workLogRepository.findOne.mockResolvedValue(null);

      await expect(service.updateWorkLogAnomaly(1, 'early_leave', 'Left early')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if anomaly type invalid', async () => {
      const mockLog = { id: 1, anomalyType: 'normal' };
      jobRepository.findOne.mockResolvedValue(mockLog);
      userRepository.findOne.mockResolvedValue(mockLog);

      await expect(service.updateWorkLogAnomaly(1, 'invalid_type', 'Note')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
