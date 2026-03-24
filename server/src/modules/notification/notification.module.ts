import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from '../../entities/notification.entity';
import { Notice } from '../../entities/notice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Notice])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
