import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { WorkService } from './work.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('work')
export class WorkController {
  constructor(private workService: WorkService) {}

  @Get('orders')
  getOrders(@CurrentUser('sub') userId: number) {
    return this.workService.getOrders(userId);
  }

  @Get('session/:jobId')
  getSession(@Param('jobId') jobId: number) {
    return this.workService.getSession(jobId);
  }

  @Post('checkin')
  checkin(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.checkin(userId, dto);
  }

  @Post('log')
  submitLog(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.submitLog(userId, dto);
  }

  @Post('anomaly')
  recordAnomaly(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.recordAnomaly(userId, dto);
  }
}
