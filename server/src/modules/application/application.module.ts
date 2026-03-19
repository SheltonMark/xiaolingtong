import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkLog } from '../../entities/work-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobApplication, Job, User, SysConfig, EnterpriseCert, WorkLog])],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
