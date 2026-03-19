import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkStart } from '../../entities/work-start.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Checkin, WorkLog, JobApplication, Job, User, EnterpriseCert, WorkStart])],
  controllers: [WorkController],
  providers: [WorkService],
})
export class WorkModule {}
