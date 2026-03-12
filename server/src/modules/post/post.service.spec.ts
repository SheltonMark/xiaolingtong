/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { Job } from '../../entities/job.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { Promotion } from '../../entities/promotion.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PostService', () => {
  let service: PostService;
  let postRepo: any;
  let unlockRepo: any;
  let userRepo: any;
  let beanTxRepo: any;
  let keywordRepo: any;
  let entCertRepo: any;
  let jobRepo: any;
  let sysConfigRepo: any;
  let promoRepo: any;

  beforeEach(async () => {
    postRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    unlockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    beanTxRepo = {
      save: jest.fn(),
      create: jest.fn(),
    };

    keywordRepo = {
      find: jest.fn(),
    };

    entCertRepo = {
      createQueryBuilder: jest.fn(),
    };

    jobRepo = {
      createQueryBuilder: jest.fn(),
    };

    sysConfigRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    promoRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

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
        {
          provide: getRepositoryToken(SysConfig),
          useValue: sysConfigRepo,
        },
        {
          provide: getRepositoryToken(Promotion),
          useValue: promoRepo,
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return posts with pagination', async () => {
      const mockPosts = [
        { id: 1, userId: 1, type: 'purchase', content: 'test', status: 'active', createdAt: new Date() },
      ];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPosts, 1]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.list).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter posts by type', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await service.list({ type: 'purchase', page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.type = :type', { type: 'purchase' });
    });

    it('should filter posts by industry', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await service.list({ industry: 'electronics', page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.industry = :industry', { industry: 'electronics' });
    });

    it('should search posts by keyword', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await service.list({ keyword: 'test', page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.content LIKE :kw', { kw: '%test%' });
    });

    it('should return empty list when no posts found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('myPosts', () => {
    it('should return user posts with pagination', async () => {
      const mockPosts = [
        { id: 1, userId: 1, type: 'purchase', content: 'test', status: 'active', createdAt: new Date() },
      ];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPosts, 1]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.myPosts(1, { page: 1, pageSize: 20 });

      expect(result.list).toBeDefined();
      expect(result.total).toBe(1);
    });

    it('should return job posts when type is job', async () => {
      const mockJobs = [
        { id: 1, userId: 1, title: 'test job', description: 'test', status: 'recruiting', createdAt: new Date(), dateEnd: new Date() },
      ];
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockJobs, 1]),
      };

      jobRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.myPosts(1, { type: 'job', page: 1, pageSize: 20 });

      expect(result.list[0].type).toBe('job');
      expect(result.total).toBe(1);
    });

    it('should filter user posts by type', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await service.myPosts(1, { type: 'purchase', page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.type = :type', { type: 'purchase' });
    });

    it('should exclude deleted posts', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      await service.myPosts(1, { page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.status != :del', { del: 'deleted' });
    });
  });

  describe('detail', () => {
    it('should return post detail with view count incremented', async () => {
      const mockPost = {
        id: 1,
        userId: 1,
        type: 'purchase',
        content: 'test',
        viewCount: 0,
        user: { id: 1 },
        save: jest.fn(),
      };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue(null);
      postRepo.count.mockResolvedValue(1);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.detail(1, 2);

      expect(mockPost.viewCount).toBe(1);
      expect(postRepo.save).toHaveBeenCalledWith(mockPost);
      expect(result.contactUnlocked).toBe(false);
    });

    it('should mark enterprise verified when cert userId is returned as string', async () => {
      const mockPost = {
        id: 1,
        userId: 1,
        type: 'purchase',
        content: 'test',
        viewCount: 0,
        user: { id: 1 },
      };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue(null);
      postRepo.count.mockResolvedValue(3);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { userId: '1', companyName: 'Test Company', status: 'approved' },
        ]),
      });

      const result = await service.detail(1, 2);

      expect(result.enterpriseVerified).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.certStatus).toBe('approved');
      expect(result.companyName).toBe('Test Company');
    });

    it('should return contact unlocked when user has unlocked', async () => {
      const mockPost = {
        id: 1,
        userId: 1,
        type: 'purchase',
        content: 'test',
        viewCount: 0,
        user: { id: 1 },
      };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue({ id: 1 });
      postRepo.count.mockResolvedValue(1);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.detail(1, 2);

      expect(result.contactUnlocked).toBe(true);
    });

    it('should return contact unlocked when user is post owner', async () => {
      const mockPost = {
        id: 1,
        userId: 1,
        type: 'purchase',
        content: 'test',
        viewCount: 0,
        user: { id: 1 },
      };

      postRepo.findOne.mockResolvedValue(mockPost);
      postRepo.count.mockResolvedValue(1);
      entCertRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await service.detail(1, 1);

      expect(result.contactUnlocked).toBe(true);
    });

    it('should throw error when post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.detail(999, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('should create post successfully', async () => {
      const dto = {
        type: 'purchase',
        title: 'test product',
        category: 'electronics',
        description: 'test description',
        images: ['image1.jpg'],
        showPhone: true,
        showWechat: true,
        validityDays: 30,
        contactName: 'John',
        contactPhone: '13800138000',
        contactWechat: 'john_wechat',
      };

      const mockPost = { id: 1, userId: 1, ...dto };

      keywordRepo.find.mockResolvedValue([]);
      postRepo.create.mockReturnValue(mockPost);
      postRepo.save.mockResolvedValue(mockPost);

      const result = await service.create(1, dto);

      expect(postRepo.create).toHaveBeenCalled();
      expect(postRepo.save).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('should throw error when content contains forbidden keyword', async () => {
      const dto = {
        type: 'purchase',
        title: 'test product',
        category: 'electronics',
        description: 'test description',
      };

      keywordRepo.find.mockResolvedValue([{ word: 'forbidden' }]);

      await expect(service.create(1, { ...dto, title: 'forbidden product' })).rejects.toThrow(BadRequestException);
    });

    it('should set expireAt when validityDays provided', async () => {
      const dto = {
        type: 'purchase',
        title: 'test product',
        category: 'electronics',
        description: 'test description',
        validityDays: 30,
      };

      const mockPost = { id: 1, userId: 1, ...dto };

      keywordRepo.find.mockResolvedValue([]);
      postRepo.create.mockReturnValue(mockPost);
      postRepo.save.mockResolvedValue(mockPost);

      await service.create(1, dto);

      const createCall = postRepo.create.mock.calls[0][0];
      expect(createCall.expireAt).toBeDefined();
    });

    it('should handle missing contact information', async () => {
      const dto = {
        type: 'purchase',
        title: 'test product',
        category: 'electronics',
        description: 'test description',
      };

      const mockPost = { id: 1, userId: 1, ...dto };

      keywordRepo.find.mockResolvedValue([]);
      postRepo.create.mockReturnValue(mockPost);
      postRepo.save.mockResolvedValue(mockPost);

      await service.create(1, dto);

      const createCall = postRepo.create.mock.calls[0][0];
      expect(createCall.contactName).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update post successfully', async () => {
      const mockPost = { id: 1, userId: 1, type: 'purchase', content: 'old content' };
      const updateDto = { content: 'new content' };

      postRepo.findOne.mockResolvedValue(mockPost);
      keywordRepo.find.mockResolvedValue([]);
      postRepo.save.mockResolvedValue({ ...mockPost, ...updateDto });

      const result = await service.update(1, 1, updateDto);

      expect(postRepo.save).toHaveBeenCalled();
      expect(result.content).toBe('new content');
    });

    it('should throw error when post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, 1, {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when user is not post owner', async () => {
      const mockPost = { id: 1, userId: 1, type: 'purchase', content: 'old content' };

      postRepo.findOne.mockResolvedValue(mockPost);

      await expect(service.update(1, 2, {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when content contains forbidden keyword', async () => {
      const mockPost = { id: 1, userId: 1, type: 'purchase', content: 'old content' };

      postRepo.findOne.mockResolvedValue(mockPost);
      keywordRepo.find.mockResolvedValue([{ word: 'forbidden' }]);

      await expect(service.update(1, 1, { content: 'forbidden content' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete post successfully', async () => {
      const mockPost = { id: 1, userId: 1, status: 'active' };

      postRepo.findOne.mockResolvedValue(mockPost);
      postRepo.save.mockResolvedValue({ ...mockPost, status: 'deleted' });

      const result = await service.remove(1, 1);

      expect(mockPost.status).toBe('deleted');
      expect(postRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('已删除');
    });

    it('should throw error when post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw error when user is not post owner', async () => {
      const mockPost = { id: 1, userId: 1, status: 'active' };

      postRepo.findOne.mockResolvedValue(mockPost);

      await expect(service.remove(1, 2)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unlockContact', () => {
    it('should unlock contact successfully', async () => {
      const mockPost = { id: 1, userId: 1, contactUnlockCount: 0 };
      const mockUser = { id: 2, beanBalance: 100 };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue(null);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      unlockRepo.save.mockResolvedValue({ id: 1 });
      beanTxRepo.save.mockResolvedValue({ id: 1 });
      postRepo.save.mockResolvedValue(mockPost);

      const result = await service.unlockContact(1, 2);

      expect(result.unlocked).toBe(true);
      expect(mockUser.beanBalance).toBe(90);
      expect(unlockRepo.save).toHaveBeenCalled();
      expect(beanTxRepo.save).toHaveBeenCalled();
    });

    it('should return unlocked when user is post owner', async () => {
      const mockPost = { id: 1, userId: 1 };

      postRepo.findOne.mockResolvedValue(mockPost);

      const result = await service.unlockContact(1, 1);

      expect(result.unlocked).toBe(true);
    });

    it('should return unlocked when already unlocked', async () => {
      const mockPost = { id: 1, userId: 2 };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue({ id: 1 });

      const result = await service.unlockContact(1, 1);

      expect(result.unlocked).toBe(true);
    });

    it('should throw error when post not found', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.unlockContact(999, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user has insufficient beans', async () => {
      const mockPost = { id: 1, userId: 2 };
      const mockUser = { id: 1, beanBalance: 5 };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue(null);
      userRepo.findOneBy.mockResolvedValue(mockUser);

      await expect(service.unlockContact(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not found', async () => {
      const mockPost = { id: 1, userId: 2 };

      postRepo.findOne.mockResolvedValue(mockPost);
      unlockRepo.findOne.mockResolvedValue(null);
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.unlockContact(1, 1)).rejects.toThrow(BadRequestException);
    });
  });
});
