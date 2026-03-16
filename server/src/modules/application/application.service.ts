import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
  ) {}

  async apply(jobId: number, workerId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new BadRequestException('招工信息不存在');
    if (job.status !== 'recruiting') throw new BadRequestException('该岗位已停止招聘');

    const existing = await this.appRepo.findOne({ where: { jobId, workerId } });
    if (existing) throw new BadRequestException('已报名');

    // 超额报名控制
    const cfg = await this.configRepo.findOne({ where: { key: 'over_apply_rate' } });
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
    if (app.status !== 'accepted') throw new BadRequestException('当前状态不可确认');

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

    const userIds = list.map(app => app.job?.userId).filter(Boolean);
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

    const formattedList = list.map(app => {
      const job = app.job;
      if (!job) return app;
      const cert = certMap.get(job.userId);
      const companyName = cert?.companyName || job.user?.nickname || '企业用户';
      return {
        ...app,
        job: {
          ...job,
          companyName,
          avatarUrl: job.user?.avatarUrl || ''
        }
      };
    });

    return { list: formattedList, total, page: +page, pageSize: +pageSize };
  }

  async cancel(id: number, workerId: number) {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app || app.workerId !== workerId) throw new ForbiddenException('无权操作');
    if (!['pending', 'accepted', 'confirmed'].includes(app.status)) throw new BadRequestException('当前状态不可取消');

    app.status = 'cancelled';
    await this.appRepo.save(app);
    return { message: '已取消' };
  }
}
