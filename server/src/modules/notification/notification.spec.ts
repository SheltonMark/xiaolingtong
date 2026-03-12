import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification } from '../../entities/notification.entity';

describe('NotificationService', () => {
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
          },
        },
      ],
      controllers: [NotificationController],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    controller = module.get<NotificationController>(NotificationController);
    notificationRepo = module.get<Repository<Notification>>(getRepositoryToken(Notification));
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'application_accepted',
        title: 'Application Accepted',
        content: 'Your application has been accepted',
        relatedId: 10,
        relatedType: 'application',
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      };

      jest.spyOn(notificationRepo, 'create').mockReturnValue(mockNotification as any);
      jest.spyOn(notificationRepo, 'save').mockResolvedValue(mockNotification as any);

      const result = await service.sendNotification(
        1,
        'application_accepted',
        'Application Accepted',
        'Your application has been accepted',
        10,
        'application',
      );

      expect(result.userId).toBe(1);
      expect(result.type).toBe('application_accepted');
      expect(result.isRead).toBe(false);
    });

    it('should send notification without related info', async () => {
      const mockNotification = {
        id: 2,
        userId: 2,
        type: 'work_started',
        title: 'Work Started',
        content: 'Your work has started',
        relatedId: null,
        relatedType: null,
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      };

      jest.spyOn(notificationRepo, 'create').mockReturnValue(mockNotification as any);
      jest.spyOn(notificationRepo, 'save').mockResolvedValue(mockNotification as any);

      const result = await service.sendNotification(
        2,
        'work_started',
        'Work Started',
        'Your work has started',
      );

      expect(result.relatedId).toBeNull();
      expect(result.relatedType).toBeNull();
    });
  });

  describe('getNotifications', () => {
    it('should retrieve notifications for user', async () => {
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
        {
          id: 2,
          userId: 1,
          type: 'work_started',
          title: 'Work Started',
          content: 'Your work has started',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(notificationRepo, 'findAndCount').mockResolvedValue([mockNotifications as any, 2]);

      const result = await service.getNotifications(1, 20, 0);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should support pagination', async () => {
      const mockNotifications = [
        {
          id: 3,
          userId: 1,
          type: 'application_rejected',
          title: 'Application Rejected',
          content: 'Your application has been rejected',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      jest.spyOn(notificationRepo, 'findAndCount').mockResolvedValue([mockNotifications as any, 10]);

      const result = await service.getNotifications(1, 5, 5);

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(5);
      expect(result.total).toBe(10);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'application_accepted',
        title: 'Application Accepted',
        content: 'Your application has been accepted',
        isRead: false,
        readAt: null,
      };

      jest.spyOn(notificationRepo, 'findOne').mockResolvedValue(mockNotification as any);
      jest.spyOn(notificationRepo, 'save').mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      } as any);

      const result = await service.markAsRead(1, 1);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw error if notification not found', async () => {
      jest.spyOn(notificationRepo, 'findOne').mockResolvedValue(null);

      await expect(service.markAsRead(999, 1)).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      jest.spyOn(notificationRepo, 'update').mockResolvedValue({} as any);

      await service.markAllAsRead(1);

      expect(notificationRepo.update).toHaveBeenCalledWith(
        { userId: 1, isRead: false },
        expect.objectContaining({ isRead: true }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      jest.spyOn(notificationRepo, 'count').mockResolvedValue(5);

      const count = await service.getUnreadCount(1);

      expect(count).toBe(5);
    });

    it('should return 0 if no unread notifications', async () => {
      jest.spyOn(notificationRepo, 'count').mockResolvedValue(0);

      const count = await service.getUnreadCount(1);

      expect(count).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      jest.spyOn(notificationRepo, 'delete').mockResolvedValue({} as any);

      await service.deleteNotification(1, 1);

      expect(notificationRepo.delete).toHaveBeenCalledWith({
        id: 1,
        userId: 1,
      });
    });
  });

  describe('NotificationController', () => {
    it('should send notification via controller', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'application_accepted',
        title: 'Application Accepted',
        content: 'Your application has been accepted',
        isRead: false,
      };

      jest.spyOn(service, 'sendNotification').mockResolvedValue(mockNotification as any);

      const result = await controller.sendNotification({
        userId: 1,
        type: 'application_accepted',
        title: 'Application Accepted',
        content: 'Your application has been accepted',
      });

      expect(result.userId).toBe(1);
      expect(result.type).toBe('application_accepted');
    });

    it('should get notifications via controller', async () => {
      const mockResult = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      jest.spyOn(service, 'getNotifications').mockResolvedValue(mockResult);

      const result = await controller.getNotifications(1, 20, 0);

      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
    });

    it('should get unread count via controller', async () => {
      jest.spyOn(service, 'getUnreadCount').mockResolvedValue(3);

      const result = await controller.getUnreadCount(1);

      expect(result.unreadCount).toBe(3);
    });

    it('should mark notification as read via controller', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        isRead: true,
        readAt: new Date(),
      };

      jest.spyOn(service, 'markAsRead').mockResolvedValue(mockNotification as any);

      const result = await controller.markAsRead(1, 1);

      expect(result.isRead).toBe(true);
    });

    it('should mark all as read via controller', async () => {
      jest.spyOn(service, 'markAllAsRead').mockResolvedValue(undefined);

      const result = await controller.markAllAsRead(1);

      expect(result.success).toBe(true);
    });

    it('should delete notification via controller', async () => {
      jest.spyOn(service, 'deleteNotification').mockResolvedValue(undefined);

      const result = await controller.deleteNotification(1, 1);

      expect(result.success).toBe(true);
    });
  });
});
