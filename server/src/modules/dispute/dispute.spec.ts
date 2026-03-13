/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { Dispute } from '../../entities/dispute.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { CreateDisputeDto, ResolveDisputeDto } from './dispute.dto';

describe('DisputeService', () => {
  let service: DisputeService;
  let disputeRepository: any;
  let jobRepository: any;
  let userRepository: any;

  const mockUser = {
    id: 1,
    name: 'Test User',
    role: 'worker',
  };

  const mockJob = {
    id: 1,
    userId: 2,
    title: 'Test Job',
    status: 'working',
  };

  const mockDispute = {
    id: 1,
    jobId: 1,
    complainantId: 1,
    respondentId: 2,
    type: 'payment',
    description: 'Payment issue',
    evidence: [],
    status: 'open',
    resolution: null,
    resolutionNotes: null,
    compensationAmount: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    disputeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        {
          provide: getRepositoryToken(Dispute),
          useValue: disputeRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<DisputeService>(DisputeService);
  });

  describe('createDispute', () => {
    it('should create a dispute successfully', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
        evidence: ['url1', 'url2'],
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockUser);
      disputeRepository.create.mockReturnValue(mockDispute);
      disputeRepository.save.mockResolvedValue(mockDispute);

      const result = await service.createDispute(1, dto);

      expect(jobRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(disputeRepository.create).toHaveBeenCalled();
      expect(disputeRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockDispute);
    });

    it('should throw error if job does not exist', async () => {
      const dto: CreateDisputeDto = {
        jobId: 999,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
      };

      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.createDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if respondent does not exist', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 999,
        type: 'payment',
        description: 'Payment issue',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.createDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if complainant tries to dispute themselves', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 1,
        type: 'payment',
        description: 'Payment issue',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(service.createDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDisputes', () => {
    it('should return paginated disputes', async () => {
      const disputes = [mockDispute];
      disputeRepository.find.mockResolvedValue(disputes);

      const result = await service.getDisputes(1, 10);

      expect(disputeRepository.find).toHaveBeenCalled();
      expect(result).toEqual(disputes);
    });

    it('should return disputes with default pagination', async () => {
      const disputes = [mockDispute];
      disputeRepository.find.mockResolvedValue(disputes);

      const result = await service.getDisputes();

      expect(disputeRepository.find).toHaveBeenCalled();
      expect(result).toEqual(disputes);
    });

    it('should return disputes sorted by creation date', async () => {
      const disputes = [mockDispute];
      disputeRepository.find.mockResolvedValue(disputes);

      await service.getDisputes(1, 10);

      const callArgs = disputeRepository.find.mock.calls[0][0];
      expect(callArgs.order).toBeDefined();
      expect(callArgs.order.createdAt).toBe('DESC');
    });
  });

  describe('getDisputeById', () => {
    it('should return dispute by id', async () => {
      disputeRepository.findOne.mockResolvedValue(mockDispute);

      const result = await service.getDisputeById(1);

      expect(disputeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['job', 'complainant', 'respondent'],
      });
      expect(result).toEqual(mockDispute);
    });

    it('should throw error if dispute not found', async () => {
      disputeRepository.findOne.mockResolvedValue(null);

      await expect(service.getDisputeById(999)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute successfully', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
        compensationAmount: 100,
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
        compensationAmount: 100,
      };

      disputeRepository.findOne.mockResolvedValue(mockDispute);
      disputeRepository.save.mockResolvedValue(resolvedDispute);

      const result = await service.resolveDispute(1, dto);

      expect(disputeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(disputeRepository.save).toHaveBeenCalled();
      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('complainant_win');
    });

    it('should throw error if dispute not found', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
      };

      disputeRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveDispute(999, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if dispute is already resolved', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
      };

      disputeRepository.findOne.mockResolvedValue(resolvedDispute);

      await expect(service.resolveDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate compensation amount for settlement', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'settlement',
        resolutionNotes: 'Settlement agreed',
        compensationAmount: -100,
      };

      disputeRepository.findOne.mockResolvedValue(mockDispute);

      await expect(service.resolveDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDisputesByUser', () => {
    it('should return disputes where user is complainant', async () => {
      const disputes = [mockDispute];
      disputeRepository.find.mockResolvedValue(disputes);

      const result = await service.getDisputesByUser(1, 'complainant');

      expect(disputeRepository.find).toHaveBeenCalled();
      expect(result).toEqual(disputes);
    });

    it('should return disputes where user is respondent', async () => {
      const disputes = [mockDispute];
      disputeRepository.find.mockResolvedValue(disputes);

      const result = await service.getDisputesByUser(2, 'respondent');

      expect(disputeRepository.find).toHaveBeenCalled();
      expect(result).toEqual(disputes);
    });
  });

  describe('getDisputeStats', () => {
    it('should return dispute statistics', async () => {
      const stats = {
        total: 10,
        open: 5,
        in_progress: 3,
        resolved: 2,
      };

      disputeRepository.find.mockResolvedValue(
        Array(10)
          .fill(null)
          .map((_, i) => ({
            ...mockDispute,
            id: i,
            status: i < 5 ? 'open' : i < 8 ? 'in_progress' : 'resolved',
          })),
      );

      const result = await service.getDisputeStats();

      expect(result.total).toBeGreaterThan(0);
      expect(result.open).toBeGreaterThan(0);
    });
  });
});
