/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { Favorite } from '../../entities/favorite.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';

describe('FavoriteModule Integration Tests', () => {
  let controller: FavoriteController;
  let service: FavoriteService;
  let favoriteRepository: any;
  let postRepository: any;
  let jobRepository: any;
  let exposureRepository: any;

  beforeEach(async () => {
    favoriteRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    postRepository = {
      findByIds: jest.fn(),
    };

    jobRepository = {
      findByIds: jest.fn(),
    };

    exposureRepository = {
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        FavoriteService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: favoriteRepository,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: postRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(Exposure),
          useValue: exposureRepository,
        },
      ],
    }).compile();

    controller = module.get<FavoriteController>(FavoriteController);
    service = module.get<FavoriteService>(FavoriteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list Integration', () => {
    it('should return favorite list with posts', async () => {
      const mockFavorites = [
        {
          id: 1,
          userId: 1,
          targetType: 'post',
          targetId: 1,
          createdAt: new Date(),
        },
      ];

      const mockPosts = [
        {
          id: 1,
          type: 'purchase',
          title: 'Test Post',
          content: 'Content',
          images: [],
          createdAt: new Date(),
        },
      ];

      favoriteRepository.find.mockResolvedValue(mockFavorites);
      postRepository.findByIds.mockResolvedValue(mockPosts);
      jobRepository.findByIds.mockResolvedValue([]);
      exposureRepository.findByIds.mockResolvedValue([]);

      const result = await controller.list(1);

      expect(result.list).toBeDefined();
      expect(result.list.length).toBeGreaterThan(0);
      expect(favoriteRepository.find).toHaveBeenCalled();
    });

    it('should return favorite list with jobs', async () => {
      const mockFavorites = [
        {
          id: 1,
          userId: 1,
          targetType: 'job',
          targetId: 1,
          createdAt: new Date(),
        },
      ];

      const mockJobs = [
        {
          id: 1,
          title: 'Test Job',
          description: 'Job Description',
          salary: 100,
          salaryUnit: 'day',
          location: 'Beijing',
          needCount: 5,
          createdAt: new Date(),
        },
      ];

      favoriteRepository.find.mockResolvedValue(mockFavorites);
      postRepository.findByIds.mockResolvedValue([]);
      jobRepository.findByIds.mockResolvedValue(mockJobs);
      exposureRepository.findByIds.mockResolvedValue([]);

      const result = await controller.list(1);

      expect(result.list).toBeDefined();
      expect(result.list.length).toBeGreaterThan(0);
      expect(jobRepository.findByIds).toHaveBeenCalled();
    });

    it('should return favorite list with exposures', async () => {
      const mockFavorites = [
        {
          id: 1,
          userId: 1,
          targetType: 'exposure',
          targetId: 1,
          createdAt: new Date(),
        },
      ];

      const mockExposures = [
        {
          id: 1,
          companyName: 'Test Company',
          personName: 'John',
          description: 'Exposure Description',
          category: 'factory',
          amount: 1000,
          images: [],
          createdAt: new Date(),
        },
      ];

      favoriteRepository.find.mockResolvedValue(mockFavorites);
      postRepository.findByIds.mockResolvedValue([]);
      jobRepository.findByIds.mockResolvedValue([]);
      exposureRepository.findByIds.mockResolvedValue(mockExposures);

      const result = await controller.list(1);

      expect(result.list).toBeDefined();
      expect(result.list.length).toBeGreaterThan(0);
      expect(exposureRepository.findByIds).toHaveBeenCalled();
    });

    it('should return empty favorite list', async () => {
      favoriteRepository.find.mockResolvedValue([]);
      postRepository.findByIds.mockResolvedValue([]);
      jobRepository.findByIds.mockResolvedValue([]);
      exposureRepository.findByIds.mockResolvedValue([]);

      const result = await controller.list(1);

      expect(result.list).toEqual([]);
    });

    it('should return mixed favorite list sorted by date', async () => {
      const date1 = new Date('2026-03-01');
      const date2 = new Date('2026-03-05');

      const mockFavorites = [
        { id: 1, userId: 1, targetType: 'post', targetId: 1, createdAt: date1 },
        { id: 2, userId: 1, targetType: 'job', targetId: 1, createdAt: date2 },
      ];

      const mockPosts = [
        {
          id: 1,
          type: 'purchase',
          title: 'Post 1',
          content: 'Content',
          images: [],
          createdAt: date1,
        },
      ];

      const mockJobs = [
        {
          id: 1,
          title: 'Job 1',
          description: 'Job Description',
          salary: 100,
          salaryUnit: 'day',
          location: 'Beijing',
          needCount: 5,
          createdAt: date2,
        },
      ];

      favoriteRepository.find.mockResolvedValue(mockFavorites);
      postRepository.findByIds.mockResolvedValue(mockPosts);
      jobRepository.findByIds.mockResolvedValue(mockJobs);
      exposureRepository.findByIds.mockResolvedValue([]);

      const result = await controller.list(1);

      expect(result.list).toBeDefined();
      expect(result.list.length).toBe(2);
      // Most recent should be first
      expect(result.list[0].createdAt).toEqual(date2);
    });

    it('should handle database error', async () => {
      favoriteRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(controller.list(1)).rejects.toThrow('Database error');
    });
  });

  describe('toggle Integration', () => {
    it('should add favorite successfully', async () => {
      const mockFavorite = {
        id: 1,
        userId: 1,
        targetType: 'post',
        targetId: 1,
      };

      favoriteRepository.findOne.mockResolvedValue(null);
      favoriteRepository.create.mockReturnValue(mockFavorite);
      favoriteRepository.save.mockResolvedValue(mockFavorite);

      const result = await controller.toggle(1, {
        targetType: 'post',
        targetId: 1,
      });

      expect(result.favorited).toBe(true);
      expect(favoriteRepository.save).toHaveBeenCalled();
    });

    it('should remove favorite successfully', async () => {
      const mockFavorite = {
        id: 1,
        userId: 1,
        targetType: 'post',
        targetId: 1,
      };

      favoriteRepository.findOne.mockResolvedValue(mockFavorite);
      favoriteRepository.remove.mockResolvedValue(mockFavorite);

      const result = await controller.toggle(1, {
        targetType: 'post',
        targetId: 1,
      });

      expect(result.favorited).toBe(false);
      expect(favoriteRepository.remove).toHaveBeenCalled();
    });

    it('should toggle favorite for job', async () => {
      const mockFavorite = { id: 1, userId: 1, targetType: 'job', targetId: 5 };

      favoriteRepository.findOne.mockResolvedValue(null);
      favoriteRepository.create.mockReturnValue(mockFavorite);
      favoriteRepository.save.mockResolvedValue(mockFavorite);

      const result = await controller.toggle(1, {
        targetType: 'job',
        targetId: 5,
      });

      expect(result.favorited).toBe(true);
      expect(favoriteRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1, targetType: 'job', targetId: 5 },
      });
    });

    it('should toggle favorite for exposure', async () => {
      const mockFavorite = {
        id: 1,
        userId: 1,
        targetType: 'exposure',
        targetId: 3,
      };

      favoriteRepository.findOne.mockResolvedValue(null);
      favoriteRepository.create.mockReturnValue(mockFavorite);
      favoriteRepository.save.mockResolvedValue(mockFavorite);

      const result = await controller.toggle(1, {
        targetType: 'exposure',
        targetId: 3,
      });

      expect(result.favorited).toBe(true);
      expect(favoriteRepository.save).toHaveBeenCalled();
    });

    it('should handle toggle error', async () => {
      favoriteRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.toggle(1, { targetType: 'post', targetId: 1 }),
      ).rejects.toThrow('Database error');
    });

    it('should handle multiple toggle operations', async () => {
      const mockFavorite = {
        id: 1,
        userId: 1,
        targetType: 'post',
        targetId: 1,
      };

      // First toggle - add
      favoriteRepository.findOne.mockResolvedValueOnce(null);
      favoriteRepository.create.mockReturnValueOnce(mockFavorite);
      favoriteRepository.save.mockResolvedValueOnce(mockFavorite);

      const result1 = await controller.toggle(1, {
        targetType: 'post',
        targetId: 1,
      });
      expect(result1.favorited).toBe(true);

      // Second toggle - remove
      favoriteRepository.findOne.mockResolvedValueOnce(mockFavorite);
      favoriteRepository.remove.mockResolvedValueOnce(mockFavorite);

      const result2 = await controller.toggle(1, {
        targetType: 'post',
        targetId: 1,
      });
      expect(result2.favorited).toBe(false);
    });

    it('should handle concurrent toggle operations', async () => {
      const mockFavorite = {
        id: 1,
        userId: 1,
        targetType: 'post',
        targetId: 1,
      };

      favoriteRepository.findOne.mockResolvedValue(null);
      favoriteRepository.create.mockReturnValue(mockFavorite);
      favoriteRepository.save.mockResolvedValue(mockFavorite);

      const result1 = await controller.toggle(1, {
        targetType: 'post',
        targetId: 1,
      });
      const result2 = await controller.toggle(1, {
        targetType: 'post',
        targetId: 2,
      });

      expect(result1.favorited).toBe(true);
      expect(result2.favorited).toBe(true);
      expect(favoriteRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
