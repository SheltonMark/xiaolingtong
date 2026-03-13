/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('JobController', () => {
  let controller: JobController;
  let jobService: jest.Mocked<JobService>;

  beforeEach(async () => {
    jobService = {
      list: jest.fn(),
      myJobs: jest.fn(),
      detail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      selectSupervisor: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      getAttendances: jest.fn(),
      recordWorkLog: jest.fn(),
      getWorkLogs: jest.fn(),
      confirmWorkLog: jest.fn(),
      updateWorkLogAnomaly: jest.fn(),
    } as jest.Mocked<JobService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: JobService,
          useValue: jobService,
        },
      ],
    }).compile();

    controller = module.get<JobController>(JobController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should call jobService.list with query params', async () => {
      const query = { category: 'construction', page: 1 };
      const mockResult = { list: [], total: 0 };

      jobService.list.mockResolvedValue(mockResult);

      const result = await controller.list(query);

      expect(jobService.list).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it('should return empty list when no jobs match', async () => {
      const query = { category: 'nonexistent' };
      const mockResult = { list: [], total: 0 };

      jobService.list.mockResolvedValue(mockResult);

      const result = await controller.list(query);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('myJobs', () => {
    it('should call jobService.myJobs with userId from CurrentUser', async () => {
      const userId = 5;
      const mockResult = [
        { id: 1, title: 'Job 1', status: 'open' },
        { id: 2, title: 'Job 2', status: 'closed' },
      ];

      jobService.myJobs.mockResolvedValue(mockResult);

      const result = await controller.myJobs(userId);

      expect(jobService.myJobs).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('detail', () => {
    it('should call jobService.detail with numeric id', async () => {
      const id = 1;
      const mockResult = { id: 1, title: 'Job Detail', description: 'Details' };

      jobService.detail.mockResolvedValue(mockResult);

      const result = await controller.detail(id);

      expect(jobService.detail).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResult);
    });

    it('should propagate NotFoundException from service', async () => {
      const id = 999;

      jobService.detail.mockRejectedValue(
        new NotFoundException('Job not found'),
      );

      await expect(controller.detail(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should call jobService.create with userId and dto', async () => {
      const userId = 5;
      const dto = { title: 'New Job', description: 'Description', salary: 100 };
      const mockResult = { id: 1, ...dto };

      jobService.create.mockResolvedValue(mockResult);

      const result = await controller.create(userId, dto);

      expect(jobService.create).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException on keyword violation', async () => {
      const userId = 5;
      const dto = { title: 'Job with forbidden keyword', description: 'Desc' };

      jobService.create.mockRejectedValue(
        new BadRequestException('Forbidden keyword detected'),
      );

      await expect(controller.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should call jobService.update with id, userId, and dto', async () => {
      const id = 1;
      const userId = 5;
      const dto = { title: 'Updated Job', salary: 150 };
      const mockResult = { id, ...dto };

      jobService.update.mockResolvedValue(mockResult);

      const result = await controller.update(id, userId, dto);

      expect(jobService.update).toHaveBeenCalledWith(id, userId, dto);
      expect(result).toEqual(mockResult);
    });

    it('should propagate ForbiddenException when user does not own job', async () => {
      const id = 1;
      const userId = 5;
      const dto = { title: 'Updated Job' };

      jobService.update.mockRejectedValue(
        new ForbiddenException('You do not own this job'),
      );

      await expect(controller.update(id, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('selectSupervisor', () => {
    it('should call jobService.selectSupervisor with correct parameters', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 5;
      const dto = { workerId };
      const mockResult = {
        id: 1,
        jobId,
        workerId,
        status: 'confirmed',
        isSupervisor: 1,
      };

      jobService.selectSupervisor = jest.fn().mockResolvedValue(mockResult);

      const result = await controller.selectSupervisor(jobId, dto, userId);

      expect(jobService.selectSupervisor).toHaveBeenCalledWith(
        jobId,
        workerId,
        userId,
      );
      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException when supervisor not qualified', async () => {
      const jobId = 1;
      const workerId = 3;
      const userId = 5;
      const dto = { workerId };

      jobService.selectSupervisor = jest
        .fn()
        .mockRejectedValue(
          new BadRequestException(
            'Worker does not meet supervisor requirements',
          ),
        );

      await expect(
        controller.selectSupervisor(jobId, dto, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate ForbiddenException when not job owner', async () => {
      const jobId = 1;
      const workerId = 2;
      const userId = 5;
      const dto = { workerId };

      jobService.selectSupervisor = jest
        .fn()
        .mockRejectedValue(
          new ForbiddenException(
            'You do not have permission to manage this job',
          ),
        );

      await expect(
        controller.selectSupervisor(jobId, dto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkIn', () => {
    it('should call jobService.checkIn with jobId and workerId', async () => {
      const jobId = 1;
      const workerId = 2;
      const mockResult = {
        id: 1,
        jobId,
        workerId,
        status: 'checked_in',
        checkInTime: new Date(),
      };

      jobService.checkIn.mockResolvedValue(mockResult);

      const result = await controller.checkIn(jobId, workerId);

      expect(jobService.checkIn).toHaveBeenCalledWith(jobId, workerId);
      expect(result.status).toBe('checked_in');
    });

    it('should propagate BadRequestException when already checked in', async () => {
      const jobId = 1;
      const workerId = 2;

      jobService.checkIn.mockRejectedValue(
        new BadRequestException('Already checked in'),
      );

      await expect(controller.checkIn(jobId, workerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate BadRequestException when worker not confirmed', async () => {
      const jobId = 1;
      const workerId = 2;

      jobService.checkIn.mockRejectedValue(
        new BadRequestException('Worker not confirmed for this job'),
      );

      await expect(controller.checkIn(jobId, workerId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('checkOut', () => {
    it('should call jobService.checkOut with jobId and workerId', async () => {
      const jobId = 1;
      const workerId = 2;
      const mockResult = {
        id: 1,
        jobId,
        workerId,
        status: 'checked_out',
        checkInTime: new Date(),
        checkOutTime: new Date(),
        workHours: 8,
      };

      jobService.checkOut.mockResolvedValue(mockResult);

      const result = await controller.checkOut(jobId, workerId);

      expect(jobService.checkOut).toHaveBeenCalledWith(jobId, workerId);
      expect(result.status).toBe('checked_out');
      expect(result).toHaveProperty('workHours');
    });

    it('should propagate NotFoundException when not checked in', async () => {
      const jobId = 1;
      const workerId = 2;

      jobService.checkOut.mockRejectedValue(
        new NotFoundException('No active check-in found'),
      );

      await expect(controller.checkOut(jobId, workerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAttendances', () => {
    it('should call jobService.getAttendances with jobId and userId', async () => {
      const jobId = 1;
      const userId = 5;
      const mockResult = [
        {
          id: 1,
          jobId,
          workerId: 2,
          status: 'checked_out',
          workHours: 8,
        },
      ];

      jobService.getAttendances.mockResolvedValue(mockResult);

      const result = await controller.getAttendances(jobId, userId);

      expect(jobService.getAttendances).toHaveBeenCalledWith(jobId, userId);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should propagate ForbiddenException when not job owner', async () => {
      const jobId = 1;
      const userId = 5;

      jobService.getAttendances.mockRejectedValue(
        new ForbiddenException(
          'You do not have permission to view attendances for this job',
        ),
      );

      await expect(controller.getAttendances(jobId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('recordWorkLog', () => {
    it('should call jobService.recordWorkLog with correct parameters', async () => {
      const jobId = 1;
      const workerId = 2;
      const dto = { date: '2026-03-13', hours: 8, pieces: 100 };
      const mockResult = { id: 1, jobId, workerId, ...dto };

      jobService.recordWorkLog.mockResolvedValue(mockResult);

      const result = await controller.recordWorkLog(jobId, workerId, dto);

      expect(jobService.recordWorkLog).toHaveBeenCalledWith(
        jobId,
        workerId,
        dto.date,
        dto.hours,
        dto.pieces,
      );
      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException on invalid hours', async () => {
      const jobId = 1;
      const workerId = 2;
      const dto = { date: '2026-03-13', hours: 25, pieces: 100 };

      jobService.recordWorkLog.mockRejectedValue(
        new BadRequestException('Work hours must be between 0 and 24'),
      );

      await expect(
        controller.recordWorkLog(jobId, workerId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkLogs', () => {
    it('should call jobService.getWorkLogs with jobId', async () => {
      const jobId = 1;
      const userId = 5;
      const mockResult = [
        {
          id: 1,
          jobId,
          workerId: 2,
          date: '2026-03-13',
          hours: 8,
          pieces: 100,
        },
      ];

      jobService.getWorkLogs.mockResolvedValue(mockResult);

      const result = await controller.getWorkLogs(jobId, userId);

      expect(jobService.getWorkLogs).toHaveBeenCalledWith(jobId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('confirmWorkLog', () => {
    it('should call jobService.confirmWorkLog with workLogId', async () => {
      const workLogId = 1;
      const userId = 5;
      const mockResult = {
        id: workLogId,
        jobId: 1,
        workerId: 2,
        confirmed: true,
      };

      jobService.confirmWorkLog.mockResolvedValue(mockResult);

      const result = await controller.confirmWorkLog(workLogId, userId);

      expect(jobService.confirmWorkLog).toHaveBeenCalledWith(workLogId);
      expect(result).toEqual(mockResult);
    });

    it('should propagate NotFoundException when work log not found', async () => {
      const workLogId = 999;
      const userId = 5;

      jobService.confirmWorkLog.mockRejectedValue(
        new NotFoundException('Work log not found'),
      );

      await expect(controller.confirmWorkLog(workLogId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateWorkLogAnomaly', () => {
    it('should call jobService.updateWorkLogAnomaly with correct parameters', async () => {
      const workLogId = 1;
      const userId = 2;
      const dto = { anomalyType: 'early_leave', anomalyNote: 'Left early' };
      const mockResult = { id: workLogId, ...dto };

      jobService.updateWorkLogAnomaly.mockResolvedValue(mockResult);

      const result = await controller.updateWorkLogAnomaly(
        workLogId,
        userId,
        dto,
      );

      expect(jobService.updateWorkLogAnomaly).toHaveBeenCalledWith(
        workLogId,
        dto.anomalyType,
        dto.anomalyNote,
      );
      expect(result).toEqual(mockResult);
    });

    it('should propagate BadRequestException on invalid anomaly type', async () => {
      const workLogId = 1;
      const userId = 2;
      const dto = { anomalyType: 'invalid_type', anomalyNote: 'Note' };

      jobService.updateWorkLogAnomaly.mockRejectedValue(
        new BadRequestException('Invalid anomaly type'),
      );

      await expect(
        controller.updateWorkLogAnomaly(workLogId, userId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
