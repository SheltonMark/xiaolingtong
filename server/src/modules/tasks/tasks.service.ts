import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AdOrder } from '../../entities/ad-order.entity';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AdOrder) private adRepo: Repository<AdOrder>,
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
}
