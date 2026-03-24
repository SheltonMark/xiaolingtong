import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { Notice } from '../../entities/notice.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notiRepo: Repository<Notification>,
    @InjectRepository(Notice) private noticeRepo: Repository<Notice>,
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

  async listActiveNotices() {
    const now = new Date();
    return this.noticeRepo
      .createQueryBuilder('n')
      .where('n.isActive = :isActive', { isActive: 1 })
      .andWhere('(n.expireAt IS NULL OR n.expireAt > :now)', { now })
      .orderBy('n.createdAt', 'DESC')
      .getMany();
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

  /**
   * 临工报名通知 - 发送给企业
   * 当临工报名工作时，通知企业有新的报名
   */
  async notifyJobApply(
    enterpriseUserId: number,
    jobId: number,
    jobTitle: string,
    workerName: string,
  ) {
    return this.create(enterpriseUserId, {
      type: 'job_apply',
      title: '新的临工报名',
      content: `${workerName}报名了您的工作"${jobTitle}"`,
      link: `/pages/job-process/job-process?jobId=${jobId}&tab=applications`,
      data: { jobId, jobTitle, workerName },
    });
  }

  /**
   * 企业接受通知 - 发送给临工
   * 当企业接受临工的报名时，通知临工
   */
  async notifyJobAccepted(
    workerId: number,
    jobId: number,
    jobTitle: string,
    enterpriseName: string,
  ) {
    return this.create(workerId, {
      type: 'job_apply',
      title: '报名已接受',
      content: `${enterpriseName}接受了您对"${jobTitle}"的报名`,
      link: '/pages/my-applications/my-applications',
      data: { jobId, jobTitle, enterpriseName },
    });
  }

  /**
   * 企业拒绝通知 - 发送给临工
   * 当企业拒绝临工的报名时，通知临工
   */
  async notifyJobRejected(
    workerId: number,
    jobId: number,
    jobTitle: string,
    enterpriseName: string,
  ) {
    return this.create(workerId, {
      type: 'job_apply',
      title: '报名已拒绝',
      content: `${enterpriseName}拒绝了您对"${jobTitle}"的报名`,
      link: '/pages/my-applications/my-applications',
      data: { jobId, jobTitle, enterpriseName },
    });
  }

  /**
   * 工作开始通知 - 发送给临工和企业
   * 当工作开始时，通知相关人员
   */
  async notifyWorkStart(
    userId: number,
    jobId: number,
    jobTitle: string,
    isWorker: boolean,
  ) {
    const title = isWorker ? '工作即将开始' : '工作已开始';
    const content = isWorker
      ? `您报名的工作"${jobTitle}"即将开始，请准时到达`
      : `您发布的工作"${jobTitle}"已开始`;

    return this.create(userId, {
      type: 'job_apply',
      title,
      content,
      link: isWorker
        ? `/pages/checkin/checkin?jobId=${jobId}`
        : `/pages/job-process/job-process?jobId=${jobId}&tab=attendance`,
      data: { jobId, jobTitle, isWorker },
    });
  }

  /**
   * 结算完成通知 - 发送给临工
   * 当工作结算完成时，通知临工
   */
  async notifySettlement(
    workerId: number,
    jobId: number,
    jobTitle: string,
    amount: number,
  ) {
    return this.create(workerId, {
      type: 'settlement',
      title: '工作结算完成',
      content: `您的工作"${jobTitle}"已结算，获得${amount}元`,
      link: `/pages/job-process/job-process?jobId=${jobId}&tab=settlement&role=worker&viewOnly=1`,
      data: { jobId, jobTitle, amount },
    });
  }

  /**
   * 评价提醒通知 - 发送给临工和企业
   * 当工作完成后，提醒对方进行评价
   */
  async notifyRating(
    userId: number,
    jobId: number,
    jobTitle: string,
    targetName: string,
    isWorker: boolean,
  ) {
    const title = isWorker ? '企业评价提醒' : '临工评价提醒';
    const content = isWorker
      ? `${targetName}还未对您的工作进行评价，请耐心等待`
      : `请对临工${targetName}的工作进行评价`;

    return this.create(userId, {
      type: 'promotion',
      title,
      content,
      link: isWorker
        ? `/pages/job-process/job-process?jobId=${jobId}&tab=settlement&role=worker&viewOnly=1`
        : `/pages/job-process/job-process?jobId=${jobId}&tab=settlement`,
      data: { jobId, jobTitle, targetName, isWorker },
    });
  }
}
