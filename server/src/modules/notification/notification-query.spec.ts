import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification } from '../../entities/notification.entity';

describe('NotificationService - Query and Management API', () => {
  let service: NotificationService;
  let controller: NotificationController;
  let notificationRepo: Repository<Notification>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
      controllers: [NotificationController],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    controller = module.get<NotificationController>(NotificationController);
    notificationRepo = module.get<Repository<Notification>>(getRepositoryToken(Notification));
  });

  describe('Query Operations', () => {
    it('should get notifications by type', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          type: 'application_accepted',
          title: 'Application Accepted',
          content: 'Your application has been accepted',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(notificationRepo, 'findAndCount').mockResolvedValue([mockNotifications as any, 1]);

      const result = await service.getNotificationsByType(1, 'application_accepted', 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.type).toBe('application_accepted');
      expect(result.total).toBe(1);
    });

    it('should get notifications by read status', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          type: 'application_accepted',
          title: 'Application Accepted',
          content: 'Your application has been accepted',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(notificationRepo, 'findAndCount').mockResolvedValue([mockNotifications as any, 1]);

      const result = await service.getNotificationsByReadStatus(1, false, 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.isRead).toBe(false);
      expect(result.total).toBe(1);
    });

    it('should get notifications by related object', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          type: 'application_accepted',
          title: 'Application Accepted',
          content: 'Your application has been accepted',
          relatedType: 'job',
          relatedId: 10,
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(notificationRepo, 'findAndCount').mockResolvedValue([mockNotifications as any, 1]);

      const result = await service.getNotificationsByRelated(1, 'job', 10, 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.relatedType).toBe('job');
      expect(result.relatedId).toBe(10);
    });

    it('should search notifications by keyword', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          type: 'application_accepted',
          title: 'Application Accepted',
          content: 'Your application has been accepted',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(notificationRepo, 'findAndCount').mockResolvedValue([mockNotifications as any, 1]);

      const result = await service.searchNotifications(1, 'accepted', 20, 0);

      expect(result.data).toHaveLength(1);
      expect(result.keyword).toBe('accepted');
    });

    it('should get unread count by type', async () => {
      jest.spyOn(notificationRepo, 'count').mockResolvedValue(3);

      const count = await service.getUnreadCountByType(1, 'application_accepted');

      expect(count).toBe(3);
    });

    it('should get notification statistics', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'application_accepted', count: 5 },
          { type: 'work_started', count: 3 },
        ]),
      };

      jest.spyOn(notificationRepo, 'count').mockResolvedValue(10);
      jest.spyOn(notificationRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const stats = await service.getNotificationStats(1);

      expect(stats.total).toBe(10);
      expect(stats.unread).toBe(10);
      expect(stats.read).toBe(0);
      expect(stats.byType).toHaveLength(2);
    });
  });

  describe('Management Operations', () => {
    it('should mark multiple notifications as read', async () => {
      jest.spyOn(notificationRepo, 'update').mockResolvedValue({} as any);

      await service.markMultipleAsRead([1, 2, 3], 1);

      expect(notificationRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
        expect.objectContaining({ isRead: true }),
      );
    });

    it('should delete multiple notifications', async () => {
      jest.spyOn(notificationRepo, 'delete').mockResolvedValue({} as any);

      await service.deleteMultipleNotifications([1, 2, 3], 1);

      expect(notificationRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
      );
    });

    it('should delete old notifications', async () => {
      jest.spyOn(notificationRepo, 'delete').mockResolvedValue({ affected: 5 } as any);

      const deleted = await service.deleteOldNotifications(1, 30);

      expect(deleted).toBe(5);
    });
  });

  describe('Controller Endpoints', () => {
    it('should get notifications by type via controller', async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        type: 'application_accepted',
      };

      jest.spyOn(service, 'getNotificationsByType').mockResolvedValue(mockResult);

      const result = await controller.getNotificationsByType(1, 'application_accepted', 20, 0);

      expect(result.type).toBe('application_accepted');
    });

    it('should get notifications by read status via controller', async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        isRead: false,
      };

      jest.spyOn(service, 'getNotificationsByReadStatus').mockResolvedValue(mockResult);

      const result = await controller.getNotificationsByReadStatus(1, 'false', 20, 0);

      expect(result.isRead).toBe(false);
    });

    it('should search notifications via controller', async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
        keyword: 'test',
      };

      jest.spyOn(service, 'searchNotifications').mockResolvedValue(mockResult);

      const result = await controller.searchNotifications(1, 'test', 20, 0);

      expect(result.keyword).toBe('test');
    });

    it('should get notification stats via controller', async () => {
      const mockStats = {
        total: 10,
        unread: 3,
        read: 7,
        byType: [],
      };

      jest.spyOn(service, 'getNotificationStats').mockResolvedValue(mockStats);

      const result = await controller.getNotificationStats(1);

      expect(result.total).toBe(10);
      expect(result.unread).toBe(3);
    });

    it('should mark multiple as read via controller', async () => {
      jest.spyOn(service, 'markMultipleAsRead').mockResolvedValue(undefined);

      const result = await controller.markMultipleAsRead(1, { notificationIds: [1, 2, 3] });

      expect(result.success).toBe(true);
    });

    it('should delete multiple notifications via controller', async () => {
      jest.spyOn(service, 'deleteMultipleNotifications').mockResolvedValue(undefined);

      const result = await controller.deleteMultipleNotifications(1, { notificationIds: [1, 2, 3] });

      expect(result.success).toBe(true);
    });

    it('should cleanup old notifications via controller', async () => {
      jest.spyOn(service, 'deleteOldNotifications').mockResolvedValue(5);

      const result = await controller.deleteOldNotifications(1, { daysOld: 30 });

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(5);
    });
  });
});
