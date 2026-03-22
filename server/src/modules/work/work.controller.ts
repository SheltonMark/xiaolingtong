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
  getSession(@CurrentUser('sub') userId: number, @Param('jobId') jobId: number) {
    return this.workService.getSession(Number(jobId), userId);
  }

  @Post('session/:jobId/start')
  confirmStart(@CurrentUser('sub') userId: number, @Param('jobId') jobId: number, @Body() dto: any) {
    return this.workService.confirmStart(userId, Number(jobId), dto);
  }

  @Post('checkin')
  checkin(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.checkin(userId, dto);
  }

  @Post('log')
  submitLog(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.submitLog(userId, dto);
  }

  @Post('log/quick-checkout')
  quickCheckout(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.quickCheckout(userId, dto);
  }

  @Post('log/status')
  updateLogStatus(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.updateLogStatus(userId, dto);
  }

  @Post('anomaly')
  recordAnomaly(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.recordAnomaly(userId, dto);
  }

  @Post('attendance')
  submitAttendance(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.submitAttendance(userId, dto);
  }

  @Get('attendance/:jobId')
  getAttendance(@Param('jobId') jobId: number, @Query('date') date?: string) {
    return this.workService.getAttendance(Number(jobId), date);
  }

  @Get('attendance/:jobId/:date')
  getAttendanceByDate(@Param('jobId') jobId: number, @Param('date') date: string) {
    return this.workService.getAttendance(Number(jobId), date);
  }

  @Post('attendance/:jobId/confirm')
  confirmAttendance(@CurrentUser('sub') userId: number, @Param('jobId') jobId: number) {
    return this.workService.confirmAttendance(userId, Number(jobId));
  }
}
