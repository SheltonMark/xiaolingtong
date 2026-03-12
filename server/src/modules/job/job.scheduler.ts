import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class JobScheduler {
  constructor(
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  @Cron('0 * * * *') // 每小时执行一次
  async releaseUnconfirmedApplications() {
    // 获取所有 accepted 状态的报名
    const applications = await this.jobApplicationRepository.find({
      where: { status: 'accepted' },
      relations: ['job'],
    });

    const now = new Date();
    const releaseThreshold = 12 * 60 * 60 * 1000; // 12 小时

    for (const app of applications) {
      const jobStartTime = new Date(app.job.dateStart).getTime();
      const timeUntilStart = jobStartTime - now.getTime();

      // 如果距离工作开始时间少于 12 小时，且未确认，则释放
      if (timeUntilStart < releaseThreshold && !app.confirmedAt) {
        app.status = 'released';
        await this.jobApplicationRepository.save(app);
      }
    }
  }

  @Cron('0 * * * *') // 每小时执行一次
  async startWorkForConfirmedApplications() {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 当天开始时间

    // 获取所有 confirmed 状态的报名，且工作开始日期为今天
    const applications = await this.jobApplicationRepository.find({
      where: { status: 'confirmed' },
      relations: ['job'],
    });

    for (const app of applications) {
      const jobStartDate = new Date(app.job.dateStart);
      jobStartDate.setHours(0, 0, 0, 0);

      if (jobStartDate.getTime() === now.getTime()) {
        app.status = 'working';
        await this.jobApplicationRepository.save(app);
      }
    }
  }
}
