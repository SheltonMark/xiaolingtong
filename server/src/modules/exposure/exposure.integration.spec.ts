/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExposureController } from './exposure.controller';
import { ExposureService } from './exposure.service';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';

describe('ExposureModule Integration Tests', () => {
  let controller: ExposureController;
  let service: ExposureService;
  let exposureRepository: any;
  let commentRepository: any;

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
      ],
    }).compile();

    controller = module.get<ExposureController>(ExposureController);
    service = module.get<ExposureService>(ExposureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list Integration', () => {
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
          publisher: { id: 1, nickname: 'User 1' },
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

      const result = await controller.list({ page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
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

      const result = await controller.list({ category: 'fraud', page: 1, pageSize: 20 });

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
        publisher: { id: 1, nickname: 'User 1', role: 'enterprise', avatarUrl: 'avatar.jpg' },
      };

      exposureRepository.findOne.mockResolvedValue(mockExposure);
      exposureRepository.save.mockResolvedValue({ ...mockExposure, viewCount: 1 });
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
        publisher: { id: 1, nickname: 'User 1', role: 'worker', avatarUrl: 'avatar.jpg' },
      };

      const mockComments = [
        { id: 1, content: 'Comment 1', createdAt: new Date(), user: { nickname: 'User 2', avatarUrl: 'avatar2.jpg' } },
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
      const mockCert = { id: 1, userId: 1, status: 'approved', companyName: 'Company A' };
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

      exposureRepository.manager.findOne.mockImplementation((entity, options) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        if (entity.name === 'EnterpriseCert') return Promise.resolve(mockCert);
        return Promise.resolve(null);
      });

      exposureRepository.create.mockReturnValue(mockExposure);
      exposureRepository.save.mockResolvedValue(mockExposure);

      const result = await controller.create(1, { company: 'Company A', contact: 'John', amount: 5000, description: 'Unpaid wages' });

      expect(result).toBeDefined();
      expect(exposureRepository.save).toHaveBeenCalled();
    });

    it('should create exposure successfully for verified worker', async () => {
      const mockUser = { id: 1, role: 'worker' };
      const mockCert = { id: 1, userId: 1, status: 'approved', realName: 'John' };
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

      exposureRepository.manager.findOne.mockImplementation((entity, options) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        if (entity.name === 'WorkerCert') return Promise.resolve(mockCert);
        return Promise.resolve(null);
      });

      exposureRepository.create.mockReturnValue(mockExposure);
      exposureRepository.save.mockResolvedValue(mockExposure);

      const result = await controller.create(1, { company: 'Company A', contact: 'John', amount: 5000, description: 'Unpaid wages' });

      expect(result).toBeDefined();
      expect(exposureRepository.save).toHaveBeenCalled();
    });

    it('should throw error when user not verified', async () => {
      const mockUser = { id: 1, role: 'enterprise' };

      exposureRepository.manager.findOne.mockImplementation((entity, options) => {
        if (entity.name === 'User') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });

      await expect(controller.create(1, { company: 'Company A', contact: 'John', amount: 5000, description: 'Unpaid wages' })).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      exposureRepository.manager.findOne.mockResolvedValue(null);

      await expect(controller.create(999, { company: 'Company A', contact: 'John', amount: 5000, description: 'Unpaid wages' })).rejects.toThrow();
    });
  });

  describe('comment Integration', () => {
    it('should add comment to exposure', async () => {
      const mockComment = { id: 1, exposureId: 1, userId: 1, content: 'Great exposure!' };

      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockResolvedValue(mockComment);

      const result = await controller.comment(1, 1, 'Great exposure!');

      expect(result).toBeDefined();
      expect(commentRepository.save).toHaveBeenCalled();
    });

    it('should handle empty comment content', async () => {
      const mockComment = { id: 1, exposureId: 1, userId: 1, content: '' };

      commentRepository.create.mockReturnValue(mockComment);
      commentRepository.save.mockResolvedValue(mockComment);

      const result = await controller.comment(1, 1, '');

      expect(result).toBeDefined();
      expect(commentRepository.save).toHaveBeenCalled();
    });
  });
});
