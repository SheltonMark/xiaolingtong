import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationTriggerService } from './notification-trigger.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationService, NotificationTriggerService],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationTriggerService],
})
export class NotificationModule {}
