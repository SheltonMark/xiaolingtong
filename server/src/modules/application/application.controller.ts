import { Controller, Get, Post, Put, Param, Query } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
export class ApplicationController {
  constructor(private appService: ApplicationService) {}

  @Post('jobs/:id/apply')
  @Roles('worker')
  apply(@Param('id') jobId: number, @CurrentUser('sub') userId: number) {
    return this.appService.apply(jobId, userId);
  }

  @Post('jobs/:id/confirm')
  @Roles('worker')
  confirm(@Param('id') jobId: number, @CurrentUser('sub') userId: number) {
    return this.appService.confirm(jobId, userId);
  }

  @Get('applications')
  myApplications(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.appService.myApplications(userId, query);
  }

  @Put('applications/:id/cancel')
  cancel(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.appService.cancel(id, userId);
  }
}
