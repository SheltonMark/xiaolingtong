/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { Job } from '../../entities/job.entity';

describe('PostModule Integration Tests', () => {
  let controller: PostController;
  let service: PostService;
  let postRepository: any;
  let contactUnlockRepository: any;
  let userRepository: any;
  let beanTxRepository: any;
  let keywordRepository: any;
  let entCertRepository: any;
  let jobRepository: any;

  beforeEach(async () => {
    postRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    contactUnlockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    beanTxRepository = {
      save: jest.fn(),
      create: jest.fn(),
    };

    keywordRepository = {
      find: jest.fn(),
    };

    entCertRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        PostService,
        {
          provide: getRepositoryToken(Post),
          useValue: postRepository,
        },
        {
          provide: getRepositoryToken(ContactUnlock),
          useValue: contactUnlockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(BeanTransaction),
          useValue: beanTxRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: entCertRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
    service = module.get<PostService>(PostService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list Integration', () => {
    it('should return posts with pagination', async () => {
      const mockPosts = [{ id: 1, type: 'purchase', title: 'Test' }];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPosts, 1]),
      };

      postRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      keywordRepository.find.mockResolvedValue([]);

      const result = await controller.list({ page: 1, pageSize: 20 });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle empty list', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      postRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      keywordRepository.find.mockResolvedValue([]);

      const result = await controller.list({ page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('detail Integration', () => {
    it('should return post detail', async () => {
      const mockPost = { id: 1, userId: 1, title: 'Test', viewCount: 0 };

      postRepository.findOne.mockResolvedValue(mockPost);
      entCertRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await controller.detail(1, 1);

      expect(result).toBeDefined();
      expect(postRepository.findOne).toHaveBeenCalled();
    });

    it('should throw error when post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(controller.detail(999, 1)).rejects.toThrow();
    });
  });

  describe('create Integration', () => {
    it('should create post successfully', async () => {
      const dto = {
        type: 'purchase',
        title: 'New Post',
        category: 'electronics',
        description: 'Test',
      };
      const mockPost = { id: 1, userId: 1, ...dto };

      keywordRepository.find.mockResolvedValue([]);
      postRepository.create.mockReturnValue(mockPost);
      postRepository.save.mockResolvedValue(mockPost);

      const result = await controller.create(1, dto);

      expect(result).toBeDefined();
      expect(postRepository.save).toHaveBeenCalled();
    });
  });

  describe('update Integration', () => {
    it('should update post successfully', async () => {
      const mockPost = { id: 1, userId: 1, title: 'Old' };
      const updateDto = { title: 'New' };

      postRepository.findOne.mockResolvedValue(mockPost);
      keywordRepository.find.mockResolvedValue([]);
      postRepository.save.mockResolvedValue({ ...mockPost, ...updateDto });

      const result = await controller.update(1, 1, updateDto);

      expect(result).toBeDefined();
      expect(postRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove Integration', () => {
    it('should delete post successfully', async () => {
      const mockPost = { id: 1, userId: 1, status: 'active' };

      postRepository.findOne.mockResolvedValue(mockPost);
      postRepository.save.mockResolvedValue({ ...mockPost, status: 'deleted' });

      const result = await controller.remove(1, 1);

      expect(result).toBeDefined();
      expect(postRepository.save).toHaveBeenCalled();
    });
  });
});
