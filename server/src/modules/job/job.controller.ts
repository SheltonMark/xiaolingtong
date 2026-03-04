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
}
