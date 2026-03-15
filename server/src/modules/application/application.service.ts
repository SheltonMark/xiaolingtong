import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { WorkLog } from '../../entities/work-log.entity';
import {
  getWorkerStatusDisplay,
  getEnterpriseStatusDisplay,
  getStatusColor,
} from './status-mapping';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(JobApplication)
    private appRepo: Repository<JobApplication>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
  ) {}

  /**
   * 检查时间冲突
   * 获取临工所有"已接受"和"已确认"的应用，检查新报名工作时间是否与其重叠
   */
  private checkTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    // 时间重叠判断：
    // 新工作开始时间 < 已有工作结束时间 AND 新工作结束时间 > 已有工作开始时间
    return start1 < end2 && end1 > start2;
  }

  private async checkTimeConflict(workerId: number, newJob: Job) {
    // 获取该临工所有"已接受"和"已确认"的应用
    const activeApps = await this.appRepo.find({
      where: [
        { workerId, status: 'accepted' },
        { workerId, status: 'confirmed' },
        { workerId, status: 'working' },
      ],
      relations: ['job'],
    });

    const conflicts: any[] = [];
    for (const app of activeApps) {
      const existingJob = app.job;
      // 检查日期是否重叠
      if (
        this.checkTimeOverlap(
          newJob.dateStart,
          newJob.dateEnd,
          existingJob.dateStart,
          existingJob.dateEnd,
        )
      ) {
        conflicts.push({
          jobId: existingJob.id,
          jobTitle: existingJob.title,
          dateRange: `${existingJob.dateStart} 至 ${existingJob.dateEnd}`,
          workHours: existingJob.workHours || '未指定',
          status: app.status,
        });
      }
    }

    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: '报名时间与已报名工作冲突',
        conflictWith: conflicts,
      });
    }
  }

  async apply(jobId: number, workerId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.status !== 'recruiting')
      throw new BadRequestException('该岗位已停止招聘');

    const existing = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (existing) throw new BadRequestException('已报名');

    // 检查时间冲突
    await this.checkTimeConflict(workerId, job);

    // 超额报名控制
    const cfg = await this.configRepo.findOne({
      where: { key: 'over_apply_rate' },
    });
    const overRate = cfg ? +cfg.value : 0.5;
    const maxApply = Math.ceil(job.needCount * (1 + overRate));
    const currentCount = await this.appRepo.count({ where: { jobId } });
    if (currentCount >= maxApply) throw new BadRequestException('报名人数已满');

    const app = this.appRepo.create({ jobId, workerId, status: 'pending' });
    return this.appRepo.save(app);
  }

  async confirm(jobId: number, workerId: number) {
    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('未找到报名记录');
    if (app.status !== 'accepted')
      throw new BadRequestException('当前状态不可确认');

    app.status = 'confirmed';
    app.confirmedAt = new Date();
    return this.appRepo.save(app);
  }

  async myApplications(workerId: number, query: any) {
    const { status, page = 1, pageSize = 20 } = query;
    const qb = this.appRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.job', 'j')
      .leftJoinAndSelect('j.user', 'u')
      .where('a.workerId = :workerId', { workerId });

    if (status) qb.andWhere('a.status = :status', { status });

    qb.orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async cancel(id: number, workerId: number) {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app || app.workerId !== workerId)
      throw new ForbiddenException('无权操作');
    if (!['pending', 'accepted', 'confirmed'].includes(app.status))
      throw new BadRequestException('当前状态不可取消');

    app.status = 'cancelled';
    await this.appRepo.save(app);
    return { message: '已取消' };
  }

  async getMyApplicationsGrouped(workerId: number) {
    const apps = await this.appRepo.find({
      where: { workerId },
      relations: ['job', 'job.user'],
      order: { createdAt: 'DESC' },
    });

    const normal: any[] = [];
    const exception: any[] = [];

    for (const app of apps) {
      const item = {
        ...app,
        displayStatus: getWorkerStatusDisplay(app.status),
        statusColor: getStatusColor(app.status),
      };

      if (
        ['pending', 'accepted', 'confirmed', 'working', 'done'].includes(
          app.status,
        )
      ) {
        normal.push(item);
      } else {
        exception.push(item);
      }
    }

    return { normal, exception };
  }

  async getApplicationsForEnterpriseGrouped(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权查看');

    const apps = await this.appRepo.find({
      where: { jobId },
      relations: ['job', 'job.user'],
      order: { createdAt: 'DESC' },
    });

    const normal: any[] = [];
    const exception: any[] = [];

    for (const app of apps) {
      const item = {
        ...app,
        displayStatus: getEnterpriseStatusDisplay(app.status),
        statusColor: getStatusColor(app.status),
      };

      if (
        ['pending', 'accepted', 'confirmed', 'working', 'done'].includes(
          app.status,
        )
      ) {
        normal.push(item);
      } else {
        exception.push(item);
      }
    }

    return { normal, exception };
  }

  /**
   * 获取工作的所有应聘者列表（企业端）
   */
  async getJobApplications(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权查看');

    const apps = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });

    return {
      list: apps.map(app => ({
        id: app.id,
        jobId: app.jobId,
        workerId: app.workerId,
        status: app.status,
        appliedAt: app.createdAt,
        worker: {
          id: app.worker.id,
          name: app.worker.name,
          creditScore: app.worker.creditScore || 0,
          completedJobs: app.worker.completedJobs || 0,
          averageRating: app.worker.averageRating || 0,
        },
      })),
    };
  }

  /**
   * 企业接受应聘者
   */
  async acceptApplication(jobId: number, appId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { id: appId, jobId } });
    if (!app) throw new BadRequestException('应聘记录不存在');
    if (app.status !== 'pending')
      throw new BadRequestException('只能接受待审核的应聘者');

    app.status = 'accepted';
    app.acceptedAt = new Date();
    await this.appRepo.save(app);

    return {
      id: app.id,
      status: app.status,
      acceptedAt: app.acceptedAt,
    };
  }

  /**
   * 企业拒绝应聘者
   */
  async rejectApplication(jobId: number, appId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.userId !== userId) throw new ForbiddenException('无权操作');

    const app = await this.appRepo.findOne({ where: { id: appId, jobId } });
    if (!app) throw new BadRequestException('应聘记录不存在');
    if (app.status !== 'pending')
      throw new BadRequestException('只能拒绝待审核的应聘者');

    app.status = 'rejected';
    app.rejectedAt = new Date();
    await this.appRepo.save(app);

    return {
      id: app.id,
      status: app.status,
      rejectedAt: app.rejectedAt,
    };
  }

  /**
   * 获取临工的工作记录（接单记录）
   */
  async getWorkOrders(workerId: number) {
    const workLogs = await this.workLogRepo.find({
      where: { workerId },
      relations: ['job', 'job.user'],
      order: { date: 'DESC' },
    });

    return workLogs.map(log => ({
      id: log.id,
      jobId: log.jobId,
      date: log.date,
      hours: log.hours,
      pieces: log.pieces,
      photoUrls: log.photoUrls || [],
      anomalyType: log.anomalyType,
      anomalyNote: log.anomalyNote,
      createdAt: log.createdAt,
      job: log.job ? {
        id: log.job.id,
        title: log.job.title,
        location: log.job.location,
        salary: log.job.salary,
        salaryUnit: log.job.salaryUnit,
        salaryType: log.job.salaryType,
      } : null,
      company: log.job?.user ? {
        id: log.job.user.id,
        name: log.job.user.name || log.job.user.nickname || '企业用户',
        avatarUrl: log.job.user.avatarUrl,
      } : null,
    }));
  }
}
