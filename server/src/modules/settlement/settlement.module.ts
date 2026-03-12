import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { SettlementsController } from './settlement.controller';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobApplication])],
  providers: [SettlementService],
  controllers: [SettlementController, SettlementsController],
  exports: [SettlementService],
})
export class SettlementModule {}
