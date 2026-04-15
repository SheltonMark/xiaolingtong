import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import { WorkerCert } from '../../entities/worker-cert.entity';
import { AttendanceSheet } from '../../entities/attendance-sheet.entity';
import { AttendanceSheetItem } from '../../entities/attendance-sheet-item.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(Settlement) private settleRepo: Repository<Settlement>,
    @InjectRepository(SettlementItem)
    private itemRepo: Repository<SettlementItem>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
    @InjectRepository(JobApplication)
    private appRepo: Repository<JobApplication>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    @InjectRepository(EnterpriseCert)
    private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert)
    private workerCertRepo: Repository<WorkerCert>,
    @InjectRepository(AttendanceSheet)
    private attendanceSheetRepo: Repository<AttendanceSheet>,
    @InjectRepository(AttendanceSheetItem)
    private attendanceSheetItemRepo: Repository<AttendanceSheetItem>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  private async getConfig(key: string, defaultVal: string): Promise<string> {
    const c = await this.configRepo.findOne({ where: { key } });
    return c ? c.value : defaultVal;
  }

  private async getCompanyName(
    userId: number,
    fallbackNickname?: string,
  ): Promise<string> {
    const cert = await this.entCertRepo.findOne({
      where: { userId, status: 'approved' },
      order: { id: 'DESC' },
    });
    return cert?.companyName || fallbackNickname || '企业';
  }

  private async getWorkerCertMap(
    userIds: Array<number | string>,
  ): Promise<Map<number, WorkerCert>> {
    const normalizedIds = Array.from(
      new Set(
        userIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );
    const certMap = new Map<number, WorkerCert>();
    if (normalizedIds.length === 0) {
      return certMap;
    }

    const certs = await this.workerCertRepo
      .createQueryBuilder('cert')
      .where('cert.userId IN (:...userIds)', { userIds: normalizedIds })
      .andWhere('cert.status = :status', { status: 'approved' })
      .orderBy('cert.userId', 'ASC')
      .addOrderBy('cert.id', 'DESC')
      .getMany();

    for (const cert of certs) {
      if (!certMap.has(Number(cert.userId))) {
        certMap.set(Number(cert.userId), cert);
      }
    }
    return certMap;
  }

  private getWorkerDisplayName(
    user?: Partial<User> | null,
    workerCert?: Partial<WorkerCert> | null,
  ): string {
    return (
      String(
        workerCert?.realName || user?.name || user?.nickname || '',
      ).trim() || '临工'
    );
  }

  private isEffectiveAttendanceItem(
    item: Partial<AttendanceSheetItem>,
  ): boolean {
    return (
      item.attendance !== 'absent' ||
      Number(item.hours || 0) > 0 ||
      Number(item.pieces || 0) > 0 ||
      !!item.checkInTime ||
      !!item.checkOutTime
    );
  }

  private async getAttendanceSheetItems(
    jobId: number,
  ): Promise<AttendanceSheetItem[]> {
    const sheets = await this.attendanceSheetRepo.find({
      where: { jobId },
      order: { date: 'ASC', id: 'ASC' },
    });
    if (sheets.length === 0) {
      return [];
    }

    const items: AttendanceSheetItem[] = [];
    for (const sheet of sheets) {
      const sheetItems = await this.attendanceSheetItemRepo.find({
        where: { sheetId: sheet.id },
        order: { id: 'ASC' },
      });
      items.push(...sheetItems);
    }
    return items;
  }

  private formatDateTime(date?: Date | null): string {
    if (!date) {
      return '';
    }
    const time = new Date(date);
    const year = time.getFullYear();
    const month = `${time.getMonth() + 1}`.padStart(2, '0');
    const day = `${time.getDate()}`.padStart(2, '0');
    const hours = `${time.getHours()}`.padStart(2, '0');
    const minutes = `${time.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  private buildAttendanceSheetDateLabel(sheets: AttendanceSheet[]): string {
    const dates = Array.from(
      new Set(
        sheets
          .map((sheet) => String(sheet.date || '').slice(0, 10))
          .filter((date) => !!date),
      ),
    );
    if (dates.length === 0) {
      return '';
    }
    if (dates.length === 1) {
      return dates[0];
    }
    return `${dates[0]} ~ ${dates[dates.length - 1]}（${dates.length}天）`;
  }

  private normalizeCommissionRate(
    rawValue: string | number | null | undefined,
    fallback = 0.2,
  ): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }
    if (parsed > 1) {
      if (parsed <= 100) {
        return +(parsed / 100).toFixed(4);
      }
      return fallback;
    }
    return +parsed.toFixed(4);
  }

  private formatCommissionRateText(rate: number): string {
    const percent = (Number(rate || 0) * 100).toFixed(2).replace(/\.?0+$/, '');
    return `${percent}%`;
  }

  private async getGlobalCommissionConfigValue(): Promise<string> {
    const primary = await this.getConfig('default_commission_rate', '');
    if (primary) {
      return primary;
    }
    return this.getConfig('platform_fee_rate', '0.20');
  }

  private async getCommissionRateForJob(jobId: number): Promise<number> {
    const jobCommission = await this.getConfig(`job_commission_${jobId}`, '');
    const globalCommission = await this.getGlobalCommissionConfigValue();
    return this.normalizeCommissionRate(jobCommission || globalCommission, 0.2);
  }

  private async getManagerShareRateForJob(jobId: number): Promise<number> {
    const managerShare = await this.getConfig(`job_manager_share_${jobId}`, '');
    return this.normalizeCommissionRate(managerShare, 0);
  }

  async createSettlement(jobId: number, userId: number) {
    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) throw new BadRequestException('招工不存在');

    const isEnterprise = Number(job.userId) === Number(userId);
    if (!isEnterprise) {
      const supervisorAccess = await this.appRepo.findOne({
        where: { jobId, workerId: userId, isSupervisor: 1 },
      });
      if (!supervisorAccess) {
        throw new ForbiddenException('无权操作');
      }
    }

    const existing = await this.settleRepo.findOne({ where: { jobId } });
    if (existing) {
      if (!['pending_settlement', 'settled', 'closed'].includes(job.status)) {
        await this.jobRepo.update(jobId, { status: 'pending_settlement' });
      }
      return {
        message: '结算单已存在',
        settlementId: existing.id,
        existing: true,
      };
    }

    const commissionRate = await this.getCommissionRateForJob(jobId);
    const managerShareRate = await this.getManagerShareRateForJob(jobId);

    const apps = await this.appRepo.find({
      where: { jobId },
    });
    const workerApps = apps.filter((a) =>
      ['confirmed', 'working', 'done'].includes(a.status),
    );
    if (workerApps.length === 0)
      throw new BadRequestException('没有进入考勤阶段的临工');

    const supervisorApp = apps.find((a) => a.isSupervisor === 1);
    const supervisorId = supervisorApp ? supervisorApp.workerId : undefined;
    const activeWorkerIds = new Set(
      workerApps.map((app) => Number(app.workerId)),
    );

    let totalHours = 0;
    let factoryTotal = 0;
    let workerTotal = 0;
    const items: {
      workerId: number;
      hours: number;
      factoryPay: number;
      workerPay: number;
    }[] = [];

    const attendanceItems = await this.getAttendanceSheetItems(jobId);
    if (attendanceItems.length > 0) {
      const totalsByWorker = new Map<
        number,
        { hours: number; pieces: number }
      >();
      for (const item of attendanceItems) {
        const workerId = Number(item.workerId);
        if (
          !activeWorkerIds.has(workerId) ||
          !this.isEffectiveAttendanceItem(item)
        ) {
          continue;
        }
        const current = totalsByWorker.get(workerId) || { hours: 0, pieces: 0 };
        current.hours += Number(item.hours || 0);
        current.pieces += Number(item.pieces || 0);
        totalsByWorker.set(workerId, current);
      }

      for (const app of workerApps) {
        const totals = totalsByWorker.get(Number(app.workerId));
        if (!totals) {
          continue;
        }

        const hours = totals.hours;
        const pieces = totals.pieces;
        const factoryPay =
          job.salaryType === 'piece'
            ? pieces * +job.salary
            : hours * +job.salary;
        const workerPay = +(factoryPay * (1 - commissionRate)).toFixed(2);

        totalHours += hours;
        factoryTotal += factoryPay;
        workerTotal += workerPay;
        items.push({ workerId: app.workerId, hours, factoryPay, workerPay });
      }
    } else {
      for (const app of workerApps) {
        const logs = await this.workLogRepo.find({
          where: { jobId, workerId: app.workerId },
        });
        const effectiveLogs = logs.filter(
          (log) =>
            log.anomalyType !== 'absent' ||
            Number(log.hours || 0) > 0 ||
            Number(log.pieces || 0) > 0 ||
            !!log.checkInTime ||
            !!log.checkOutTime,
        );
        if (effectiveLogs.length === 0) {
          continue;
        }

        const hours = effectiveLogs.reduce(
          (sum, l) => sum + Number(l.hours || 0),
          0,
        );
        const pieces = effectiveLogs.reduce(
          (sum, l) => sum + Number(l.pieces || 0),
          0,
        );

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
    }

    if (items.length === 0)
      throw new BadRequestException('暂无有效考勤记录，无法生成结算单');

    const commissionPool = +(factoryTotal - workerTotal).toFixed(2);
    const rawSupervisorFee = supervisorId
      ? +(commissionPool * managerShareRate).toFixed(2)
      : 0;
    const supervisorFee = Math.max(0, Math.min(rawSupervisorFee, commissionPool));
    const platformFee = +(commissionPool - supervisorFee).toFixed(2);

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
      await this.itemRepo.save(
        this.itemRepo.create({
          settlementId: settlement.id,
          workerId: it.workerId,
          hours: it.hours,
          factoryPay: it.factoryPay,
          workerPay: it.workerPay,
        }),
      );
    }

    await this.jobRepo.update(jobId, { status: 'pending_settlement' });

    return { message: '结算单已生成', settlementId: settlement.id };
  }

  async detail(jobId: number, viewerId?: number) {
    const settlement = await this.settleRepo.findOne({
      where: { jobId },
      relations: ['job', 'job.user'],
    });
    if (!settlement) {
      const job = await this.jobRepo.findOne({
        where: { id: jobId },
        relations: ['user'],
      });
      if (!job) throw new BadRequestException('招工不存在');

      const commissionRate = await this.getCommissionRateForJob(jobId);
      const companyName = await this.getCompanyName(
        job.userId,
        job.user?.nickname,
      );
      const dateRange =
        job.dateStart && job.dateEnd
          ? job.dateStart.slice(5) + ' ~ ' + job.dateEnd.slice(5)
          : '';

      return {
        exists: false,
        job: {
          company: companyName,
          avatarText: companyName[0] || '企',
          jobType: job.title || '临时工',
          dateRange,
          totalWorkers: 0,
          totalHours: 0,
          factoryTotal: '0.00',
          enterpriseId: job.userId,
        },
        workers: [],
        fees: {
          factoryTotal: '0.00',
          platformFee: '0.00',
          platformFeeRateText: this.formatCommissionRateText(commissionRate),
          managerFee: '0.00',
          workerTotal: '0.00',
        },
        steps: [],
        status: '',
        currentWorkerSettlement: null,
      };
    }

    const items = await this.itemRepo.find({
      where: { settlementId: settlement.id },
      relations: ['worker'],
    });
    const workerCertMap = await this.getWorkerCertMap(
      items.map((item) => item.workerId),
    );
    const attendanceSheets = await this.attendanceSheetRepo.find({
      where: { jobId },
      order: { date: 'ASC', id: 'ASC' },
    });
    const attendanceSheetDateLabel =
      this.buildAttendanceSheetDateLabel(attendanceSheets);

    const job = settlement.job || ({} as any);
    const enterprise = job.user || ({} as any);
    const companyName = await this.getCompanyName(
      job.userId,
      enterprise.nickname,
    );

    const dateRange =
      job.dateStart && job.dateEnd
        ? job.dateStart.slice(5) + ' ~ ' + job.dateEnd.slice(5)
        : '';

    const workers = items.map((it) => ({
      name: this.getWorkerDisplayName(
        it.worker,
        workerCertMap.get(Number(it.workerId)) || null,
      ),
      hours: +it.hours,
      factoryPay: (+it.factoryPay).toFixed(2),
      workerPay: (+it.workerPay).toFixed(2),
      confirmed: it.confirmed === 1,
    }));
    const currentWorkerItem = viewerId
      ? items.find((item) => Number(item.workerId) === Number(viewerId))
      : null;

    const steps = [
      {
        label: '管理员提交核验单',
        done: true,
        time: settlement.createdAt
          ? new Date(settlement.createdAt).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
      },
      {
        label: '企业确认支付',
        done: ['paid', 'distributed', 'completed'].includes(settlement.status),
        time: settlement.paidAt
          ? new Date(settlement.paidAt).toLocaleString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '待确认',
      },
      {
        label: '工资发放完成',
        done: ['distributed', 'completed'].includes(settlement.status),
        time: ['distributed', 'completed'].includes(settlement.status)
          ? '已发放'
          : '待发放',
      },
      {
        label: '临工全部确认',
        done: settlement.status === 'completed',
        time: settlement.status === 'completed' ? '已完成' : '待确认',
      },
    ];

    return {
      exists: true,
      job: {
        company: companyName,
        avatarText: companyName[0] || '企',
        jobType: job.title || '临时工',
        dateRange,
        totalWorkers: settlement.totalWorkers,
        totalHours: +settlement.totalHours,
        factoryTotal: (+settlement.factoryTotal).toFixed(2),
        enterpriseId: settlement.enterpriseId,
        settlementGeneratedAt: this.formatDateTime(settlement.createdAt),
        attendanceSheetDateLabel,
      },
      workers,
      fees: {
        factoryTotal: (+settlement.factoryTotal).toFixed(2),
        platformFee: (+settlement.platformFee).toFixed(2),
        platformFeeRateText: this.formatCommissionRateText(
          +settlement.commissionRate || 0,
        ),
        managerFee: (+settlement.supervisorFee).toFixed(2),
        workerTotal: (+settlement.workerTotal).toFixed(2),
      },
      steps,
      status: settlement.status,
      currentWorkerSettlement: currentWorkerItem
        ? {
            workerId: currentWorkerItem.workerId,
            hours: +currentWorkerItem.hours,
            factoryPay: (+currentWorkerItem.factoryPay).toFixed(2),
            workerPay: (+currentWorkerItem.workerPay).toFixed(2),
            confirmed: currentWorkerItem.confirmed === 1,
            confirmedAt: currentWorkerItem.confirmedAt || null,
            canConfirm:
              currentWorkerItem.confirmed !== 1 &&
              ['paid', 'distributed', 'completed'].includes(settlement.status),
          }
        : null,
    };
  }

  async pay(jobId: number, enterpriseId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    const normalizedEnterpriseId = Number(enterpriseId || 0);
    if (settlement) {
      settlement.enterpriseId = Number(settlement.enterpriseId) as any;
    }
    if (!settlement) throw new BadRequestException('结算单不存在');
    if (settlement.enterpriseId !== normalizedEnterpriseId)
      throw new ForbiddenException('无权操作');
    if (settlement.status !== 'pending')
      throw new BadRequestException('结算单状态异常');

    const user = await this.userRepo.findOneBy({ id: normalizedEnterpriseId });
    if (!user) throw new BadRequestException('用户不存在');

    const outTradeNo = this.paymentService.generateOutTradeNo(
      'STL',
      settlement.id,
    );
    const host = this.config.get('API_HOST', 'https://quanqiutong888.com');
    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `聚采通用工结算-${settlement.totalWorkers}人`,
      totalFee: Math.round(+settlement.factoryTotal * 100),
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return { settlementId: settlement.id, outTradeNo, ...result };
  }

  async confirmByWorker(jobId: number, workerId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');

    const item = await this.itemRepo.findOne({
      where: { settlementId: settlement.id, workerId },
    });
    if (!item) throw new BadRequestException('未找到结算记录');

    item.confirmed = 1;
    item.confirmedAt = new Date();
    await this.itemRepo.save(item);

    const unconfirmed = await this.itemRepo.count({
      where: { settlementId: settlement.id, confirmed: 0 },
    });
    if (
      unconfirmed === 0 &&
      ['distributed', 'completed'].includes(settlement.status)
    ) {
      settlement.status = 'completed';
      await this.settleRepo.save(settlement);
      await this.jobRepo.update(jobId, { status: 'closed' });

      await this.appRepo
        .createQueryBuilder()
        .update()
        .set({ status: 'done' })
        .where("jobId = :jobId AND status IN ('confirmed','working')", {
          jobId,
        })
        .execute();
    }

    return { message: '已确认' };
  }
}
