/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateRatingDto } from './rating.dto';

describe('RatingController', () => {
  let controller: RatingController;
  let ratingService: jest.Mocked<RatingService>;

  const mockRating = {
    id: 1,
    jobId: 1,
    raterId: 1,
    ratedId: 2,
    raterRole: 'worker',
    score: 5,
    comment: 'Great work',
    tags: ['professional', 'reliable'],
    isAnonymous: false,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    ratingService = {
      createRating: jest.fn(),
      getRatings: jest.fn(),
      approveRating: jest.fn(),
      rejectRating: jest.fn(),
    } as jest.Mocked<RatingService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingController],
      providers: [
        {
          provide: RatingService,
          useValue: ratingService,
        },
      ],
    }).compile();

    controller = module.get<RatingController>(RatingController);
  });

  describe('POST /ratings', () => {
    it('should successfully create a rating with valid data', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
        comment: 'Great work',
        tags: ['professional'],
        isAnonymous: false,
      };

      ratingService.createRating.mockResolvedValue(mockRating);

      const result = await controller.create(1, 'worker', dto);

      expect(ratingService.createRating).toHaveBeenCalledWith(
        1,
        1,
        2,
        'worker',
        dto,
      );
      expect(result.id).toBe(1);
      expect(result.score).toBe(5);
    });

    it('should create rating with enterprise role', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 4,
        comment: 'Good',
      };

      const enterpriseRating = { ...mockRating, raterRole: 'enterprise' };
      ratingService.createRating.mockResolvedValue(enterpriseRating);

      const result = await controller.create(1, 'enterprise', dto);

      expect(ratingService.createRating).toHaveBeenCalledWith(
        1,
        1,
        2,
        'enterprise',
        dto,
      );
      expect(result.raterRole).toBe('enterprise');
    });

    it('should throw error when score is out of range', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 6,
      };

      ratingService.createRating.mockRejectedValue(
        new BadRequestException('评分必须在1-5之间'),
      );

      await expect(controller.create(1, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when rating self', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 1,
        score: 5,
      };

      ratingService.createRating.mockRejectedValue(
        new BadRequestException('不能评价自己'),
      );

      await expect(controller.create(1, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when job not found', async () => {
      const dto: CreateRatingDto = {
        jobId: 999,
        ratedId: 2,
        score: 5,
      };

      ratingService.createRating.mockRejectedValue(
        new NotFoundException('工作不存在'),
      );

      await expect(controller.create(1, 'worker', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when duplicate rating exists', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
      };

      ratingService.createRating.mockRejectedValue(
        new BadRequestException('已评价过'),
      );

      await expect(controller.create(1, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create anonymous rating', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 3,
        isAnonymous: true,
      };

      const anonRating = { ...mockRating, isAnonymous: true };
      ratingService.createRating.mockResolvedValue(anonRating);

      const result = await controller.create(1, 'worker', dto);

      expect(result.isAnonymous).toBe(true);
    });

    it('should create rating with tags', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
        tags: ['professional', 'reliable', 'punctual'],
      };

      const taggedRating = { ...mockRating, tags: dto.tags };
      ratingService.createRating.mockResolvedValue(taggedRating);

      const result = await controller.create(1, 'worker', dto);

      expect(result.tags).toEqual(dto.tags);
    });

    it('should handle minimum score', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 1,
      };

      const lowRating = { ...mockRating, score: 1 };
      ratingService.createRating.mockResolvedValue(lowRating);

      const result = await controller.create(1, 'worker', dto);

      expect(result.score).toBe(1);
    });
  });

  describe('GET /ratings/users/:userId', () => {
    it('should retrieve ratings for a user with default pagination', async () => {
      const mockResponse = {
        data: [mockRating],
        total: 1,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2);

      expect(ratingService.getRatings).toHaveBeenCalledWith(2, 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should retrieve ratings with custom pagination', async () => {
      const mockResponse = {
        data: [mockRating],
        total: 25,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2, 2, 20);

      expect(ratingService.getRatings).toHaveBeenCalledWith(2, 2, 20);
      expect(result.total).toBe(25);
    });

    it('should return empty array when user has no ratings', async () => {
      const mockResponse = {
        data: [],
        total: 0,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(999);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle multiple ratings in response', async () => {
      const rating2 = { ...mockRating, id: 2, score: 4 };
      const rating3 = { ...mockRating, id: 3, score: 3 };

      const mockResponse = {
        data: [mockRating, rating2, rating3],
        total: 3,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].score).toBe(5);
      expect(result.data[1].score).toBe(4);
      expect(result.data[2].score).toBe(3);
    });

    it('should handle page size of 1', async () => {
      const mockResponse = {
        data: [mockRating],
        total: 100,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2, 1, 1);

      expect(ratingService.getRatings).toHaveBeenCalledWith(2, 1, 1);
      expect(result.data).toHaveLength(1);
    });

    it('should handle large page numbers', async () => {
      const mockResponse = {
        data: [],
        total: 100,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2, 100, 10);

      expect(ratingService.getRatings).toHaveBeenCalledWith(2, 100, 10);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('POST /ratings/:id/approve', () => {
    it('should successfully approve a rating', async () => {
      const approvedRating = { ...mockRating, status: 'approved' };
      ratingService.approveRating.mockResolvedValue(approvedRating);

      const result = await controller.approveRating(1);

      expect(ratingService.approveRating).toHaveBeenCalledWith(1);
      expect(result.status).toBe('approved');
    });

    it('should throw error when rating not found', async () => {
      ratingService.approveRating.mockRejectedValue(
        new NotFoundException('评价不存在'),
      );

      await expect(controller.approveRating(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update user credit score on approval', async () => {
      const approvedRating = {
        ...mockRating,
        status: 'approved',
        ratedId: 2,
      };
      ratingService.approveRating.mockResolvedValue(approvedRating);

      const result = await controller.approveRating(1);

      expect(result.status).toBe('approved');
      expect(ratingService.approveRating).toHaveBeenCalledWith(1);
    });

    it('should handle approval of already approved rating', async () => {
      const approvedRating = { ...mockRating, status: 'approved' };
      ratingService.approveRating.mockResolvedValue(approvedRating);

      const result = await controller.approveRating(1);

      expect(result.status).toBe('approved');
    });

    it('should approve rating with low score', async () => {
      const lowScoreRating = { ...mockRating, score: 1, status: 'approved' };
      ratingService.approveRating.mockResolvedValue(lowScoreRating);

      const result = await controller.approveRating(1);

      expect(result.score).toBe(1);
      expect(result.status).toBe('approved');
    });
  });

  describe('POST /ratings/:id/reject', () => {
    it('should successfully reject a rating', async () => {
      const rejectedRating = { ...mockRating, status: 'rejected' };
      ratingService.rejectRating.mockResolvedValue(rejectedRating);

      const result = await controller.rejectRating(1);

      expect(ratingService.rejectRating).toHaveBeenCalledWith(1);
      expect(result.status).toBe('rejected');
    });

    it('should throw error when rating not found', async () => {
      ratingService.rejectRating.mockRejectedValue(
        new NotFoundException('评价不存在'),
      );

      await expect(controller.rejectRating(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle rejection of already rejected rating', async () => {
      const rejectedRating = { ...mockRating, status: 'rejected' };
      ratingService.rejectRating.mockResolvedValue(rejectedRating);

      const result = await controller.rejectRating(1);

      expect(result.status).toBe('rejected');
    });

    it('should reject rating with high score', async () => {
      const highScoreRating = { ...mockRating, score: 5, status: 'rejected' };
      ratingService.rejectRating.mockResolvedValue(highScoreRating);

      const result = await controller.rejectRating(1);

      expect(result.score).toBe(5);
      expect(result.status).toBe('rejected');
    });

    it('should not affect user credit score on rejection', async () => {
      const rejectedRating = { ...mockRating, status: 'rejected' };
      ratingService.rejectRating.mockResolvedValue(rejectedRating);

      const result = await controller.rejectRating(1);

      expect(result.status).toBe('rejected');
      expect(ratingService.rejectRating).toHaveBeenCalledWith(1);
    });
  });

  describe('Permission and Authorization', () => {
    it('should allow worker to create rating', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
      };

      ratingService.createRating.mockResolvedValue(mockRating);

      const result = await controller.create(1, 'worker', dto);

      expect(result).toBeDefined();
    });

    it('should allow enterprise to create rating', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
      };

      const enterpriseRating = { ...mockRating, raterRole: 'enterprise' };
      ratingService.createRating.mockResolvedValue(enterpriseRating);

      const result = await controller.create(1, 'enterprise', dto);

      expect(result).toBeDefined();
    });

    it('should allow admin to approve rating', async () => {
      const approvedRating = { ...mockRating, status: 'approved' };
      ratingService.approveRating.mockResolvedValue(approvedRating);

      const result = await controller.approveRating(1);

      expect(result.status).toBe('approved');
    });

    it('should allow admin to reject rating', async () => {
      const rejectedRating = { ...mockRating, status: 'rejected' };
      ratingService.rejectRating.mockResolvedValue(rejectedRating);

      const result = await controller.rejectRating(1);

      expect(result.status).toBe('rejected');
    });
  });

  describe('Parameter Validation', () => {
    it('should handle numeric userId parameter', async () => {
      const mockResponse = {
        data: [mockRating],
        total: 1,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(123);

      expect(ratingService.getRatings).toHaveBeenCalledWith(123, 1, 10);
      expect(result).toBeDefined();
    });

    it('should handle numeric rating id parameter', async () => {
      const approvedRating = { ...mockRating, status: 'approved' };
      ratingService.approveRating.mockResolvedValue(approvedRating);

      const result = await controller.approveRating(456);

      expect(ratingService.approveRating).toHaveBeenCalledWith(456);
      expect(result).toBeDefined();
    });

    it('should handle zero page number', async () => {
      const mockResponse = {
        data: [],
        total: 0,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2, 0, 10);

      expect(ratingService.getRatings).toHaveBeenCalledWith(2, 0, 10);
      expect(result).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return rating with all fields', async () => {
      ratingService.createRating.mockResolvedValue(mockRating);

      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
        comment: 'Great work',
        tags: ['professional'],
        isAnonymous: false,
      };

      const result = await controller.create(1, 'worker', dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('raterId');
      expect(result).toHaveProperty('ratedId');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('comment');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('isAnonymous');
      expect(result).toHaveProperty('status');
    });

    it('should return paginated response with data and total', async () => {
      const mockResponse = {
        data: [mockRating],
        total: 1,
      };

      ratingService.getRatings.mockResolvedValue(mockResponse);

      const result = await controller.getUserRatings(2);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe('number');
    });
  });
});
