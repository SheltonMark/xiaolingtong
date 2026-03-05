/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteService } from './favorite.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let favRepo: jest.Mocked<any>;
  let postRepo: jest.Mocked<any>;
  let jobRepo: jest.Mocked<any>;
  let exposureRepo: jest.Mocked<any>;

  beforeEach(async () => {
    favRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as jest.Mocked<any>;

    postRepo = {
      findByIds: jest.fn(),
    } as jest.Mocked<any>;

    jobRepo = {
      findByIds: jest.fn(),
    } as jest.Mocked<any>;

    exposureRepo = {
      findByIds: jest.fn(),
    } as jest.Mocked<any>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        {
          provide: getRepositoryToken(Favorite),
          useValue: favRepo,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: postRepo,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepo,
        },
        {
          provide: getRepositoryToken(Exposure),
          useValue: exposureRepo,
        },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  describe('list', () => {
    it('should return empty list when user has no favorites', async () => {
      const userId = 1;

      favRepo.find.mockResolvedValue([]);

      const result = await service.list(userId);

      expect(favRepo.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result.list).toEqual([]);
    });

    it('should return posts from favorites', async () => {
      const userId = 1;
      const favorites = [
        {
          id: 1,
          userId,
          targetType: 'post',
          targetId: 10,
          createdAt: new Date(),
        },
      ];
      const posts = [
        {
          id: 10,
          type: 'purchase',
          title: 'Test Post',
          content: 'Test content',
          images: [],
          createdAt: new Date(),
        },
      ];

      favRepo.find.mockResolvedValue(favorites);
      postRepo.findByIds.mockResolvedValue(posts);
      jobRepo.findByIds.mockResolvedValue([]);
      exposureRepo.findByIds.mockResolvedValue([]);

      const result = await service.list(userId);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].targetType).toBe('post');
      expect(result.list[0].title).toBe('Test Post');
    });

    it('should return jobs from favorites', async () => {
      const userId = 1;
      const favorites = [
        {
          id: 1,
          userId,
          targetType: 'job',
          targetId: 20,
          createdAt: new Date(),
        },
      ];
      const jobs = [
        {
          id: 20,
          title: 'Software Engineer',
          description: 'Job description',
          salary: 15000,
          salaryUnit: 'month',
          location: 'Beijing',
          needCount: 5,
          createdAt: new Date(),
        },
      ];

      favRepo.find.mockResolvedValue(favorites);
      postRepo.findByIds.mockResolvedValue([]);
      jobRepo.findByIds.mockResolvedValue(jobs);
      exposureRepo.findByIds.mockResolvedValue([]);

      const result = await service.list(userId);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].targetType).toBe('job');
      expect(result.list[0].title).toBe('Software Engineer');
      expect(result.list[0].salary).toBe(15000);
    });

    it('should return exposures from favorites', async () => {
      const userId = 1;
      const favorites = [
        {
          id: 1,
          userId,
          targetType: 'exposure',
          targetId: 30,
          createdAt: new Date(),
        },
      ];
      const exposures = [
        {
          id: 30,
          companyName: 'Test Company',
          personName: 'John Doe',
          description: 'Exposure description',
          category: 'factory',
          amount: 1000,
          images: [],
          createdAt: new Date(),
        },
      ];

      favRepo.find.mockResolvedValue(favorites);
      postRepo.findByIds.mockResolvedValue([]);
      jobRepo.findByIds.mockResolvedValue([]);
      exposureRepo.findByIds.mockResolvedValue(exposures);

      const result = await service.list(userId);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].targetType).toBe('exposure');
      expect(result.list[0].title).toContain('Test Company');
    });

    it('should return mixed favorites sorted by createdAt', async () => {
      const userId = 1;
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const favorites = [
        {
          id: 1,
          userId,
          targetType: 'post',
          targetId: 10,
          createdAt: yesterday,
        },
        { id: 2, userId, targetType: 'job', targetId: 20, createdAt: now },
      ];

      const posts = [
        {
          id: 10,
          type: 'purchase',
          title: 'Old Post',
          content: 'Old content',
          images: [],
          createdAt: yesterday,
        },
      ];

      const jobs = [
        {
          id: 20,
          title: 'New Job',
          description: 'New job description',
          salary: 20000,
          salaryUnit: 'month',
          location: 'Shanghai',
          needCount: 3,
          createdAt: now,
        },
      ];

      favRepo.find.mockResolvedValue(favorites);
      postRepo.findByIds.mockResolvedValue(posts);
      jobRepo.findByIds.mockResolvedValue(jobs);
      exposureRepo.findByIds.mockResolvedValue([]);

      const result = await service.list(userId);

      expect(result.list).toHaveLength(2);
      expect(result.list[0].title).toBe('New Job');
      expect(result.list[1].title).toBe('Old Post');
    });

    it('should handle post without title by using content slice', async () => {
      const userId = 1;
      const favorites = [
        {
          id: 1,
          userId,
          targetType: 'post',
          targetId: 10,
          createdAt: new Date(),
        },
      ];
      const posts = [
        {
          id: 10,
          type: 'purchase',
          title: null,
          content:
            'This is a very long content that should be sliced to 30 characters',
          images: [],
          createdAt: new Date(),
        },
      ];

      favRepo.find.mockResolvedValue(favorites);
      postRepo.findByIds.mockResolvedValue(posts);
      jobRepo.findByIds.mockResolvedValue([]);
      exposureRepo.findByIds.mockResolvedValue([]);

      const result = await service.list(userId);

      expect(result.list[0].title).toBe('This is a very long content th');
    });

    it('should handle exposure with only company name', async () => {
      const userId = 1;
      const favorites = [
        {
          id: 1,
          userId,
          targetType: 'exposure',
          targetId: 30,
          createdAt: new Date(),
        },
      ];
      const exposures = [
        {
          id: 30,
          companyName: 'Test Company',
          personName: null,
          description: 'Description',
          category: 'factory',
          amount: 500,
          images: [],
          createdAt: new Date(),
        },
      ];

      favRepo.find.mockResolvedValue(favorites);
      postRepo.findByIds.mockResolvedValue([]);
      jobRepo.findByIds.mockResolvedValue([]);
      exposureRepo.findByIds.mockResolvedValue(exposures);

      const result = await service.list(userId);

      expect(result.list[0].title).toBe('Test Company');
    });
  });

  describe('toggle', () => {
    it('should add favorite when not exists', async () => {
      const userId = 1;
      const targetType = 'post';
      const targetId = 10;

      const newFavorite = {
        userId,
        targetType,
        targetId,
      };

      favRepo.findOne.mockResolvedValue(null);
      favRepo.create.mockReturnValue(newFavorite);
      favRepo.save.mockResolvedValue(newFavorite);

      const result = await service.toggle(userId, targetType, targetId);

      expect(favRepo.findOne).toHaveBeenCalledWith({
        where: { userId, targetType, targetId },
      });
      expect(favRepo.create).toHaveBeenCalledWith({
        userId,
        targetType,
        targetId,
      });
      expect(favRepo.save).toHaveBeenCalled();
      expect(result.favorited).toBe(true);
    });

    it('should remove favorite when exists', async () => {
      const userId = 1;
      const targetType = 'job';
      const targetId = 20;

      const existingFavorite = {
        id: 1,
        userId,
        targetType,
        targetId,
      };

      favRepo.findOne.mockResolvedValue(existingFavorite);
      favRepo.remove.mockResolvedValue(existingFavorite);

      const result = await service.toggle(userId, targetType, targetId);

      expect(favRepo.findOne).toHaveBeenCalledWith({
        where: { userId, targetType, targetId },
      });
      expect(favRepo.remove).toHaveBeenCalledWith(existingFavorite);
      expect(result.favorited).toBe(false);
    });

    it('should handle toggle for exposure type', async () => {
      const userId = 1;
      const targetType = 'exposure';
      const targetId = 30;

      favRepo.findOne.mockResolvedValue(null);
      favRepo.create.mockReturnValue({ userId, targetType, targetId });
      favRepo.save.mockResolvedValue({ userId, targetType, targetId });

      const result = await service.toggle(userId, targetType, targetId);

      expect(result.favorited).toBe(true);
      expect(favRepo.create).toHaveBeenCalledWith({
        userId,
        targetType,
        targetId,
      });
    });

    it('should handle multiple toggles correctly', async () => {
      const userId = 1;
      const targetType = 'post';
      const targetId = 10;

      // First toggle - add
      favRepo.findOne.mockResolvedValueOnce(null);
      favRepo.create.mockReturnValueOnce({ userId, targetType, targetId });
      favRepo.save.mockResolvedValueOnce({ userId, targetType, targetId });

      const result1 = await service.toggle(userId, targetType, targetId);
      expect(result1.favorited).toBe(true);

      // Second toggle - remove
      const existingFavorite = { id: 1, userId, targetType, targetId };
      favRepo.findOne.mockResolvedValueOnce(existingFavorite);
      favRepo.remove.mockResolvedValueOnce(existingFavorite);

      const result2 = await service.toggle(userId, targetType, targetId);
      expect(result2.favorited).toBe(false);
    });
  });
});
