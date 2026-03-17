import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { JobService } from './job.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('jobs')
export class JobController {
  constructor(private jobService: JobService) {}

  @Public()
  @Get()
  list(@Query() query: any) {
    return this.jobService.list(query);
  }

  @Get('mine')
  @Roles('enterprise')
  myJobs(@CurrentUser('sub') userId: number) {
    return this.jobService.myJobs(userId);
  }

  @Get('manage/mine')
  @Roles('enterprise')
  manageJobs(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.jobService.manageJobs(userId, query);
  }

  @Get(':id/manage')
  @Roles('enterprise')
  manageDetail(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.jobService.manageDetail(Number(id), userId);
  }

  @Post(':id/applications/:workerId/accept')
  @Roles('enterprise')
  acceptApplication(
    @Param('id') id: number,
    @Param('workerId') workerId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.acceptApplication(Number(id), Number(workerId), userId);
  }

  @Post(':id/applications/:workerId/reject')
  @Roles('enterprise')
  rejectApplication(
    @Param('id') id: number,
    @Param('workerId') workerId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.rejectApplication(Number(id), Number(workerId), userId);
  }

  @Post(':id/supervisor')
  @Roles('enterprise')
  setSupervisor(
    @Param('id') id: number,
    @CurrentUser('sub') userId: number,
    @Body() dto: { workerId: number },
  ) {
    return this.jobService.setSupervisor(Number(id), userId, dto);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: number) {
    return this.jobService.detail(id);
  }

  @Post()
  @Roles('enterprise')
  create(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.jobService.create(userId, dto);
  }

  @Put(':id')
  @Roles('enterprise')
  update(@Param('id') id: number, @CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.jobService.update(id, userId, dto);
  }

  @Get('urgent/pricing')
  @Roles('enterprise')
  getUrgentPricing(@CurrentUser('sub') userId: number) {
    return this.jobService.getUrgentPricing(userId);
  }

  @Post(':id/set-urgent')
  @Roles('enterprise')
  setUrgent(@Param('id') id: number, @CurrentUser('sub') userId: number, @Body() dto: { durationDays: number }) {
    return this.jobService.setUrgent(id, userId, dto);
  }
}
