import { Controller, Get, Post, Put, Param, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private notiService: NotificationService) {}

  @Get('unread-count')
  unreadCount(@CurrentUser('sub') userId: number) {
    return this.notiService.unreadCount(userId);
  }

  @Get()
  list(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.notiService.list(userId, query);
  }

  @Post('read-all')
  readAll(@CurrentUser('sub') userId: number) {
    return this.notiService.readAll(userId);
  }

  @Put(':id/read')
  read(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.notiService.read(id, userId);
  }
}
