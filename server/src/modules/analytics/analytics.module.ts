import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Rating } from '../../entities/rating.entity';
import { JobApplication } from '../../entities/job-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, User, WorkLog, Rating, JobApplication])],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
