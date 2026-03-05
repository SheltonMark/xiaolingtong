/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let favoriteService: jest.Mocked<FavoriteService>;

  beforeEach(async () => {
    favoriteService = {
      list: jest.fn(),
      toggle: jest.fn(),
    } as jest.Mocked<FavoriteService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        {
          provide: FavoriteService,
          useValue: favoriteService,
        },
      ],
    }).compile();

    controller = module.get<FavoriteController>(FavoriteController);
  });

  describe('list', () => {
    it('should return favorites with pagination', async () => {
      const userId = 1;
      const mockResult = {
        list: [
          { id: 1, userId, postId: 101, createdAt: new Date() },
          { id: 2, userId, postId: 102, createdAt: new Date() },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      favoriteService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId);

      expect(favoriteService.list).toHaveBeenCalledWith(userId);
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return empty favorites list', async () => {
      const userId = 1;
      const mockResult = {
        list: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };

      favoriteService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw error when pagination is invalid', async () => {
      const userId = 1;

      favoriteService.list.mockRejectedValue(
        new Error('Invalid pagination'),
      );

      await expect(controller.list(userId)).rejects.toThrow(
        'Invalid pagination',
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;

      favoriteService.list.mockRejectedValue(
        new Error('User not authenticated'),
      );

      await expect(controller.list(userId as any)).rejects.toThrow(
        'User not authenticated',
      );
    });

    it('should handle service exception', async () => {
      const userId = 1;

      favoriteService.list.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.list(userId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('toggle', () => {
    // 测试将在后续步骤中添加
  });
});
