import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notiRepo: Repository<Notification>,
  ) {}

  async list(userId: number, query: any) {
    const { type, page = 1, pageSize = 20 } = query;
    const qb = this.notiRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });
    if (type) qb.andWhere('n.type = :type', { type });
    qb.orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async readAll(userId: number) {
    await this.notiRepo.update({ userId, isRead: 0 }, { isRead: 1 });
    return { message: '全部已读' };
  }

  async read(id: number, userId: number) {
    await this.notiRepo.update({ id, userId }, { isRead: 1 });
    return { message: '已读' };
  }

  async create(userId: number, data: Partial<Notification>) {
    return this.notiRepo.save(this.notiRepo.create({ ...data, userId }));
  }

  async unreadCount(userId: number) {
    const count = await this.notiRepo.count({ where: { userId, isRead: 0 } });
    return { count };
  }

  async sendNotification(userId: number, data: Partial<Notification>) {
    return this.create(userId, data);
  }

  async getNotifications(userId: number, query: any) {
    return this.list(userId, query);
  }

  async markAsRead(id: number, userId: number) {
    return this.read(id, userId);
  }

  async deleteNotification(id: number, userId: number) {
    await this.notiRepo.update({ id, userId }, { status: 'deleted' });
    return { message: '通知已删除' };
  }
}
