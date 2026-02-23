import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {}

  async apply(jobId: number, workerId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.status !== 'recruiting') throw new BadRequestException('该岗位已停止招聘');

    const existing = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (existing) throw new BadRequestException('已报名');

    const app = this.appRepo.create({ jobId, workerId, status: 'pending' });
    return this.appRepo.save(app);
  }

  async confirm(jobId: number, workerId: number) {
    const app = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (!app) throw new BadRequestException('未找到报名记录');
    if (app.status !== 'pending') throw new BadRequestException('当前状态不可确认');

    app.status = 'confirmed';
    app.confirmedAt = new Date();
    return this.appRepo.save(app);
  }

  async myApplications(workerId: number, query: any) {
    const { status, page = 1, pageSize = 20 } = query;
    const qb = this.appRepo.createQueryBuilder('a')
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
    if (!app || app.workerId !== workerId) throw new ForbiddenException('无权操作');
    if (!['pending', 'confirmed'].includes(app.status)) throw new BadRequestException('当前状态不可取消');

    app.status = 'cancelled';
    await this.appRepo.save(app);
    return { message: '已取消' };
  }
}
