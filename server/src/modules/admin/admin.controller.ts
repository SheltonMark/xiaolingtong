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

  // 认证审核
  @Get('certs')
  certList(@Query() query: any) {
    return this.adminService.certList(query);
  }

  @Put('certs/:type/:id/audit')
  auditCert(@Param('type') type: string, @Param('id') id: number, @Body() body: { action: string; rejectReason?: string }) {
    return this.adminService.auditCert(type, id, body.action, body.rejectReason);
  }

  // 用户信用分
  @Put('users/:id/credit')
  updateUserCredit(@Param('id') id: number, @Body('creditScore') creditScore: number) {
    return this.adminService.updateUserCredit(id, creditScore);
  }

  // 关键词黑名单
  @Get('keywords')
  keywordList() {
    return this.adminService.keywordList();
  }

  @Post('keywords')
  addKeyword(@Body('word') word: string) {
    return this.adminService.addKeyword(word);
  }

  @Delete('keywords/:id')
  deleteKeyword(@Param('id') id: number) {
    return this.adminService.deleteKeyword(id);
  }

  // 公告管理
  @Get('notices')
  noticeList() {
    return this.adminService.noticeList();
  }

  @Post('notices')
  createNotice(@Body() dto: any) {
    return this.adminService.createNotice(dto);
  }

  @Put('notices/:id')
  updateNotice(@Param('id') id: number, @Body() dto: any) {
    return this.adminService.updateNotice(id, dto);
  }

  @Delete('notices/:id')
  deleteNotice(@Param('id') id: number) {
    return this.adminService.deleteNotice(id);
  }

  // 系统配置
  @Get('configs')
  configList() {
    return this.adminService.configList();
  }

  @Put('configs')
  updateConfig(@Body() body: { key: string; value: string }) {
    return this.adminService.updateConfig(body.key, body.value);
  }
}
