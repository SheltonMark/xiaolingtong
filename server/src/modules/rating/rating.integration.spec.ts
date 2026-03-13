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
import { CreateRatingDto } from './rating.dto';

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
      createQueryBuilder: jest.fn(),
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

  describe('createRating Integration', () => {
    it('should create rating successfully via controller', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
        comment: 'Great job',
        tags: ['good'],
      };
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 5,
        comment: 'Great job',
        tags: ['good'],
        isAnonymous: false,
        status: 'pending',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await controller.create(1, 'worker', dto);

      expect(result).toBeDefined();
      expect(result.score).toBe(5);
      expect(result.status).toBe('pending');
      expect(ratingRepository.save).toHaveBeenCalled();
    });

    it('should throw error when already rated', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const existingRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
      };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
        comment: 'Great job',
        tags: ['good'],
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepository.findOne.mockResolvedValue(existingRating);

      await expect(controller.create(1, 'worker', dto)).rejects.toThrow();
    });

    it('should accept different score values', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 3,
        comment: 'Average',
        tags: ['ok'],
      };
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 3,
        comment: 'Average',
        tags: ['ok'],
        isAnonymous: false,
        status: 'pending',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await controller.create(1, 'worker', dto);

      expect(result.score).toBe(3);
    });

    it('should validate rater and rated are different', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 1,
        score: 5,
      };

      await expect(controller.create(1, 'worker', dto)).rejects.toThrow();
    });

    it('should support enterprise role rating', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 2, nickname: 'Enterprise' };
      const mockRated = { id: 1, nickname: 'Worker' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 1,
        score: 4,
        comment: 'Good worker',
      };
      const mockRating = {
        id: 1,
        jobId: 1,
        raterId: 2,
        ratedId: 1,
        raterRole: 'enterprise',
        score: 4,
        comment: 'Good worker',
        tags: [],
        isAnonymous: false,
        status: 'pending',
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRated);
        if (id === 2) return Promise.resolve(mockRater);
        return Promise.resolve(null);
      });
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue(mockRating);
      ratingRepository.save.mockResolvedValue(mockRating);

      const result = await controller.create(2, 'enterprise', dto);

      expect(result.raterRole).toBe('enterprise');
      expect(result.raterId).toBe(2);
    });
  });
});
