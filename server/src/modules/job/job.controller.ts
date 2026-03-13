import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { JobService } from './job.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AcceptApplicationDto } from './dto/accept-application.dto';
import { SelectSupervisorDto } from './dto/select-supervisor.dto';

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
  update(
    @Param('id') id: number,
    @CurrentUser('sub') userId: number,
    @Body() dto: any,
  ) {
    return this.jobService.update(id, userId, dto);
  }

  @Post(':jobId/applications/:applicationId/accept')
  @Roles('enterprise')
  acceptApplication(
    @Param('jobId') jobId: number,
    @Param('applicationId') applicationId: number,
    @Body() dto: AcceptApplicationDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.acceptApplication(applicationId, dto.action, userId);
  }

  @Post(':jobId/select-supervisor')
  @Roles('enterprise')
  selectSupervisor(
    @Param('jobId') jobId: number,
    @Body() dto: SelectSupervisorDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.selectSupervisor(jobId, dto.workerId, userId);
  }

  @Post('applications/:applicationId/confirm-attendance')
  @Roles('worker')
  confirmAttendance(
    @Param('applicationId') applicationId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.confirmAttendance(applicationId, userId);
  }

  @Get('my-applications')
  @Roles('worker')
  getMyApplications(@CurrentUser('sub') userId: number) {
    return this.jobService.getMyApplications(userId);
  }

  @Get(':jobId/applications')
  @Roles('enterprise')
  getApplicationsForEnterprise(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.getApplicationsForEnterprise(jobId, userId);
  }

  @Post(':jobId/check-in')
  checkIn(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') workerId: number,
  ) {
    return this.jobService.checkIn(jobId, workerId);
  }

  @Post(':jobId/check-out')
  checkOut(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') workerId: number,
  ) {
    return this.jobService.checkOut(jobId, workerId);
  }

  @Get(':jobId/attendances')
  @Roles('enterprise')
  getAttendances(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.getAttendances(jobId, userId);
  }

  @Post(':jobId/work-logs')
  @Roles('worker')
  recordWorkLog(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') workerId: number,
    @Body() dto: any,
  ) {
    return this.jobService.recordWorkLog(
      jobId,
      workerId,
      dto.date,
      dto.hours,
      dto.pieces,
    );
  }

  @Get(':jobId/work-logs')
  @Roles('enterprise')
  getWorkLogs(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.getWorkLogs(jobId);
  }

  @Put('work-logs/:workLogId/confirm')
  @Roles('enterprise')
  confirmWorkLog(
    @Param('workLogId') workLogId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.jobService.confirmWorkLog(workLogId);
  }

  @Put('work-logs/:workLogId/anomaly')
  @Roles('worker')
  updateWorkLogAnomaly(
    @Param('workLogId') workLogId: number,
    @CurrentUser('sub') userId: number,
    @Body() dto: any,
  ) {
    return this.jobService.updateWorkLogAnomaly(
      workLogId,
      dto.anomalyType,
      dto.anomalyNote,
    );
  }
}
