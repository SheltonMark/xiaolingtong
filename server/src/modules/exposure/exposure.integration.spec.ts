/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExposureController } from './exposure.controller';
import { ExposureService } from './exposure.service';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';

describe('ExposureModule Integration Tests', () => {
  let controller: ExposureController;
  let service: ExposureService;
  let exposureRepository: any;
  let commentRepository: any;
  let configRepository: any;
  let wechatSecurityService: any;

  beforeEach(async () => {
    exposureRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
    };

    commentRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    configRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    wechatSecurityService = {
      assertSafeSubmission: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExposureController],
      providers: [
        ExposureService,
        {
          provide: getRepositoryToken(Exposure),
          useValue: exposureRepository,
        },
        {
          provide: getRepositoryToken(ExposureComment),
          useValue: commentRepository,
        },
        {
          provide: getRepositoryToken(SysConfig),
          useValue: configRepository,
        },
        {
          provide: WechatSecurityService,
          useValue: wechatSecurityService,
        },
      ],
    }).compile();

    controller = module.get<ExposureController>(ExposureController);
    service = module.get<ExposureService>(ExposureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list Integration', () => {
    it('should expose configurable category settings', async () => {
      configRepository.find.mockResolvedValue([
        { key: 'exposure_category_false_info_label', value: '虚假信息' },
        { key: 'exposure_category_fraud_label', value: '骗货行为' },
        { key: 'exposure_category_wage_theft_label', value: '拖欠工钱' },
      ]);

      const result = await (controller as any).settings();

      expect(result.categories).toEqual([
        { key: 'false_info', label: '虚假信息', avatarText: '虚' },
        { key: 'fraud', label: '骗货行为', avatarText: '骗' },
        { key: 'wage_theft', label: '拖欠工钱', avatarText: '拖' },
      ]);
    });

    it('should return paginated exposure list', async () => {
      const mockExposures = [
        {
          id: 1,
          companyName: 'Company A',
          personName: 'John',
          category: 'wage_theft',
          amount: 5000,
          description: 'Unpaid wages',
          images: [],
          createdAt: new Date(),
          publisher: { id: 1, nickname: 'User 1', role: 'enterprise' },
        },
      ];

      exposureRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockExposures, 1]),
      });
      configRepository.find.mockResolvedValue([
        { key: 'exposure_category_wage_theft_label', value: '拖欠工钱' },
      ]);

      const result = await controller.list({ page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.list[0]).toEqual(
        expect.objectContaining({
          category: 'wage_theft',
          type: '拖欠工钱',
          avatarText: '拖',
        }),
      );
    });

    it('should filter by category', async () => {
      const mockExposures = [];
      exposureRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockExposures, 0]),
      });

      const result = await controller.list({
        category: 'fraud',
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(0);
    });

    it('should return empty list when no exposures', async () => {
      exposureRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await controller.list({ page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('detail Integration', () => {
    it('should return exposure detail with incremented view count', async () => {
      const mockExposure = {
        id: 1,
        companyName: 'Company A',
        personName: 'John',
        category: 'wage_theft',
        amount: 5000,
        description: 'Unpaid wages',
        images: [],
        viewCount: 0,
        createdAt: new Date(),
        publisher: {
          id: 1,
          nickname: 'User 1',
          role: 'enterprise',
          avatarUrl: 'avatar.jpg',
        },
      };

      exposureRepository.findOne.mockResolvedValue(mockExposure);
      exposureRepository.save.mockResolvedValue({
        ...mockExposure,
        viewCount: 1,
      });
      commentRepository.find.mockResolvedValue([]);
      exposureRepository.manager.findOne.mockResolvedValue(null);

      const result = await controller.detail(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(exposureRepository.save).toHaveBeenCalled();
    });

    it('should return comments with exposure detail', async () => {
      const mockExposure = {
        id: 1,
        companyName: 'Company A',
        personName: 'John',
        category: 'wage_theft',
        amount: 5000,
        description: 'Unpaid wages',
        images: [],
        viewCount: 0,
        createdAt: new Date(),
        publisher: {
          id: 1,
          nickname: 'User 1',
          role: 'worker',
          avatarUrl: 'avatar.jpg',
        },
      };

      const mockComments = [
        {
          id: 1,
          content: 'Comment 1',
          createdAt: new Date(),
          user: { nickname: 'User 2', avatarUrl: 'avatar2.jpg' },
        },
      ];

      exposureRepository.findOne.mockResolvedValue(mockExposure);
      exposureRepository.save.mockResolvedValue(mockExposure);
      commentRepository.find.mockResolvedValue(mockComments);
      exposureRepository.manager.findOne.mockResolvedValue(null);

      const result = await controller.detail(1);

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].content).toBe('Comment 1');
    });

    it('should throw error when exposure not found', async () => {
      exposureRepository.findOne.mockResolvedValue(null);

      await expect(controller.detail(999)).rejects.toThrow();
    });
  });

  describe('create Integration', () => {
    it('should create exposure successfully for verified enterprise', async () => {
      const mockUser = { id: 1, role: 'enterprise' };
      const mockCert = {
        id: 1,
        userId: 1,
        status: 'approved',
        companyName: 'Company A',
      };
      const mockExposure = {
        id: 1,
        publisherId: 1,
        category: 'wage_theft',
        companyName: 'Company A',
        personName: 'John',
        amount: 5000,
        description: 'Unpaid wages',
        images: [],
        status: 'pending',
      };

      exposureRepository.manager.findOne.mockImplementation(
        (entity, options) => {
          if (entity.name === 'User') return Promise.resolve(mockUser);
          if (entity.name === 'EnterpriseCert')
            return Promise.resolve(mockCert);
          return Promise.resolve(null);
        },
      );

      exposureRepository.create.mockReturnValue(mockExposure);
      exposureRepository.save.mockResolvedValue(mockExposure);

      const result = await controller.create(1, {
        category: 'fraud',
        amount: 5000,
        description: '我自己的维权经历分享',
      });

      expect(result).toBeDefined();
      expect(exposureRepository.save).toHaveBeenCalled();
      expect(exposureRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'fraud',
        }),
      );
    });

    it('should create exposure successfully for verified worker', async () => {
      const mockUser = { id: 1, role: 'worker' };
      const mockCert = {
        id: 1,
        userId: 1,
        status: 'approved',
        realName: 'John',
      };
      const mockExposure = {
        id: 1,
        publisherId: 1,
        category: 'wage_theft',
        companyName: 'Company A',
        personName: 'John',
        amount: 5000,
        description: 'Unpaid wages',
        images: [],
        status: 'pending',
      };

      exposureRepository.manager.findOne.mockImplementation(
        (entity, options) => {
          if (entity.name === 'User') return Promise.resolve(mockUser);
          if (entity.name === 'WorkerCert') return Promise.resolve(mockCert);
          return Promise.resolve(null);
        },
      );

      exposureRepository.create.mockReturnValue(mockExposure);
      exposureRepository.save.mockResolvedValue(mockExposure);

      const result = await controller.create(1, {
        category: 'wage_theft',
        amount: 5000,
        description: '我自己的维权经历分享',
      });

      expect(result).toBeDefined();
      expect(exposureRepository.save).toHaveBeenCalled();
    });

    it('should normalize object-shaped images before saving exposure', async () => {
      const mockUser = { id: 1, role: 'worker' };
      const mockCert = {
        id: 1,
        userId: 1,
        status: 'approved',
        realName: 'John',
      };

      exposureRepository.manager.findOne.mockImplementation((entity) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        if (entity.name === 'WorkerCert') return Promise.resolve(mockCert);
        return Promise.resolve(null);
      });
      exposureRepository.create.mockImplementation((payload) => payload);
      exposureRepository.save.mockImplementation(async (payload) => payload);

      const result = await controller.create(1, {
        category: 'false_info',
        amount: 5000,
        description: '我自己的维权经历分享',
        images: { 0: 'image1.jpg', 1: 'image2.jpg' },
      });

      expect(exposureRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['image1.jpg', 'image2.jpg'],
        }),
      );
      expect(result.images).toEqual(['image1.jpg', 'image2.jpg']);
    });

    it('should return the recent existing exposure for duplicate submits', async () => {
      const mockUser = { id: 1, role: 'worker', openid: 'openid-1' };
      const mockCert = {
        id: 1,
        userId: 1,
        status: 'approved',
        realName: 'John',
      };
      const existingExposure = {
        id: 7,
        publisherId: 1,
        category: 'wage_theft',
        companyName: 'Company A',
        personName: 'John',
        amount: 5000,
        description: 'Unpaid wages',
        status: 'pending',
        createdAt: new Date(),
      };

      exposureRepository.manager.findOne.mockImplementation((entity) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        if (entity.name === 'WorkerCert') return Promise.resolve(mockCert);
        return Promise.resolve(null);
      });
      exposureRepository.findOne.mockResolvedValue(existingExposure);

      const result = await controller.create(1, {
        category: 'wage_theft',
        amount: 5000,
        description: '我自己的维权经历分享',
      });

      expect(result).toBe(existingExposure);
      expect(exposureRepository.create).not.toHaveBeenCalled();
      expect(exposureRepository.save).not.toHaveBeenCalled();
      expect(exposureRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publisherId: 1,
            category: 'wage_theft',
            companyName: undefined,
            personName: undefined,
            amount: 5000,
            description: '我自己的维权经历分享',
            createdAt: expect.any(Object),
          }),
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('should throw error when user not verified', async () => {
      const mockUser = { id: 1, role: 'enterprise' };

      exposureRepository.manager.findOne.mockImplementation(
        (entity, options) => {
          if (entity.name === 'User') return Promise.resolve(mockUser);
          return Promise.resolve(null);
        },
      );

      await expect(
        controller.create(1, {
          category: 'fraud',
          amount: 5000,
          description: '我自己的维权经历分享',
        }),
      ).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      exposureRepository.manager.findOne.mockResolvedValue(null);

      await expect(
        controller.create(999, {
          category: 'fraud',
          amount: 5000,
          description: '我自己的维权经历分享',
        }),
      ).rejects.toThrow();
    });

    it('should reject submissions that name third-party companies or contacts', async () => {
      const mockUser = { id: 1, role: 'worker' };
      const mockCert = {
        id: 1,
        userId: 1,
        status: 'approved',
        realName: 'John',
      };

      exposureRepository.manager.findOne.mockImplementation((entity) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        if (entity.name === 'WorkerCert') return Promise.resolve(mockCert);
        return Promise.resolve(null);
      });

      await expect(
        controller.create(1, {
          category: 'fraud',
          company: '某某公司',
          contact: '张三',
          description: '这是我的维权经历',
        }),
      ).rejects.toThrow();
    });
  });

  describe('comment Integration', () => {
    it('should create comment successfully', async () => {
      const mockExposure = { id: 1 };
      const mockUser = { id: 1, openid: 'openid-1' };
      const savedComment = {
        id: 1,
        exposureId: 1,
        userId: 1,
        content: 'Great exposure!',
      };

      exposureRepository.findOne.mockResolvedValue(mockExposure);
      exposureRepository.manager.findOne.mockImplementation((entity) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });
      commentRepository.create.mockImplementation((payload) => payload);
      commentRepository.save.mockResolvedValue(savedComment);

      const result = await controller.comment(1, 1, 'Great exposure!');

      expect(wechatSecurityService.assertSafeSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          texts: ['Great exposure!'],
          openid: 'openid-1',
        }),
      );
      expect(commentRepository.create).toHaveBeenCalledWith({
        exposureId: 1,
        userId: 1,
        content: 'Great exposure!',
      });
      expect(commentRepository.save).toHaveBeenCalled();
      expect(result).toBe(savedComment);
    });
  });
});
