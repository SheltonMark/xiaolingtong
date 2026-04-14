import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { OpenCity } from '../../entities/open-city.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';
import { findRecentDuplicate } from '../../common/recent-create-dedupe';
import { getEnterpriseStatusDisplay, getEnterpriseStatusTone } from '../application/status-mapping';

@Injectable()
export class JobService {
  private static readonly WORKER_VISIBLE_JOB_STATUSES = ['recruiting'];
  private static readonly ACTIVE_APPLICATION_STATUSES = ['pending', 'accepted', 'confirmed', 'working', 'done'];
  private static readonly ARRIVED_APPLICATION_STATUSES = ['confirmed', 'working', 'done'];

  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert) private workerCertRepo: Repository<WorkerCert>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(Notification) private notiRepo: Repository<Notification>,
    @InjectRepository(SysConfig) private sysConfigRepo: Repository<SysConfig>,
    @InjectRepository(OpenCity) private openCityRepo: Repository<OpenCity>,
    private wechatSecurityService: WechatSecurityService,
  ) {}

  private async resolveDefaultOpenCityId(): Promise<number | null> {
    const row = await this.openCityRepo.findOne({
      where: { name: '义乌', isActive: 1 },
    });
    return row ? Number(row.id) : null;
  }

  private async assertOpenCityActive(openCityId: number): Promise<OpenCity> {
    const city = await this.openCityRepo.findOne({
      where: { id: openCityId, isActive: 1 },
    });
    if (!city) {
      throw new BadRequestException('无效或未启用的地区');
    }
    return city;
  }

  private async mapOpenCityNames(jobs: Job[]): Promise<Map<number, string>> {
    const ids = [
      ...new Set(
        (jobs || [])
          .map((j) => (j.openCityId != null ? Number(j.openCityId) : null))
          .filter((id): id is number => id != null && id > 0),
      ),
    ];
    if (!ids.length) return new Map();
    const rows = await this.openCityRepo.find({ where: { id: In(ids) } });
    return new Map(rows.map((r) => [Number(r.id), r.name]));
  }

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

  private isSameUserId(actualUserId: number | string | null | undefined, expectedUserId: number | string | null | undefined): boolean {
    const actual = Number(actualUserId);
    const expected = Number(expectedUserId);
    return Number.isFinite(actual) && Number.isFinite(expected) && actual === expected;
  }

  private parseVisibility(value: any, defaultValue = false): boolean {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = this.normalizeText(value).toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
  }

  private buildVisibleContactInfo(job: Partial<Job>, opts: { includeHidden?: boolean; hasApplied?: boolean } = {}) {
    const { includeHidden = false, hasApplied = false } = opts;
    const canSee = includeHidden || hasApplied;
    const showPhone = canSee || this.parseVisibility(job.showPhone, !!job.contactPhone);
    const showWechat = canSee || this.parseVisibility(job.showWechat, !!job.contactWechat);
    const showWechatQr = canSee || this.parseVisibility(job.showWechatQr, !!job.contactWechatQr);

    return {
      contactName: job.contactName || '',
      contactPhone: showPhone ? job.contactPhone || '' : '',
      contactWechat: showWechat ? job.contactWechat || '' : '',
      contactWechatQr: showWechatQr ? job.contactWechatQr || '' : '',
      showPhone,
      showWechat,
      showWechatQr,
    };
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

  private normalizeArrayInput(value: any): any[] | undefined {
    if (Array.isArray(value)) return value;

    if (value && typeof value === 'object') {
      const keys = Object.keys(value)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));
      if (!keys.length) return undefined;
      return keys.map((key) => value[key]);
    }

    return undefined;
  }

  private normalizeBenefits(value: any) {
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      try {
        return this.normalizeBenefits(JSON.parse(text));
      } catch {
        return this.normalizeBenefits(
          text
            .split(/[,\n，|]/)
            .map((item) => item.trim())
            .filter(Boolean),
        );
      }
    }
    const arrayValue = this.normalizeArrayInput(value);
    if (!arrayValue) return undefined;
    const normalized = arrayValue
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === 'string') return { label: item, color: 'green' };
        if (item.label) return { ...item, color: item.color || 'green' };
        return null;
      })
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  private buildBenefitTags(benefits: Array<{ label: string; color?: string }> = []) {
    return benefits.map((item) => ({
      label: item.label,
      bg: '#ECFDF5',
      color: '#10B981',
    }));
  }

  private buildAllTags(benefits: Array<{ label: string; color?: string }> = [], workHours?: string) {
    const benefitTags = this.buildBenefitTags(benefits);
    const timeTags = workHours ? [{
      label: workHours,
      bg: '#EFF6FF',
      color: '#3B82F6',
    }] : [];
    return [...benefitTags, ...timeTags];
  }

  private normalizeImages(value: any) {
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      try {
        return this.normalizeImages(JSON.parse(text));
      } catch {
        return [text];
      }
    }

    const arrayValue = this.normalizeArrayInput(value);
    if (!arrayValue) return undefined;
    const normalized = arrayValue.filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  private extractCityDistrict(fullAddress: string): string {
    if (!fullAddress) return '';
    const match = fullAddress.match(/(?:.*?[省市])?([^省]+?[市州直辖])([^市县区]+?[县区镇乡])/);
    if (match) {
      const city = match[1].replace(/市$/, '');
      const district = match[2].replace(/[县区镇乡]$/, '');
      return `${city}·${district}`;
    }
    const simpleMatch = fullAddress.match(/([^省]+?[市州直辖])([^市]+)/);
    if (simpleMatch) {
      return simpleMatch[1].replace(/市$/, '') + '·' + simpleMatch[2].substring(0, 4);
    }
    return fullAddress.substring(0, 20);
  }

  private formatDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isDatePassed(dateText: string, today = this.formatDate()): boolean {
    const normalized = this.normalizeText(dateText);
    return !!normalized && normalized < today;
  }

  private getJobTimeMeta(
    job: Partial<Job>,
    summary: { pendingCount?: number; acceptedCount?: number; confirmedCount?: number } = {},
  ) {
    const status = this.normalizeText(job.status);
    const startPassed = this.isDatePassed(this.normalizeText(job.dateStart));
    const endPassed = this.isDatePassed(this.normalizeText(job.dateEnd));
    const pendingCount = summary.pendingCount || 0;
    const confirmedCount = summary.confirmedCount || 0;

    if (status === 'pending_settlement') {
      return {
        key: 'settlement',
        text: '待结算',
        tone: 'amber',
        hint: '考勤已确认，尽快完成结算',
      };
    }

    if (['settled', 'closed'].includes(status)) {
      return {
        key: 'ended',
        text: '已结束',
        tone: 'slate',
        hint: '本单已结束，无需继续处理',
      };
    }

    if (endPassed) {
      if (confirmedCount > 0 || status === 'working') {
        return {
          key: 'end_overdue',
          text: '待考勤',
          tone: 'amber',
          hint: '已超过结束日期，请尽快确认考勤并生成结算',
        };
      }
      return {
        key: 'ended',
        text: '已结束',
        tone: 'slate',
        hint: '已超过结束日期，订单已停止招工',
      };
    }

    if (startPassed && ['recruiting', 'full'].includes(status)) {
      return {
        key: 'start_overdue',
        text: '已过开工',
        tone: 'amber',
        hint: pendingCount > 0
          ? `已过开工日期，仍有 ${pendingCount} 人待处理`
          : '已过开工日期，请尽快处理当前报名',
      };
    }

    return {
      key: 'normal',
      text: '',
      tone: '',
      hint: '',
    };
  }

  private getJobPrimaryAction(
    job: Partial<Job>,
    summary: { pendingCount?: number } = {},
    timeMeta = this.getJobTimeMeta(job, summary),
  ) {
    const status = this.normalizeText(job.status);
    const pendingCount = summary.pendingCount || 0;

    if (status === 'pending_settlement') {
      return { text: '去结算', tab: 'settlement' };
    }
    if (timeMeta.key === 'end_overdue' || status === 'working') {
      return { text: '去考勤', tab: 'attendance' };
    }
    if (['settled', 'closed'].includes(status)) {
      return { text: '查看详情', tab: 'settlement' };
    }
    if (pendingCount > 0 || timeMeta.key === 'start_overdue') {
      return { text: '查看报名', tab: 'applications' };
    }
    return { text: '管理招工', tab: 'applications' };
  }

  private isWorkerVisibleJob(job: Partial<Job>) {
    return JobService.WORKER_VISIBLE_JOB_STATUSES.includes(this.normalizeText(job.status))
      && !this.isDatePassed(this.normalizeText(job.dateEnd));
  }

  private isActiveApplicationStatus(status: string) {
    return JobService.ACTIVE_APPLICATION_STATUSES.includes(this.normalizeText(status));
  }

  private isArrivedApplicationStatus(status: string) {
    return JobService.ARRIVED_APPLICATION_STATUSES.includes(this.normalizeText(status));
  }

  private summarizeApplications(applications: Array<Partial<JobApplication>> = []) {
    const applicationRecordCount = applications.length;
    const activeApplicantCount = applications.filter((item) =>
      this.isActiveApplicationStatus(String(item.status || ''))).length;
    const pendingCount = applications.filter((item) => item.status === 'pending').length;
    const acceptedCount = applications.filter((item) => item.status === 'accepted').length;
    const confirmedCount = applications.filter((item) =>
      this.isArrivedApplicationStatus(String(item.status || ''))).length;
    const rejectedCount = applications.filter((item) => item.status === 'rejected').length;
    const supervisorCount = applications.filter((item) => item.isSupervisor === 1).length;

    return {
      applicationRecordCount,
      activeApplicantCount,
      pendingCount,
      acceptedCount,
      confirmedCount,
      rejectedCount,
      supervisorCount,
    };
  }

  private normalizeCreateDto(dto: any) {
    const salary = Number(dto.salary || dto.price || 0);
    const needCount = Number(dto.needCount || dto.headcount || dto.need || 0);
    const salaryType = this.parseSalaryType(dto.salaryType || dto.salaryMode);
    const salaryUnit = this.normalizeText(dto.salaryUnit) || (salaryType === 'hourly' ? '元/时' : '元/件');
    const location = this.normalizeText(dto.location || dto.address);
    const jobType = this.normalizeText(dto.jobType);
    const lat = this.parseCoordinate(dto.lat ?? dto.latitude);
    const lng = this.parseCoordinate(dto.lng ?? dto.longitude);
    const dateStart = this.normalizeText(dto.dateStart || dto.startDate);
    const dateEnd = this.normalizeText(dto.dateEnd || dto.endDate);
    const startTime = this.normalizeText(dto.startTime);
    const endTime = this.normalizeText(dto.endTime);
    const workHours = this.normalizeText(dto.workHours) || (startTime && endTime ? `${startTime}-${endTime}` : '');
    const contactPhone = this.normalizeText(dto.contactPhone || dto.phone);
    const contactWechat = this.normalizeText(dto.contactWechat || dto.wechat || dto.wechatId);
    const contactWechatQr = this.normalizeText(dto.contactWechatQr || dto.wechatQr || dto.wechatQrImage);
    const hasShowPhone = Object.prototype.hasOwnProperty.call(dto, 'showPhone');
    const hasShowWechat = Object.prototype.hasOwnProperty.call(dto, 'showWechat');
    const hasShowWechatQr = Object.prototype.hasOwnProperty.call(dto, 'showWechatQr');
    const rawOcid = dto.openCityId;
    const ocid =
      rawOcid !== undefined && rawOcid !== null && rawOcid !== ''
        ? Number(rawOcid)
        : NaN;

    return {
      title: this.normalizeText(dto.title || dto.jobType),
      jobType,
      salary,
      salaryType,
      salaryUnit,
      needCount,
      location,
      lat,
      lng,
      contactName: this.normalizeText(dto.contactName || dto.contact),
      contactPhone,
      contactWechat,
      contactWechatQr,
      showPhone: hasShowPhone ? (this.parseVisibility(dto.showPhone, !!contactPhone) ? 1 : 0) : (contactPhone ? 1 : 0),
      showWechat: hasShowWechat ? (this.parseVisibility(dto.showWechat, !!contactWechat) ? 1 : 0) : (contactWechat ? 1 : 0),
      showWechatQr: hasShowWechatQr ? (this.parseVisibility(dto.showWechatQr, !!contactWechatQr) ? 1 : 0) : (contactWechatQr ? 1 : 0),
      dateStart,
      dateEnd,
      workHours,
      description: this.normalizeText(dto.description || dto.content),
      benefits: this.normalizeBenefits(dto.benefits ?? dto.tags),
      images: this.normalizeImages(dto.images),
      videos: this.normalizeImages(dto.videos),
      urgent: dto.urgent ? 1 : 0,
      openCityId:
        Number.isFinite(ocid) && ocid > 0 ? ocid : undefined,
    };
  }

  private async findRecentDuplicateJob(userId: number, payload: any) {
    return findRecentDuplicate(this.jobRepo, {
      userId,
      title: payload.title,
      jobType: payload.jobType,
      salary: payload.salary,
      salaryType: payload.salaryType,
      salaryUnit: payload.salaryUnit,
      needCount: payload.needCount,
      location: payload.location,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      contactWechat: payload.contactWechat,
      contactWechatQr: payload.contactWechatQr,
      showPhone: payload.showPhone,
      showWechat: payload.showWechat,
      showWechatQr: payload.showWechatQr,
      dateStart: payload.dateStart,
      dateEnd: payload.dateEnd,
      workHours: payload.workHours,
      description: payload.description,
    });
  }

  async list(query: any, currentUserId?: number) {
    const { keyword, jobType, salaryType, minSalary, maxSalary, page = 1, pageSize = 20 } = query;
    const today = this.formatDate();
    const qb = this.jobRepo.createQueryBuilder('j')
      .leftJoinAndSelect('j.user', 'u')
      .where('j.status IN (:...statuses)', { statuses: JobService.WORKER_VISIBLE_JOB_STATUSES })
      .andWhere('j.dateEnd >= :today', { today });

    if (keyword) {
      qb.andWhere(
        '(j.title LIKE :kw OR j.description LIKE :kw OR j.jobType LIKE :kw)',
        { kw: `%${keyword}%` }
      );
    }
    if (jobType) {
      qb.andWhere('(j.jobType = :jobType OR j.title LIKE :jobTypeLike)', { jobType, jobTypeLike: `%${jobType}%` });
    }
    if (salaryType) qb.andWhere('j.salaryType = :salaryType', { salaryType });
    if (minSalary) qb.andWhere('j.salary >= :minSalary', { minSalary });
    if (maxSalary) qb.andWhere('j.salary <= :maxSalary', { maxSalary });

    const rawOcid = query.openCityId ?? query.cityId;
    let filterOcid = parseInt(String(rawOcid), 10);
    if (!Number.isFinite(filterOcid) || filterOcid <= 0) {
      filterOcid = 0;
    }
    if (filterOcid > 0) {
      qb.andWhere('j.openCityId = :filterOcid', { filterOcid });
    }

    qb.orderBy('j.urgent', 'DESC')
      .addOrderBy('j.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    const cityNameById = await this.mapOpenCityNames(list);

    const now = new Date();
    for (const job of list) {
      if (job.urgent === 1 && job.urgentExpireAt && new Date(job.urgentExpireAt) < now) {
        job.urgent = 0;
        await this.jobRepo.save(job);
      }
    }

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

    const appliedJobIds = new Set<number>();
    if (currentUserId && list.length > 0) {
      const jobIds = list.map((job) => job.id);
      const apps = await this.appRepo.find({
        where: { workerId: currentUserId, jobId: In(jobIds), status: Not('cancelled') },
        select: ['jobId'],
      });
      for (const app of apps) appliedJobIds.add(Number(app.jobId));
    }

    const formattedList = await Promise.all(list.map(async (job) => {
      const [applicationRecordCount, activeApplicantCount] = await Promise.all([
        this.appRepo.count({ where: { jobId: job.id } }),
        this.appRepo.count({
          where: {
            jobId: job.id,
            status: In(JobService.ACTIVE_APPLICATION_STATUSES),
          },
        }),
      ]);
      const cert = certMap.get(job.userId);

      const normalizedBenefits = this.normalizeBenefits(job.benefits) || [];
      const benefitTags = this.buildBenefitTags(normalizedBenefits);
      const allTags = this.buildAllTags(normalizedBenefits, job.workHours);

      const ocId =
        job.openCityId != null ? Number(job.openCityId) : null;
      return {
        id: job.id,
        title: job.title,
        jobType: job.jobType || '',
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        need: job.needCount,
        applied: activeApplicantCount,
        activeApplicantCount,
        applicationRecordCount,
        total: job.needCount,
        location: job.location,
        lat: this.parseCoordinate(job.lat) ?? null,
        lng: this.parseCoordinate(job.lng) ?? null,
        openCityId: ocId,
        openCityName: ocId ? cityNameById.get(ocId) ?? null : null,
        cityDistrict: this.extractCityDistrict(job.location),
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart}~${job.dateEnd}` : '',
        publishDate: job.createdAt
          ? new Date(job.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
          : '',
        desc: job.description || '',
        urgent: job.urgent === 1,
        images: job.images || [],
        benefits: normalizedBenefits,
        tags: benefitTags,
        allTags,
        companyName: cert?.companyName || job.user?.nickname || job.user?.name || '企业用户',
        avatarUrl: job.user?.avatarUrl || '',
        user: {
          id: job.user?.id,
          avatarUrl: job.user?.avatarUrl || '',
          isMember: job.user?.isMember || 0
        },
        isMember: !!job.user?.isMember,
        time: job.createdAt ? new Date(job.createdAt).toLocaleDateString('zh-CN').replace(/\//g, '-') : '',
        canApply: this.isWorkerVisibleJob(job),
        hasApplied: appliedJobIds.has(job.id),
        visibleStatusText: '可报名',
      };
    }));

    return { list: formattedList, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number, currentUserId?: number) {
    const job = await this.jobRepo.findOne({ where: { id }, relations: ['user'] });
    if (!job) throw new BadRequestException('招工信息不存在');

    const [applicationRecordCount, activeApplicantCount] = await Promise.all([
      this.appRepo.count({ where: { jobId: id } }),
      this.appRepo.count({
        where: {
          jobId: id,
          status: In(JobService.ACTIVE_APPLICATION_STATUSES),
        },
      }),
    ]);

    let companyName = job.user?.nickname || job.user?.name || '企业用户';
    let verified = false;
    const avatarUrl = job.user?.avatarUrl || '';

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

    const salaryTypeMap = { hourly: '计时', piece: '计件' };
    const dateRange = job.dateStart && job.dateEnd
      ? `${job.dateStart} 至 ${job.dateEnd}`
      : '待定';
    const normalizedBenefits = this.normalizeBenefits(job.benefits) || [];
    const allTags = this.buildAllTags(normalizedBenefits, job.workHours);

    let hasApplied = false;
    if (currentUserId) {
      const appCount = await this.appRepo.count({
        where: { jobId: id, workerId: currentUserId, status: Not('cancelled') },
      });
      hasApplied = appCount > 0;
    }

    const isOwner = currentUserId === job.userId;
    const contactInfo = this.buildVisibleContactInfo(job, { includeHidden: isOwner, hasApplied });
    const cityNameById = await this.mapOpenCityNames([job]);
    const detailOpenCityId =
      job.openCityId != null ? Number(job.openCityId) : null;

    return {
      ...job,
      openCityId: detailOpenCityId,
      openCityName: detailOpenCityId
        ? cityNameById.get(detailOpenCityId) ?? null
        : null,
      images: this.normalizeImages(job.images) || [],
      videos: this.normalizeImages(job.videos) || [],
      need: job.needCount,
      total: job.needCount,
      jobType: job.jobType || '',
      applied: activeApplicantCount,
      activeApplicantCount,
      applicationRecordCount,
      salaryType: salaryTypeMap[job.salaryType] || job.salaryType,
      dateRange,
      hours: job.workHours || '待定',
      cityDistrict: this.extractCityDistrict(job.location),
      benefits: normalizedBenefits,
      tags: this.buildBenefitTags(normalizedBenefits),
      allTags,
      canApply: this.isWorkerVisibleJob(job),
      hasApplied,
      company: {
        name: companyName,
        verified,
        avatarUrl,
        creditScore: job.user?.creditScore || 100,
        contact: contactInfo.contactName || '联系人',
        phone: contactInfo.contactPhone || '',
        wechat: contactInfo.contactWechat || '',
        wechatQrImage: contactInfo.contactWechatQr || '',
        showPhone: contactInfo.showPhone,
        showWechat: contactInfo.showWechat,
        showWechatQr: contactInfo.showWechatQr,
      }
    };
  }

  async myJobs(userId: number) {
    const jobs = await this.jobRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    const formattedJobs = await Promise.all(jobs.map(async (job) => {
      const applications = await this.appRepo.find({ where: { jobId: job.id } });
      const applicationSummary = this.summarizeApplications(applications);
      const {
        applicationRecordCount,
        activeApplicantCount,
        pendingCount,
        acceptedCount,
        confirmedCount,
      } = applicationSummary;
      const timeMeta = this.getJobTimeMeta(job, { pendingCount, acceptedCount, confirmedCount });
      const primaryAction = this.getJobPrimaryAction(job, { pendingCount }, timeMeta);

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
        jobType: job.jobType || '',
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        appliedCount: activeApplicantCount,
        activeApplicantCount,
        applicationRecordCount,
        pendingCount,
        acceptedCount,
        confirmedCount,
        benefits: this.normalizeBenefits(job.benefits) || [],
        tags: this.buildBenefitTags(this.normalizeBenefits(job.benefits) || []),
        allTags: this.buildAllTags(this.normalizeBenefits(job.benefits) || [], job.workHours),
        dateStart: job.dateStart,
        dateEnd: job.dateEnd,
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart}~${job.dateEnd}` : '',
        workHours: job.workHours,
        cityDistrict: this.extractCityDistrict(job.location),
        status: job.status,
        timeState: timeMeta.key,
        timeStateText: timeMeta.text,
        timeStateTone: timeMeta.tone,
        timeHint: timeMeta.hint,
        actionText: primaryAction.text,
        actionTab: primaryAction.tab,
        urgent: isUrgent,
        urgentExpireAt: job.urgentExpireAt,
        createdAt: job.createdAt,
        publishDate: job.createdAt
          ? new Date(job.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
          : '',
        viewCount: 0
      };
    }));

    const summary = {
      publishedJobCount: formattedJobs.length,
      recruitingJobCount: formattedJobs.filter((item) => item.status === 'recruiting').length,
      workingJobCount: formattedJobs.filter((item) => item.status === 'working').length,
      pendingSettlementJobCount: formattedJobs.filter((item) => item.status === 'pending_settlement').length,
      closedJobCount: formattedJobs.filter((item) => ['settled', 'closed'].includes(item.status)).length,
    };

    return { list: formattedJobs, summary };
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
      const applicationSummary = this.summarizeApplications(applications);
      const {
        applicationRecordCount,
        activeApplicantCount,
        pendingCount,
        acceptedCount,
        confirmedCount,
        rejectedCount,
        supervisorCount,
      } = applicationSummary;
      const timeMeta = this.getJobTimeMeta(job, { pendingCount, acceptedCount, confirmedCount });

      let stageKey = 'recruiting';
      let filterKey = 'ongoing';
      let stageText = '招工中';
      let stageTone = 'blue';
      let highlight = pendingCount > 0 ? `待审核 ${pendingCount} 人` : '继续招募临工';
      let actionText = '查看报名';
      let actionTab = 'applications';

      if (timeMeta.key === 'end_overdue') {
        stageKey = 'attendance_due';
        filterKey = 'ongoing';
        stageText = timeMeta.text;
        stageTone = timeMeta.tone;
        highlight = timeMeta.hint;
        actionText = '去考勤';
        actionTab = 'attendance';
      } else if (timeMeta.key === 'ended' && !['settled', 'closed'].includes(job.status)) {
        stageKey = 'closed';
        filterKey = 'closed';
        stageText = timeMeta.text;
        stageTone = timeMeta.tone;
        highlight = timeMeta.hint;
        actionText = '查看报名';
        actionTab = 'applications';
      } else if (job.status === 'working') {
        stageKey = 'working';
        filterKey = 'ongoing';
        stageText = '进行中';
        stageTone = 'green';
        highlight = `已到岗 ${confirmedCount} 人`;
        actionText = '去考勤';
        actionTab = 'attendance';
      } else if (job.status === 'pending_settlement') {
        stageKey = 'settlement';
        filterKey = 'ongoing';
        stageText = '待结算';
        stageTone = 'amber';
        highlight = '待确认考勤和结算';
        actionText = '去结算';
        actionTab = 'settlement';
      } else if (['settled', 'closed'].includes(job.status)) {
        stageKey = 'closed';
        filterKey = 'closed';
        stageText = '已完成';
        stageTone = 'slate';
        highlight = '已完成本次用工';
        actionText = '查看详情';
        actionTab = 'settlement';
      } else if (timeMeta.key === 'start_overdue') {
        stageKey = 'start_overdue';
        filterKey = pendingCount > 0 ? 'pending' : 'ongoing';
        stageText = timeMeta.text;
        stageTone = timeMeta.tone;
        highlight = timeMeta.hint;
        actionText = '查看报名';
        actionTab = 'applications';
      } else if (pendingCount > 0) {
        stageKey = 'pending';
        filterKey = 'pending';
        stageText = '待处理';
        stageTone = 'rose';
        highlight = `待审核 ${pendingCount} 人`;
        actionText = '立即处理';
        actionTab = 'applications';
      }

      return {
        id: job.id,
        title: job.title,
        jobType: job.jobType || '',
        companyName,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        location: this.extractCityDistrict(job.location),
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart} ~ ${job.dateEnd}` : '',
        workHours: job.workHours || '',
        dateStart: job.dateStart,
        dateEnd: job.dateEnd,
          status: job.status,
          timeState: timeMeta.key,
          timeStateText: timeMeta.text,
          timeStateTone: timeMeta.tone,
          timeHint: timeMeta.hint,
          stageKey,
          filterKey,
          stageText,
          stageTone,
        pendingCount,
        acceptedCount,
        confirmedCount,
        rejectedCount,
        supervisorCount,
        appliedCount: activeApplicantCount,
        activeApplicantCount,
        applicationRecordCount,
        highlight,
        actionText,
        actionTab,
      };
    }));

    const list = stage === 'all' ? items : items.filter((item) => item.filterKey === stage);
    const summary = {
      publishedJobCount: items.length,
      pendingJobCount: items.filter((item) => item.filterKey === 'pending').length,
      ongoingJobCount: items.filter((item) => item.filterKey === 'ongoing').length,
      closedJobCount: items.filter((item) => item.filterKey === 'closed').length,
      pendingSettlementJobCount: items.filter((item) => item.stageKey === 'settlement').length,
    };
    return { list, summary };
  }

  async manageDetail(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权查看');

    const companyName = await this.getEnterpriseCompanyName(job.userId, job.user?.nickname || job.user?.name || '企业用户');
    const applications = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'ASC' },
    });
    const workerIds = applications.map((item) => item.workerId).filter(Boolean);
    const workerCertMap = new Map<number, WorkerCert>();
    if (workerIds.length) {
      const workerCerts = await this.workerCertRepo.createQueryBuilder('cert')
        .where('cert.userId IN (:...workerIds)', { workerIds })
        .andWhere('cert.status = :status', { status: 'approved' })
        .orderBy('cert.userId', 'ASC')
        .addOrderBy('cert.id', 'DESC')
        .getMany();
      for (const cert of workerCerts) {
        if (!workerCertMap.has(cert.userId)) workerCertMap.set(cert.userId, cert);
      }
    }

    const enrichedApplicants = await Promise.all(applications.map(async (app) => {
      const doneCount = await this.appRepo.count({
        where: { workerId: app.workerId, status: 'done' },
      });
      const statusText = getEnterpriseStatusDisplay(app.status);
      const statusTone = getEnterpriseStatusTone(app.status);
      const workerCert = workerCertMap.get(app.workerId);
      const displayName = this.normalizeText(app.worker?.nickname)
        || this.normalizeText(workerCert?.realName)
        || '临工';

      return {
        id: app.id,
        workerId: app.workerId,
        name: displayName,
        avatarUrl: app.worker?.avatarUrl || '',
        creditScore: app.worker?.creditScore || 100,
        doneCount,
        status: app.status,
        statusText,
        statusTone,
        isSupervisor: app.isSupervisor === 1,
        applyTime: app.createdAt ? new Date(app.createdAt).toLocaleDateString('zh-CN') : '',
        canAccept: app.status === 'pending',
        canReject: ['pending', 'accepted'].includes(app.status),
        canEarlyFinish: ['confirmed', 'working'].includes(app.status),
        canSetSupervisor: ['accepted', 'confirmed', 'working', 'done'].includes(app.status),
      };
    }));

    const summary = {
      pendingCount: enrichedApplicants.filter((item) => item.status === 'pending').length,
      acceptedCount: enrichedApplicants.filter((item) => item.status === 'accepted').length,
      confirmedCount: enrichedApplicants.filter((item) => ['confirmed', 'working', 'done'].includes(item.status)).length,
      attendanceConfirmedCount: enrichedApplicants.filter((item) => item.status === 'confirmed').length,
      workingCount: enrichedApplicants.filter((item) => item.status === 'working').length,
      doneCount: enrichedApplicants.filter((item) => item.status === 'done').length,
      activeCount: enrichedApplicants.filter((item) => ['confirmed', 'working', 'done'].includes(item.status)).length,
      rejectedCount: enrichedApplicants.filter((item) => item.status === 'rejected').length,
      supervisor: enrichedApplicants.find((item) => item.isSupervisor) || null,
    };

    return {
      job: {
        id: job.id,
        title: job.title,
        jobType: job.jobType || '',
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
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('报名记录不存在');
    if (app.status !== 'pending') throw new BadRequestException('当前状态不可录用');

    app.status = 'accepted';
    app.acceptedAt = new Date();
    await this.appRepo.save(app);

    const companyName = await this.getEnterpriseCompanyName(job.userId, '企业');
    await this.notiRepo.save(this.notiRepo.create({
      userId: workerId,
      type: 'job_apply',
      title: '报名已录用',
      content: `${companyName}已录用你报名的“${job.title}”，请尽快确认出勤`,
      link: '/pages/my-applications/my-applications',
      data: { jobId, workerId, status: 'accepted' },
    }));

    return { message: '已录用' };
  }

  async rejectApplication(jobId: number, workerId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('报名记录不存在');
    if (!['pending', 'accepted'].includes(app.status)) throw new BadRequestException('当前状态不可拒绝');

    app.status = 'rejected';
    app.isSupervisor = 0;
    app.rejectedAt = new Date();
    await this.appRepo.save(app);

    const companyName = await this.getEnterpriseCompanyName(job.userId, '企业');
    await this.notiRepo.save(this.notiRepo.create({
      userId: workerId,
      type: 'job_apply',
      title: '报名未通过',
      content: `${companyName}未通过你报名的“${job.title}”`,
      link: '/pages/my-applications/my-applications',
      data: { jobId, workerId, status: 'rejected' },
    }));

    return { message: '已拒绝' };
  }

  async earlyFinishApplication(jobId: number, workerId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('报名记录不存在');
    if (!['confirmed', 'working'].includes(app.status)) {
      throw new BadRequestException('当前状态不可提前结束');
    }

    app.status = 'done';
    await this.appRepo.save(app);

    const companyName = await this.getEnterpriseCompanyName(job.userId, '企业');
    await this.notiRepo.save(this.notiRepo.create({
      userId: workerId,
      type: 'job_apply',
      title: '订单已提前结束',
      content: `${companyName}已提前结束你在"${job.title}"的工作`,
      link: '/pages/my-applications/my-applications',
      data: { jobId, workerId, status: 'done', earlyFinish: true },
    }));

    return { message: '已提前结束' };
  }

  async setSupervisor(jobId: number, userId: number, dto: { workerId: number }) {
    void jobId;
    void userId;
    void dto;
    throw new ForbiddenException('主管需由后台设置');
  }

  async create(userId: number, dto: any) {
    const payload = this.normalizeCreateDto(dto);
    if (!payload.title) throw new BadRequestException('请输入招工标题');
    if (!payload.jobType) throw new BadRequestException('\u8bf7\u9009\u62e9\u5de5\u79cd');
    if (!(payload.salary > 0)) throw new BadRequestException('请输入正确工价');
    if (!(payload.needCount > 0)) throw new BadRequestException('请输入招工人数');
    if (!payload.location) throw new BadRequestException('请选择工作地点');
    if (!payload.contactName) throw new BadRequestException('请输入联系人');
    if (!payload.showPhone && !payload.showWechat && !payload.showWechatQr) {
      throw new BadRequestException('请至少选择一种联系方式');
    }
    if (payload.showPhone && !payload.contactPhone) throw new BadRequestException('请输入联系电话');
    if (payload.showWechat && !payload.contactWechat) throw new BadRequestException('请填写微信号');
    if (payload.showWechatQr && !payload.contactWechatQr) throw new BadRequestException('请上传微信二维码');
    if (!payload.dateStart || !payload.dateEnd) throw new BadRequestException('请选择工作日期');
    let resolvedOpenCityId: number | null = null;
    const createOpenCityId = Number(payload.openCityId);
    if (Number.isFinite(createOpenCityId) && createOpenCityId > 0) {
      await this.assertOpenCityActive(createOpenCityId);
      resolvedOpenCityId = createOpenCityId;
    } else {
      resolvedOpenCityId = (await this.resolveDefaultOpenCityId()) ?? null;
    }

    await this.checkKeywords(payload.title + (payload.description || ''));
    const existing = await this.findRecentDuplicateJob(userId, payload);
    if (existing) return existing;
    const submitter = await this.userRepo.findOneBy({ id: userId });

    await this.wechatSecurityService.assertSafeSubmission({
      texts: [payload],
      images: [payload.images, payload.contactWechatQr, payload.videos],
      openid: submitter?.openid,
    });

    const job = this.jobRepo.create({
      ...payload,
      openCityId: resolvedOpenCityId,
      userId,
    });
    return this.jobRepo.save(job);
  }

  async update(id: number, userId: number, dto: any) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job || job.userId !== userId) throw new ForbiddenException('无权操作');
    const submitter = await this.userRepo.findOneBy({ id: userId });
    await this.checkKeywords((dto.title || '') + (dto.description || ''));
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [dto],
      images: [dto.images, dto.contactWechatQr, dto.videos],
      openid: submitter?.openid,
    });
    const { openCityId: rawOc, ...rest } = dto || {};
    if (rawOc !== undefined && rawOc !== null && rawOc !== '') {
      const ocid = parseInt(String(rawOc), 10);
      if (Number.isFinite(ocid) && ocid > 0) {
        await this.assertOpenCityActive(ocid);
        job.openCityId = ocid;
      } else {
        job.openCityId = (await this.resolveDefaultOpenCityId()) ?? null;
      }
    }
    Object.assign(job, rest);
    if (Object.prototype.hasOwnProperty.call(dto, 'videos')) {
      job.videos = this.normalizeImages(dto.videos) ?? null;
    }
    return this.jobRepo.save(job);
  }

  async remove(id: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const applicationCount = await this.appRepo.count({ where: { jobId: id } });
    if (applicationCount > 0) {
      throw new BadRequestException('已有报名记录，无法直接删除，请先完成当前招工流程');
    }

    await this.jobRepo.delete(id);
    return { message: '删除成功' };
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
    if (job && this.isSameUserId(job.userId, userId)) {
      job.userId = userId as any;
    }
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const durationDays = Number(dto.durationDays || 0);
    if (!durationDays || durationDays < 1) throw new BadRequestException('急招时长不能为空');

    const pricingList = await this.buildUrgentPricingForUser(user);
    const pricing = pricingList.find((item) => item.durationDays === durationDays);
    if (!pricing) throw new BadRequestException('不支持的急招时长');
    const actualCost = pricing.beanCost;

    if (user.beanBalance < actualCost) throw new BadRequestException('灵豆不足');

    user.beanBalance -= actualCost;
    await this.userRepo.save(user);

    job.urgent = 1;
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + durationDays);
    job.urgentExpireAt = expireAt;
    await this.jobRepo.save(job);

    await this.beanTxRepo.save(this.beanTxRepo.create({
      userId,
      type: 'promote',
      amount: -actualCost,
      refType: 'job',
      refId: jobId,
      remark: this.isMemberActive(user)
        ? `设置急招${durationDays}天(会员折扣)`
        : `设置急招${durationDays}天`,
    }));

    await this.notiRepo.save(this.notiRepo.create({
      userId,
      type: 'promotion' as any,
      title: '急招设置成功',
      content: `您的招工信息已设置急招${durationDays}天，消耗${actualCost}灵豆`,
    }));

    return { message: '设置成功', beanBalance: user.beanBalance, actualCost, durationDays };
  }
}
