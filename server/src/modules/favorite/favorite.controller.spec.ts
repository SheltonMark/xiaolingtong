/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

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

  afterEach(() => {
    jest.clearAllMocks();
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

      expect(favoriteService.list).toHaveBeenCalledWith(userId);
      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw error when pagination is invalid', async () => {
      const userId = 1;

      favoriteService.list.mockRejectedValue(
        new BadRequestException('Invalid pagination'),
      );

      await expect(controller.list(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;

      favoriteService.list.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(controller.list(userId as any)).rejects.toThrow(
        UnauthorizedException,
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
    it('should successfully favorite a post', async () => {
      const userId = 1;
      const dto = { targetType: 'post', targetId: 101 };
      const mockResult = {
        message: '收藏成功',
        isFavorited: true,
      };

      favoriteService.toggle.mockResolvedValue(mockResult);

      const result = await controller.toggle(userId, dto);

      expect(favoriteService.toggle).toHaveBeenCalledWith(userId, dto.targetType, dto.targetId);
      expect(result.isFavorited).toBe(true);
      expect(result.message).toBe('收藏成功');
    });

    it('should successfully unfavorite a post', async () => {
      const userId = 1;
      const dto = { targetType: 'post', targetId: 101 };
      const mockResult = {
        message: '取消收藏成功',
        isFavorited: false,
      };

      favoriteService.toggle.mockResolvedValue(mockResult);

      const result = await controller.toggle(userId, dto);

      expect(favoriteService.toggle).toHaveBeenCalledWith(userId, dto.targetType, dto.targetId);
      expect(result.isFavorited).toBe(false);
      expect(result.message).toBe('取消收藏成功');
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const dto = { targetType: 'post', targetId: 101 };

      favoriteService.toggle.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(controller.toggle(userId as any, dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error when targetId is missing', async () => {
      const userId = 1;
      const dto = { targetType: 'post', targetId: undefined };

      favoriteService.toggle.mockRejectedValue(
        new BadRequestException('targetId is required'),
      );

      await expect(controller.toggle(userId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle service exception', async () => {
      const userId = 1;
      const dto = { targetType: 'post', targetId: 101 };

      favoriteService.toggle.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.toggle(userId, dto)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
