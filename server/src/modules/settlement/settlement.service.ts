import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(Settlement) private settleRepo: Repository<Settlement>,
    @InjectRepository(SettlementItem) private itemRepo: Repository<SettlementItem>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
  ) {}

  private async getConfig(key: string, defaultVal: string): Promise<string> {
    const c = await this.configRepo.findOne({ where: { key } });
    return c ? c.value : defaultVal;
  }

  async createSettlement(jobId: number, userId: number) {
    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) throw new BadRequestException('招工不存在');

    const existing = await this.settleRepo.findOne({ where: { jobId } });
    if (existing) throw new BadRequestException('结算单已存在');

    // 获取佣金率（优先单个job覆盖，否则全局默认）
    const jobCommission = await this.getConfig(`job_commission_${jobId}`, '');
    const globalCommission = await this.getConfig('default_commission_rate', '0.20');
    const commissionRate = jobCommission ? +jobCommission : +globalCommission;

    // 获取管理员服务费单价
    const managerFeeStr = await this.getConfig('manager_service_fee', '5');
    const managerFeeUnit = +managerFeeStr;

    // 查找实际参与工作的临工（confirmed/working/done）
    const apps = await this.appRepo.find({
      where: { jobId },
    });
    const workerApps = apps.filter(a => ['confirmed', 'working', 'done'].includes(a.status));
    if (workerApps.length === 0) throw new BadRequestException('没有参与工作的临工');

    // 找管理员
    const supervisorApp = apps.find(a => a.isSupervisor === 1);
    const supervisorId = supervisorApp ? supervisorApp.workerId : undefined;

    let totalHours = 0;
    let factoryTotal = 0;
    let workerTotal = 0;
    const items: { workerId: number; hours: number; factoryPay: number; workerPay: number }[] = [];

    for (const app of workerApps) {
      // 汇总该工人的 WorkLog
      const logs = await this.workLogRepo.find({ where: { jobId, workerId: app.workerId } });
      const hours = logs.reduce((sum, l) => sum + (+l.hours || 0), 0);
      const pieces = logs.reduce((sum, l) => sum + (+l.pieces || 0), 0);

      let factoryPay: number;
      if (job.salaryType === 'piece') {
        factoryPay = pieces * +job.salary;
      } else {
        factoryPay = hours * +job.salary;
      }
      const workerPay = +(factoryPay * (1 - commissionRate)).toFixed(2);

      totalHours += hours;
      factoryTotal += factoryPay;
      workerTotal += workerPay;
      items.push({ workerId: app.workerId, hours, factoryPay, workerPay });
    }

    // 管理员服务费
    const supervisorFee = supervisorId ? +(workerApps.length * totalHours * managerFeeUnit).toFixed(2) : 0;
    const platformFee = +(factoryTotal - workerTotal - supervisorFee).toFixed(2);

    const settlementEntity = this.settleRepo.create({
      jobId,
      enterpriseId: job.userId,
      totalWorkers: workerApps.length,
      totalHours,
      factoryTotal: +factoryTotal.toFixed(2),
      platformFee: platformFee > 0 ? platformFee : 0,
      workerTotal: +workerTotal.toFixed(2),
      supervisorId,
      supervisorFee,
      commissionRate,
      status: 'pending' as const,
    });
    const settlement = await this.settleRepo.save(settlementEntity);

    for (const it of items) {
      await this.itemRepo.save(this.itemRepo.create({
        settlementId: settlement.id,
        workerId: it.workerId,
        hours: it.hours,
        factoryPay: it.factoryPay,
        workerPay: it.workerPay,
      }));
    }

    // Job 状态改为 pending_settlement
    await this.jobRepo.update(jobId, { status: 'pending_settlement' });

    return { message: '结算单已生成', settlementId: settlement.id };
  }

  async detail(jobId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId }, relations: ['job'] });
    if (!settlement) throw new BadRequestException('结算单不存在');
    const items = await this.itemRepo.find({ where: { settlementId: settlement.id }, relations: ['worker'] });
    return { ...settlement, items };
  }

  async pay(jobId: number, enterpriseId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');
    if (settlement.enterpriseId !== enterpriseId) throw new ForbiddenException('无权操作');
    if (settlement.status !== 'pending') throw new BadRequestException('结算单状态异常');

    settlement.status = 'paid';
    settlement.paidAt = new Date();
    await this.settleRepo.save(settlement);

    // 分发到工人钱包
    const items = await this.itemRepo.find({ where: { settlementId: settlement.id } });
    for (const item of items) {
      let wallet = await this.walletRepo.findOne({ where: { userId: item.workerId } });
      if (!wallet) {
        wallet = this.walletRepo.create({ userId: item.workerId });
        wallet = await this.walletRepo.save(wallet);
      }
      wallet.balance = +wallet.balance + +item.workerPay;
      wallet.totalIncome = +wallet.totalIncome + +item.workerPay;
      await this.walletRepo.save(wallet);

      await this.walletTxRepo.save(this.walletTxRepo.create({
        userId: item.workerId, type: 'income', amount: item.workerPay,
        refType: 'settlement', refId: settlement.id, status: 'success',
        remark: '工资结算',
      }));

      // 完工信用分 +2
      await this.userRepo.increment({ id: item.workerId }, 'creditScore', 2);
    }

    settlement.status = 'distributed';
    await this.settleRepo.save(settlement);
    return { message: '支付成功，工资已发放' };
  }

  async confirmByWorker(jobId: number, workerId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');

    const item = await this.itemRepo.findOne({ where: { settlementId: settlement.id, workerId } });
    if (!item) throw new BadRequestException('未找到结算记录');

    item.confirmed = 1;
    item.confirmedAt = new Date();
    await this.itemRepo.save(item);
    return { message: '已确认' };
  }
}
