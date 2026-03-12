import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
  ) {}

  async sendNotification(
    userId: number,
    type: string,
    title: string,
    content: string,
    relatedId?: number,
    relatedType?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId,
      type,
      title,
      content,
      relatedId,
      relatedType,
      isRead: false,
    });

    return this.notificationRepo.save(notification);
  }

  async getNotifications(userId: number, limit: number = 20, offset: number = 0): Promise<any> {
    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: notifications,
      total,
      limit,
      offset,
    };
  }

  async getNotificationsByType(
    userId: number,
    type: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId, type },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: notifications,
      total,
      limit,
      offset,
      type,
    };
  }

  async getNotificationsByReadStatus(
    userId: number,
    isRead: boolean,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { userId, isRead },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: notifications,
      total,
      limit,
      offset,
      isRead,
    };
  }

  async getNotificationsByRelated(
    userId: number,
    relatedType: string,
    relatedId?: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    const where: any = { userId, relatedType };
    if (relatedId) {
      where.relatedId = relatedId;
    }

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: notifications,
      total,
      limit,
      offset,
      relatedType,
      relatedId,
    };
  }

  async searchNotifications(
    userId: number,
    keyword: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any> {
    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: [
        { userId, title: { like: `%${keyword}%` } },
        { userId, content: { like: `%${keyword}%` } },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: notifications,
      total,
      limit,
      offset,
      keyword,
    };
  }

  async markAsRead(notificationId: number, userId: number): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async markMultipleAsRead(notificationIds: number[], userId: number): Promise<void> {
    await this.notificationRepo.update(
      { id: { in: notificationIds }, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async getUnreadCountByType(userId: number, type: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, type, isRead: false },
    });
  }

  async deleteNotification(notificationId: number, userId: number): Promise<void> {
    await this.notificationRepo.delete({
      id: notificationId,
      userId,
    });
  }

  async deleteMultipleNotifications(notificationIds: number[], userId: number): Promise<void> {
    await this.notificationRepo.delete({
      id: { in: notificationIds },
      userId,
    });
  }

  async deleteOldNotifications(userId: number, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepo.delete({
      userId,
      createdAt: { lessThan: cutoffDate },
      isRead: true,
    });

    return result.affected || 0;
  }

  async getNotificationStats(userId: number): Promise<any> {
    const total = await this.notificationRepo.count({ where: { userId } });
    const unread = await this.notificationRepo.count({ where: { userId, isRead: false } });
    const read = total - unread;

    const typeStats = await this.notificationRepo
      .createQueryBuilder('n')
      .select('n.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('n.userId = :userId', { userId })
      .groupBy('n.type')
      .getRawMany();

    return {
      total,
      unread,
      read,
      byType: typeStats,
    };
  }
}

