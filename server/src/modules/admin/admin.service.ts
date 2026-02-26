import { Injectable, UnauthorizedException } from '@nestjs/common';
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
import * as crypto from 'crypto';

function hashPwd(pwd: string): string {
  return crypto.createHash('sha256').update(pwd + '_xlt2026').digest('hex');
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Exposure) private exposureRepo: Repository<Exposure>,
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert) private workerCertRepo: Repository<WorkerCert>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(Notice) private noticeRepo: Repository<Notice>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    @InjectRepository(OpenCity) private cityRepo: Repository<OpenCity>,
    @InjectRepository(JobType) private jobTypeRepo: Repository<JobType>,
    private jwt: JwtService,
  ) {}

  async initSuperAdmin() {
    const exists = await this.adminRepo.findOne({ where: { username: 'admin' } });
    if (!exists) {
      await this.adminRepo.save(this.adminRepo.create({
        username: 'admin', password: hashPwd('admin123'), nickname: '超级管理员', role: 'super',
      }));
    }
  }

  async login(username: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { username } });
    if (!admin || admin.password !== hashPwd(password)) throw new UnauthorizedException('账号或密码错误');
    if (!admin.isActive) throw new UnauthorizedException('账号已禁用');
    const token = this.jwt.sign({ sub: admin.id, role: admin.role, isAdmin: true });
    return { token, admin: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role } };
  }

  // 数据统计
  async dashboard() {
    const [userCount, postCount, jobCount, exposureCount] = await Promise.all([
      this.userRepo.count(),
      this.postRepo.count({ where: { status: 'active' as any } }),
      this.jobRepo.count(),
      this.exposureRepo.count(),
    ]);
    const enterpriseCount = await this.userRepo.count({ where: { role: 'enterprise' } });
    const workerCount = await this.userRepo.count({ where: { role: 'worker' } });
    return { userCount, enterpriseCount, workerCount, postCount, jobCount, exposureCount };
  }

  // 用户管理
  async userList(query: any) {
    const { role, keyword, page = 1, pageSize = 20 } = query;
    const qb = this.userRepo.createQueryBuilder('u');
    if (role) qb.andWhere('u.role = :role', { role });
    if (keyword) qb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw)', { kw: `%${keyword}%` });
    qb.orderBy('u.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
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
    const qb = this.postRepo.createQueryBuilder('p').leftJoinAndSelect('p.user', 'u');
    if (type) qb.andWhere('p.type = :type', { type });
    if (status) qb.andWhere('p.status = :status', { status });
    qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
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
    const qb = this.jobRepo.createQueryBuilder('j').leftJoinAndSelect('j.user', 'u');
    qb.orderBy('j.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  // 曝光管理
  async exposureList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.exposureRepo.createQueryBuilder('e');
    qb.orderBy('e.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async deleteExposure(id: number) {
    await this.exposureRepo.delete(id);
    return { message: '已删除' };
  }

  // 举报管理
  async reportList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.reportRepo.createQueryBuilder('r');
    qb.orderBy('r.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
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
      const qb = this.workerCertRepo.createQueryBuilder('c').leftJoinAndSelect('c.user', 'u');
      if (status) qb.andWhere('c.status = :status', { status });
      qb.orderBy('c.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
      const [list, total] = await qb.getManyAndCount();
      return { list, total, page: +page, pageSize: +pageSize };
    }
    const qb = this.entCertRepo.createQueryBuilder('c').leftJoinAndSelect('c.user', 'u');
    if (status) qb.andWhere('c.status = :status', { status });
    qb.orderBy('c.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async auditCert(type: string, id: number, action: string, rejectReason?: string) {
    const repo = type === 'worker' ? this.workerCertRepo : this.entCertRepo;
    const update: any = { status: action === 'approve' ? 'approved' : 'rejected', reviewedAt: new Date() };
    if (action === 'reject' && rejectReason) update.rejectReason = rejectReason;
    await repo.update(id, update);
    return { message: action === 'approve' ? '已通过' : '已驳回' };
  }

  // 用户信用分调整
  async updateUserCredit(id: number, creditScore: number) {
    await this.userRepo.update(id, { creditScore });
    return { message: '信用分已更新' };
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
    return this.configRepo.find({ order: { group: 'ASC', key: 'ASC' } });
  }

  async updateConfig(key: string, value: string) {
    const existing = await this.configRepo.findOne({ where: { key } });
    if (existing) {
      await this.configRepo.update(existing.id, { value });
    } else {
      await this.configRepo.save(this.configRepo.create({ key, value }));
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
      this.userRepo.createQueryBuilder('u').where('u.createdAt >= :d', { d: today }).getCount(),
      this.userRepo.createQueryBuilder('u').where('u.createdAt >= :d', { d: week }).getCount(),
      this.userRepo.createQueryBuilder('u').where('u.createdAt >= :d', { d: month }).getCount(),
    ]);

    const [totalPosts, pendingPosts, totalJobs, totalExposures, totalReports, pendingReports] = await Promise.all([
      this.postRepo.count(),
      this.postRepo.count({ where: { status: 'pending' as any } }),
      this.jobRepo.count(),
      this.exposureRepo.count(),
      this.reportRepo.count(),
      this.reportRepo.count({ where: { status: 'pending' as any } }),
    ]);

    const pendingEntCerts = await this.entCertRepo.count({ where: { status: 'pending' as any } });
    const pendingWorkerCerts = await this.workerCertRepo.count({ where: { status: 'pending' as any } });

    return {
      users: { total: totalUsers, today: todayUsers, week: weekUsers, month: monthUsers },
      posts: { total: totalPosts, pending: pendingPosts },
      jobs: { total: totalJobs },
      exposures: { total: totalExposures },
      reports: { total: totalReports, pending: pendingReports },
      certs: { pendingEnterprise: pendingEntCerts, pendingWorker: pendingWorkerCerts },
    };
  }

  // 管理员账号管理
  async adminList() {
    return this.adminRepo.find({ order: { createdAt: 'DESC' }, select: ['id', 'username', 'nickname', 'role', 'isActive', 'createdAt'] });
  }

  async createAdmin(dto: any) {
    const exists = await this.adminRepo.findOne({ where: { username: dto.username } });
    if (exists) return { message: '用户名已存在' };
    await this.adminRepo.save(this.adminRepo.create({
      username: dto.username, password: hashPwd(dto.password || '123456'), nickname: dto.nickname || dto.username, role: dto.role || 'admin',
    }));
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
    return this.jobTypeRepo.find({ order: { createdAt: 'DESC' } });
  }

  async addJobType(name: string, defaultSettlement?: string) {
    const exists = await this.jobTypeRepo.findOne({ where: { name } });
    if (exists) return { message: '工种已存在' };
    await this.jobTypeRepo.save(this.jobTypeRepo.create({ name, defaultSettlement: defaultSettlement || 'hourly' }));
    return { message: '已添加' };
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

  async initDefaultConfigs() {
    const defaults = [
      { key: 'member_monthly_price', value: '30', label: '月会员价格(元)', group: 'price' },
      { key: 'member_yearly_price', value: '298', label: '年会员价格(元)', group: 'price' },
      { key: 'view_contact_price', value: '5', label: '查看联系方式价格(灵豆)', group: 'price' },
      { key: 'top_price_per_day', value: '10', label: '置顶价格(灵豆/天)', group: 'price' },
      { key: 'default_commission_rate', value: '20', label: '默认用工抽成比例(%)', group: 'work' },
      { key: 'platform_fee_rate', value: '5', label: '平台服务费比例(%)', group: 'work' },
      { key: 'new_user_free_views', value: '3', label: '新用户免费查看次数', group: 'user' },
      { key: 'initial_credit_score', value: '100', label: '初始信用分', group: 'user' },
      { key: 'post_expire_days', value: '30', label: '信息默认有效期(天)', group: 'info' },
      { key: 'audit_mode', value: 'manual', label: '审核模式(auto/manual)', group: 'info' },
    ];
    for (const d of defaults) {
      const exists = await this.configRepo.findOne({ where: { key: d.key } });
      if (!exists) await this.configRepo.save(this.configRepo.create(d));
    }
  }
}
