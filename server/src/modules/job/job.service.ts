import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(Notification) private notiRepo: Repository<Notification>,
    @InjectRepository(SysConfig) private sysConfigRepo: Repository<SysConfig>,
  ) {}

  private async getEnterpriseCompanyName(userId: number, fallback = '企业用户') {
    const cert = await this.entCertRepo.findOne({
      where: { userId, status: 'approved' },
      order: { id: 'DESC' },
    });
    return cert?.companyName || fallback;
  }

  private async checkKeywords(text: string) {
    const keywords = await this.keywordRepo.find();
    for (const kw of keywords) {
      if (text.includes(kw.word)) {
        throw new BadRequestException(`内容包含违禁词: ${kw.word}`);
      }
    }
  }

  private normalizeText(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private parseCoordinate(value: any): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }

  private parseSalaryType(value: any): 'hourly' | 'piece' {
    const text = this.normalizeText(value);
    if (!text) return 'hourly';
    if (text === 'piece' || text.includes('按件')) return 'piece';
    return 'hourly';
  }

  private normalizeBenefits(value: any) {
    if (!Array.isArray(value)) return undefined;
    const normalized = value
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === 'string') return { label: item, color: 'green' };
        if (item.label) return item;
        return null;
      })
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  private normalizeImages(value: any) {
    if (!Array.isArray(value)) return undefined;
    const normalized = value.filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  // 提取地级市+区县
  private extractCityDistrict(fullAddress: string): string {
    if (!fullAddress) return '';
    // 匹配模式：省份 + 地级市 + 区县
    // 例如：广东省东莞市长安镇 -> 东莞·长安
    const match = fullAddress.match(/(?:.*?[省市])?([^省]+?[市州盟])([^市县区]+?[县区镇乡])/);
    if (match) {
      const city = match[1].replace(/市$/, '');
      const district = match[2].replace(/[县区镇乡]$/, '');
      return `${city}·${district}`;
    }
    // 如果匹配失败，尝试简单提取
    const simpleMatch = fullAddress.match(/([^省]+?[市州盟])([^市]+)/);
    if (simpleMatch) {
      return simpleMatch[1].replace(/市$/, '') + '·' + simpleMatch[2].substring(0, 4);
    }
    return fullAddress.substring(0, 20);
  }

  private normalizeCreateDto(dto: any) {
    const salary = Number(dto.salary || dto.price || 0);
    const needCount = Number(dto.needCount || dto.headcount || dto.need || 0);
    const salaryType = this.parseSalaryType(dto.salaryType || dto.salaryMode);
    const salaryUnit = this.normalizeText(dto.salaryUnit) || (salaryType === 'hourly' ? '元/时' : '元/件');
    const location = this.normalizeText(dto.location || dto.address);
    const lat = this.parseCoordinate(dto.lat ?? dto.latitude);
    const lng = this.parseCoordinate(dto.lng ?? dto.longitude);
    const dateStart = this.normalizeText(dto.dateStart || dto.startDate);
    const dateEnd = this.normalizeText(dto.dateEnd || dto.endDate);
    const startTime = this.normalizeText(dto.startTime);
    const endTime = this.normalizeText(dto.endTime);
    const workHours = this.normalizeText(dto.workHours) || (startTime && endTime ? `${startTime}-${endTime}` : '');

    return {
      title: this.normalizeText(dto.title || dto.jobType),
      salary,
      salaryType,
      salaryUnit,
      needCount,
      location,
      lat,
      lng,
      contactName: this.normalizeText(dto.contactName || dto.contact),
      contactPhone: this.normalizeText(dto.contactPhone || dto.phone),
      dateStart,
      dateEnd,
      workHours,
      description: this.normalizeText(dto.description || dto.content),
      benefits: this.normalizeBenefits(dto.benefits),
      images: this.normalizeImages(dto.images),
      urgent: dto.urgent ? 1 : 0,
    };
  }

  async list(query: any) {
    const { keyword, salaryType, minSalary, maxSalary, page = 1, pageSize = 20 } = query;
    const qb = this.jobRepo.createQueryBuilder('j')
      .leftJoinAndSelect('j.user', 'u')
      .where('j.status IN (:...statuses)', { statuses: ['recruiting', 'full'] });

    if (keyword) {
      qb.andWhere(
        '(j.title LIKE :kw OR j.description LIKE :kw OR j.companyName LIKE :kw)',
        { kw: `%${keyword}%` }
      );
    }
    if (salaryType) qb.andWhere('j.salaryType = :salaryType', { salaryType });
    if (minSalary) qb.andWhere('j.salary >= :minSalary', { minSalary });
    if (maxSalary) qb.andWhere('j.salary <= :maxSalary', { maxSalary });

    qb.orderBy('j.urgent', 'DESC')
      .addOrderBy('j.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    // 检查并更新过期的急招状态
    const now = new Date();
    for (const job of list) {
      if (job.urgent === 1 && job.urgentExpireAt && new Date(job.urgentExpireAt) < now) {
        job.urgent = 0;
        await this.jobRepo.save(job);
      }
    }

    // 获取企业认证信息
    const userIds = list.map(job => job.userId).filter(Boolean);
    const certMap = new Map<number, EnterpriseCert>();
    if (userIds.length > 0) {
      const certs = await this.entCertRepo.createQueryBuilder('c')
        .where('c.userId IN (:...userIds)', { userIds })
        .andWhere('c.status = :status', { status: 'approved' })
        .orderBy('c.userId', 'ASC')
        .addOrderBy('c.id', 'DESC')
        .getMany();
      for (const cert of certs) {
        if (!certMap.has(cert.userId)) certMap.set(cert.userId, cert);
      }
    }

    // 格式化列表数据
    const formattedList = await Promise.all(list.map(async (job) => {
      const appliedCount = await this.appRepo.count({ where: { jobId: job.id } });
      const cert = certMap.get(job.userId);

      // 格式化福利标签
      const benefitTags = (job.benefits || []).map((b: any) => ({
        label: typeof b === 'string' ? b : b.label,
        bg: '#ECFDF5',
        color: '#10B981'
      }));

      // 添加工作时间标签
      const timeTags = job.workHours ? [{
        label: job.workHours,
        bg: '#EFF6FF',
        color: '#3B82F6'
      }] : [];

      const allTags = [...benefitTags, ...timeTags];

      return {
        id: job.id,
        title: job.title,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        need: job.needCount,
        applied: appliedCount,
        total: job.needCount,
        location: job.location,
        lat: this.parseCoordinate(job.lat) ?? null,
        lng: this.parseCoordinate(job.lng) ?? null,
        cityDistrict: this.extractCityDistrict(job.location),
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart}~${job.dateEnd}` : '',
        publishDate: job.createdAt ? new Date(job.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '',
        desc: job.description || '',
        urgent: job.urgent === 1,
        images: job.images || [],
        tags: benefitTags,
        allTags,
        companyName: cert?.companyName || job.user?.nickname || '企业用户',
        avatarUrl: job.user?.avatarUrl || '',
        user: {
          id: job.user?.id,
          avatarUrl: job.user?.avatarUrl || '',
          isMember: job.user?.isMember || 0
        },
        isMember: !!(job.user?.isMember),
        time: job.createdAt ? new Date(job.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-') : ''
      };
    }));

    return { list: formattedList, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number) {
    const job = await this.jobRepo.findOne({ where: { id }, relations: ['user'] });
    if (!job) throw new BadRequestException('招工信息不存在');

    // 查询报名人数
    const appliedCount = await this.appRepo.count({ where: { jobId: id } });

    // 查询企业认证信息
    let companyName = job.user?.nickname || '企业用户';
    let verified = false;
    let avatarUrl = job.user?.avatarUrl || '';

    if (job.userId) {
      const cert = await this.entCertRepo.findOne({
        where: { userId: job.userId, status: 'approved' },
        order: { id: 'DESC' }
      });
      if (cert) {
        companyName = cert.companyName;
        verified = true;
      }
    }

    // 格式化返回数据
    const salaryTypeMap = { hourly: '计时', piece: '计件' };
    const dateRange = job.dateStart && job.dateEnd
      ? `${job.dateStart} 至 ${job.dateEnd}`
      : '待定';

    return {
      ...job,
      need: job.needCount,
      total: job.needCount,
      applied: appliedCount,
      salaryType: salaryTypeMap[job.salaryType] || job.salaryType,
      dateRange,
      hours: job.workHours || '待定',
      cityDistrict: this.extractCityDistrict(job.location),
      company: {
        name: companyName,
        verified,
        avatarUrl,
        creditScore: job.user?.creditScore || 100,
        contact: job.contactName || '联系人',
        phone: job.contactPhone || job.user?.phone || ''
      }
    };
  }

  async myJobs(userId: number) {
    const jobs = await this.jobRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    const formattedJobs = await Promise.all(jobs.map(async (job) => {
      const appliedCount = await this.appRepo.count({ where: { jobId: job.id } });

      // 检查急招是否过期
      let isUrgent = job.urgent === 1;
      if (isUrgent && job.urgentExpireAt && new Date(job.urgentExpireAt) < new Date()) {
        isUrgent = false;
        job.urgent = 0;
        await this.jobRepo.save(job);
      }

      return {
        id: job.id,
        type: 'job',
        title: job.title,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        appliedCount,
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart}~${job.dateEnd}` : '',
        workHours: job.workHours,
        cityDistrict: this.extractCityDistrict(job.location),
        status: job.status,
        urgent: isUrgent,
        urgentExpireAt: job.urgentExpireAt,
        createdAt: job.createdAt,
        viewCount: 0 // TODO: 实现浏览次数统计
      };
    }));

    return { list: formattedJobs };
  }

  async manageJobs(userId: number, query: any) {
    const { stage = 'all' } = query || {};
    const jobs = await this.jobRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const companyName = await this.getEnterpriseCompanyName(userId);
    const items = await Promise.all(jobs.map(async (job) => {
      const applications = await this.appRepo.find({ where: { jobId: job.id } });
      const pendingCount = applications.filter((item) => item.status === 'pending').length;
      const acceptedCount = applications.filter((item) => item.status === 'accepted').length;
      const confirmedCount = applications.filter((item) => ['confirmed', 'working', 'done'].includes(item.status)).length;
      const rejectedCount = applications.filter((item) => item.status === 'rejected').length;
      const supervisorCount = applications.filter((item) => item.isSupervisor === 1).length;

      let stageKey = 'recruiting';
      let stageText = '招工中';
      let stageTone = 'blue';
      let highlight = pendingCount > 0 ? `待审核 ${pendingCount} 人` : '继续招募临工';
      let actionText = '查看报名';
      let actionTab = 'applications';

      if (job.status === 'working') {
        stageKey = 'working';
        stageText = '进行中';
        stageTone = 'green';
        highlight = `已到岗 ${confirmedCount} 人`;
        actionText = '去考勤';
        actionTab = 'attendance';
      } else if (job.status === 'pending_settlement') {
        stageKey = 'settlement';
        stageText = '待结算';
        stageTone = 'amber';
        highlight = '待确认考勤和结算';
        actionText = '去结算';
        actionTab = 'settlement';
      } else if (['settled', 'closed'].includes(job.status)) {
        stageKey = 'closed';
        stageText = '已完成';
        stageTone = 'slate';
        highlight = '已完成本次用工';
        actionText = '查看详情';
        actionTab = 'settlement';
      } else if (pendingCount > 0) {
        stageKey = 'pending';
        stageText = '待处理';
        stageTone = 'rose';
        highlight = `待审核 ${pendingCount} 人`;
        actionText = '立即处理';
        actionTab = 'applications';
      }

      return {
        id: job.id,
        title: job.title,
        companyName,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        location: this.extractCityDistrict(job.location),
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart} ~ ${job.dateEnd}` : '',
        workHours: job.workHours || '',
        status: job.status,
        stageKey,
        stageText,
        stageTone,
        pendingCount,
        acceptedCount,
        confirmedCount,
        rejectedCount,
        supervisorCount,
        appliedCount: applications.length,
        highlight,
        actionText,
        actionTab,
      };
    }));

    const list = stage === 'all' ? items : items.filter((item) => item.stageKey === stage);
    return { list };
  }

  async manageDetail(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权查看');

    const companyName = await this.getEnterpriseCompanyName(job.userId, job.user?.nickname || '企业用户');
    const applications = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'ASC' },
    });

    const enrichedApplicants = await Promise.all(applications.map(async (app) => {
      const doneCount = await this.appRepo.count({
        where: { workerId: app.workerId, status: 'done' },
      });
      const statusMap: Record<string, { text: string; tone: string }> = {
        pending: { text: '待审核', tone: 'rose' },
        accepted: { text: '已录用', tone: 'blue' },
        confirmed: { text: '待出勤', tone: 'violet' },
        working: { text: '进行中', tone: 'green' },
        done: { text: '已完工', tone: 'slate' },
        rejected: { text: '已拒绝', tone: 'slate' },
        released: { text: '已释放', tone: 'slate' },
        cancelled: { text: '已取消', tone: 'slate' },
      };
      const statusInfo = statusMap[app.status] || statusMap.pending;

      return {
        id: app.id,
        workerId: app.workerId,
        name: app.worker?.nickname || '临工',
        avatarUrl: app.worker?.avatarUrl || '',
        creditScore: app.worker?.creditScore || 100,
        doneCount,
        status: app.status,
        statusText: statusInfo.text,
        statusTone: statusInfo.tone,
        isSupervisor: app.isSupervisor === 1,
        applyTime: app.createdAt ? new Date(app.createdAt).toLocaleDateString('zh-CN') : '',
        canAccept: app.status === 'pending',
        canReject: ['pending', 'accepted'].includes(app.status),
        canSetSupervisor: ['accepted', 'confirmed', 'working', 'done'].includes(app.status),
      };
    }));

    const summary = {
      pendingCount: enrichedApplicants.filter((item) => item.status === 'pending').length,
      acceptedCount: enrichedApplicants.filter((item) => item.status === 'accepted').length,
      confirmedCount: enrichedApplicants.filter((item) => ['confirmed', 'working', 'done'].includes(item.status)).length,
      rejectedCount: enrichedApplicants.filter((item) => item.status === 'rejected').length,
      supervisor: enrichedApplicants.find((item) => item.isSupervisor) || null,
    };

    return {
      job: {
        id: job.id,
        title: job.title,
        companyName,
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart} ~ ${job.dateEnd}` : '',
        workHours: job.workHours || '',
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        location: this.extractCityDistrict(job.location),
        status: job.status,
      },
      summary,
      applicants: enrichedApplicants,
    };
  }

  async acceptApplication(jobId: number, workerId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('报名记录不存在');
    if (app.status !== 'pending') throw new BadRequestException('当前状态不可录用');

    app.status = 'accepted';
    await this.appRepo.save(app);
    return { message: '已录用' };
  }

  async rejectApplication(jobId: number, workerId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('报名记录不存在');
    if (!['pending', 'accepted'].includes(app.status)) throw new BadRequestException('当前状态不可拒绝');

    app.status = 'rejected';
    app.isSupervisor = 0;
    await this.appRepo.save(app);
    return { message: '已拒绝' };
  }

  async setSupervisor(jobId: number, userId: number, dto: { workerId: number }) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const workerId = Number(dto.workerId || 0);
    if (!workerId) throw new BadRequestException('请选择主管');

    const target = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!target) throw new BadRequestException('报名记录不存在');
    if (!['accepted', 'confirmed', 'working', 'done'].includes(target.status)) {
      throw new BadRequestException('当前状态不可设为主管');
    }

    await this.appRepo.update({ jobId }, { isSupervisor: 0 });
    target.isSupervisor = 1;
    await this.appRepo.save(target);
    return { message: '已设置主管' };
  }

  async create(userId: number, dto: any) {
    const payload = this.normalizeCreateDto(dto);
    if (!payload.title) throw new BadRequestException('请输入招工标题');
    if (!(payload.salary > 0)) throw new BadRequestException('请输入正确工价');
    if (!(payload.needCount > 0)) throw new BadRequestException('请输入招工人数');
    if (!payload.location) throw new BadRequestException('请选择工作地点');
    if (!payload.contactName) throw new BadRequestException('请输入联系人');
    if (!payload.contactPhone) throw new BadRequestException('请输入联系电话');
    if (!payload.dateStart || !payload.dateEnd) throw new BadRequestException('请选择工作日期');

    await this.checkKeywords(payload.title + (payload.description || ''));
    const job = this.jobRepo.create({ ...payload, userId });
    return this.jobRepo.save(job);
  }

  async update(id: number, userId: number, dto: any) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job || job.userId !== userId) throw new ForbiddenException('无权操作');
    await this.checkKeywords((dto.title || '') + (dto.description || ''));
    Object.assign(job, dto);
    return this.jobRepo.save(job);
  }

  private async getConfig(key: string, defaultValue: string): Promise<string> {
    const row = await this.sysConfigRepo.findOne({ where: { key } });
    return row ? row.value : defaultValue;
  }

  private isMemberActive(user: User): boolean {
    return !!(user.isMember && user.memberExpireAt && new Date(user.memberExpireAt) > new Date());
  }

  private async getUrgentBasePricing() {
    const [day1, day3, day7, day30] = await Promise.all([
      this.getConfig('top_price_per_day', '100'),
      this.getConfig('top_price_3d', '250'),
      this.getConfig('top_price_7d', '500'),
      this.getConfig('top_price_30d', '1500'),
    ]);

    return [
      { durationDays: 1, beanCost: parseInt(day1, 10) || 100 },
      { durationDays: 3, beanCost: parseInt(day3, 10) || 250 },
      { durationDays: 7, beanCost: parseInt(day7, 10) || 500 },
      { durationDays: 30, beanCost: parseInt(day30, 10) || 1500 },
    ];
  }

  private async buildUrgentPricingForUser(user: User) {
    const baseList = await this.getUrgentBasePricing();
    const memberDiscount = parseFloat(await this.getConfig('member_promote_discount', '0.8')) || 0.8;
    const isMember = this.isMemberActive(user);

    return baseList.map((item) => {
      const originalBeanCost = item.beanCost;
      const beanCost = isMember ? Math.ceil(originalBeanCost * memberDiscount) : originalBeanCost;
      return {
        durationDays: item.durationDays,
        beanCost,
        originalBeanCost,
        isDiscounted: isMember && beanCost < originalBeanCost,
      };
    });
  }

  async getUrgentPricing(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    const list = await this.buildUrgentPricingForUser(user);
    return { list };
  }

  async setUrgent(jobId: number, userId: number, dto: { durationDays: number }) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const durationDays = Number(dto.durationDays || 0);
    if (!durationDays || durationDays < 1) throw new BadRequestException('急招时长不能为空');

    // 从配置获取急招价格（使用置顶价格配置），并应用会员折扣
    const pricingList = await this.buildUrgentPricingForUser(user);
    const pricing = pricingList.find((item) => item.durationDays === durationDays);
    if (!pricing) throw new BadRequestException('不支持的急招时长');
    const actualCost = pricing.beanCost;

    if (user.beanBalance < actualCost) throw new BadRequestException('灵豆不足');

    // 扣除灵豆
    user.beanBalance -= actualCost;
    await this.userRepo.save(user);

    // 设置急招状态和过期时间
    job.urgent = 1;
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + durationDays);
    job.urgentExpireAt = expireAt;
    await this.jobRepo.save(job);

    // 记录灵豆交易
    await this.beanTxRepo.save(this.beanTxRepo.create({
      userId,
      type: 'promote',
      amount: -actualCost,
      refType: 'job',
      refId: jobId,
      remark: this.isMemberActive(user) ? `设置急招${durationDays}天(会员折扣)` : `设置急招${durationDays}天`,
    }));

    // 发送通知
    await this.notiRepo.save(this.notiRepo.create({
      userId,
      type: 'promotion' as any,
      title: '急招设置成功',
      content: `您的招工信息已设置急招${durationDays}天，消耗${actualCost}灵豆`,
    }));

    return { message: '设置成功', beanBalance: user.beanBalance, actualCost, durationDays };
  }
}
