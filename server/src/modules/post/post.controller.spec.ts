/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PostController', () => {
  let controller: PostController;
  let postService: jest.Mocked<PostService>;

  beforeEach(async () => {
    postService = {
      list: jest.fn(),
      myPosts: jest.fn(),
      detail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      unlockContact: jest.fn(),
    } as jest.Mocked<PostService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: postService,
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
  });

  describe('list', () => {
    it('should return posts list with pagination', async () => {
      const query = { page: 1, pageSize: 20 };
      const mockResult = {
        list: [
          {
            id: 1,
            userId: 1,
            type: 'purchase',
            title: 'Test Post',
            status: 'active',
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      postService.list.mockResolvedValue(mockResult);

      const result = await controller.list(query);

      expect(postService.list).toHaveBeenCalledWith(query, 0);
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle empty list', async () => {
      const query = { page: 1, pageSize: 20 };
      const mockResult = { list: [], total: 0, page: 1, pageSize: 20 };

      postService.list.mockResolvedValue(mockResult);

      const result = await controller.list(query);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw error when service fails', async () => {
      const query = { page: 1, pageSize: 20 };

      postService.list.mockRejectedValue(
        new BadRequestException('Invalid query'),
      );

      await expect(controller.list(query)).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid pagination parameters', async () => {
      const query = { page: -1, pageSize: 0 };

      postService.list.mockRejectedValue(
        new BadRequestException('Invalid pagination'),
      );

      await expect(controller.list(query)).rejects.toThrow(BadRequestException);
    });
  });

  describe('myPosts', () => {
    it('should return user posts with pagination', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const mockResult = {
        list: [
          {
            id: 1,
            userId,
            type: 'purchase',
            title: 'My Post',
            status: 'active',
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      postService.myPosts.mockResolvedValue(mockResult);

      const result = await controller.myPosts(userId, query);

      expect(postService.myPosts).toHaveBeenCalledWith(userId, query);
      expect(result.list).toHaveLength(1);
      expect(result.list[0].userId).toBe(userId);
    });

    it('should return empty list when user has no posts', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const mockResult = { list: [], total: 0, page: 1, pageSize: 20 };

      postService.myPosts.mockResolvedValue(mockResult);

      const result = await controller.myPosts(userId, query);

      expect(result.list).toEqual([]);
    });

    it('should throw error when userId is undefined', async () => {
      const userId = undefined;
      const query = { page: 1, pageSize: 20 };

      postService.myPosts.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.myPosts(userId as any, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };

      postService.myPosts.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.myPosts(userId, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle pagination correctly', async () => {
      const userId = 1;
      const query = { page: 2, pageSize: 10 };
      const mockResult = { list: [], total: 25, page: 2, pageSize: 10 };

      postService.myPosts.mockResolvedValue(mockResult);

      const result = await controller.myPosts(userId, query);

      expect(postService.myPosts).toHaveBeenCalledWith(userId, query);
      expect(result.page).toBe(2);
    });
  });

  describe('detail', () => {
    it('should return post detail', async () => {
      const postId = 1;
      const userId = 1;
      const mockPost = {
        id: postId,
        userId: 2,
        title: 'Test Post',
        content: 'Test content',
        viewCount: 10,
        contactUnlocked: false,
        postCount: 5,
        createdAt: new Date(),
      };

      postService.detail.mockResolvedValue(mockPost);

      const result = await controller.detail(postId, userId);

      expect(postService.detail).toHaveBeenCalledWith(postId, userId);
      expect(result.id).toBe(postId);
      expect(result.title).toBe('Test Post');
    });

    it('should return post detail for unauthenticated user', async () => {
      const postId = 1;
      const userId = 0;
      const mockPost = {
        id: postId,
        userId: 2,
        title: 'Test Post',
        content: 'Test content',
        viewCount: 10,
        contactUnlocked: false,
        postCount: 5,
        createdAt: new Date(),
      };

      postService.detail.mockResolvedValue(mockPost);

      const result = await controller.detail(postId, userId);

      expect(postService.detail).toHaveBeenCalledWith(postId, userId);
      expect(result).toBeDefined();
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;

      postService.detail.mockRejectedValue(
        new BadRequestException('Post not found'),
      );

      await expect(controller.detail(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle invalid post id', async () => {
      const postId = -1;
      const userId = 1;

      postService.detail.mockRejectedValue(
        new BadRequestException('Invalid post id'),
      );

      await expect(controller.detail(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('should create a new post', async () => {
      const userId = 1;
      const dto = {
        type: 'purchase',
        title: 'New Post',
        category: 'electronics',
        description: 'Test description',
        images: ['image1.jpg'],
        showPhone: true,
        showWechat: true,
        validityDays: 30,
        contactName: 'John',
        contactPhone: '13800138000',
        contactWechat: 'john_wechat',
      };
      const mockPost = { id: 1, userId, ...dto };

      postService.create.mockResolvedValue(mockPost);

      const result = await controller.create(userId, dto);

      expect(postService.create).toHaveBeenCalledWith(userId, dto);
      expect(result.id).toBe(1);
      expect(result.userId).toBe(userId);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const dto = { type: 'purchase', title: 'New Post' };

      postService.create.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.create(userId as any, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when required fields missing', async () => {
      const userId = 1;
      const dto = { type: 'purchase' };

      postService.create.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(controller.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when content contains forbidden keyword', async () => {
      const userId = 1;
      const dto = {
        type: 'purchase',
        title: 'forbidden keyword',
        category: 'electronics',
        description: 'Test description',
      };

      postService.create.mockRejectedValue(
        new BadRequestException('Content contains forbidden keyword'),
      );

      await expect(controller.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle empty images array', async () => {
      const userId = 1;
      const dto = {
        type: 'purchase',
        title: 'New Post',
        category: 'electronics',
        description: 'Test description',
        images: [],
      };
      const mockPost = { id: 1, userId, ...dto };

      postService.create.mockResolvedValue(mockPost);

      const result = await controller.create(userId, dto);

      expect(result.images).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update post by owner', async () => {
      const postId = 1;
      const userId = 1;
      const dto = { title: 'Updated Title', content: 'Updated content' };
      const mockPost = { id: postId, userId, ...dto };

      postService.update.mockResolvedValue(mockPost);

      const result = await controller.update(postId, userId, dto);

      expect(postService.update).toHaveBeenCalledWith(postId, userId, dto);
      expect(result.title).toBe('Updated Title');
    });

    it('should throw error when user is not post owner', async () => {
      const postId = 1;
      const userId = 2;
      const dto = { title: 'Updated Title' };

      postService.update.mockRejectedValue(
        new ForbiddenException('Not post owner'),
      );

      await expect(controller.update(postId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;
      const dto = { title: 'Updated Title' };

      postService.update.mockRejectedValue(
        new ForbiddenException('Post not found'),
      );

      await expect(controller.update(postId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw error when content contains forbidden keyword', async () => {
      const postId = 1;
      const userId = 1;
      const dto = { title: 'forbidden keyword' };

      postService.update.mockRejectedValue(
        new BadRequestException('Content contains forbidden keyword'),
      );

      await expect(controller.update(postId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle partial update', async () => {
      const postId = 1;
      const userId = 1;
      const dto = { title: 'Updated Title' };
      const mockPost = {
        id: postId,
        userId,
        title: 'Updated Title',
        content: 'Original content',
      };

      postService.update.mockResolvedValue(mockPost);

      const result = await controller.update(postId, userId, dto);

      expect(result.title).toBe('Updated Title');
      expect(result.content).toBe('Original content');
    });
  });

  describe('remove', () => {
    it('should delete post by owner', async () => {
      const postId = 1;
      const userId = 1;
      const mockResult = { message: '已删除' };

      postService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(postId, userId);

      expect(postService.remove).toHaveBeenCalledWith(postId, userId);
      expect(result.message).toBe('已删除');
    });

    it('should throw error when user is not post owner', async () => {
      const postId = 1;
      const userId = 2;

      postService.remove.mockRejectedValue(
        new ForbiddenException('Not post owner'),
      );

      await expect(controller.remove(postId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;

      postService.remove.mockRejectedValue(
        new ForbiddenException('Post not found'),
      );

      await expect(controller.remove(postId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw error when post already deleted', async () => {
      const postId = 1;
      const userId = 1;

      postService.remove.mockRejectedValue(
        new BadRequestException('Post already deleted'),
      );

      await expect(controller.remove(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle invalid post id', async () => {
      const postId = -1;
      const userId = 1;

      postService.remove.mockRejectedValue(
        new BadRequestException('Invalid post id'),
      );

      await expect(controller.remove(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('unlockContact', () => {
    it('should unlock contact for non-owner with sufficient beans', async () => {
      const postId = 1;
      const userId = 1;
      const mockResult = { unlocked: true, beanBalance: 90 };

      postService.unlockContact.mockResolvedValue(mockResult);

      const result = await controller.unlockContact(postId, userId);

      expect(postService.unlockContact).toHaveBeenCalledWith(postId, userId);
      expect(result.unlocked).toBe(true);
      expect(result.beanBalance).toBe(90);
    });

    it('should return unlocked for post owner', async () => {
      const postId = 1;
      const userId = 1;
      const mockResult = { unlocked: true };

      postService.unlockContact.mockResolvedValue(mockResult);

      const result = await controller.unlockContact(postId, userId);

      expect(result.unlocked).toBe(true);
    });

    it('should throw error when beans insufficient', async () => {
      const postId = 1;
      const userId = 1;

      postService.unlockContact.mockRejectedValue(
        new BadRequestException('Insufficient beans'),
      );

      await expect(controller.unlockContact(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;

      postService.unlockContact.mockRejectedValue(
        new BadRequestException('Post not found'),
      );

      await expect(controller.unlockContact(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const postId = 1;
      const userId = undefined;

      postService.unlockContact.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.unlockContact(postId, userId as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
