import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Public()
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.adminService.login(body.username, body.password);
  }

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('users')
  userList(@Query() query: any) {
    return this.adminService.userList(query);
  }

  @Put('users/:id/ban')
  banUser(@Param('id') id: number) {
    return this.adminService.banUser(id);
  }

  @Put('users/:id/unban')
  unbanUser(@Param('id') id: number) {
    return this.adminService.unbanUser(id);
  }

  @Get('posts')
  postList(@Query() query: any) {
    return this.adminService.postList(query);
  }

  @Put('posts/:id/audit')
  auditPost(@Param('id') id: number, @Body('action') action: string) {
    return this.adminService.auditPost(id, action);
  }

  @Get('jobs')
  jobList(@Query() query: any) {
    return this.adminService.jobList(query);
  }

  @Get('exposures')
  exposureList(@Query() query: any) {
    return this.adminService.exposureList(query);
  }

  @Delete('exposures/:id')
  deleteExposure(@Param('id') id: number) {
    return this.adminService.deleteExposure(id);
  }

  @Get('reports')
  reportList(@Query() query: any) {
    return this.adminService.reportList(query);
  }

  @Put('reports/:id/handle')
  handleReport(@Param('id') id: number, @Body('action') action: string) {
    return this.adminService.handleReport(id, action);
  }
}
