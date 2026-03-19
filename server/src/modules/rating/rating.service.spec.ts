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

  describe('createRating', () => {
    it('should create rating successfully with all parameters', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const savedRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 5,
        comment: 'Great work',
        tags: ['professional'],
        status: 'pending',
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockResolvedValueOnce(mockRater);
      userRepo.findOne.mockResolvedValueOnce(mockRated);
      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.createRating(
        1,
        1,
        2,
        'worker',
        5,
        'Great work',
        ['professional'],
      );

      expect(result).toEqual(savedRating);
      expect(result.status).toBe('pending');
    });

    it('should throw BadRequestException when score is below 1', async () => {
      await expect(
        service.createRating(1, 1, 2, 'worker', 0, 'Bad'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when score is above 5', async () => {
      await expect(
        service.createRating(1, 1, 2, 'worker', 6, 'Bad'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when job does not exist', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createRating(999, 1, 2, 'worker', 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when rater does not exist', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createRating(1, 999, 2, 'worker', 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when rated user does not exist', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockResolvedValueOnce(mockRater);
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createRating(1, 1, 999, 'worker', 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when duplicate rating exists', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const existingRating = { id: 1, jobId: 1, raterId: 1, ratedId: 2 };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockResolvedValueOnce(mockRater);
      userRepo.findOne.mockResolvedValueOnce(mockRated);
      ratingRepo.findOne.mockResolvedValue(existingRating);

      await expect(
        service.createRating(1, 1, 2, 'worker', 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set default empty tags when not provided', async () => {
      const mockJob = { id: 1, title: 'Test Job' };
      const mockRater = { id: 1, nickname: 'Worker' };
      const mockRated = { id: 2, nickname: 'Enterprise' };
      const savedRating = {
        id: 1,
        jobId: 1,
        raterId: 1,
        ratedId: 2,
        raterRole: 'worker',
        score: 4,
        comment: 'Good',
        tags: [],
        status: 'pending',
      };

      jobRepo.findOne.mockResolvedValue(mockJob);
      userRepo.findOne.mockResolvedValueOnce(mockRater);
      userRepo.findOne.mockResolvedValueOnce(mockRated);
      ratingRepo.findOne.mockResolvedValue(null);
      ratingRepo.create.mockReturnValue(savedRating);
      ratingRepo.save.mockResolvedValue(savedRating);

      const result = await service.createRating(1, 1, 2, 'worker', 4, 'Good');

      expect(result.tags).toEqual([]);
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
    it('should approve rating and update user average rating', async () => {
      const mockRating = {
        id: 1,
        ratedId: 2,
        score: 5,
        status: 'pending',
      };
      const approvedRating = { ...mockRating, status: 'approved' };
      const mockUser = { id: 2, creditScore: 100 };
      const approvedRatings = [
        { score: 5 },
        { score: 4 },
        { score: 5 },
      ];

      ratingRepo.findOne.mockResolvedValueOnce(mockRating);
      ratingRepo.save.mockResolvedValueOnce(approvedRating);
      ratingRepo.find.mockResolvedValue(approvedRatings);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      const result = await service.approveRating(1);

      expect(result.status).toBe('approved');
      expect(ratingRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rating does not exist', async () => {
      ratingRepo.findOne.mockResolvedValue(null);

      await expect(service.approveRating(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update user credit score based on average rating', async () => {
      const mockRating = {
        id: 1,
        ratedId: 2,
        score: 5,
        status: 'pending',
      };
      const approvedRating = { ...mockRating, status: 'approved' };
      const mockUser = { id: 2, creditScore: 100 };
      const approvedRatings = [{ score: 5 }, { score: 4 }];

      ratingRepo.findOne.mockResolvedValueOnce(mockRating);
      ratingRepo.save.mockResolvedValueOnce(approvedRating);
      ratingRepo.find.mockResolvedValue(approvedRatings);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);

      await service.approveRating(1);

      expect(userRepo.save).toHaveBeenCalled();
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

      await expect(service.rejectRating(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

