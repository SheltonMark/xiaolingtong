import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobApplication, Job])],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}
