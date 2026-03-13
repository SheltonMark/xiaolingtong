import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { Attendance } from '../../entities/attendance.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobStateMachine } from './job-state-machine';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(JobApplication)
    private appRepo: Repository<JobApplication>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Supervisor) private supervisorRepo: Repository<Supervisor>,
    @InjectRepository(Attendance) private attendanceRepo: Repository<Attendance>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
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
    const match = fullAddress.match(
      /(?:.*?[省市])?([^省]+?[市州盟])([^市县区]+?[县区镇乡])/,
    );
    if (match) {
      const city = match[1].replace(/市$/, '');
      const district = match[2].replace(/[县区镇乡]$/, '');
      return `${city}·${district}`;
    }
    // 如果匹配失败，尝试简单提取
    const simpleMatch = fullAddress.match(/([^省]+?[市州盟])([^市]+)/);
    if (simpleMatch) {
      return (
        simpleMatch[1].replace(/市$/, '') + '·' + simpleMatch[2].substring(0, 4)
      );
    }
    return fullAddress.substring(0, 20);
  }

  private normalizeCreateDto(dto: any) {
    const salary = Number(dto.salary || dto.price || 0);
    const needCount = Number(dto.needCount || dto.headcount || dto.need || 0);
    const salaryType = this.parseSalaryType(dto.salaryType || dto.salaryMode);
    const salaryUnit =
      this.normalizeText(dto.salaryUnit) ||
      (salaryType === 'hourly' ? '元/时' : '元/件');
    const location = this.normalizeText(dto.location || dto.address);
    const dateStart = this.normalizeText(dto.dateStart || dto.startDate);
    const dateEnd = this.normalizeText(dto.dateEnd || dto.endDate);
    const startTime = this.normalizeText(dto.startTime);
    const endTime = this.normalizeText(dto.endTime);
    const workHours =
      this.normalizeText(dto.workHours) ||
      (startTime && endTime ? `${startTime}-${endTime}` : '');

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
    const {
      keyword,
      salaryType,
      minSalary,
      maxSalary,
      page = 1,
      pageSize = 20,
    } = query;
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.user', 'u')
      .where('j.status IN (:...statuses)', {
        statuses: ['recruiting', 'full'],
      });

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
    const formattedList = await Promise.all(
      list.map(async (job) => {
        const appliedCount = await this.appRepo.count({
          where: { jobId: job.id },
        });

        // 格式化福利标签
        const benefitTags = (job.benefits || []).map((b: any) => ({
          label: typeof b === 'string' ? b : b.label,
          bg: '#ECFDF5',
          color: '#10B981',
        }));

        // 添加工作时间标签
        const timeTags = job.workHours
          ? [
              {
                label: job.workHours,
                bg: '#EFF6FF',
                color: '#3B82F6',
              },
            ]
          : [];

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
          dateRange:
            job.dateStart && job.dateEnd
              ? `${job.dateStart}~${job.dateEnd}`
              : '',
          publishDate: job.createdAt
            ? new Date(job.createdAt)
                .toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                })
                .replace(/\//g, '-')
            : '',
          desc: job.description || '',
          urgent: job.urgent === 1,
          images: job.images || [],
          tags: benefitTags,
          allTags,
          companyName: job.user?.nickname || '企业用户',
          time: job.createdAt
            ? new Date(job.createdAt)
                .toLocaleDateString('zh-CN')
                .replace(/\//g, '-')
            : '',
        };
      }),
    );

    return { list: formattedList, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number) {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!job) throw new BadRequestException('招工信息不存在');

    // 查询报名人数
    const appliedCount = await this.appRepo.count({ where: { jobId: id } });

    // 格式化返回数据
    const salaryTypeMap = { hourly: '计时', piece: '计件' };
    const dateRange =
      job.dateStart && job.dateEnd
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
        phone: job.contactPhone || job.user?.phone || '',
      },
    };
  }

  async myJobs(userId: number) {
    const jobs = await this.jobRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const formattedJobs = await Promise.all(
      jobs.map(async (job) => {
        const appliedCount = await this.appRepo.count({
          where: { jobId: job.id },
        });
        return {
          id: job.id,
          type: 'job',
          title: job.title,
          salary: job.salary,
          salaryUnit: job.salaryUnit,
          needCount: job.needCount,
          appliedCount,
          dateRange:
            job.dateStart && job.dateEnd
              ? `${job.dateStart}~${job.dateEnd}`
              : '',
          workHours: job.workHours,
          cityDistrict: this.extractCityDistrict(job.location),
          status: job.status,
          createdAt: job.createdAt,
          viewCount: 0, // TODO: 实现浏览次数统计
        };
      }),
    );

    return { list: formattedJobs };
  }

  async create(userId: number, dto: any) {
    const payload = this.normalizeCreateDto(dto);
    if (!payload.title) throw new BadRequestException('请输入招工标题');
    if (!(payload.salary > 0)) throw new BadRequestException('请输入正确工价');
    if (!(payload.needCount > 0))
      throw new BadRequestException('请输入招工人数');
    if (!payload.location) throw new BadRequestException('请选择工作地点');
    if (!payload.contactName) throw new BadRequestException('请输入联系人');
    if (!payload.contactPhone) throw new BadRequestException('请输入联系电话');
    if (!payload.dateStart || !payload.dateEnd)
      throw new BadRequestException('请选择工作日期');

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
      throw new ForbiddenException(
        'You do not have permission to accept this application',
      );
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
    // 验证工作存在
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new ForbiddenException(
        'You do not have permission to manage this job',
      );
    }

    // 验证权限
    if (job.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to manage this job',
      );
    }

    // 验证应用存在且状态为 accepted
    const application = await this.appRepo.findOne({
      where: { jobId, workerId, status: 'accepted' },
    });

    if (!application) {
      throw new NotFoundException(
        'Application not found or not in accepted status',
      );
    }

    // 验证工人存在
    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new BadRequestException(
        'Worker does not meet supervisor requirements',
      );
    }

    // 验证工人资格 - 分别返回不同的错误消息
    if (worker.creditScore < 95) {
      throw new BadRequestException(
        'Worker credit score must be at least 95',
      );
    }

    if (worker.totalOrders < 10) {
      throw new BadRequestException(
        'Worker must have at least 10 completed orders',
      );
    }

    // 检查是否已有主管
    const existingSupervisor = await this.supervisorRepo.findOne({
      where: { jobId },
    });

    if (existingSupervisor) {
      throw new BadRequestException('Supervisor already selected for this job');
    }

    // 创建 Supervisor 记录
    const supervisor = this.supervisorRepo.create({
      jobId,
      supervisorId: workerId,
      status: 'active',
      supervisoryFee: 0,
      managedWorkerCount: 0,
    });

    await this.supervisorRepo.save(supervisor);

    // 更新应用状态为 confirmed 并标记为主管
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
      throw new NotFoundException(
        'Application not found or not in accepted status',
      );
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
      // 将 pending 和 accepted 都归到 pending 分类
      if (app.status === 'pending' || app.status === 'accepted') {
        grouped.pending.push(app);
      } else if (app.status === 'confirmed') {
        grouped.confirmed.push(app);
      } else if (app.status === 'working') {
        grouped.working.push(app);
      } else if (app.status === 'done') {
        grouped.done.push(app);
      }
    });

    return grouped;
  }

  async getApplicationsForEnterprise(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this job',
      );
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
      if (app.status === 'pending') {
        grouped.pending.push({
          ...app,
          worker: {
            id: app.worker.id,
            name: app.worker.nickname,
            creditScore: app.worker.creditScore,
            totalOrders: app.worker.totalOrders,
          },
        });
      } else if (app.status === 'accepted') {
        grouped.accepted.push(app);
      } else if (app.status === 'confirmed') {
        grouped.confirmed.push({
          ...app,
          isSupervisor: app.isSupervisor,
        });
      }
    });

    return grouped;
  }

  async checkIn(jobId: number, workerId: number): Promise<Attendance> {
    // 验证工作存在
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // 验证工人存在
    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    // 验证工人已确认出勤（应用状态为 confirmed）
    const application = await this.appRepo.findOne({
      where: { jobId, workerId, status: 'confirmed' },
    });
    if (!application) {
      throw new BadRequestException('Worker not confirmed for this job');
    }

    // 检查是否已签到（防止重复签到）
    const existing = await this.attendanceRepo.findOne({
      where: { jobId, workerId, status: 'checked_in' },
    });

    if (existing) {
      throw new BadRequestException('Already checked in');
    }

    const attendance = this.attendanceRepo.create({
      jobId,
      workerId,
      status: 'checked_in',
      checkInTime: new Date(),
    });

    return this.attendanceRepo.save(attendance);
  }

  async checkOut(jobId: number, workerId: number): Promise<Attendance> {
    const attendance = await this.attendanceRepo.findOne({
      where: { jobId, workerId, status: 'checked_in' },
    });

    if (!attendance) {
      throw new NotFoundException('No active check-in found');
    }

    // 验证签到时间有效
    if (!attendance.checkInTime) {
      throw new BadRequestException('Invalid check-in time');
    }

    // 计算工作小时数
    const checkOutTime = new Date();
    const timeDiff = checkOutTime.getTime() - attendance.checkInTime.getTime();

    // 检查时间是否为负（系统时间不同步）
    if (timeDiff < 0) {
      throw new BadRequestException(
        'Check-out time cannot be before check-in time',
      );
    }

    const workHours = timeDiff / (1000 * 60 * 60);

    // 设置最大工作小时数限制（24 小时）
    if (workHours > 24) {
      throw new BadRequestException('Work hours cannot exceed 24 hours');
    }

    // 更新考勤记录
    attendance.status = 'checked_out';
    attendance.checkOutTime = checkOutTime;
    attendance.workHours = Math.round(workHours * 100) / 100;

    return this.attendanceRepo.save(attendance);
  }

  async getAttendances(jobId: number, userId: number): Promise<Attendance[]> {
    // 验证工作存在且属于当前用户
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view attendances for this job',
      );
    }

    // 返回考勤记录
    return this.attendanceRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });
  }

  async recordWorkLog(
    jobId: number,
    workerId: number,
    date: string,
    hours: number,
    pieces: number = 0,
  ) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (hours < 0 || hours > 24) {
      throw new BadRequestException('Work hours must be between 0 and 24');
    }

    if (pieces < 0) {
      throw new BadRequestException('Piece count cannot be negative');
    }

    const workLog = this.workLogRepo.create({
      jobId,
      workerId,
      date,
      hours,
      pieces,
      anomalyType: 'normal',
    });

    return this.workLogRepo.save(workLog);
  }

  async getWorkLogs(jobId: number) {
    return this.workLogRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });
  }

  async confirmWorkLog(workLogId: number) {
    const workLog = await this.workLogRepo.findOne({ where: { id: workLogId } });
    if (!workLog) {
      throw new NotFoundException('Work log not found');
    }

    return this.workLogRepo.save(workLog);
  }

  async updateWorkLogAnomaly(
    workLogId: number,
    anomalyType: string,
    anomalyNote?: string,
  ) {
    const validAnomalyTypes = ['normal', 'early_leave', 'late', 'injury', 'absent'];
    if (!validAnomalyTypes.includes(anomalyType)) {
      throw new BadRequestException('Invalid anomaly type');
    }

    const workLog = await this.workLogRepo.findOne({ where: { id: workLogId } });
    if (!workLog) {
      throw new NotFoundException('Work log not found');
    }

    workLog.anomalyType = anomalyType;
    if (anomalyNote) {
      workLog.anomalyNote = anomalyNote;
    }

    return this.workLogRepo.save(workLog);
  }
}
