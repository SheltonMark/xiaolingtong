/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { Job } from '../../entities/job.entity';

describe('PostService', () => {
  let service: PostService;
  let postRepo: jest.Mocked<any>;
  let unlockRepo: jest.Mocked<any>;
  let userRepo: jest.Mocked<any>;
  let beanTxRepo: jest.Mocked<any>;
  let keywordRepo: jest.Mocked<any>;
  let entCertRepo: jest.Mocked<any>;
  let jobRepo: jest.Mocked<any>;

  beforeEach(async () => {
    postRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as jest.Mocked<any>;

    unlockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    userRepo = {
      findOneBy: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    beanTxRepo = {
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    keywordRepo = {
      find: jest.fn(),
    } as jest.Mocked<any>;

    entCertRepo = {
      createQueryBuilder: jest.fn(),
    } as jest.Mocked<any>;

    jobRepo = {
      createQueryBuilder: jest.fn(),
    } as jest.Mocked<any>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: getRepositoryToken(Post),
          useValue: postRepo,
        },
        {
          provide: getRepositoryToken(ContactUnlock),
          useValue: unlockRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(BeanTransaction),
          useValue: beanTxRepo,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepo,
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: entCertRepo,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepo,
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  describe('list', () => {
    it('should return active posts with pagination', async () => {
      const query = { page: 1, pageSize: 20 };
      const posts = [
        {
          id: 1,
          userId: 1,
          type: 'purchase',
          title: 'Test Post',
          content: 'Test content',
          status: 'active',
          createdAt: new Date(),
          user: { id: 1 },
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([posts, 1]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.list(query);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter posts by type', async () => {
      const query = { type: 'purchase', page: 1, pageSize: 20 };
      const posts = [];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([posts, 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.list(query);

      expect(result.list).toEqual([]);
    });

    it('should filter posts by keyword', async () => {
      const query = { keyword: 'test', page: 1, pageSize: 20 };
      const posts = [];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([posts, 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.list(query);

      expect(result.list).toEqual([]);
    });
  });

  describe('detail', () => {
    it('should return post detail with view count incremented', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId: 2,
        title: 'Test Post',
        content: 'Test content',
        viewCount: 0,
        contactUnlockCount: 0,
        user: { id: 2 },
      };

      postRepo.findOne.mockResolvedValue(post);
      postRepo.count.mockResolvedValue(5);
      unlockRepo.findOne.mockResolvedValue(null);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.detail(postId, userId);

      expect(postRepo.findOne).toHaveBeenCalledWith({
        where: { id: postId },
        relations: ['user'],
      });
      expect(result.postCount).toBe(5);
      expect(result.contactUnlocked).toBe(false);
    });

    it('should return unlocked contact for post owner', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId,
        title: 'Test Post',
        content: 'Test content',
        viewCount: 0,
        contactUnlockCount: 0,
        user: { id: userId },
      };

      postRepo.findOne.mockResolvedValue(post);
      postRepo.count.mockResolvedValue(1);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.detail(postId, userId);

      expect(result.contactUnlocked).toBe(true);
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;

      postRepo.findOne.mockResolvedValue(null);

      await expect(service.detail(postId, userId)).rejects.toThrow(
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

      const newPost = {
        id: 1,
        userId,
        ...dto,
      };

      keywordRepo.find.mockResolvedValue([]);
      postRepo.create.mockReturnValue(newPost);
      postRepo.save.mockResolvedValue(newPost);

      const result = await service.create(userId, dto);

      expect(keywordRepo.find).toHaveBeenCalled();
      expect(postRepo.create).toHaveBeenCalled();
      expect(postRepo.save).toHaveBeenCalled();
      expect(result.userId).toBe(userId);
    });

    it('should throw error when content contains forbidden keyword', async () => {
      const userId = 1;
      const dto = {
        type: 'purchase',
        title: 'forbidden',
        category: 'electronics',
        description: 'Test description',
      };

      keywordRepo.find.mockResolvedValue([{ id: 1, word: 'forbidden' }]);

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update post by owner', async () => {
      const postId = 1;
      const userId = 1;
      const dto = { title: 'Updated Title', content: 'Updated content' };
      const post = {
        id: postId,
        userId,
        title: 'Old Title',
        content: 'Old content',
      };

      postRepo.findOne.mockResolvedValue(post);
      keywordRepo.find.mockResolvedValue([]);
      postRepo.save.mockResolvedValue({ ...post, ...dto });

      const result = await service.update(postId, userId, dto);

      expect(postRepo.findOne).toHaveBeenCalledWith({ where: { id: postId } });
      expect(postRepo.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should throw error when user is not post owner', async () => {
      const postId = 1;
      const userId = 2;
      const dto = { title: 'Updated Title' };
      const post = {
        id: postId,
        userId: 1,
        title: 'Old Title',
      };

      postRepo.findOne.mockResolvedValue(post);

      await expect(service.update(postId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;
      const dto = { title: 'Updated Title' };

      postRepo.findOne.mockResolvedValue(null);

      await expect(service.update(postId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete post by owner', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId,
        title: 'Test Post',
        status: 'active',
      };

      postRepo.findOne.mockResolvedValue(post);
      postRepo.save.mockResolvedValue({ ...post, status: 'deleted' });

      const result = await service.remove(postId, userId);

      expect(postRepo.findOne).toHaveBeenCalledWith({ where: { id: postId } });
      expect(postRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('已删除');
    });

    it('should throw error when user is not post owner', async () => {
      const postId = 1;
      const userId = 2;
      const post = {
        id: postId,
        userId: 1,
        title: 'Test Post',
      };

      postRepo.findOne.mockResolvedValue(post);

      await expect(service.remove(postId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;

      postRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(postId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('unlockContact', () => {
    it('should unlock contact for non-owner with sufficient beans', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId: 2,
        contactUnlockCount: 0,
      };
      const user = {
        id: userId,
        beanBalance: 100,
      };

      postRepo.findOne.mockResolvedValue(post);
      userRepo.findOneBy.mockResolvedValue(user);
      unlockRepo.findOne.mockResolvedValue(null);
      unlockRepo.create.mockReturnValue({ userId, postId, beanCost: 10 });
      beanTxRepo.create.mockReturnValue({
        userId,
        type: 'unlock_contact',
        amount: -10,
      });

      const result = await service.unlockContact(postId, userId);

      expect(result.unlocked).toBe(true);
      expect(result.beanBalance).toBe(90);
      expect(userRepo.save).toHaveBeenCalled();
      expect(unlockRepo.save).toHaveBeenCalled();
      expect(beanTxRepo.save).toHaveBeenCalled();
    });

    it('should return unlocked for post owner', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId,
        contactUnlockCount: 0,
      };

      postRepo.findOne.mockResolvedValue(post);

      const result = await service.unlockContact(postId, userId);

      expect(result.unlocked).toBe(true);
      expect(userRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('should return unlocked if already unlocked', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId: 2,
        contactUnlockCount: 1,
      };

      postRepo.findOne.mockResolvedValue(post);
      unlockRepo.findOne.mockResolvedValue({ userId, postId });

      const result = await service.unlockContact(postId, userId);

      expect(result.unlocked).toBe(true);
      expect(userRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw error when beans insufficient', async () => {
      const postId = 1;
      const userId = 1;
      const post = {
        id: postId,
        userId: 2,
        contactUnlockCount: 0,
      };
      const user = {
        id: userId,
        beanBalance: 5,
      };

      postRepo.findOne.mockResolvedValue(post);
      userRepo.findOneBy.mockResolvedValue(user);
      unlockRepo.findOne.mockResolvedValue(null);

      await expect(service.unlockContact(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when post not found', async () => {
      const postId = 999;
      const userId = 1;

      postRepo.findOne.mockResolvedValue(null);

      await expect(service.unlockContact(postId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('myPosts', () => {
    it('should return user posts with pagination', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const posts = [
        {
          id: 1,
          userId,
          type: 'purchase',
          title: 'My Post',
          status: 'active',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([posts, 1]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.myPosts(userId, query);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return user jobs when type is job', async () => {
      const userId = 1;
      const query = { type: 'job', page: 1, pageSize: 20 };
      const jobs = [
        {
          id: 1,
          userId,
          title: 'Job Title',
          description: 'Job description',
          status: 'recruiting',
          dateEnd: new Date(),
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([jobs, 1]),
      };

      jobRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.myPosts(userId, query);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].type).toBe('job');
    });
  });
});
