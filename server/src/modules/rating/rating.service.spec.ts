/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RatingService } from './rating.service';
import { Rating } from '../../entities/rating.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';
import { CreateRatingDto } from './rating.dto';

describe('RatingService', () => {
  let service: RatingService;
  let ratingRepo: any;
  let userRepo: any;
  let jobRepo: any;

  beforeEach(async () => {
    ratingRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jobRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        {
          provide: getRepositoryToken(Rating),
          useValue: ratingRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepo,
        },
      ],
    }).compile();

    service = module.get<RatingService>(RatingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRating', () => {
    it('should create rating successfully with all parameters', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
        comment: 'Great work',
        tags: ['professional'],
        isAnonymous: false,
      };
      const savedRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 5,
        comment: 'Great work',
        tags: ['professional'],
        isAnonymous: false,
        status: 'pending',
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.createRating(1, 1, 2, 'worker', dto);

      expect(result).toEqual(savedRating);
      expect(result.status).toBe('pending');
    });

    it('should throw BadRequestException when score is below 1', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 0,
      };

      await expect(service.createRating(1, 1, 2, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when score is above 5', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 6,
      };

      await expect(service.createRating(1, 1, 2, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when rater and rated are the same', async () => {
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 1,
        score: 5,
      };

      await expect(service.createRating(1, 1, 1, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when job does not exist', async () => {
      const dto: CreateRatingDto = {
        jobId: 999,
        ratedId: 2,
        score: 5,
      };

      jobRepo.findOne.mockResolvedValue(null);

      await expect(service.createRating(999, 1, 2, 'worker', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when rater does not exist', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.createRating(1, 999, 2, 'worker', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when rated user does not exist', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 999,
        score: 5,
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        return Promise.resolve(null);
      });

      await expect(service.createRating(1, 1, 999, 'worker', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when duplicate rating exists', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const existingRating = { id: 1, jobId: 1, raterId: 1, ratedId: 2 };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepo.findOne.mockResolvedValue(existingRating);

      await expect(service.createRating(1, 1, 2, 'worker', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set default empty tags when not provided', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 4,
        comment: 'Good',
      };
      const savedRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 4,
        comment: 'Good',
        tags: [],
        isAnonymous: false,
        status: 'pending',
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.createRating(1, 1, 2, 'worker', dto);

      expect(result.tags).toEqual([]);
    });

    it('should set default isAnonymous to false when not provided', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const dto: CreateRatingDto = {
        jobId: 1,
        ratedId: 2,
        score: 5,
      };
      const savedRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 5,
        tags: [],
        isAnonymous: false,
        status: 'pending',
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockImplementation(({ where: { id } }) => {
        if (id === 1) return Promise.resolve(mockRater);
        if (id === 2) return Promise.resolve(mockRated);
        return Promise.resolve(null);
      });
      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.createRating(1, 1, 2, 'worker', dto);

      expect(result.isAnonymous).toBe(false);
    });
  });

  describe('getRatings', () => {
    it('should get ratings for a user with pagination', async () => {
      const mockRatings = [
        { id: 1, ratedId: 1, score: 5, createdAt: new Date() },
        { id: 2, ratedId: 1, score: 4, createdAt: new Date() },
      ];

      ratingRepo.findAndCount.mockResolvedValue([mockRatings, 2]);

      const result = await service.getRatings(1, 1, 10);

      expect(result.data).toEqual(mockRatings);
      expect(result.total).toBe(2);
    });

    it('should use default pagination values', async () => {
      ratingRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getRatings(1);

      expect(ratingRepo.findAndCount).toHaveBeenCalledWith({
        where: { ratedId: 1 },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should calculate correct skip value for page 2', async () => {
      ratingRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getRatings(1, 2, 10);

      expect(ratingRepo.findAndCount).toHaveBeenCalledWith({
        where: { ratedId: 1 },
        skip: 10,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should sort by createdAt in descending order', async () => {
      ratingRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getRatings(1);

      expect(ratingRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  describe('approveRating', () => {
    it('should approve rating and update user credit score using QueryBuilder', async () => {
      const mockRating = {
        id: 1,
        ratedId: 2,
        score: 5,
        status: 'pending',
      };
      const approvedRating = { ...mockRating, status: 'approved' };
      const mockUser = { id: 2, creditScore: 50 };
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgScore: '4.5', count: '3' }),
      };

      ratingRepo.findOne.mockResolvedValueOnce(mockRating);
      ratingRepo.save.mockResolvedValueOnce(approvedRating);
      ratingRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      const result = await service.approveRating(1);

      expect(result.status).toBe('approved');
      expect(ratingRepo.createQueryBuilder).toHaveBeenCalledWith('r');
      expect(queryBuilder.select).toHaveBeenCalledWith('AVG(r.score)', 'avgScore');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('COUNT(*)', 'count');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rating does not exist', async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(service.approveRating(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle missing user gracefully', async () => {
      const mockRating = {
        id: 1,
        ratedId: 2,
        score: 5,
        status: 'pending',
      };
      const approvedRating = { ...mockRating, status: 'approved' };
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avgScore: '4.5', count: '3' }),
      };

      ratingRepo.findOne.mockResolvedValueOnce(mockRating);
      ratingRepo.save.mockResolvedValueOnce(approvedRating);
      ratingRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.approveRating(1);

      expect(result.status).toBe('approved');
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('rejectRating', () => {
    it('should reject rating successfully', async () => {
      const mockRating = {
        id: 1,
        ratedId: 2,
        score: 1,
        status: 'pending',
      };
      const rejectedRating = { ...mockRating, status: 'rejected' };

      ratingRepo.findOne.mockResolvedValue(mockRating);
      ratingRepo.save.mockResolvedValue(rejectedRating);

      const result = await service.rejectRating(1);

      expect(result.status).toBe('rejected');
      expect(ratingRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rating does not exist', async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(service.rejectRating(999)).rejects.toThrow(NotFoundException);
    });
  });
});
