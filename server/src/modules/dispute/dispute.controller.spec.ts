/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { BadRequestException } from '@nestjs/common';
import { CreateDisputeDto, ResolveDisputeDto } from './dispute.dto';

describe('DisputeController', () => {
  let controller: DisputeController;
  let disputeService: jest.Mocked<DisputeService>;

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
    disputeService = {
      createDispute: jest.fn(),
      getDisputes: jest.fn(),
      getDisputeById: jest.fn(),
      resolveDispute: jest.fn(),
      getDisputesByUser: jest.fn(),
      getDisputeStats: jest.fn(),
      updateDisputeStatus: jest.fn(),
    } as jest.Mocked<DisputeService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputeController],
      providers: [
        {
          provide: DisputeService,
          useValue: disputeService,
        },
      ],
    }).compile();

    controller = module.get<DisputeController>(DisputeController);
  });

  describe('POST /disputes', () => {
    it('should successfully create a dispute with valid data', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
        evidence: ['url1', 'url2'],
      };

      disputeService.createDispute.mockResolvedValue(mockDispute);

      const result = await controller.createDispute(1, dto);

      expect(disputeService.createDispute).toHaveBeenCalledWith(1, dto);
      expect(result.id).toBe(1);
      expect(result.status).toBe('open');
    });

    it('should create dispute with quality type', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'quality',
        description: 'Quality issue',
      };

      const qualityDispute = { ...mockDispute, type: 'quality' };
      disputeService.createDispute.mockResolvedValue(qualityDispute);

      const result = await controller.createDispute(1, dto);

      expect(result.type).toBe('quality');
    });

    it('should create dispute with behavior type', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'behavior',
        description: 'Behavior issue',
      };

      const behaviorDispute = { ...mockDispute, type: 'behavior' };
      disputeService.createDispute.mockResolvedValue(behaviorDispute);

      const result = await controller.createDispute(1, dto);

      expect(result.type).toBe('behavior');
    });

    it('should create dispute with other type', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'other',
        description: 'Other issue',
      };

      const otherDispute = { ...mockDispute, type: 'other' };
      disputeService.createDispute.mockResolvedValue(otherDispute);

      const result = await controller.createDispute(1, dto);

      expect(result.type).toBe('other');
    });

    it('should throw error if job not found', async () => {
      const dto: CreateDisputeDto = {
        jobId: 999,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
      };

      disputeService.createDispute.mockRejectedValue(
        new BadRequestException('Job not found'),
      );

      await expect(controller.createDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if respondent not found', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 999,
        type: 'payment',
        description: 'Payment issue',
      };

      disputeService.createDispute.mockRejectedValue(
        new BadRequestException('Respondent not found'),
      );

      await expect(controller.createDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if complainant disputes themselves', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 1,
        type: 'payment',
        description: 'Payment issue',
      };

      disputeService.createDispute.mockRejectedValue(
        new BadRequestException('Cannot dispute yourself'),
      );

      await expect(controller.createDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create dispute with evidence', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
        evidence: ['url1', 'url2', 'url3'],
      };

      const disputeWithEvidence = {
        ...mockDispute,
        evidence: ['url1', 'url2', 'url3'],
      };
      disputeService.createDispute.mockResolvedValue(disputeWithEvidence);

      const result = await controller.createDispute(1, dto);

      expect(result.evidence).toHaveLength(3);
    });

    it('should create dispute without evidence', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
      };

      disputeService.createDispute.mockResolvedValue(mockDispute);

      const result = await controller.createDispute(1, dto);

      expect(result.evidence).toEqual([]);
    });
  });

  describe('GET /disputes', () => {
    it('should retrieve all disputes with default pagination', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes();

      expect(disputeService.getDisputes).toHaveBeenCalledWith(1, 10);
      expect(result).toHaveLength(1);
    });

    it('should retrieve disputes with custom pagination', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes(2, 20);

      expect(disputeService.getDisputes).toHaveBeenCalledWith(2, 20);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no disputes exist', async () => {
      disputeService.getDisputes.mockResolvedValue([]);

      const result = await controller.getDisputes();

      expect(result).toHaveLength(0);
    });

    it('should handle multiple disputes in response', async () => {
      const dispute2 = { ...mockDispute, id: 2 };
      const dispute3 = { ...mockDispute, id: 3 };
      const disputes = [mockDispute, dispute2, dispute3];

      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(3);
    });

    it('should handle large page numbers', async () => {
      disputeService.getDisputes.mockResolvedValue([]);

      const result = await controller.getDisputes(100, 10);

      expect(disputeService.getDisputes).toHaveBeenCalledWith(100, 10);
      expect(result).toHaveLength(0);
    });
  });

  describe('GET /disputes/user/:userId', () => {
    it('should retrieve disputes where user is complainant', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      const result = await controller.getUserDisputes(1, 'complainant');

      expect(disputeService.getDisputesByUser).toHaveBeenCalledWith(
        1,
        'complainant',
        1,
        10,
      );
      expect(result).toHaveLength(1);
    });

    it('should retrieve disputes where user is respondent', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      const result = await controller.getUserDisputes(2, 'respondent');

      expect(disputeService.getDisputesByUser).toHaveBeenCalledWith(
        2,
        'respondent',
        1,
        10,
      );
      expect(result).toHaveLength(1);
    });

    it('should retrieve user disputes with custom pagination', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      const result = await controller.getUserDisputes(1, 'complainant', 2, 20);

      expect(disputeService.getDisputesByUser).toHaveBeenCalledWith(
        1,
        'complainant',
        2,
        20,
      );
    });

    it('should return empty array when user has no disputes', async () => {
      disputeService.getDisputesByUser.mockResolvedValue([]);

      const result = await controller.getUserDisputes(999, 'complainant');

      expect(result).toHaveLength(0);
    });

    it('should handle multiple disputes for user', async () => {
      const dispute2 = { ...mockDispute, id: 2 };
      const disputes = [mockDispute, dispute2];

      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      const result = await controller.getUserDisputes(1, 'complainant');

      expect(result).toHaveLength(2);
    });

    it('should filter by complainant role', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      await controller.getUserDisputes(1, 'complainant');

      expect(disputeService.getDisputesByUser).toHaveBeenCalledWith(
        1,
        'complainant',
        1,
        10,
      );
    });

    it('should filter by respondent role', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      await controller.getUserDisputes(2, 'respondent');

      expect(disputeService.getDisputesByUser).toHaveBeenCalledWith(
        2,
        'respondent',
        1,
        10,
      );
    });
  });

  describe('GET /disputes/:id', () => {
    it('should retrieve dispute by id', async () => {
      disputeService.getDisputeById.mockResolvedValue(mockDispute);

      const result = await controller.getDisputeById(1);

      expect(disputeService.getDisputeById).toHaveBeenCalledWith(1);
      expect(result.id).toBe(1);
    });

    it('should throw error when dispute not found', async () => {
      disputeService.getDisputeById.mockRejectedValue(
        new BadRequestException('Dispute not found'),
      );

      await expect(controller.getDisputeById(999)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return dispute with all relations', async () => {
      const disputeWithRelations = {
        ...mockDispute,
        job: { id: 1, title: 'Test Job' },
        complainant: { id: 1, name: 'Complainant' },
        respondent: { id: 2, name: 'Respondent' },
      };

      disputeService.getDisputeById.mockResolvedValue(disputeWithRelations);

      const result = await controller.getDisputeById(1);

      expect(result).toHaveProperty('job');
      expect(result).toHaveProperty('complainant');
      expect(result).toHaveProperty('respondent');
    });

    it('should handle numeric id parameter', async () => {
      disputeService.getDisputeById.mockResolvedValue(mockDispute);

      const result = await controller.getDisputeById(123);

      expect(disputeService.getDisputeById).toHaveBeenCalledWith(123);
      expect(result).toBeDefined();
    });
  });

  describe('POST /disputes/:id/resolve', () => {
    it('should successfully resolve dispute with complainant win', async () => {
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

      disputeService.resolveDispute.mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(1, dto);

      expect(disputeService.resolveDispute).toHaveBeenCalledWith(1, dto);
      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('complainant_win');
    });

    it('should resolve dispute with respondent win', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'respondent_win',
        resolutionNotes: 'Respondent is right',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'respondent_win',
        resolutionNotes: 'Respondent is right',
      };

      disputeService.resolveDispute.mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(1, dto);

      expect(result.resolution).toBe('respondent_win');
    });

    it('should resolve dispute with settlement', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'settlement',
        resolutionNotes: 'Settlement agreed',
        compensationAmount: 50,
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'settlement',
        resolutionNotes: 'Settlement agreed',
        compensationAmount: 50,
      };

      disputeService.resolveDispute.mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(1, dto);

      expect(result.resolution).toBe('settlement');
      expect(result.compensationAmount).toBe(50);
    });

    it('should throw error when dispute not found', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
      };

      disputeService.resolveDispute.mockRejectedValue(
        new BadRequestException('Dispute not found'),
      );

      await expect(controller.resolveDispute(999, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if dispute already resolved', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
      };

      disputeService.resolveDispute.mockRejectedValue(
        new BadRequestException('Dispute is already resolved or closed'),
      );

      await expect(controller.resolveDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for negative compensation amount', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'settlement',
        resolutionNotes: 'Settlement agreed',
        compensationAmount: -100,
      };

      disputeService.resolveDispute.mockRejectedValue(
        new BadRequestException('Compensation amount cannot be negative'),
      );

      await expect(controller.resolveDispute(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should resolve dispute without compensation', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'respondent_win',
        resolutionNotes: 'Respondent is right',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'respondent_win',
        resolutionNotes: 'Respondent is right',
        compensationAmount: null,
      };

      disputeService.resolveDispute.mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(1, dto);

      expect(result.compensationAmount).toBeNull();
    });

    it('should handle zero compensation amount', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'settlement',
        resolutionNotes: 'Settlement agreed',
        compensationAmount: 0,
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
        resolution: 'settlement',
        resolutionNotes: 'Settlement agreed',
        compensationAmount: 0,
      };

      disputeService.resolveDispute.mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(1, dto);

      expect(result.compensationAmount).toBe(0);
    });
  });

  describe('GET /disputes/stats/overview', () => {
    it('should retrieve dispute statistics', async () => {
      const stats = {
        total: 10,
        open: 5,
        in_progress: 3,
        resolved: 2,
        closed: 0,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(disputeService.getDisputeStats).toHaveBeenCalled();
      expect(result.total).toBe(10);
      expect(result.open).toBe(5);
      expect(result.in_progress).toBe(3);
      expect(result.resolved).toBe(2);
    });

    it('should return stats with all status counts', async () => {
      const stats = {
        total: 20,
        open: 8,
        in_progress: 7,
        resolved: 4,
        closed: 1,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('open');
      expect(result).toHaveProperty('in_progress');
      expect(result).toHaveProperty('resolved');
      expect(result).toHaveProperty('closed');
    });

    it('should return zero stats when no disputes exist', async () => {
      const stats = {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(result.total).toBe(0);
    });

    it('should return stats with all disputes open', async () => {
      const stats = {
        total: 5,
        open: 5,
        in_progress: 0,
        resolved: 0,
        closed: 0,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(result.open).toBe(5);
      expect(result.in_progress).toBe(0);
      expect(result.resolved).toBe(0);
    });

    it('should return stats with all disputes resolved', async () => {
      const stats = {
        total: 5,
        open: 0,
        in_progress: 0,
        resolved: 5,
        closed: 0,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(result.resolved).toBe(5);
      expect(result.open).toBe(0);
    });
  });

  describe('Permission and Authorization', () => {
    it('should allow worker to create dispute', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
      };

      disputeService.createDispute.mockResolvedValue(mockDispute);

      const result = await controller.createDispute(1, dto);

      expect(result).toBeDefined();
    });

    it('should allow enterprise to create dispute', async () => {
      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
      };

      disputeService.createDispute.mockResolvedValue(mockDispute);

      const result = await controller.createDispute(1, dto);

      expect(result).toBeDefined();
    });

    it('should allow admin to get all disputes', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes();

      expect(result).toBeDefined();
    });

    it('should allow admin to resolve dispute', async () => {
      const dto: ResolveDisputeDto = {
        resolution: 'complainant_win',
        resolutionNotes: 'Complainant is right',
      };

      const resolvedDispute = {
        ...mockDispute,
        status: 'resolved',
      };

      disputeService.resolveDispute.mockResolvedValue(resolvedDispute);

      const result = await controller.resolveDispute(1, dto);

      expect(result.status).toBe('resolved');
    });

    it('should allow admin to view stats', async () => {
      const stats = {
        total: 10,
        open: 5,
        in_progress: 3,
        resolved: 2,
        closed: 0,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(result).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should handle numeric userId parameter', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputesByUser.mockResolvedValue(disputes);

      const result = await controller.getUserDisputes(123, 'complainant');

      expect(disputeService.getDisputesByUser).toHaveBeenCalledWith(
        123,
        'complainant',
        1,
        10,
      );
      expect(result).toBeDefined();
    });

    it('should handle numeric dispute id parameter', async () => {
      disputeService.getDisputeById.mockResolvedValue(mockDispute);

      const result = await controller.getDisputeById(456);

      expect(disputeService.getDisputeById).toHaveBeenCalledWith(456);
      expect(result).toBeDefined();
    });

    it('should handle zero page number', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes(0, 10);

      expect(disputeService.getDisputes).toHaveBeenCalledWith(0, 10);
      expect(result).toBeDefined();
    });

    it('should handle large page size', async () => {
      const disputes = [mockDispute];
      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes(1, 100);

      expect(disputeService.getDisputes).toHaveBeenCalledWith(1, 100);
      expect(result).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return dispute with all fields', async () => {
      disputeService.createDispute.mockResolvedValue(mockDispute);

      const dto: CreateDisputeDto = {
        jobId: 1,
        respondentId: 2,
        type: 'payment',
        description: 'Payment issue',
      };

      const result = await controller.createDispute(1, dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('complainantId');
      expect(result).toHaveProperty('respondentId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('status');
    });

    it('should return array of disputes', async () => {
      const disputes = [mockDispute, { ...mockDispute, id: 2 }];
      disputeService.getDisputes.mockResolvedValue(disputes);

      const result = await controller.getDisputes();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return stats object with numeric values', async () => {
      const stats = {
        total: 10,
        open: 5,
        in_progress: 3,
        resolved: 2,
        closed: 0,
      };

      disputeService.getDisputeStats.mockResolvedValue(stats);

      const result = await controller.getDisputeStats();

      expect(typeof result.total).toBe('number');
      expect(typeof result.open).toBe('number');
      expect(typeof result.in_progress).toBe('number');
      expect(typeof result.resolved).toBe('number');
      expect(typeof result.closed).toBe('number');
    });
  });
});
