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
          { id: 1, type: 'post', title: 'Post 1', content: 'Content 1', createdAt: new Date(), targetType: 'post' },
          { id: 2, type: 'post', title: 'Post 2', content: 'Content 2', createdAt: new Date(), targetType: 'post' },
        ],
      };

      favoriteService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId);

      expect(favoriteService.list).toHaveBeenCalledWith(userId);
      expect(result.list).toHaveLength(2);
      expect(result.list[0]).toHaveProperty('id');
      expect(result.list[0]).toHaveProperty('targetType');
    });

    it('should return empty favorites list', async () => {
      const userId = 1;
      const mockResult = {
        list: [],
      };

      favoriteService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId);

      expect(favoriteService.list).toHaveBeenCalledWith(userId);
      expect(result.list).toEqual([]);
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
        favorited: true,
      };

      favoriteService.toggle.mockResolvedValue(mockResult);

      const result = await controller.toggle(userId, dto);

      expect(favoriteService.toggle).toHaveBeenCalledWith(userId, dto.targetType, dto.targetId);
      expect(result.favorited).toBe(true);
    });

    it('should successfully unfavorite a post', async () => {
      const userId = 1;
      const dto = { targetType: 'post', targetId: 101 };
      const mockResult = {
        favorited: false,
      };

      favoriteService.toggle.mockResolvedValue(mockResult);

      const result = await controller.toggle(userId, dto);

      expect(favoriteService.toggle).toHaveBeenCalledWith(userId, dto.targetType, dto.targetId);
      expect(result.favorited).toBe(false);
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
