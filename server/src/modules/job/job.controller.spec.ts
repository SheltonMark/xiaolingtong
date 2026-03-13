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
});
