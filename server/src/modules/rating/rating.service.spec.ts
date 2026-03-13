/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RatingService } from './rating.service';
import { Rating } from '../../entities/rating.entity';

describe('RatingService', () => {
  let service: RatingService;
  let ratingRepo: any;

  beforeEach(async () => {
    ratingRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        {
          provide: getRepositoryToken(Rating),
          useValue: ratingRepo,
        },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should save and return rating when no prior rating exists', async () => {
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 5,
        tags: ['good', 'professional'],
        content: 'Great job',
      };
      const savedRating = { id: 1, workerId: 1, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.create(1, dto);

      expect(result).toEqual(savedRating);
      expect(ratingRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException with "已评价过" when duplicate found', async () => {
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 4,
        tags: [],
        content: 'Good',
      };
      const existingRating = { id: 1, workerId: 1, jobId: 1 };

      ratingRepo.findOne.mockResolvedValue(existingRating);

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with "已评价过" message', async () => {
      const dto = { jobId: 1, enterpriseId: 1, score: 3 };

      ratingRepo.findOne.mockResolvedValue({ id: 1 });

      try {
        await service.create(1, dto);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('已评价过');
      }
    });

    it('should call ratingRepo.create with correct workerId, enterpriseId, jobId', async () => {
      const dto = {
        jobId: 5,
        enterpriseId: 2,
        score: 5,
        tags: ['excellent'],
        content: 'Perfect',
      };
      const savedRating = { id: 1, workerId: 10, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      await service.create(10, dto);

      expect(ratingRepo.create).toHaveBeenCalledWith({
        workerId: 10,
        enterpriseId: 2,
        jobId: 5,
        score: 5,
        tags: ['excellent'],
        content: 'Perfect',
      });
    });

    it('should persist score value 1 (minimum boundary)', async () => {
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 1,
        tags: [],
        content: 'Poor',
      };
      const savedRating = { id: 1, workerId: 1, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.create(1, dto);

      expect(result.score).toBe(1);
    });

    it('should persist score value 5 (maximum boundary)', async () => {
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 5,
        tags: [],
        content: 'Excellent',
      };
      const savedRating = { id: 1, workerId: 1, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.create(1, dto);

      expect(result.score).toBe(5);
    });

    it('should persist score value 3 (midpoint)', async () => {
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 3,
        tags: [],
        content: 'Average',
      };
      const savedRating = { id: 1, workerId: 1, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.create(1, dto);

      expect(result.score).toBe(3);
    });

    it('should persist tags array correctly', async () => {
      const tags = ['professional', 'punctual', 'skilled'];
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 5,
        tags,
        content: 'Great',
      };
      const savedRating = { id: 1, workerId: 1, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.create(1, dto);

      expect(result.tags).toEqual(tags);
    });

    it('should persist content string correctly', async () => {
      const content =
        'This worker was very professional and completed the job on time.';
      const dto = {
        jobId: 1,
        enterpriseId: 1,
        score: 5,
        tags: [],
        content,
      };
      const savedRating = { id: 1, workerId: 1, ...dto };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.create(1, dto);

      expect(result.content).toBe(content);
    });

    it('should check duplicate by workerId + jobId combination', async () => {
      const dto = { jobId: 10, enterpriseId: 1, score: 5 };

      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue({ id: 1, workerId: 5, ...dto });
      ratingRepo.save.mockResolvedValue({ id: 1, workerId: 5, ...dto });

      await service.create(5, dto);

      expect(ratingRepo.findOne).toHaveBeenCalledWith({
        where: { workerId: 5, jobId: 10 },
      });
    });
  });
});
