export class JobStatsDto {
  jobId: number;
  title: string;
  publishedAt: Date;
  completedCount: number;
  averageRating: number;
  totalApplications: number;
}

export class WorkerStatsDto {
  workerId: number;
  nickname: string;
  completedJobs: number;
  totalIncome: number;
  averageRating: number;
  totalRatings: number;
}

export class PlatformStatsDto {
  totalJobs: number;
  totalIncome: number;
  activeUsers: number;
  totalWorkers: number;
  totalEnterprises: number;
  averagePlatformRating: number;
}

export class TimelineStatsDto {
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  jobsPublished: number;
  jobsCompleted: number;
  totalIncome: number;
  newUsers: number;
  averageRating: number;
}
