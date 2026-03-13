import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeService } from './dispute.service';
import { Dispute } from '../../entities/dispute.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, Job, User])],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
