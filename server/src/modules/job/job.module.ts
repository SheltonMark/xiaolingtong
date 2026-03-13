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
import { Attendance } from '../../entities/attendance.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      Keyword,
      JobApplication,
      Supervisor,
      User,
      Attendance,
      WorkLog,
      WorkerCert,
      EnterpriseCert,
      BeanTransaction,
      Notification,
      SysConfig,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [JobController],
  providers: [JobService, JobScheduler],
  exports: [JobService],
})
export class JobModule {}
