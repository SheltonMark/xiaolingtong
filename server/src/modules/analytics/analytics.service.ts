import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Rating } from '../../entities/rating.entity';
import { JobApplication } from '../../entities/job-application.entity';
import {
  JobStatsDto,
  WorkerStatsDto,
  PlatformStatsDto,
  TimelineStatsDto,
} from './analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
    @InjectRepository(Rating) private ratingRepo: Repository<Rating>,
    @InjectRepository(JobApplication)
    private jobApplicationRepo: Repository<JobApplication>,
  ) {}

  async getJobStats(jobId: number): Promise<JobStatsDto> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const ratings = await this.ratingRepo.find({ where: { jobId } });
    const applications = await this.jobApplicationRepo.find({
      where: { jobId },
    });

    const averageRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) *
              100,
          ) / 100
        : 0;

    return {
      jobId: job.id,
      title: job.title,
      publishedAt: job.createdAt,
      completedCount: 0, // Will be calculated from work logs
      averageRating,
      totalApplications: applications.length,
    };
  }

  async getWorkerStats(workerId: number): Promise<WorkerStatsDto> {
    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }

    const workLogs = await this.workLogRepo.find({ where: { workerId } });
    const ratings = await this.ratingRepo.find({
      where: { ratedId: workerId },
    });

    const averageRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) *
              100,
          ) / 100
        : 0;

    // Calculate total income from work logs (simplified - would need job salary info in real scenario)
    const totalIncome = 0;

    return {
      workerId: worker.id,
      nickname: worker.nickname || 'Unknown',
      completedJobs: workLogs.length,
      totalIncome,
      averageRating,
      totalRatings: ratings.length,
    };
  }

  async getPlatformStats(): Promise<PlatformStatsDto> {
    const users = await this.userRepo.find();
    const ratings = await this.ratingRepo.find();

    const totalJobs = await this.jobRepo.count();
    const totalUsers = await this.userRepo.count();

    const workers = users.filter((u) => u.role === 'worker');
    const enterprises = users.filter((u) => u.role === 'enterprise');

    const averagePlatformRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) *
              100,
          ) / 100
        : 0;

    // Calculate total income from settled jobs (simplified)
    const totalIncome = 0;

    return {
      totalJobs,
      totalIncome,
      activeUsers: totalUsers,
      totalWorkers: workers.length,
      totalEnterprises: enterprises.length,
      averagePlatformRating,
    };
  }

  async getTimelineStats(
    period: 'daily' | 'weekly' | 'monthly',
    date: string,
  ): Promise<TimelineStatsDto> {
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      throw new BadRequestException(`Invalid period: ${period}`);
    }

    const startDate = this.getStartDate(period, date);
    const endDate = this.getEndDate(period, date);

    // Get jobs published in the period
    const jobsQuery = this.jobRepo.createQueryBuilder('job');
    jobsQuery.where('job.createdAt >= :startDate', { startDate });
    jobsQuery.andWhere('job.createdAt <= :endDate', { endDate });
    const jobsPublished = await jobsQuery.getMany();

    // Get new users in the period
    const usersQuery = this.userRepo.createQueryBuilder('user');
    usersQuery.where('user.createdAt >= :startDate', { startDate });
    usersQuery.andWhere('user.createdAt <= :endDate', { endDate });
    const newUsers = await usersQuery.getMany();

    // Get ratings in the period
    const ratingsQuery = this.ratingRepo.createQueryBuilder('rating');
    ratingsQuery.where('rating.createdAt >= :startDate', { startDate });
    ratingsQuery.andWhere('rating.createdAt <= :endDate', { endDate });
    const periodRatings = await ratingsQuery.getMany();

    const averageRating =
      periodRatings.length > 0
        ? Math.round(
            (periodRatings.reduce((sum, r) => sum + r.score, 0) /
              periodRatings.length) *
              100,
          ) / 100
        : 0;

    return {
      period,
      date,
      jobsPublished: jobsPublished.length,
      jobsCompleted: 0, // Would need to calculate from work logs
      totalIncome: 0, // Would need to calculate from settlements
      newUsers: newUsers.length,
      averageRating,
    };
  }

  private getStartDate(period: string, dateStr: string): Date {
    const date = new Date(dateStr);

    if (period === 'daily') {
      date.setHours(0, 0, 0, 0);
      return date;
    }

    if (period === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day;
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    if (period === 'monthly') {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    return date;
  }

  private getEndDate(period: string, dateStr: string): Date {
    const date = new Date(dateStr);

    if (period === 'daily') {
      date.setHours(23, 59, 59, 999);
      return date;
    }

    if (period === 'weekly') {
      const day = date.getDay();
      const diff = date.getDate() - day + 6;
      date.setDate(diff);
      date.setHours(23, 59, 59, 999);
      return date;
    }

    if (period === 'monthly') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    }

    return date;
  }
}
