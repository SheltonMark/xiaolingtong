import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { PaymentService } from '../payment/payment.service';

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
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  private async getConfig(key: string, defaultVal: string): Promise<string> {
    const c = await this.configRepo.findOne({ where: { key } });
    return c ? c.value : defaultVal;
  }

  private async getCompanyName(userId: number, fallbackNickname?: string): Promise<string> {
    const cert = await this.entCertRepo.findOne({
      where: { userId, status: 'approved' },
      order: { id: 'DESC' },
    });
    return cert?.companyName || fallbackNickname || '企业';
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

    // 查找进入考勤阶段的临工，最终是否参与结算由考勤/工时记录决定
    const apps = await this.appRepo.find({
      where: { jobId },
    });
    const workerApps = apps.filter(a => ['confirmed', 'working', 'done'].includes(a.status));
    if (workerApps.length === 0) throw new BadRequestException('没有进入考勤阶段的临工');

    // 找管理员
    const supervisorApp = apps.find(a => a.isSupervisor === 1);
    const supervisorId = supervisorApp ? supervisorApp.workerId : undefined;

    let totalHours = 0;
    let factoryTotal = 0;
    let workerTotal = 0;
    const items: { workerId: number; hours: number; factoryPay: number; workerPay: number }[] = [];

    for (const app of workerApps) {
      const logs = await this.workLogRepo.find({ where: { jobId, workerId: app.workerId } });
      const effectiveLogs = logs.filter((log) => (
        log.anomalyType !== 'absent'
        || (Number(log.hours || 0)) > 0
        || (Number(log.pieces || 0)) > 0
        || !!log.checkInTime
        || !!log.checkOutTime
      ));
      if (effectiveLogs.length === 0) {
        continue;
      }

      const hours = effectiveLogs.reduce((sum, l) => sum + Number(l.hours || 0), 0);
      const pieces = effectiveLogs.reduce((sum, l) => sum + Number(l.pieces || 0), 0);

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

    if (items.length === 0) throw new BadRequestException('暂无有效考勤记录，无法生成结算单');

    // 管理员服务费
    const supervisorFee = supervisorId ? +(items.length * totalHours * managerFeeUnit).toFixed(2) : 0;
    const platformFee = +(factoryTotal - workerTotal - supervisorFee).toFixed(2);

    const settlementEntity = this.settleRepo.create({
      jobId,
      enterpriseId: job.userId,
      totalWorkers: items.length,
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

  async detail(jobId: number, viewerId?: number) {
    const settlement = await this.settleRepo.findOne({
      where: { jobId },
      relations: ['job', 'job.user'],
    });
    if (!settlement) throw new BadRequestException('结算单不存在');

    const items = await this.itemRepo.find({
      where: { settlementId: settlement.id },
      relations: ['worker'],
    });

    const job = settlement.job || {} as any;
    const enterprise = job.user || {} as any;
    const companyName = await this.getCompanyName(job.userId, enterprise.nickname);

    // 格式化为前端期望的结构
    const dateRange = job.dateStart && job.dateEnd
      ? job.dateStart.slice(5) + ' ~ ' + job.dateEnd.slice(5)
      : '';

    const workers = items.map(it => ({
      name: it.worker?.nickname || '临工',
      hours: +it.hours,
      factoryPay: (+it.factoryPay).toFixed(2),
      workerPay: (+it.workerPay).toFixed(2),
      confirmed: it.confirmed === 1,
    }));
    const currentWorkerItem = viewerId
      ? items.find((item) => Number(item.workerId) === Number(viewerId))
      : null;

    // 确认状态步骤
    const steps = [
      {
        label: '管理员提交核验单',
        done: true,
        time: settlement.createdAt ? new Date(settlement.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
      },
      {
        label: '企业确认支付',
        done: ['paid', 'distributed', 'completed'].includes(settlement.status),
        time: settlement.paidAt ? new Date(settlement.paidAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '待确认',
      },
      {
        label: '工资发放完成',
        done: ['distributed', 'completed'].includes(settlement.status),
        time: ['distributed', 'completed'].includes(settlement.status) ? '已发放' : '待发放',
      },
      {
        label: '临工全部确认',
        done: settlement.status === 'completed',
        time: settlement.status === 'completed' ? '已完成' : '待确认',
      },
    ];

    return {
      job: {
        company: companyName,
        avatarText: companyName[0] || '企',
        jobType: job.title || '临时工',
        dateRange,
        totalWorkers: settlement.totalWorkers,
        totalHours: +settlement.totalHours,
        factoryTotal: (+settlement.factoryTotal).toFixed(2),
        enterpriseId: settlement.enterpriseId,
      },
      workers,
      fees: {
        factoryTotal: (+settlement.factoryTotal).toFixed(2),
        platformFee: (+settlement.platformFee).toFixed(2),
        managerFee: (+settlement.supervisorFee).toFixed(2),
        workerTotal: (+settlement.workerTotal).toFixed(2),
      },
      steps,
      status: settlement.status,
      currentWorkerSettlement: currentWorkerItem ? {
        workerId: currentWorkerItem.workerId,
        hours: +currentWorkerItem.hours,
        factoryPay: (+currentWorkerItem.factoryPay).toFixed(2),
        workerPay: (+currentWorkerItem.workerPay).toFixed(2),
        confirmed: currentWorkerItem.confirmed === 1,
        confirmedAt: currentWorkerItem.confirmedAt || null,
        canConfirm: currentWorkerItem.confirmed !== 1 && ['paid', 'distributed', 'completed'].includes(settlement.status),
      } : null,
    };
  }

  async pay(jobId: number, enterpriseId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');
    if (settlement.enterpriseId !== enterpriseId) throw new ForbiddenException('无权操作');
    if (settlement.status !== 'pending') throw new BadRequestException('结算单状态异常');

    const user = await this.userRepo.findOneBy({ id: enterpriseId });
    if (!user) throw new BadRequestException('用户不存在');

    const outTradeNo = this.paymentService.generateOutTradeNo('STL', settlement.id);
    const host = this.config.get('API_HOST', 'https://quanqiutong888.com');
    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `小灵通用工结算-${settlement.totalWorkers}人`,
      totalFee: Math.round(+settlement.factoryTotal * 100),
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return { settlementId: settlement.id, outTradeNo, ...result };
  }

  async confirmByWorker(jobId: number, workerId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');

    const item = await this.itemRepo.findOne({ where: { settlementId: settlement.id, workerId } });
    if (!item) throw new BadRequestException('未找到结算记录');

    item.confirmed = 1;
    item.confirmedAt = new Date();
    await this.itemRepo.save(item);

    // 检查是否所有人都确认了 → Job 状态改为 closed
    const unconfirmed = await this.itemRepo.count({ where: { settlementId: settlement.id, confirmed: 0 } });
    if (unconfirmed === 0 && ['distributed', 'completed'].includes(settlement.status)) {
      settlement.status = 'completed';
      await this.settleRepo.save(settlement);
      await this.jobRepo.update(jobId, { status: 'closed' });

      // application 状态改为 done
      await this.appRepo.createQueryBuilder()
        .update().set({ status: 'done' })
        .where("jobId = :jobId AND status IN ('confirmed','working')", { jobId })
        .execute();
    }

    return { message: '已确认' };
  }
}
