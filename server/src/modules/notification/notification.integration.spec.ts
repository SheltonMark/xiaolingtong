/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from '../../entities/notification.entity';

describe('NotificationModule Integration Tests', () => {
  let controller: NotificationController;
  let service: NotificationService;
  let notificationRepository: any;

  beforeEach(async () => {
    notificationRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepository,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list Integration', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, type: 'job', title: 'New Job', isRead: 0, createdAt: new Date() },
      ];

      notificationRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 1]),
      });

      const result = await controller.list(1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by type', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, type: 'job', title: 'New Job', isRead: 0, createdAt: new Date() },
      ];

      notificationRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 1]),
      });

      const result = await controller.list(1, { type: 'job', page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should return empty list when no notifications', async () => {
      notificationRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await controller.list(1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('readAll Integration', () => {
    it('should mark all notifications as read', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 5 });

      const result = await controller.readAll(1);

      expect(result).toBeDefined();
      expect(result.message).toBe('全部已读');
      expect(notificationRepository.update).toHaveBeenCalled();
    });
  });

  describe('read Integration', () => {
    it('should mark notification as read', async () => {
      notificationRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.read(1, 1);

      expect(result).toBeDefined();
      expect(result.message).toBe('已读');
      expect(notificationRepository.update).toHaveBeenCalledWith({ id: 1, userId: 1 }, { isRead: 1 });
    });
  });
});
