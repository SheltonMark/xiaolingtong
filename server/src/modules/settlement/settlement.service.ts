import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
  ) {}

  async getSettlementDashboard(userId: number) {
    const jobs = await this.jobRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    const grouped = {
      recruiting: [],
      full: [],
      completed: []
    };

    for (const job of jobs) {
      const appliedCount = await this.appRepo.count({ where: { jobId: job.id } });

      const jobInfo = {
        id: job.id,
        title: job.title,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        appliedCount,
        dateRange: `${job.dateStart}~${job.dateEnd}`,
        status: job.status,
        createdAt: job.createdAt
      };

      if (job.status === 'recruiting') {
        grouped.recruiting.push(jobInfo);
      } else if (job.status === 'full') {
        grouped.full.push(jobInfo);
      } else {
        grouped.completed.push(jobInfo);
      }
    }

    return grouped;
  }

  async getJobApplications(jobId: number, userId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new ForbiddenException('No permission to view this job');
    }

    const applications = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
      order: { createdAt: 'DESC' }
    });

    const grouped = {
      pending: [],
      accepted: [],
      confirmed: [],
      working: [],
      done: [],
      rejected: [],
      released: [],
      cancelled: []
    };

    applications.forEach((app) => {
      const formatted = {
        id: app.id,
        workerId: app.worker.id,
        workerName: app.worker.nickname,
        workerPhone: app.worker.phone,
        workerCredit: app.worker.creditScore,
        workerOrders: app.worker.totalOrders,
        status: app.status,
        appliedAt: app.createdAt,
        isSupervisor: app.isSupervisor
      };

      grouped[app.status].push(formatted);
    });

    return grouped;
  }

  async getSettlementRecords(userId: number) {
    const jobs = await this.jobRepo.find({
      where: { userId },
      relations: ['applications']
    });

    const records = [];

    for (const job of jobs) {
      const completedApps = job.applications.filter(app => app.status === 'done');

      if (completedApps.length > 0) {
        const totalAmount = completedApps.reduce((sum, app) => {
          return sum + (job.salary * (job.salaryType === 'hourly' ? 8 : 1));
        }, 0);

        records.push({
          jobId: job.id,
          jobTitle: job.title,
          completedCount: completedApps.length,
          totalAmount,
          status: 'pending_settlement',
          createdAt: job.createdAt
        });
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getPaymentRecords(userId: number) {
    return [];
  }
}
