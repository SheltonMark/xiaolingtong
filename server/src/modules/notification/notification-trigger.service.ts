import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationTriggerService {
  constructor(private notificationService: NotificationService) {}

  // Worker notifications
  async notifyApplicationSubmitted(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'application_submitted',
      '报名成功',
      `您已报名《${jobTitle}》，请等待企业审核`,
      jobId,
      'job',
    );
  }

  async notifyApplicationAccepted(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'application_accepted',
      '报名已接受',
      `企业已接受您的报名《${jobTitle}》，请确认出勤`,
      jobId,
      'job',
    );
  }

  async notifyApplicationRejected(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'application_rejected',
      '报名已拒绝',
      `企业拒绝了您对《${jobTitle}》的报名`,
      jobId,
      'job',
    );
  }

  async notifyWorkStarting(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'work_starting',
      '工作即将开始',
      `《${jobTitle}》工作即将开始，请准时出勤`,
      jobId,
      'job',
    );
  }

  async notifyWorkStarted(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'work_started',
      '工作已开始',
      `《${jobTitle}》工作已开始，请签到`,
      jobId,
      'job',
    );
  }

  async notifySettlementCompleted(workerId: number, amount: number): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'settlement_completed',
      '工资已到账',
      `您的工资 ¥${amount} 已到账，请查看`,
    );
  }

  async notifyRatingReminder(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'rating_reminder',
      '请评价本次工作',
      `请评价《${jobTitle}》的工作体验`,
      jobId,
      'job',
    );
  }

  async notifyApplicationCancelled(workerId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      workerId,
      'application_cancelled',
      '报名已取消',
      `您已取消《${jobTitle}》的报名`,
      jobId,
      'job',
    );
  }

  // Enterprise notifications
  async notifyNewApplication(enterpriseId: number, jobId: number, jobTitle: string, workerName: string): Promise<void> {
    await this.notificationService.sendNotification(
      enterpriseId,
      'new_application',
      '新的报名申请',
      `${workerName} 报名了《${jobTitle}》，请审核`,
      jobId,
      'job',
    );
  }

  async notifyWorkerConfirmed(enterpriseId: number, jobId: number, jobTitle: string, workerName: string): Promise<void> {
    await this.notificationService.sendNotification(
      enterpriseId,
      'worker_confirmed',
      '临工已确认出勤',
      `${workerName} 已确认出勤《${jobTitle}》`,
      jobId,
      'job',
    );
  }

  async notifyApplicationCancelledEnterprise(enterpriseId: number, jobId: number, jobTitle: string, workerName: string): Promise<void> {
    await this.notificationService.sendNotification(
      enterpriseId,
      'application_cancelled_enterprise',
      '临工已取消报名',
      `${workerName} 已取消《${jobTitle}》的报名`,
      jobId,
      'job',
    );
  }

  async notifyWorkStartedEnterprise(enterpriseId: number, jobId: number, jobTitle: string): Promise<void> {
    await this.notificationService.sendNotification(
      enterpriseId,
      'work_started_enterprise',
      '工作已开始',
      `《${jobTitle}》工作已开始`,
      jobId,
      'job',
    );
  }

  async notifySettlementReminder(enterpriseId: number, jobId: number, jobTitle: string, amount: number): Promise<void> {
    await this.notificationService.sendNotification(
      enterpriseId,
      'settlement_reminder',
      '结算提醒',
      `《${jobTitle}》结算单已生成，金额 ¥${amount}，请确认并支付`,
      jobId,
      'job',
    );
  }

  async notifyWorkerRated(enterpriseId: number, jobId: number, jobTitle: string, workerName: string, rating: number): Promise<void> {
    await this.notificationService.sendNotification(
      enterpriseId,
      'worker_rated',
      '临工已评价',
      `${workerName} 对《${jobTitle}》的评价：${rating}星`,
      jobId,
      'job',
    );
  }
}
