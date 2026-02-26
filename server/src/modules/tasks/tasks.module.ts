import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { User } from '../../entities/user.entity';
import { AdOrder } from '../../entities/ad-order.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, AdOrder]),
  ],
  providers: [TasksService],
})
export class TasksModule {}
