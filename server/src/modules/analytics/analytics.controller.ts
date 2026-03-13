import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('jobs/:jobId')
  @UseGuards(AuthGuard('jwt'))
  async getJobStats(@Param('jobId') jobId: number) {
    return this.analyticsService.getJobStats(jobId);
  }

  @Get('workers/:workerId')
  @UseGuards(AuthGuard('jwt'))
  async getWorkerStats(@Param('workerId') workerId: number) {
    return this.analyticsService.getWorkerStats(workerId);
  }

  @Get('platform')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('admin')
  async getPlatformStats() {
    return this.analyticsService.getPlatformStats();
  }

  @Get('timeline')
  @UseGuards(AuthGuard('jwt'), RoleGuard)
  @Roles('admin')
  async getTimelineStats(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('date') date?: string,
  ) {
    return this.analyticsService.getTimelineStats(period, date || new Date().toISOString().split('T')[0]);
  }
}
