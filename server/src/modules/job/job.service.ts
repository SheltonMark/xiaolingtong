import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { JobStateMachine } from './job-state-machine';
import { getWorkerStatusDisplay, getEnterpriseStatusDisplay, getStatusColor } from './status-mapping';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

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

    if (keyword) qb.andWhere('j.title LIKE :kw', { kw: `%${keyword}%` });
    if (salaryType) qb.andWhere('j.salaryType = :salaryType', { salaryType });
    if (minSalary) qb.andWhere('j.salary >= :minSalary', { minSalary });
    if (maxSalary) qb.andWhere('j.salary <= :maxSalary', { maxSalary });

    qb.orderBy('j.urgent', 'DESC')
      .addOrderBy('j.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    // 格式化列表数据
    const formattedList = await Promise.all(list.map(async (job) => {
      const appliedCount = await this.appRepo.count({ where: { jobId: job.id } });

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
        cityDistrict: this.extractCityDistrict(job.location),
        dateRange: job.dateStart && job.dateEnd ? `${job.dateStart}~${job.dateEnd}` : '',
        publishDate: job.createdAt ? new Date(job.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '',
        desc: job.description || '',
        urgent: job.urgent === 1,
        images: job.images || [],
        tags: benefitTags,
        allTags,
        companyName: job.user?.nickname || '企业用户',
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
        name: job.user?.nickname || '企业用户',
        verified: false,
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
        createdAt: job.createdAt,
        viewCount: 0 // TODO: 实现浏览次数统计
      };
    }));

    return { list: formattedJobs };
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

  async updateApplicationStatus(
    applicationId: number,
    newStatus: string,
    userId: number,
  ): Promise<JobApplication> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (!JobStateMachine.canTransition(application.status, newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${application.status} to ${newStatus}`,
      );
    }

    application.status = newStatus;
    if (newStatus === 'confirmed') {
      application.confirmedAt = new Date();
    }

    return this.appRepo.save(application);
  }

  async acceptApplication(
    applicationId: number,
    action: 'accepted' | 'rejected',
    userId: number,
  ): Promise<JobApplication> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // 验证权限：只有工作发布者可以接受/拒绝
    if (application.job.userId !== userId) {
      throw new ForbiddenException('You do not have permission to accept this application');
    }

    // 验证状态：只有 pending 状态可以接受/拒绝
    if (application.status !== 'pending') {
      throw new BadRequestException('Application is not in pending status');
    }

    return this.updateApplicationStatus(applicationId, action, userId);
  }

  async selectSupervisor(
    jobId: number,
    workerId: number,
    userId: number,
  ): Promise<JobApplication> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new ForbiddenException('You do not have permission to manage this job');
    }

    const application = await this.appRepo.findOne({
      where: { jobId, workerId, status: 'accepted' },
    });

    if (!application) {
      throw new NotFoundException('Application not found or not in accepted status');
    }

    // 验证临工资格
    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    if (!worker || worker.creditScore < 95 || worker.totalOrders < 10) {
      throw new BadRequestException('Worker does not meet supervisor requirements');
    }

    // 更新为 confirmed 并标记为管理员
    application.status = 'confirmed';
    application.isSupervisor = 1;
    application.confirmedAt = new Date();

    return this.appRepo.save(application);
  }

  async confirmAttendance(
    applicationId: number,
    workerId: number,
  ): Promise<JobApplication> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId, workerId, status: 'accepted' },
    });

    if (!application) {
      throw new NotFoundException('Application not found or not in accepted status');
    }

    application.status = 'confirmed';
    application.confirmedAt = new Date();

    return this.appRepo.save(application);
  }

  async getMyApplications(workerId: number) {
    const applications = await this.appRepo.find({
      where: { workerId },
      relations: ['job', 'job.user'],
      order: { createdAt: 'DESC' },
    });

    // 按状态分类
    const grouped = {
      pending: [],
      accepted: [],
      confirmed: [],
      working: [],
      done: [],
    };

    applications.forEach((app) => {
      const formatted = {
        ...app,
        displayStatus: getWorkerStatusDisplay(app.status),
        statusColor: getStatusColor(app.status)
      };

      // 将 pending 和 accepted 都归到 pending 分类
      if (app.status === 'pending' || app.status === 'accepted') {
        grouped.pending.push(formatted);
      } else if (app.status === 'confirmed') {
        grouped.confirmed.push(formatted);
      } else if (app.status === 'working') {
        grouped.working.push(formatted);
      } else if (app.status === 'done') {
        grouped.done.push(formatted);
      }
    });

    return grouped;
  }

  async getApplicationsForEnterprise(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this job');
    }

    const applications = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });

    // 按状态分类
    const grouped = {
      pending: [],
      accepted: [],
      confirmed: [],
    };

    applications.forEach((app) => {
      const formatted = {
        ...app,
        displayStatus: getEnterpriseStatusDisplay(app.status),
        statusColor: getStatusColor(app.status)
      };

      if (app.status === 'pending') {
        grouped.pending.push({
          ...formatted,
          worker: {
            id: app.worker.id,
            name: app.worker.nickname,
            creditScore: app.worker.creditScore,
            totalOrders: app.worker.totalOrders,
          },
        });
      } else if (app.status === 'accepted') {
        grouped.accepted.push(formatted);
      } else if (app.status === 'confirmed') {
        grouped.confirmed.push({
          ...formatted,
          isSupervisor: app.isSupervisor,
        });
      }
    });

    return grouped;
  }

  async checkTimeConflict(workerId: number, jobId: number): Promise<any[]> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const { In } = require('typeorm');
    const confirmedApps = await this.appRepo.find({
      where: { workerId, status: In(['accepted', 'confirmed', 'working']) },
      relations: ['job']
    });

    const conflicts: any[] = [];

    for (const app of confirmedApps) {
      if (this.hasTimeOverlap(job, app.job)) {
        conflicts.push({
          jobId: app.jobId,
          jobTitle: app.job.title,
          dateRange: `${app.job.dateStart}~${app.job.dateEnd}`,
          workHours: app.job.workHours
        });
      }
    }

    return conflicts;
  }

  private hasTimeOverlap(job1: Job, job2: Job): boolean {
    const start1 = new Date(job1.dateStart);
    const end1 = new Date(job1.dateEnd);
    const start2 = new Date(job2.dateStart);
    const end2 = new Date(job2.dateEnd);

    // 日期不重叠
    if (end1 < start2 || end2 < start1) return false;

    // 日期重叠，检查时间段
    if (job1.workHours && job2.workHours) {
      const [s1, e1] = job1.workHours.split('-');
      const [s2, e2] = job2.workHours.split('-');
      return !(e1 <= s2 || e2 <= s1);
    }

    return true;
  }

  async applyJob(jobId: number, workerId: number): Promise<any> {
    // 检查时间冲突
    const conflicts = await this.checkTimeConflict(workerId, jobId);
    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: '工作时间冲突',
        conflictWith: conflicts
      });
    }

    // 创建应用
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const application = this.appRepo.create({
      jobId,
      workerId,
      status: 'pending'
    });

    return this.appRepo.save(application);
  }

  calculateCancellationPenalty(job: Job, cancelledAt: Date): any {
    const workStart = new Date(`${job.dateStart}T${job.workHours.split('-')[0]}`);
    const hoursBeforeWork = (workStart.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

    if (hoursBeforeWork >= 24) {
      return { creditDeduction: 0, restrictionDays: 0, message: '无惩罚' };
    } else if (hoursBeforeWork >= 12) {
      return { creditDeduction: 5, restrictionDays: 0, message: '扣信用分5分' };
    } else if (hoursBeforeWork > 0) {
      return { creditDeduction: 10, restrictionDays: 1, message: '扣信用分10分，限制报名24小时' };
    } else {
      return { creditDeduction: 20, restrictionDays: 7, message: '扣信用分20分，限制报名7天' };
    }
  }

  async getMyApplicationsGrouped(workerId: number) {
    const applications = await this.appRepo.find({
      where: { workerId },
      relations: ['job', 'job.user'],
      order: { createdAt: 'DESC' },
    });

    const grouped = {
      normal: { pending: [], confirmed: [], working: [], done: [] },
      exception: { rejected: [], released: [], cancelled: [] }
    };

    applications.forEach((app) => {
      const formatted = {
        ...app,
        displayStatus: getWorkerStatusDisplay(app.status),
        statusColor: getStatusColor(app.status)
      };

      if (['pending', 'confirmed', 'working', 'done'].includes(app.status)) {
        grouped.normal[app.status].push(formatted);
      } else if (['rejected', 'released', 'cancelled'].includes(app.status)) {
        grouped.exception[app.status].push(formatted);
      }
    });

    return grouped;
  }

  async cancelApplication(applicationId: number, workerId: number): Promise<any> {
    const app = await this.appRepo.findOne({
      where: { id: applicationId, workerId },
      relations: ['job']
    });

    if (!app) throw new NotFoundException('Application not found');

    // 检查是否允许取消
    const allowedStatuses = ['pending', 'accepted', 'confirmed'];
    if (!allowedStatuses.includes(app.status)) {
      throw new BadRequestException(`Cannot cancel application in ${app.status} status`);
    }

    // 计算惩罚
    const penalty = this.calculateCancellationPenalty(app.job, new Date());

    // 更新应用状态
    app.status = 'cancelled';
    await this.appRepo.save(app);

    // 扣信用分
    if (penalty.creditDeduction > 0) {
      const worker = await this.userRepo.findOne({ where: { id: workerId } });
      if (worker) {
        worker.creditScore -= penalty.creditDeduction;
        await this.userRepo.save(worker);
      }
    }

    return { id: app.id, status: 'cancelled', penalty };
  }

  async getEligibleSupervisors(jobId: number, userId: number): Promise<any[]> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new ForbiddenException('No permission to manage this job');
    }

    // 获取该工作的所有已接受的应用
    const { In } = require('typeorm');
    const acceptedApps = await this.appRepo.find({
      where: { jobId, status: In(['accepted', 'confirmed']) },
      relations: ['worker']
    });

    // 筛选符合条件的临工（信用分≥95，订单数≥10）
    const eligible = acceptedApps
      .filter(app => app.worker.creditScore >= 95 && app.worker.totalOrders >= 10)
      .map(app => ({
        id: app.id,
        workerId: app.worker.id,
        workerName: app.worker.nickname,
        creditScore: app.worker.creditScore,
        totalOrders: app.worker.totalOrders,
        phone: app.worker.phone,
        status: app.status,
        isSupervisor: app.isSupervisor
      }));

    return eligible;
  }
}
