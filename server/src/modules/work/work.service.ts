import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class WorkService {
  constructor(
    @InjectRepository(Checkin) private checkinRepo: Repository<Checkin>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
    @InjectRepository(JobApplication)
    private appRepo: Repository<JobApplication>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getOrders(userId: number) {
    // 获取该临工所有的 work_logs 记录
    const workLogs = await this.workLogRepo.find({
      where: { workerId: userId },
      order: { date: 'DESC' },
    });

    if (workLogs.length === 0) {
      return [];
    }

    // 获取所有对应的 job_applications 记录
    const jobIds = [...new Set(workLogs.map(log => log.jobId))];
    const applications = await this.appRepo.find({
      where: { workerId: userId, jobId: In(jobIds) },
      relations: ['job', 'job.user'],
    });

    // 按 jobId 分组 work_logs
    const workLogMap = new Map();
    workLogs.forEach(log => {
      if (!workLogMap.has(log.jobId)) {
        workLogMap.set(log.jobId, []);
      }
      workLogMap.get(log.jobId).push(log);
    });

    // 返回 job_applications 记录，包含对应的 work_logs 数据
    return applications.map(app => {
      const logs = workLogMap.get(app.jobId) || [];
      const latestLog = logs[0]; // 最新的 work_log

      return {
        id: app.id,
        jobId: app.jobId,
        workerId: app.workerId,
        status: app.status,
        createdAt: app.createdAt,
        confirmedAt: app.confirmedAt,
        // work_logs 数据
        workLogId: latestLog?.id,
        date: latestLog?.date,
        hours: latestLog?.hours || 0,
        pieces: latestLog?.pieces || 0,
        photoUrls: latestLog?.photoUrls || [],
        anomalyType: latestLog?.anomalyType || 'normal',
        anomalyNote: latestLog?.anomalyNote || '',
        // job 信息
        job: app.job ? {
          id: app.job.id,
          title: app.job.title,
          location: app.job.location,
          salary: app.job.salary,
          salaryUnit: app.job.salaryUnit,
          salaryType: app.job.salaryType,
        } : null,
        // company 信息
        company: app.job?.user ? {
          id: app.job.user.id,
          name: app.job.user.name || app.job.user.nickname || '企业用户',
          avatarUrl: app.job.user.avatarUrl,
        } : null,
      };
    });
  }

  async getSession(jobId: number) {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
    if (!job) return { job: null };

    // 已签到工人
    const checkins = await this.checkinRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { checkInAt: 'ASC' },
    });

    // 工作记录
    const logs = await this.workLogRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });

    // 参与的工人列表
    const workers = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
    });
    const confirmedWorkers = workers.filter((w) =>
      ['confirmed', 'working', 'done'].includes(w.status),
    );

    return { job, checkins, logs, workers: confirmedWorkers };
  }

  async checkin(workerId: number, dto: any) {
    const checkin = this.checkinRepo.create({
      jobId: dto.jobId,
      workerId,
      checkInAt: new Date(),
      checkInType: dto.type || 'location',
      lat: dto.lat,
      lng: dto.lng,
      photoUrl: dto.photoUrl,
    });
    await this.checkinRepo.save(checkin);

    // 第一个人签到时，Job 状态从 full → working
    const job = await this.jobRepo.findOneBy({ id: dto.jobId });
    if (job && job.status === 'full') {
      await this.jobRepo.update(dto.jobId, { status: 'working' });
    }

    // application 状态改为 working
    await this.appRepo.update(
      { jobId: dto.jobId, workerId },
      { status: 'working' },
    );

    return checkin;
  }

  async submitLog(workerId: number, dto: any) {
    const log = this.workLogRepo.create({
      jobId: dto.jobId,
      workerId,
      date: dto.date || new Date().toISOString().slice(0, 10),
      hours: dto.hours,
      pieces: dto.pieces,
      photoUrls: dto.photoUrls,
    });
    return this.workLogRepo.save(log);
  }

  async recordAnomaly(workerId: number, dto: any) {
    const log = this.workLogRepo.create({
      jobId: dto.jobId,
      workerId: dto.targetWorkerId || workerId,
      date: dto.date || new Date().toISOString().slice(0, 10),
      anomalyType: dto.anomalyType,
      anomalyNote: dto.anomalyNote,
      photoUrls: dto.photoUrls,
    });
    await this.workLogRepo.save(log);

    // 信用分扣分
    const targetId = dto.targetWorkerId || workerId;
    const penaltyMap: Record<string, number> = {
      absent: 5,
      early_leave: 5,
      late: 2,
      injury: 0,
      fraud: 20,
    };
    const penalty = penaltyMap[dto.anomalyType] || 0;
    if (penalty > 0) {
      await this.userRepo.decrement({ id: targetId }, 'creditScore', penalty);
    }

    return log;
  }
}
