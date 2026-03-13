import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobScheduler } from './job.scheduler';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Keyword, JobApplication, Supervisor, User]),
    ScheduleModule.forRoot(),
  ],
  controllers: [JobController],
  providers: [JobService, JobScheduler],
  exports: [JobService],
})
export class JobModule {}
