/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Rating } from '../../entities/rating.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';

describe('RatingModule Integration Tests', () => {
  let controller: RatingController;
  let service: RatingService;
  let ratingRepository: any;
  let userRepository: any;
  let jobRepository: any;

  beforeEach(async () => {
    ratingRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingController],
      providers: [
        RatingService,
        {
          provide: getRepositoryToken(Rating),
          useValue: ratingRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
      ],
    }).compile();

    controller = module.get<RatingController>(RatingController);
    service = module.get<RatingService>(RatingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create Integration', () => {
    it('should create rating successfully', async () => {
      const mockRating = {
        id: 1,
        workerId: 1,
        enterpriseId: 2,
        jobId: 1,
        score: 5,
        tags: ['good'],
        content: 'Great job',
      };

      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await controller.create(1, {
        enterpriseId: 2,
        jobId: 1,
        score: 5,
        tags: ['good'],
        content: 'Great job',
      });

      expect(result).toBeDefined();
      expect(result.score).toBe(5);
      expect(ratingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when already rated', async () => {
      const mockRating = {
        id: 1,
        workerId: 1,
        enterpriseId: 2,
        jobId: 1,
        score: 5,
      };

      ratingRepository.findOne.mockResolvedValue(mockRating);

      await expect(
        controller.create(1, {
          enterpriseId: 2,
          jobId: 1,
          score: 5,
          tags: ['good'],
          content: 'Great job',
        }),
      ).rejects.toThrow();
    });

    it('should accept different score values', async () => {
      const mockRating = {
        id: 1,
        workerId: 1,
        enterpriseId: 2,
        jobId: 1,
        score: 3,
        tags: ['ok'],
        content: 'Average',
      };

      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await controller.create(1, {
        enterpriseId: 2,
        jobId: 1,
        score: 3,
        tags: ['ok'],
        content: 'Average',
      });

      expect(result.score).toBe(3);
    });
  });
});

