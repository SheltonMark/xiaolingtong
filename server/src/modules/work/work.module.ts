import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Checkin, WorkLog])],
  controllers: [WorkController],
  providers: [WorkService],
})
export class WorkModule {}
