/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { Notification } from '../../entities/notification.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let notiRepo: any;

  beforeEach(async () => {
    notiRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notiRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated result with correct structure', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, type: 'message', isRead: 0 },
        { id: 2, userId: 1, type: 'system', isRead: 1 },
      ];

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 2]),
      };

      notiRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list(1, { page: 1, pageSize: 20 });

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result.list).toEqual(mockNotifications);
      expect(result.total).toBe(2);
    });

    it('should apply type filter when type is provided', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      notiRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list(1, { type: 'message', page: 1, pageSize: 20 });

      expect(qb.andWhere).toHaveBeenCalledWith('n.type = :type', {
        type: 'message',
      });
    });

    it('should default page=1 and pageSize=20', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      notiRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list(1, {});

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should return empty list when no notifications', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      notiRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list(1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('readAll', () => {
    it('should call update with isRead: 1', async () => {
      notiRepo.update.mockResolvedValue({ affected: 5 });

      await service.readAll(1);

      expect(notiRepo.update).toHaveBeenCalledWith(
        { userId: 1, isRead: 0 },
        { isRead: 1 },
      );
    });

    it('should return { message: "全部已读" }', async () => {
      notiRepo.update.mockResolvedValue({ affected: 5 });

      const result = await service.readAll(1);

      expect(result).toEqual({ message: '全部已读' });
    });
  });

  describe('read', () => {
    it('should call update with { id, userId }', async () => {
      notiRepo.update.mockResolvedValue({ affected: 1 });

      await service.read(1, 1);

      expect(notiRepo.update).toHaveBeenCalledWith(
        { id: 1, userId: 1 },
        { isRead: 1 },
      );
    });

    it('should return { message: "已读" }', async () => {
      notiRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.read(1, 1);

      expect(result).toEqual({ message: '已读' });
    });
  });

  describe('create', () => {
    it('should call notiRepo.create with userId and data', async () => {
      const data = { type: 'message', content: 'Hello' };
      const createdEntity = { id: 1, userId: 1, ...data };

      notiRepo.create.mockReturnValue(createdEntity);
      notiRepo.save.mockResolvedValue(createdEntity);

      await service.create(1, data);

      expect(notiRepo.create).toHaveBeenCalledWith({ ...data, userId: 1 });
    });

    it('should call notiRepo.save and return saved entity', async () => {
      const data = { type: 'system', content: 'System notification' };
      const savedEntity = { id: 2, userId: 1, ...data };

      notiRepo.create.mockReturnValue(savedEntity);
      notiRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(1, data);

      expect(notiRepo.save).toHaveBeenCalled();
      expect(result).toEqual(savedEntity);
    });
  });

  describe('sendNotification', () => {
    it('should call create with userId and data', async () => {
      const data = { type: 'job_apply', title: 'New Job', content: 'Job available' };
      const savedEntity = { id: 3, userId: 1, ...data };

      notiRepo.create.mockReturnValue(savedEntity);
      notiRepo.save.mockResolvedValue(savedEntity);

      const result = await service.sendNotification(1, data);

      expect(result).toEqual(savedEntity);
    });

    it('should include data field in notification', async () => {
      const data = {
        type: 'settlement',
        title: 'Settlement',
        content: 'Settlement completed',
        data: { amount: 100, orderId: 123 },
      };
      const savedEntity = { id: 4, userId: 1, ...data };

      notiRepo.create.mockReturnValue(savedEntity);
      notiRepo.save.mockResolvedValue(savedEntity);

      const result = await service.sendNotification(1, data);

      expect(result.data).toEqual({ amount: 100, orderId: 123 });
    });
  });

  describe('getNotifications', () => {
    it('should call list with userId and query', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, type: 'job_apply', isRead: 0 },
      ];

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 1]),
      };

      notiRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getNotifications(1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual(mockNotifications);
      expect(result.total).toBe(1);
    });

    it('should support pagination in getNotifications', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      notiRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getNotifications(1, { page: 2, pageSize: 10 });

      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('markAsRead', () => {
    it('should call read with id and userId', async () => {
      notiRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.markAsRead(1, 1);

      expect(notiRepo.update).toHaveBeenCalledWith(
        { id: 1, userId: 1 },
        { isRead: 1 },
      );
      expect(result.message).toBe('已读');
    });

    it('should return success message', async () => {
      notiRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.markAsRead(5, 2);

      expect(result).toEqual({ message: '已读' });
    });
  });

  describe('deleteNotification', () => {
    it('should update notification status to deleted', async () => {
      notiRepo.update.mockResolvedValue({ affected: 1 });

      await service.deleteNotification(1, 1);

      expect(notiRepo.update).toHaveBeenCalledWith(
        { id: 1, userId: 1 },
        { status: 'deleted' },
      );
    });

    it('should return success message', async () => {
      notiRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.deleteNotification(1, 1);

      expect(result).toEqual({ message: '通知已删除' });
    });

    it('should handle deletion of non-existent notification', async () => {
      notiRepo.update.mockResolvedValue({ affected: 0 });

      const result = await service.deleteNotification(999, 1);

      expect(result.message).toBe('通知已删除');
    });
  });

  describe('unreadCount', () => {
    it('should return count of unread notifications', async () => {
      notiRepo.count.mockResolvedValue(5);

      const result = await service.unreadCount(1);

      expect(result).toEqual({ count: 5 });
    });

    it('should return 0 when no unread notifications', async () => {
      notiRepo.count.mockResolvedValue(0);

      const result = await service.unreadCount(1);

      expect(result).toEqual({ count: 0 });
    });
  });
});
