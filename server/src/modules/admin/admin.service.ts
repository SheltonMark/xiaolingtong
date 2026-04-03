import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';
import { Report } from '../../entities/report.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { Keyword } from '../../entities/keyword.entity';
import { Notice } from '../../entities/notice.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Category } from '../../entities/category.entity';
import { MemberOrder } from '../../entities/member-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Notification } from '../../entities/notification.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { AttendanceSheet } from '../../entities/attendance-sheet.entity';
import { WorkLog } from '../../entities/work-log.entity';
import * as crypto from 'crypto';

function hashPwd(pwd: string): string {
  return crypto
    .createHash('sha256')
    .update(pwd + '_xlt2026')
    .digest('hex');
}

@Injectable()
export class AdminService {
  private static readonly SUPERVISOR_ELIGIBLE_STATUSES = [
    'accepted',
    'confirmed',
    'working',
    'done',
  ];

  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Exposure) private exposureRepo: Repository<Exposure>,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(EnterpriseCert)
    private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert)
    private workerCertRepo: Repository<WorkerCert>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(Notice) private noticeRepo: Repository<Notice>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    @InjectRepository(OpenCity) private cityRepo: Repository<OpenCity>,
    @InjectRepository(JobType) private jobTypeRepo: Repository<JobType>,
    @InjectRepository(AdOrder) private adRepo: Repository<AdOrder>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(MemberOrder)
    private memberOrderRepo: Repository<MemberOrder>,
    @InjectRepository(Settlement)
    private settlementRepo: Repository<Settlement>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(BeanTransaction)
    private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(JobApplication)
    private appRepo: Repository<JobApplication>,
    @InjectRepository(Notification) private notiRepo: Repository<Notification>,
    @InjectRepository(SettlementItem)
    private settlementItemRepo: Repository<SettlementItem>,
    @InjectRepository(AttendanceSheet)
    private attendanceSheetRepo: Repository<AttendanceSheet>,
    @InjectRepository(WorkLog)
    private workLogRepo: Repository<WorkLog>,
    private jwt: JwtService,
  ) {}

  private isSupervisorEligibleStatus(status?: string | null) {
    return AdminService.SUPERVISOR_ELIGIBLE_STATUSES.includes(
      String(status || '').trim(),
    );
  }

  private async buildUserDisplayNameMap(userIds: Array<number | string>) {
    const ids = Array.from(new Set((userIds || []).map((id) => Number(id || 0)).filter(Boolean)));
    const nameMap = new Map<number, string>();
    if (!ids.length) return nameMap;

    const [users, entCerts, workerCerts] = await Promise.all([
      this.userRepo
        .createQueryBuilder('u')
        .select(['u.id', 'u.nickname', 'u.name', 'u.phone'])
        .where('u.id IN (:...ids)', { ids })
        .getMany(),
      this.entCertRepo
        .createQueryBuilder('cert')
        .select(['cert.userId', 'cert.companyName'])
        .where('cert.userId IN (:...ids) AND cert.status = :st', { ids, st: 'approved' })
        .getMany(),
      this.workerCertRepo
        .createQueryBuilder('cert')
        .select(['cert.userId', 'cert.realName'])
        .where('cert.userId IN (:...ids) AND cert.status = :st', { ids, st: 'approved' })
        .getMany(),
    ]);

    // 先填入用户自己编辑的名称（nickname/name）
    users.forEach((user) => {
      const userId = Number(user.id);
      nameMap.set(
        userId,
        user.nickname || user.name || user.phone || ('\u7528\u6237' + userId),
      );
    });

    // 已通过实名认证的名字覆盖 nickname
    entCerts.forEach((cert) => {
      if (cert?.companyName) {
        nameMap.set(Number(cert.userId), cert.companyName);
      }
    });

    workerCerts.forEach((cert) => {
      const userId = Number(cert.userId);
      if (cert?.realName) {
        nameMap.set(userId, cert.realName);
      }
    });

    return nameMap;
  }

  private resolveDisplayName(
    nameMap: Map<number, string>,
    userId: number | string | undefined,
    fallback?: { nickname?: string | null; name?: string | null; phone?: string | null },
  ) {
    const displayName =
      nameMap.get(Number(userId || 0)) ||
      fallback?.nickname ||
      fallback?.name ||
      fallback?.phone;
    return displayName ? String(displayName) : '';
  }

  private normalizeStringArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return [];
      try {
        return this.normalizeStringArray(JSON.parse(text));
      } catch {
        return [text];
      }
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));
      return this.normalizeStringArray(keys.map((key) => value[key]));
    }

    return [];
  }

  private async assignSupervisorForJob(jobId: number, workerId: number) {
    const normalizedWorkerId = Number(workerId || 0);
    if (!normalizedWorkerId) {
      throw new BadRequestException('请选择主管');
    }

    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) {
      throw new BadRequestException('招工不存在');
    }

    const target = await this.appRepo.findOne({
      where: { jobId, workerId: normalizedWorkerId },
      relations: ['worker'],
    });
    if (!target) {
      throw new BadRequestException('主管候选人不存在');
    }
    if (!this.isSupervisorEligibleStatus(target.status)) {
      throw new BadRequestException('当前状态不可设为主管');
    }

    await this.appRepo.update({ jobId }, { isSupervisor: 0 });
    target.isSupervisor = 1;
    await this.appRepo.save(target);
    return target;
  }

  async initSuperAdmin() {
    const exists = await this.adminRepo.findOne({
      where: { username: 'admin' },
    });
    if (!exists) {
      await this.adminRepo.save(
        this.adminRepo.create({
          username: 'admin',
          password: hashPwd('admin123'),
          nickname: '超级管理员',
          role: 'super',
        }),
      );
    }
  }

  async login(username: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { username } });
    if (!admin || admin.password !== hashPwd(password))
      throw new UnauthorizedException('账号或密码错误');
    if (!admin.isActive) throw new UnauthorizedException('账号已禁用');
    const token = this.jwt.sign({
      sub: admin.id,
      role: admin.role,
      isAdmin: true,
    });
    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
      },
    };
  }

  // 数据统计
  async dashboard() {
    const [userCount, postCount, jobCount, exposureCount] = await Promise.all([
      this.userRepo.count(),
      this.postRepo.count({ where: { status: 'active' as any } }),
      this.jobRepo.count(),
      this.exposureRepo.count(),
    ]);
    const enterpriseCount = await this.userRepo.count({
      where: { role: 'enterprise' },
    });
    const workerCount = await this.userRepo.count({
      where: { role: 'worker' },
    });
    return {
      userCount,
      enterpriseCount,
      workerCount,
      postCount,
      jobCount,
      exposureCount,
    };
  }

  // 用户管理
  async userList(query: any) {
    const { role, keyword, page = 1, pageSize = 20 } = query;
    const qb = this.userRepo.createQueryBuilder('u');
    if (role) qb.andWhere('u.role = :role', { role });
    else qb.andWhere('u.role IS NOT NULL');
    if (keyword) {
      qb
        .leftJoin(EnterpriseCert, 'ent', 'ent.userId = u.id')
        .leftJoin(WorkerCert, 'worker', 'worker.userId = u.id')
        .andWhere(
          '(u.nickname LIKE :kw OR u.phone LIKE :kw OR u.name LIKE :kw OR ent.companyName LIKE :kw OR worker.realName LIKE :kw)',
          {
            kw: `%${keyword}%`,
          },
        );
    }
    qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const nameMap = await this.buildUserDisplayNameMap(
      list.map((item) => item.id),
    );
    return {
      list: list.map((item) => {
        const displayName = this.resolveDisplayName(nameMap, item.id, item);
        return {
          ...item,
          displayName,
          nickname: displayName || item.nickname || item.name || item.phone || '',
        };
      }),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async banUser(id: number) {
    await this.userRepo.update(id, { status: 'banned' });
    return { message: '已封禁' };
  }

  async unbanUser(id: number) {
    await this.userRepo.update(id, { status: 'active' });
    return { message: '已解封' };
  }

  // 信息审核
  async postList(query: any) {
    const { type, status, page = 1, pageSize = 20 } = query;
    const qb = this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u');
    if (type) qb.andWhere('p.type = :type', { type });
    if (status) qb.andWhere('p.status = :status', { status });
    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const nameMap = await this.buildUserDisplayNameMap(
      list.map((item) => item.userId),
    );
    return {
      list: list.map((item) => {
        const displayName = this.resolveDisplayName(
          nameMap,
          item.userId,
          item.user,
        );
        return {
          ...item,
          displayName,
          companyName: displayName || undefined,
        };
      }),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async auditPost(id: number, action: string) {
    if (action === 'approve') {
      await this.postRepo.update(id, { status: 'active' });
    } else if (action === 'reject') {
      await this.postRepo.update(id, { status: 'deleted' });
    }
    return { message: action === 'approve' ? '已通过' : '已驳回' };
  }

  // 招工审核
  async jobList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.user', 'u');
    qb.orderBy('j.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  // 曝光管理
  async exposureList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.exposureRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.publisher', 'u')
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async deleteExposure(id: number) {
    await this.exposureRepo.delete(id);
    return { message: '已删除' };
  }

  async approveExposure(id: number) {
    await this.exposureRepo.update(id, { status: 'approved' });
    return { message: '已通过' };
  }

  async rejectExposure(id: number) {
    await this.exposureRepo.update(id, { status: 'rejected' });
    return { message: '已拒绝' };
  }

  // 举报管理
  async reportList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.reportRepo.createQueryBuilder('r');
    qb.orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return {
      list: list.map((item) => ({
        ...item,
        images: this.normalizeStringArray(item.images),
      })),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async handleReport(id: number, action: string) {
    if (action === 'resolve') {
      await this.reportRepo.update(id, { status: 'handled' });
    } else if (action === 'dismiss') {
      await this.reportRepo.update(id, { status: 'dismissed' });
    }
    return { message: action === 'resolve' ? '已处理' : '已驳回' };
  }

  // 认证审核
  async certList(query: any) {
    const { type = 'enterprise', status, page = 1, pageSize = 20 } = query;
    if (type === 'worker') {
      const qb = this.workerCertRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.user', 'u');
      if (status) qb.andWhere('c.status = :status', { status });
      qb.orderBy('c.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize);
      const [list, total] = await qb.getManyAndCount();
      return { list, total, page: +page, pageSize: +pageSize };
    }
    const qb = this.entCertRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u');
    if (status) qb.andWhere('c.status = :status', { status });
    qb.orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async auditCert(
    type: string,
    id: number,
    action: string,
    rejectReason?: string,
  ) {
    const repo = type === 'worker' ? this.workerCertRepo : this.entCertRepo;
    const cert = await repo.findOneBy({ id } as any);
    const update: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: new Date(),
    };
    if (action === 'reject' && rejectReason) update.rejectReason = rejectReason;
    await repo.update(id, update);

    // 发送通知
    if (cert && cert.userId) {
      const typeName = type === 'worker' ? '临工认证' : '企业认证';
      const title =
        action === 'approve' ? `${typeName}审核通过` : `${typeName}审核未通过`;
      const content =
        action === 'approve'
          ? `恭喜，您的${typeName}已审核通过！`
          : `您的${typeName}审核未通过${rejectReason ? '，原因：' + rejectReason : ''}`;
      await this.notiRepo.save(
        this.notiRepo.create({
          userId: cert.userId,
          type: 'cert' as any,
          title,
          content,
        }),
      );
    }

    return { message: action === 'approve' ? '已通过' : '已驳回' };
  }

  // 用户信用分调整
  async updateUserCredit(id: number, creditScore: number) {
    await this.userRepo.update(id, { creditScore });
    return { message: '信用分已更新' };
  }

  // 灵豆余额调整
  async updateBeanBalance(id: number, amount: number, remark?: string) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new BadRequestException('用户不存在');

    const newBalance = (user.beanBalance || 0) + amount;
    if (newBalance < 0) throw new BadRequestException('余额不足，调整后余额不能为负');

    await this.userRepo.update(id, { beanBalance: newBalance });

    await this.beanTxRepo.save(
      this.beanTxRepo.create({
        userId: id,
        type: amount > 0 ? 'admin_add' : 'admin_deduct',
        amount: Math.abs(amount),
        refType: 'admin',
        remark: remark || (amount > 0 ? '管理员充值' : '管理员扣减'),
      }),
    );

    return { message: '灵豆余额已更新', newBalance };
  }

  // 关键词黑名单
  async keywordList() {
    return this.keywordRepo.find({ order: { createdAt: 'DESC' } });
  }

  async addKeyword(word: string) {
    const exists = await this.keywordRepo.findOne({ where: { word } });
    if (exists) return { message: '关键词已存在' };
    await this.keywordRepo.save(this.keywordRepo.create({ word }));
    return { message: '已添加' };
  }

  async deleteKeyword(id: number) {
    await this.keywordRepo.delete(id);
    return { message: '已删除' };
  }

  // 公告管理
  async noticeList() {
    return this.noticeRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createNotice(dto: any) {
    return this.noticeRepo.save(this.noticeRepo.create(dto));
  }

  async updateNotice(id: number, dto: any) {
    await this.noticeRepo.update(id, dto);
    return { message: '已更新' };
  }

  async deleteNotice(id: number) {
    await this.noticeRepo.delete(id);
    return { message: '已删除' };
  }

  // 系统配置
  async configList() {
    const configs = await this.configRepo.find({
      order: { group: 'ASC', key: 'ASC' },
    });
    const defaultCommission = configs.find(
      (item) => item.key === 'default_commission_rate',
    );
    const platformFee = configs.find(
      (item) => item.key === 'platform_fee_rate',
    );
    if (
      defaultCommission &&
      platformFee &&
      defaultCommission.value !== platformFee.value
    ) {
      platformFee.value = defaultCommission.value;
    }
    return configs;
  }

  async updateConfig(key: string, value: string) {
    const syncKeys = ['default_commission_rate', 'platform_fee_rate'].includes(
      key,
    )
      ? ['default_commission_rate', 'platform_fee_rate']
      : [key];

    for (const syncKey of syncKeys) {
      const existing = await this.configRepo.findOne({
        where: { key: syncKey },
      });
      if (existing) {
        await this.configRepo.update(existing.id, { value });
      } else {
        await this.configRepo.save(
          this.configRepo.create({ key: syncKey, value }),
        );
      }
    }
    return { message: '已更新' };
  }

  // 用户详情
  async userDetail(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) return null;
    const posts = await this.postRepo.count({ where: { userId: id } });
    const jobs = await this.jobRepo.count({ where: { userId: id } });
    const entCert = await this.entCertRepo.findOneBy({ userId: id });
    const workerCert = await this.workerCertRepo.findOneBy({ userId: id });
    return { user, postCount: posts, jobCount: jobs, entCert, workerCert };
  }

  // 数据统计
  async statsOverview() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today.getTime() - 7 * 86400000);
    const month = new Date(today.getTime() - 30 * 86400000);

    const [totalUsers, todayUsers, weekUsers, monthUsers] = await Promise.all([
      this.userRepo.count(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :d', { d: today })
        .getCount(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :d', { d: week })
        .getCount(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :d', { d: month })
        .getCount(),
    ]);

    const [
      totalPosts,
      pendingPosts,
      totalJobs,
      totalExposures,
      totalReports,
      pendingReports,
    ] = await Promise.all([
      this.postRepo.count(),
      this.postRepo.count({ where: { status: 'pending' as any } }),
      this.jobRepo.count(),
      this.exposureRepo.count(),
      this.reportRepo.count(),
      this.reportRepo.count({ where: { status: 'pending' as any } }),
    ]);

    const pendingEntCerts = await this.entCertRepo.count({
      where: { status: 'pending' as any },
    });
    const pendingWorkerCerts = await this.workerCertRepo.count({
      where: { status: 'pending' as any },
    });

    return {
      users: {
        total: totalUsers,
        today: todayUsers,
        week: weekUsers,
        month: monthUsers,
      },
      posts: { total: totalPosts, pending: pendingPosts },
      jobs: { total: totalJobs },
      exposures: { total: totalExposures },
      reports: { total: totalReports, pending: pendingReports },
      certs: {
        pendingEnterprise: pendingEntCerts,
        pendingWorker: pendingWorkerCerts,
      },
    };
  }

  async pendingCounts() {
    const [
      pendingPosts,
      pendingReports,
      pendingEntCerts,
      pendingWorkerCerts,
      pendingExposures,
      pendingJobs,
    ] = await Promise.all([
      this.postRepo.count({ where: { status: 'pending' as any } }),
      this.reportRepo.count({ where: { status: 'pending' as any } }),
      this.entCertRepo.count({ where: { status: 'pending' as any } }),
      this.workerCertRepo.count({ where: { status: 'pending' as any } }),
      this.exposureRepo.count({ where: { status: 'pending' as any } }),
      this.jobRepo.count({ where: { status: 'pending' as any } }),
    ]);

    return {
      posts: pendingPosts,
      reports: pendingReports,
      certs: pendingEntCerts + pendingWorkerCerts,
      exposures: pendingExposures,
      jobs: pendingJobs,
    };
  }

  // 管理员账号管理
  async adminList() {
    return this.adminRepo.find({
      order: { createdAt: 'DESC' },
      select: ['id', 'username', 'nickname', 'role', 'isActive', 'createdAt'],
    });
  }

  async createAdmin(dto: any) {
    const exists = await this.adminRepo.findOne({
      where: { username: dto.username },
    });
    if (exists) return { message: '用户名已存在' };
    await this.adminRepo.save(
      this.adminRepo.create({
        username: dto.username,
        password: hashPwd(dto.password || '123456'),
        nickname: dto.nickname || dto.username,
        role: dto.role || 'admin',
      }),
    );
    return { message: '已创建' };
  }

  async toggleAdmin(id: number) {
    const admin = await this.adminRepo.findOneBy({ id });
    if (!admin) return { message: '不存在' };
    if (admin.role === 'super') return { message: '不能禁用超级管理员' };
    await this.adminRepo.update(id, { isActive: admin.isActive ? 0 : 1 });
    return { message: admin.isActive ? '已禁用' : '已启用' };
  }

  async resetAdminPwd(id: number) {
    await this.adminRepo.update(id, { password: hashPwd('123456') });
    return { message: '密码已重置为123456' };
  }

  // 工种管理
  async jobTypeList() {
    return this.jobTypeRepo.find({ order: { sort: 'ASC', createdAt: 'DESC' } });
  }

  async addJobType(
    name: string,
    defaultSettlement?: string,
    sort?: number,
    iconUrl?: string,
  ) {
    const exists = await this.jobTypeRepo.findOne({ where: { name } });
    if (exists) return { message: '工种已存在' };
    await this.jobTypeRepo.save(
      this.jobTypeRepo.create({
        name,
        defaultSettlement: defaultSettlement || 'hourly',
        sort: sort ?? 0,
        ...(iconUrl ? { iconUrl } : {}),
      }),
    );
    return { message: '已添加' };
  }

  async updateJobType(id: number, dto: any) {
    const jt = await this.jobTypeRepo.findOneBy({ id });
    if (!jt) return { message: '不存在' };
    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.sort !== undefined) update.sort = Number(dto.sort);
    if (dto.iconUrl !== undefined) update.iconUrl = dto.iconUrl || null;
    if (dto.defaultSettlement !== undefined)
      update.defaultSettlement = dto.defaultSettlement;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (Object.keys(update).length === 0) return { message: '无修改' };
    await this.jobTypeRepo.update(id, update);
    return { message: '已更新' };
  }

  async toggleJobType(id: number) {
    const jt = await this.jobTypeRepo.findOneBy({ id });
    if (!jt) return { message: '不存在' };
    await this.jobTypeRepo.update(id, { isActive: jt.isActive ? 0 : 1 });
    return { message: jt.isActive ? '已禁用' : '已启用' };
  }

  // 开放城市管理
  async cityList() {
    return this.cityRepo.find({ order: { createdAt: 'DESC' } });
  }

  async addCity(name: string) {
    const exists = await this.cityRepo.findOne({ where: { name } });
    if (exists) return { message: '城市已存在' };
    await this.cityRepo.save(this.cityRepo.create({ name }));
    return { message: '已添加' };
  }

  async toggleCity(id: number) {
    const c = await this.cityRepo.findOneBy({ id });
    if (!c) return { message: '不存在' };
    await this.cityRepo.update(id, { isActive: c.isActive ? 0 : 1 });
    return { message: c.isActive ? '已禁用' : '已启用' };
  }

  // 广告管理
  async adList(query: any) {
    const { status, page = 1, pageSize = 20 } = query;
    const qb = this.adRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'u');
    if (status) qb.andWhere('a.status = :status', { status });
    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const nameMap = await this.buildUserDisplayNameMap(
      list.map((item) => item.userId),
    );
    return {
      list: list.map((item) => {
        const displayName = this.resolveDisplayName(
          nameMap,
          item.userId,
          item.user,
        );
        return {
          ...item,
          displayName,
          companyName: displayName || undefined,
        };
      }),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async createAd(dto: any) {
    const ad = this.adRepo.create({
      userId: dto.userId || 0,
      slot: dto.slot || 'banner',
      title: dto.title,
      imageUrl: dto.imageUrl,
      link: dto.link || null,
      linkType: dto.linkType || 'internal',
      durationDays: Number(dto.durationDays) || 30,
      price: Number(dto.price) || 0,
      status: 'active',
      startAt: new Date(),
      endAt: new Date(
        Date.now() + (Number(dto.durationDays) || 30) * 86400000,
      ),
    });
    await this.adRepo.save(ad);
    return { message: '广告已创建并上线' };
  }

  async updateAd(id: number, dto: any) {
    const ad = await this.adRepo.findOneBy({ id });
    if (!ad) return { message: '不存在' };
    const update: any = {};
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.imageUrl !== undefined) update.imageUrl = dto.imageUrl;
    if (dto.slot !== undefined) update.slot = dto.slot;
    if (dto.link !== undefined) update.link = dto.link || null;
    if (dto.linkType !== undefined) update.linkType = dto.linkType || 'internal';
    if (dto.durationDays !== undefined) {
      update.durationDays = Number(dto.durationDays);
      if (ad.startAt) {
        update.endAt = new Date(
          new Date(ad.startAt).getTime() + Number(dto.durationDays) * 86400000,
        );
      }
    }
    if (dto.price !== undefined) update.price = Number(dto.price);
    if (Object.keys(update).length === 0) return { message: '无修改' };
    await this.adRepo.update(id, update);
    return { message: '已更新' };
  }

  async auditAd(id: number, action: string) {
    if (action === 'approve') {
      const ad = await this.adRepo.findOneBy({ id });
      if (!ad) return { message: '不存在' };
      const now = new Date();
      const end = new Date(now.getTime() + ad.durationDays * 86400000);
      await this.adRepo.update(id, {
        status: 'active',
        startAt: now,
        endAt: end,
      });
    } else {
      await this.adRepo.update(id, { status: 'expired' });
    }
    return { message: action === 'approve' ? '已通过' : '已驳回' };
  }

  async takedownAd(id: number) {
    const ad = await this.adRepo.findOneBy({ id });
    if (!ad) return { message: '不存在' };
    await this.adRepo.update(id, { status: 'expired' });
    return { message: '已下架' };
  }

  // 品类标签管理
  async categoryList() {
    const all = await this.categoryRepo.find({
      order: { level: 'ASC', sort: 'ASC', id: 'ASC' },
    });
    const top = all.filter((c) => c.level === 1);
    return top.map((t) => ({
      ...t,
      children: all.filter((c) => c.parentId === t.id),
    }));
  }

  async addCategory(
    name: string,
    parentId: number,
    level: number,
    bizType?: string,
    iconUrl?: string,
  ) {
    const exists = await this.categoryRepo.findOne({
      where: { name, parentId },
    });
    if (exists) return { message: '分类已存在' };
    await this.categoryRepo.save(
      this.categoryRepo.create({
        name,
        parentId: parentId || 0,
        level: level || 1,
        ...(bizType ? { bizType } : {}),
        ...(iconUrl ? { iconUrl } : {}),
      }),
    );
    return { message: '已添加' };
  }

  async updateCategory(id: number, dto: any) {
    const c = await this.categoryRepo.findOneBy({ id });
    if (!c) return { message: '不存在' };
    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.sort !== undefined) update.sort = Number(dto.sort);
    if (dto.iconUrl !== undefined) update.iconUrl = dto.iconUrl || null;
    if (dto.bizType !== undefined) update.bizType = dto.bizType || null;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (Object.keys(update).length === 0) return { message: '无修改' };
    await this.categoryRepo.update(id, update);
    return { message: '已更新' };
  }

  async toggleCategory(id: number) {
    const c = await this.categoryRepo.findOneBy({ id });
    if (!c) return { message: '不存在' };
    await this.categoryRepo.update(id, { isActive: c.isActive ? 0 : 1 });
    return { message: c.isActive ? '已禁用' : '已启用' };
  }

  // 财务管理
  async financeOverview() {
    const [
      memberIncome,
      adIncome,
      beanIncome,
      commissionGross,
      commissionNet,
      managerServiceFeeExpense,
      withdrawTotal,
    ] = await Promise.all([
      this.memberOrderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.price),0)', 'total')
        .where('o.payStatus = :s', { s: 'paid' })
        .getRawOne(),
      this.adRepo
        .createQueryBuilder('a')
        .select('COALESCE(SUM(a.price),0)', 'total')
        .where('a.status != :s', { s: 'pending' })
        .getRawOne(),
      this.beanTxRepo
        .createQueryBuilder('b')
        .select('COALESCE(SUM(b.amount),0)', 'total')
        .where('b.type = :t', { t: 'recharge' })
        .getRawOne(),
      this.settlementRepo
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.platformFee + s.supervisorFee),0)', 'total')
        .where('s.status IN (:...st)', {
          st: ['paid', 'distributed', 'completed'],
        })
        .getRawOne(),
      this.settlementRepo
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.platformFee),0)', 'total')
        .where('s.status IN (:...st)', {
          st: ['paid', 'distributed', 'completed'],
        })
        .getRawOne(),
      this.settlementRepo
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.supervisorFee),0)', 'total')
        .where('s.status IN (:...st)', {
          st: ['paid', 'distributed', 'completed'],
        })
        .getRawOne(),
      this.walletTxRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount),0)', 'total')
        .where('w.type = :t AND w.status = :s', {
          t: 'withdraw',
          s: 'success',
        })
        .getRawOne(),
    ]);
    return {
      income: {
        member: +memberIncome.total,
        ad: +adIncome.total,
        bean: +beanIncome.total,
        commission: +commissionGross.total,
        commissionGross: +commissionGross.total,
        commissionNet: +commissionNet.total,
        total:
          +memberIncome.total +
          +adIncome.total +
          +beanIncome.total +
          +commissionGross.total,
      },
      expense: {
        managerServiceFee: +managerServiceFeeExpense.total,
        withdraw: +withdrawTotal.total,
        total: +managerServiceFeeExpense.total + +withdrawTotal.total,
      },
    };
  }

  async transactionList(query: any) {
    const { type, page = 1, pageSize = 20 } = query;
    const qb = this.walletTxRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'u')
      .orderBy('t.createdAt', 'DESC');
    if (type) qb.andWhere('t.type = :type', { type });
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const nameMap = await this.buildUserDisplayNameMap(
      list.map((item) => item.userId),
    );
    return {
      list: list.map((item) => ({
        ...item,
        displayName:
          nameMap.get(Number(item.userId)) ||
          item.user?.nickname ||
          item.user?.phone ||
          '已删除用户',
      })),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  // 用工订单管理
  async jobOrderList(query: any) {
    const { status, page = 1, pageSize = 20 } = query;
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.user', 'u')
      .orderBy('j.createdAt', 'DESC');
    if (status) qb.andWhere('j.status = :status', { status });
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const nameMap = await this.buildUserDisplayNameMap(
      list.map((item) => item.userId),
    );
    // 手动查报名数
    for (const job of list) {
      const cnt = await this.appRepo.count({ where: { jobId: job.id } });
      const companyName = this.resolveDisplayName(
        nameMap,
        job.userId,
        job.user,
      );
      (job as any).applyCount = cnt;
      (job as any).displayName = companyName || undefined;
      (job as any).companyName = companyName || undefined;
    }
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async jobOrderDetail(jobId: number) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
    if (!job) return { message: '不存在' };
    const applications = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'ASC' },
    });
    const nameMap = await this.buildUserDisplayNameMap([
      job.userId,
      ...applications.map((item) => item.workerId),
    ]);
    const companyName = this.resolveDisplayName(nameMap, job.userId, job.user);
    (job as any).displayName = companyName || undefined;
    (job as any).companyName = companyName || undefined;
    // 附加每个工人的完工次数
    const enriched: any[] = [];
    for (const app of applications) {
      const doneCount = await this.appRepo.count({
        where: { workerId: app.workerId, status: 'done' },
      });
      const workerDisplayName = this.resolveDisplayName(
        nameMap,
        app.workerId,
        app.worker,
      );
      enriched.push({
        ...app,
        worker: {
          ...app.worker,
          displayName: workerDisplayName || undefined,
          doneCount,
        },
      });
    }
    return { job, applications: enriched };
  }

  async assignWorkers(
    jobId: number,
    body: { workerIds: number[]; supervisorId: number },
  ) {
    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) return { message: '招工不存在' };

    const { workerIds, supervisorId } = body;

    // 选中的改为 accepted
    await this.appRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'accepted', isSupervisor: 0 })
      .where('jobId = :jobId AND workerId IN (:...ids)', {
        jobId,
        ids: workerIds,
      })
      .execute();

    // 未选中的改为 rejected
    await this.appRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'rejected' })
      .where('jobId = :jobId AND status = :s AND workerId NOT IN (:...ids)', {
        jobId,
        s: 'pending',
        ids: workerIds,
      })
      .execute();

    // 指定主管
    if (supervisorId) {
      await this.assignSupervisorForJob(jobId, supervisorId);
    }

    // Job 状态改为 assigned
    await this.jobRepo.update(jobId, { status: 'full' as any });
    return { message: '分配成功' };
  }

  async setJobSupervisor(jobId: number, body: { workerId: number }) {
    const target = await this.assignSupervisorForJob(jobId, body.workerId);
    return {
      message: '主管设置成功',
      workerId: target.workerId,
    };
  }

  async adjustManagerShare(jobId: number, managerShareRate: number) {
    const rate = Number(managerShareRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new BadRequestException('分成比例需在 0-100 之间');
    }

    const job = await this.jobRepo.findOneBy({ id: jobId });
    if (!job) throw new BadRequestException('招工不存在');

    const key = `job_manager_share_${jobId}`;
    const config = await this.configRepo.findOne({ where: { key } });
    if (config) {
      await this.configRepo.update(config.id, { value: String(rate) });
    } else {
      await this.configRepo.save(
        this.configRepo.create({
          key,
          value: String(rate),
          label: `招工${jobId}管理员分成比例`,
          group: 'job',
        }),
      );
    }

    return { message: '管理员分成比例已调整为 ' + rate + '%' };
  }

  async jobDashboard(query: any) {
    const date = query.date || new Date().toISOString().slice(0, 10);
    const dayStart = date + ' 00:00:00';
    const dayEnd = date + ' 23:59:59';

    const activeStatuses = ['recruiting', 'full', 'working', 'pending_settlement'];
    const workingAppStatuses = ['confirmed', 'working'];

    const [
      todayJobs,
      activeJobs,
      todayApplied,
      currentWorking,
      todaySettlements,
    ] = await Promise.all([
      this.jobRepo
        .createQueryBuilder('j')
        .select('COUNT(DISTINCT j.id)', 'jobCount')
        .addSelect('COUNT(DISTINCT j.userId)', 'entCount')
        .where('j.createdAt BETWEEN :s AND :e', { s: dayStart, e: dayEnd })
        .getRawOne(),
      this.jobRepo
        .createQueryBuilder('j')
        .select('COUNT(DISTINCT j.id)', 'jobCount')
        .addSelect('COUNT(DISTINCT j.userId)', 'entCount')
        .where('j.status IN (:...st)', { st: activeStatuses })
        .getRawOne(),
      this.appRepo
        .createQueryBuilder('a')
        .select('COUNT(*)', 'cnt')
        .where('a.createdAt BETWEEN :s AND :e', { s: dayStart, e: dayEnd })
        .getRawOne(),
      this.appRepo
        .createQueryBuilder('a')
        .select('COUNT(*)', 'cnt')
        .where('a.status IN (:...st)', { st: workingAppStatuses })
        .getRawOne(),
      this.settlementRepo
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.platformFee),0)', 'profit')
        .addSelect('COALESCE(SUM(s.supervisorFee),0)', 'supFee')
        .addSelect('COALESCE(SUM(s.workerTotal),0)', 'workerPay')
        .addSelect('COALESCE(SUM(s.factoryTotal),0)', 'factoryTotal')
        .where('s.createdAt BETWEEN :s AND :e', { s: dayStart, e: dayEnd })
        .andWhere('s.status IN (:...st)', { st: ['paid', 'distributed', 'completed'] })
        .getRawOne(),
    ]);

    // Enterprise-level aggregation for active jobs
    const entRows: any[] = await this.jobRepo
      .createQueryBuilder('j')
      .select('j.userId', 'userId')
      .addSelect('COUNT(DISTINCT j.id)', 'activeJobCount')
      .addSelect('COALESCE(SUM(j.needCount),0)', 'totalNeed')
      .where('j.status IN (:...st)', { st: activeStatuses })
      .groupBy('j.userId')
      .getRawMany();

    const entUserIds = entRows.map((r) => Number(r.userId));
    const nameMap = await this.buildUserDisplayNameMap(entUserIds);

    // Per-enterprise app counts + settlement totals
    const enterprises: any[] = [];
    for (const row of entRows) {
      const uid = Number(row.userId);
      const jobIds = await this.jobRepo
        .createQueryBuilder('j')
        .select('j.id')
        .where('j.userId = :uid AND j.status IN (:...st)', { uid, st: activeStatuses })
        .getMany();
      const jids = jobIds.map((j) => j.id);

      let totalApplied = 0;
      let totalWorking = 0;
      let totalSettled = 0;
      let totalUnpaid = 0;

      if (jids.length) {
        const appCounts = await this.appRepo
          .createQueryBuilder('a')
          .select('COUNT(*)', 'total')
          .addSelect(`SUM(CASE WHEN a.status IN ('confirmed','working') THEN 1 ELSE 0 END)`, 'working')
          .where('a.jobId IN (:...jids)', { jids })
          .getRawOne();
        totalApplied = +(appCounts.total || 0);
        totalWorking = +(appCounts.working || 0);

        const stlSums = await this.settlementRepo
          .createQueryBuilder('s')
          .select('COALESCE(SUM(s.factoryTotal),0)', 'settled')
          .addSelect(
            `COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.factoryTotal ELSE 0 END),0)`,
            'unpaid',
          )
          .where('s.jobId IN (:...jids)', { jids })
          .getRawOne();
        totalSettled = +(stlSums.settled || 0);
        totalUnpaid = +(stlSums.unpaid || 0);
      }

      enterprises.push({
        userId: uid,
        companyName: nameMap.get(uid) || '企业' + uid,
        activeJobCount: +row.activeJobCount,
        totalNeed: +row.totalNeed,
        totalApplied,
        totalWorking,
        totalSettled,
        totalUnpaid,
      });
    }

    return {
      date,
      todayJobCount: +(todayJobs.jobCount || 0),
      todayEnterpriseCount: +(todayJobs.entCount || 0),
      activeJobCount: +(activeJobs.jobCount || 0),
      activeEnterpriseCount: +(activeJobs.entCount || 0),
      totalWorkerApplied: +(todayApplied.cnt || 0),
      totalWorkerWorking: +(currentWorking.cnt || 0),
      todayProfit: +(todaySettlements.profit || 0),
      todaySupervisorFee: +(todaySettlements.supFee || 0),
      todayWorkerPay: +(todaySettlements.workerPay || 0),
      todayFactoryTotal: +(todaySettlements.factoryTotal || 0),
      enterprises,
    };
  }

  async jobDashboardDetail(jobId: number) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
    if (!job) throw new BadRequestException('招工不存在');

    const applications = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'ASC' },
    });

    const nameMap = await this.buildUserDisplayNameMap([
      job.userId,
      ...applications.map((a) => a.workerId),
    ]);
    const companyName = this.resolveDisplayName(nameMap, job.userId, job.user);

    const summary = {
      applied: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      confirmed: applications.filter((a) => a.status === 'confirmed').length,
      working: applications.filter((a) => a.status === 'working').length,
      done: applications.filter((a) => a.status === 'done').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
      cancelled: applications.filter((a) => a.status === 'cancelled').length,
    };

    // Settlement data
    const settlement = await this.settlementRepo.findOne({ where: { jobId } });
    const settlementItems = settlement
      ? await this.settlementItemRepo.find({ where: { settlementId: settlement.id } })
      : [];
    const itemMap = new Map(settlementItems.map((si) => [Number(si.workerId), si]));

    // Work logs for hours/pieces
    const workLogs = await this.workLogRepo.find({ where: { jobId } });
    const logMap = new Map<number, { hours: number; pieces: number; days: number }>();
    for (const log of workLogs) {
      const wid = Number(log.workerId);
      const cur = logMap.get(wid) || { hours: 0, pieces: 0, days: 0 };
      cur.hours += +(log.hours || 0);
      cur.pieces += +(log.pieces || 0);
      cur.days += 1;
      logMap.set(wid, cur);
    }

    const workers = applications.map((a) => {
      const wid = Number(a.workerId);
      const w = a.worker || ({} as any);
      const si = itemMap.get(wid);
      const wl = logMap.get(wid);
      return {
        workerId: wid,
        name: this.resolveDisplayName(nameMap, wid, w),
        phone: w.phone || '',
        status: a.status,
        isSupervisor: !!(a.isSupervisor),
        totalHours: si ? +(si.hours || 0) : wl ? wl.hours : 0,
        totalPieces: wl ? wl.pieces : 0,
        workerPay: si ? +(si.workerPay || 0) : 0,
        checkInCount: wl ? wl.days : 0,
      };
    });

    const finance = settlement
      ? {
          factoryTotal: +(settlement.factoryTotal || 0),
          workerTotal: +(settlement.workerTotal || 0),
          supervisorFee: +(settlement.supervisorFee || 0),
          platformFee: +(settlement.platformFee || 0),
          commissionRate: +(settlement.commissionRate || 0),
          paymentStatus: settlement.status,
        }
      : {
          factoryTotal: 0,
          workerTotal: 0,
          supervisorFee: 0,
          platformFee: 0,
          commissionRate: 0,
          paymentStatus: 'none',
        };

    // Attendance photos
    const sheets = await this.attendanceSheetRepo.find({ where: { jobId } });
    const photos: string[] = [];
    for (const sheet of sheets) {
      const urls = sheet.photoUrls;
      if (Array.isArray(urls)) photos.push(...urls);
      else if (typeof urls === 'string') {
        try { photos.push(...JSON.parse(urls)); } catch { /* skip */ }
      }
    }

    return {
      job: {
        id: job.id,
        title: job.title,
        jobType: job.jobType,
        status: job.status,
        needCount: job.needCount,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        dateStart: job.dateStart,
        dateEnd: job.dateEnd,
        workHours: job.workHours,
        location: job.location,
      },
      companyName,
      summary,
      workers,
      finance,
      photos,
    };
  }

  async financeDetail(query: any) {
    const date = query.date || new Date().toISOString().slice(0, 10);
    const dayStart = date + ' 00:00:00';
    const dayEnd = date + ' 23:59:59';

    // Membership today
    const memberToday = await this.memberOrderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.price),0)', 'total')
      .where('o.payStatus = :s AND o.paidAt BETWEEN :ds AND :de', { s: 'paid', ds: dayStart, de: dayEnd })
      .getRawOne();
    const memberOrders = await this.memberOrderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'u')
      .where('o.payStatus = :s AND o.paidAt BETWEEN :ds AND :de', { s: 'paid', ds: dayStart, de: dayEnd })
      .orderBy('o.paidAt', 'DESC')
      .getMany();
    const memberNameMap = await this.buildUserDisplayNameMap(memberOrders.map((o) => (o as any).userId));

    // Settlement aggregation today
    const stlToday = await this.settlementRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.factoryTotal),0)', 'factoryPaid')
      .addSelect('COALESCE(SUM(s.workerTotal),0)', 'workerPay')
      .addSelect('COALESCE(SUM(s.supervisorFee),0)', 'supFee')
      .addSelect('COALESCE(SUM(s.platformFee),0)', 'profit')
      .where('s.status IN (:...st) AND s.paidAt BETWEEN :ds AND :de', {
        st: ['paid', 'distributed', 'completed'],
        ds: dayStart,
        de: dayEnd,
      })
      .getRawOne();

    // Unpaid enterprises (settlements with status=pending)
    const unpaidStls = await this.settlementRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.job', 'j')
      .where('s.status = :st', { st: 'pending' })
      .getMany();

    const unpaidByEnt = new Map<number, { totalOwed: number; totalPaid: number; jobs: any[] }>();
    for (const stl of unpaidStls) {
      const eid = Number(stl.enterpriseId);
      const cur = unpaidByEnt.get(eid) || { totalOwed: 0, totalPaid: 0, jobs: [] };
      cur.totalOwed += +(stl.factoryTotal || 0);
      cur.jobs.push({
        jobId: stl.jobId,
        title: stl.job?.title || '',
        factoryTotal: +(stl.factoryTotal || 0),
        status: stl.status,
      });
      unpaidByEnt.set(eid, cur);
    }
    const unpaidEntIds = Array.from(unpaidByEnt.keys());
    const unpaidNameMap = await this.buildUserDisplayNameMap(unpaidEntIds);
    const unpaidEnterprises = unpaidEntIds.map((uid) => {
      const data = unpaidByEnt.get(uid)!;
      return {
        userId: uid,
        companyName: unpaidNameMap.get(uid) || '企业' + uid,
        totalOwed: data.totalOwed,
        totalPaid: data.totalPaid,
        remaining: data.totalOwed - data.totalPaid,
        jobs: data.jobs,
      };
    });

    // Worker pay details (from all paid settlements)
    const paidItems = await this.settlementItemRepo
      .createQueryBuilder('si')
      .innerJoin('si.settlement', 's')
      .innerJoin('s.job', 'j')
      .addSelect(['s.id', 's.status', 'j.id', 'j.title'])
      .where('s.status IN (:...st)', { st: ['paid', 'distributed', 'completed'] })
      .getMany();
    const workerAgg = new Map<number, { totalPay: number; jobs: any[] }>();
    for (const item of paidItems) {
      const wid = Number(item.workerId);
      const cur = workerAgg.get(wid) || { totalPay: 0, jobs: [] };
      cur.totalPay += +(item.workerPay || 0);
      cur.jobs.push({
        jobId: (item as any).settlement?.job?.id || 0,
        title: (item as any).settlement?.job?.title || '',
        hours: +(item.hours || 0),
        pay: +(item.workerPay || 0),
      });
      workerAgg.set(wid, cur);
    }
    const workerIds = Array.from(workerAgg.keys());
    const workerNameMap = await this.buildUserDisplayNameMap(workerIds);
    const workerPayDetails = workerIds.map((wid) => {
      const data = workerAgg.get(wid)!;
      return {
        workerId: wid,
        name: workerNameMap.get(wid) || '工人' + wid,
        phone: '',
        totalPay: data.totalPay,
        jobs: data.jobs,
      };
    });

    // Settlement orders list
    const allSettlements = await this.settlementRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.job', 'j')
      .orderBy('s.createdAt', 'DESC')
      .limit(100)
      .getMany();
    const stlEntIds = allSettlements.map((s) => Number(s.enterpriseId));
    const stlNameMap = await this.buildUserDisplayNameMap(stlEntIds);
    const settlementOrders = allSettlements.map((s) => ({
      jobId: s.jobId,
      title: s.job?.title || '',
      companyName: stlNameMap.get(Number(s.enterpriseId)) || '',
      factoryTotal: +(s.factoryTotal || 0),
      workerTotal: +(s.workerTotal || 0),
      supervisorFee: +(s.supervisorFee || 0),
      platformFee: +(s.platformFee || 0),
      status: s.status,
    }));

    return {
      date,
      membership: {
        todayAmount: +(memberToday.total || 0),
        recentOrders: memberOrders.map((o: any) => ({
          userId: o.userId,
          name: memberNameMap.get(Number(o.userId)) || '',
          amount: +(o.price || 0),
          paidAt: o.paidAt,
        })),
      },
      settlement: {
        todayFactoryPaid: +(stlToday.factoryPaid || 0),
        todayWorkerPay: +(stlToday.workerPay || 0),
        todaySupervisorFee: +(stlToday.supFee || 0),
        todayPlatformProfit: +(stlToday.profit || 0),
        unpaidEnterprises,
        workerPayDetails,
        settlementOrders,
      },
    };
  }

  async initDefaultConfigs() {
    const defaults = [
      {
        key: 'member_monthly_price',
        value: '99',
        label: '月会员价格(元)',
        group: 'member',
      },
      {
        key: 'member_quarterly_price',
        value: '238',
        label: '季度会员价格(元)',
        group: 'member',
      },
      {
        key: 'member_yearly_price',
        value: '799',
        label: '年会员价格(元)',
        group: 'member',
      },
      {
        key: 'view_contact_price',
        value: '5',
        label: '查看联系方式价格(灵豆)',
        group: 'price',
      },
      {
        key: 'top_price_per_day',
        value: '100',
        label: '置顶推广价格(灵豆/天)',
        group: 'price',
      },
      {
        key: 'top_price_3d',
        value: '250',
        label: '置顶推广价格(灵豆/3天)',
        group: 'price',
      },
      {
        key: 'top_price_7d',
        value: '500',
        label: '置顶推广价格(灵豆/7天)',
        group: 'price',
      },
      {
        key: 'top_price_30d',
        value: '1500',
        label: '置顶推广价格(灵豆/30天)',
        group: 'price',
      },
      {
        key: 'banner_ad_price',
        value: '100',
        label: 'Banner广告价格(元/天)',
        group: 'price',
      },
      {
        key: 'feed_ad_price',
        value: '50',
        label: '信息流广告价格(元/天)',
        group: 'price',
      },
      {
        key: 'default_commission_rate',
        value: '20',
        label: '默认用工抽成比例(%)',
        group: 'work',
      },
      {
        key: 'platform_fee_rate',
        value: '20',
        label: '平台服务费比例(%)',
        group: 'work',
      },
      {
        key: 'manager_service_fee',
        value: '5',
        label: '管理员服务费(元/人/时)',
        group: 'work',
      },
      {
        key: 'over_apply_rate',
        value: '50',
        label: '超额报名比例(%)',
        group: 'work',
      },
      {
        key: 'attendance_remind_hours',
        value: '2',
        label: '出勤确认提醒(开工前N小时)',
        group: 'work',
      },
      {
        key: 'attendance_deadline_hours',
        value: '1',
        label: '出勤确认截止(开工前N小时)',
        group: 'work',
      },
      {
        key: 'new_user_free_views',
        value: '3',
        label: '新用户免费查看次数',
        group: 'user',
      },
      {
        key: 'view_expire_days',
        value: '30',
        label: '查看机会有效期(天)',
        group: 'user',
      },
      {
        key: 'initial_credit_score',
        value: '100',
        label: '初始信用分',
        group: 'user',
      },
      {
        key: 'manager_min_orders',
        value: '20',
        label: '管理员资格-最低接单数',
        group: 'user',
      },
      {
        key: 'manager_min_credit',
        value: '90',
        label: '管理员资格-最低信用分',
        group: 'user',
      },
      {
        key: 'post_expire_days',
        value: '30',
        label: '信息默认有效期(天)',
        group: 'info',
      },
      {
        key: 'audit_mode',
        value: 'manual',
        label: '审核模式(auto/manual)',
        group: 'info',
      },
      {
        key: 'member_expire_remind_days',
        value: '7',
        label: '会员到期提醒(提前N天)',
        group: 'other',
      },
      {
        key: 'view_expire_remind_days',
        value: '3',
        label: '查看机会过期提醒(提前N天)',
        group: 'other',
      },
      {
        key: 'exposure_category_false_info_label',
        value: '维权经历',
        label: '维权分类-维权经历',
        group: 'exposure',
      },
      {
        key: 'exposure_category_fraud_label',
        value: '协商过程',
        label: '维权分类-协商过程',
        group: 'exposure',
      },
      {
        key: 'exposure_category_wage_theft_label',
        value: '结果反馈',
        label: '维权分类-结果反馈',
        group: 'exposure',
      },
      {
        key: 'user_agreement_content',
        value: '<h2 style="text-align:center;">小灵通平台用户服务协议</h2><p style="text-align:center;color:#94A3B8;font-size:12px;">更新日期：2026年1月1日 · 生效日期：2026年1月1日</p><h3>一、总则</h3><p>1.1 欢迎您使用小灵通平台（以下简称"本平台"）。本协议是您与小灵通平台运营方之间关于使用本平台服务所订立的协议。</p><p>1.2 您在使用本平台服务前，应当仔细阅读本协议。如您不同意本协议的任何条款，请勿注册或使用本平台服务。</p><h3>二、账号注册与管理</h3><p>2.1 用户需通过微信授权登录注册账号，并选择企业用户或临工用户身份。</p><p>2.2 用户应提供真实、准确的注册信息，并及时更新。因信息不实导致的后果由用户自行承担。</p><p>2.3 用户账号仅限本人使用，不得转让、借用或出售。</p><h3>三、服务内容</h3><p>3.1 本平台为企业用户提供采购需求发布、工厂库存展示、代加工对接、临工招聘等服务。</p><p>3.2 本平台为临工用户提供岗位浏览、报名应聘、打卡出勤、工资结算等服务。</p><p>3.3 平台提供灵豆虚拟货币系统，用于信息查看、推广置顶等增值服务。</p><h3>四、用户行为规范</h3><p>4.1 用户不得发布虚假信息、恶意刷单、诱导线下交易等违规行为。</p><p>4.2 企业用户应按时支付临工工资，不得拖欠或克扣。</p><p>4.3 临工用户应按时到岗，遵守工作纪律，不得无故旷工。</p><h3>五、费用与结算</h3><p>5.1 平台对企业用户收取服务费，具体费率以页面展示为准。</p><p>5.2 临工工资由企业通过平台支付，平台扣除服务费后发放至临工钱包。</p><p>5.3 临工可随时将钱包余额提现至微信零钱。</p><h3>六、免责声明</h3><p>6.1 本平台仅提供信息对接服务，不对用户间的交易行为承担担保责任。</p><p>6.2 因不可抗力导致的服务中断，本平台不承担责任。</p>',
        label: '用户协议内容',
        group: 'agreement',
      },
      {
        key: 'privacy_policy_content',
        value: '<h2 style="text-align:center;">小灵通平台隐私保护政策</h2><p style="text-align:center;color:#94A3B8;font-size:12px;">更新日期：2026年1月1日 · 生效日期：2026年1月1日</p><h3>一、信息收集</h3><p>1.1 我们会收集您在注册、认证过程中提供的个人信息，包括但不限于：微信昵称、手机号码、真实姓名、身份证号码。</p><p>1.2 企业用户还需提供：企业名称、统一社会信用代码、营业执照照片、法人身份信息。</p><p>1.3 在使用签到功能时，我们会获取您的地理位置信息，仅用于工作签到验证。</p><h3>二、信息使用</h3><p>2.1 为您提供平台核心服务（信息发布、岗位匹配、工资结算等）。</p><p>2.2 用于身份验证和实名认证。</p><p>2.3 用于平台安全风控和信用评估。</p><p>2.4 向您发送服务通知（报名结果、出勤提醒、工资到账等）。</p><h3>三、信息存储与保护</h3><p>3.1 您的个人信息存储在中国境内的安全服务器上。</p><p>3.2 我们采用加密技术保护您的敏感信息（身份证号、银行卡号等）。</p><p>3.3 我们会定期审查信息安全措施，防止信息泄露、损毁或丢失。</p><h3>四、信息共享</h3><p>4.1 未经您的同意，我们不会向第三方共享您的个人信息，以下情况除外：</p><p>· 为完成交易需向交易对方展示必要信息（如企业名称、联系方式）</p><p>· 根据法律法规要求或政府主管部门的要求</p><p>· 为保护平台及其他用户的合法权益</p><h3>五、您的权利</h3><p>5.1 您有权查看、修改您的个人信息。</p><p>5.2 您有权注销账号，注销后我们将删除您的个人信息。</p><p>5.3 如有隐私相关问题，请通过平台客服联系我们。</p>',
        label: '隐私政策内容',
        group: 'agreement',
      },
      {
        key: 'rights_agreement_content',
        value: '<h2 style="text-align:center;">小灵通平台维权协议</h2><p style="text-align:center;color:#94A3B8;font-size:12px;">更新日期：2026年1月1日 · 生效日期：2026年1月1日</p><h3>一、维权范围</h3><p>1.1 本协议适用于通过小灵通平台发生的用工纠纷、工资争议等维权事项。</p><p>1.2 平台提供维权信息发布渠道，协助双方沟通协商。</p><h3>二、维权流程</h3><p>2.1 用户可在维权专区发布维权信息，描述纠纷经过及诉求。</p><p>2.2 平台将对维权信息进行审核，确保内容真实合规。</p><p>2.3 平台可协助双方进行调解，但不承担仲裁义务。</p><h3>三、注意事项</h3><p>3.1 发布维权信息需实事求是，不得捏造虚假信息。</p><p>3.2 涉及法律纠纷的，建议通过劳动仲裁或法律途径解决。</p><p>3.3 平台保留对恶意发布不实维权信息的用户进行处理的权利。</p>',
        label: '维权协议内容',
        group: 'agreement',
      },
    ];
    for (const d of defaults) {
      const exists = await this.configRepo.findOne({ where: { key: d.key } });
      if (!exists) await this.configRepo.save(this.configRepo.create(d));
    }
  }
}
