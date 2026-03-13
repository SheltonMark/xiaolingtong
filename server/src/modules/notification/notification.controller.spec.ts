/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('NotificationController', () => {
  let controller: NotificationController;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    notificationService = {
      list: jest.fn(),
      read: jest.fn(),
      readAll: jest.fn(),
      deleteNotification: jest.fn(),
      unreadCount: jest.fn(),
    } as jest.Mocked<NotificationService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: notificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return notifications with pagination', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const mockResult = {
        list: [
          {
            id: 1,
            userId: 1,
            type: 'job_apply',
            title: '新的临工报名',
            content: '张三报名了您的工作',
            link: '/job/1/applications',
            isRead: 0,
            createdAt: new Date(),
          },
          {
            id: 2,
            userId: 1,
            type: 'settlement',
            title: '工作结算完成',
            content: '您的工作已结算，获得100元',
            link: '/settlement/1',
            isRead: 1,
            createdAt: new Date(),
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      notificationService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId, query);

      expect(notificationService.list).toHaveBeenCalledWith(userId, query);
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should return empty notifications list', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const mockResult = {
        list: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };

      notificationService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId, query);

      expect(notificationService.list).toHaveBeenCalledWith(userId, query);
      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter notifications by type', async () => {
      const userId = 1;
      const query = { type: 'job_apply', page: 1, pageSize: 20 };
      const mockResult = {
        list: [
          {
            id: 1,
            userId: 1,
            type: 'job_apply',
            title: '新的临工报名',
            content: '张三报名了您的工作',
            link: '/job/1/applications',
            isRead: 0,
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      notificationService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId, query);

      expect(notificationService.list).toHaveBeenCalledWith(userId, query);
      expect(result.list).toHaveLength(1);
      expect(result.list[0].type).toBe('job_apply');
    });

    it('should handle pagination correctly', async () => {
      const userId = 1;
      const query = { page: 2, pageSize: 10 };
      const mockResult = {
        list: [],
        total: 25,
        page: 2,
        pageSize: 10,
      };

      notificationService.list.mockResolvedValue(mockResult);

      const result = await controller.list(userId, query);

      expect(notificationService.list).toHaveBeenCalledWith(userId, query);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const query = { page: 1, pageSize: 20 };

      notificationService.list.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(controller.list(userId as any, query)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('read', () => {
    it('should mark notification as read', async () => {
      const userId = 1;
      const notificationId = 1;
      const mockResult = { message: '已读' };

      notificationService.read.mockResolvedValue(mockResult);

      const result = await controller.read(notificationId, userId);

      expect(notificationService.read).toHaveBeenCalledWith(
        notificationId,
        userId,
      );
      expect(result.message).toBe('已读');
    });

    it('should only allow user to read their own notifications', async () => {
      const userId = 1;
      const notificationId = 1;

      notificationService.read.mockRejectedValue(
        new BadRequestException('Notification not found'),
      );

      await expect(controller.read(notificationId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when notification not found', async () => {
      const userId = 1;
      const notificationId = 999;

      notificationService.read.mockRejectedValue(
        new BadRequestException('Notification not found'),
      );

      await expect(controller.read(notificationId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const notificationId = 1;

      notificationService.read.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(
        controller.read(notificationId, userId as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('delete', () => {
    it('should delete notification', async () => {
      const userId = 1;
      const notificationId = 1;
      const mockResult = { message: '通知已删除' };

      notificationService.deleteNotification.mockResolvedValue(mockResult);

      const result = await controller.delete(notificationId, userId);

      expect(notificationService.deleteNotification).toHaveBeenCalledWith(
        notificationId,
        userId,
      );
      expect(result.message).toBe('通知已删除');
    });

    it('should only allow user to delete their own notifications', async () => {
      const userId = 1;
      const notificationId = 1;

      notificationService.deleteNotification.mockRejectedValue(
        new BadRequestException('Notification not found'),
      );

      await expect(controller.delete(notificationId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when notification not found', async () => {
      const userId = 1;
      const notificationId = 999;

      notificationService.deleteNotification.mockRejectedValue(
        new BadRequestException('Notification not found'),
      );

      await expect(controller.delete(notificationId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const notificationId = 1;

      notificationService.deleteNotification.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(
        controller.delete(notificationId, userId as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('readAll', () => {
    it('should mark all notifications as read', async () => {
      const userId = 1;
      const mockResult = { message: '全部已读' };

      notificationService.readAll.mockResolvedValue(mockResult);

      const result = await controller.readAll(userId);

      expect(notificationService.readAll).toHaveBeenCalledWith(userId);
      expect(result.message).toBe('全部已读');
    });

    it('should handle when user has no unread notifications', async () => {
      const userId = 1;
      const mockResult = { message: '全部已读' };

      notificationService.readAll.mockResolvedValue(mockResult);

      const result = await controller.readAll(userId);

      expect(notificationService.readAll).toHaveBeenCalledWith(userId);
      expect(result.message).toBe('全部已读');
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;

      notificationService.readAll.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(controller.readAll(userId as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle service exception', async () => {
      const userId = 1;

      notificationService.readAll.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.readAll(userId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('unreadCount', () => {
    it('should return unread notification count', async () => {
      const userId = 1;
      const mockResult = { count: 5 };

      notificationService.unreadCount.mockResolvedValue(mockResult);

      const result = await controller.unreadCount(userId);

      expect(notificationService.unreadCount).toHaveBeenCalledWith(userId);
      expect(result.count).toBe(5);
    });

    it('should return 0 when user has no unread notifications', async () => {
      const userId = 1;
      const mockResult = { count: 0 };

      notificationService.unreadCount.mockResolvedValue(mockResult);

      const result = await controller.unreadCount(userId);

      expect(notificationService.unreadCount).toHaveBeenCalledWith(userId);
      expect(result.count).toBe(0);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;

      notificationService.unreadCount.mockRejectedValue(
        new UnauthorizedException('User not authenticated'),
      );

      await expect(controller.unreadCount(userId as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle service exception', async () => {
      const userId = 1;

      notificationService.unreadCount.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.unreadCount(userId)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
