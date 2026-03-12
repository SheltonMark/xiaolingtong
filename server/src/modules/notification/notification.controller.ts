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

  @Get('by-type')
  async getNotificationsByType(
    @CurrentUser('sub') userId: number,
    @Query('type') type: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.notificationService.getNotificationsByType(userId, type, limit, offset);
  }

  @Get('by-status')
  async getNotificationsByReadStatus(
    @CurrentUser('sub') userId: number,
    @Query('isRead') isRead: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const isReadBool = isRead === 'true';
    return this.notificationService.getNotificationsByReadStatus(userId, isReadBool, limit, offset);
  }

  @Get('by-related')
  async getNotificationsByRelated(
    @CurrentUser('sub') userId: number,
    @Query('relatedType') relatedType: string,
    @Query('relatedId') relatedId?: number,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.notificationService.getNotificationsByRelated(userId, relatedType, relatedId, limit, offset);
  }

  @Get('search')
  async searchNotifications(
    @CurrentUser('sub') userId: number,
    @Query('keyword') keyword: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.notificationService.searchNotifications(userId, keyword, limit, offset);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('sub') userId: number,
  ) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Get('unread-count-by-type')
  async getUnreadCountByType(
    @CurrentUser('sub') userId: number,
    @Query('type') type: string,
  ) {
    const count = await this.notificationService.getUnreadCountByType(userId, type);
    return { type, unreadCount: count };
  }

  @Get('stats')
  async getNotificationStats(
    @CurrentUser('sub') userId: number,
  ) {
    return this.notificationService.getNotificationStats(userId);
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

  @Post('mark-multiple-read')
  async markMultipleAsRead(
    @CurrentUser('sub') userId: number,
    @Body() dto: { notificationIds: number[] },
  ) {
    await this.notificationService.markMultipleAsRead(dto.notificationIds, userId);
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

  @Delete('batch')
  async deleteMultipleNotifications(
    @CurrentUser('sub') userId: number,
    @Body() dto: { notificationIds: number[] },
  ) {
    await this.notificationService.deleteMultipleNotifications(dto.notificationIds, userId);
    return { success: true };
  }

  @Post('cleanup-old')
  async deleteOldNotifications(
    @CurrentUser('sub') userId: number,
    @Body() dto: { daysOld?: number },
  ) {
    const daysOld = dto.daysOld || 30;
    const deleted = await this.notificationService.deleteOldNotifications(userId, daysOld);
    return { success: true, deleted };
  }
}

