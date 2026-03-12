import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post('send')
  async sendNotification(
    @Body() dto: any,
  ) {
    return this.notificationService.sendNotification(
      dto.userId,
      dto.type,
      dto.title,
      dto.content,
      dto.relatedId,
      dto.relatedType,
    );
  }

  @Get('list')
  async getNotifications(
    @CurrentUser('sub') userId: number,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.notificationService.getNotifications(userId, limit, offset);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('sub') userId: number,
  ) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Post(':id/read')
  async markAsRead(
    @Param('id') notificationId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.notificationService.markAsRead(notificationId, userId);
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @CurrentUser('sub') userId: number,
  ) {
    await this.notificationService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id') notificationId: number,
    @CurrentUser('sub') userId: number,
  ) {
    await this.notificationService.deleteNotification(notificationId, userId);
    return { success: true };
  }
}
