import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AdOrder) private adRepo: Repository<AdOrder>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {}

  /** 每天凌晨1点：会员到期自动降级 */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleMemberExpire() {
    const result = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ isMember: 0 })
      .where('isMember = 1 AND memberExpireAt < NOW()')
      .execute();
    if (result.affected) {
      this.logger.log(`会员到期降级: ${result.affected} 人`);
    }
  }

  /** 每天凌晨2点：广告到期自动下架 */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleAdExpire() {
    const result = await this.adRepo
      .createQueryBuilder()
      .update(AdOrder)
      .set({ status: 'expired' })
      .where("status = 'active' AND endAt < NOW()")
      .execute();
    if (result.affected) {
      this.logger.log(`广告到期下架: ${result.affected} 条`);
    }
  }

  /** 每小时检查：出勤确认超时自动释放 + 爽约扣分 */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAttendanceTimeout() {
    // 查找 status=accepted 且 job 开工时间在12小时内的 application
    const expired = await this.appRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.job', 'j')
      .where("a.status = 'accepted'")
      .andWhere("DATE_SUB(j.dateStart, INTERVAL 12 HOUR) < NOW()")
      .getMany();

    for (const app of expired) {
      // 释放名额
      app.status = 'released';
      await this.appRepo.save(app);

      // 爽约扣信用分 -10
      await this.userRepo.decrement({ id: app.workerId }, 'creditScore', 10);
      this.logger.log(`出勤超时释放: 工人${app.workerId} 招工${app.jobId} 信用分-10`);

      // 尝试从候补递补（rejected 中信用分最高的）
      const alternate = await this.appRepo.createQueryBuilder('a2')
        .leftJoinAndSelect('a2.worker', 'w')
        .where('a2.jobId = :jobId AND a2.status = :s', { jobId: app.jobId, s: 'rejected' })
        .orderBy('w.creditScore', 'DESC')
        .getOne();

      if (alternate) {
        alternate.status = 'accepted';
        await this.appRepo.save(alternate);
        this.logger.log(`递补工人${alternate.workerId} 到招工${app.jobId}`);
      }
    }
  }
}
