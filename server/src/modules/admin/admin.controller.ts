import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
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

  @Put('posts/:id')
  updatePost(@Param('id') id: number, @Body() dto: any) {
    return this.adminService.updatePost(id, dto);
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

  @Post('exposures/:id/approve')
  approveExposure(@Param('id') id: number) {
    return this.adminService.approveExposure(id);
  }

  @Post('exposures/:id/reject')
  rejectExposure(@Param('id') id: number) {
    return this.adminService.rejectExposure(id);
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
  auditCert(
    @Param('type') type: string,
    @Param('id') id: number,
    @Body() body: { action: string; rejectReason?: string },
  ) {
    return this.adminService.auditCert(
      type,
      id,
      body.action,
      body.rejectReason,
    );
  }

  // 用户信用分
  @Put('users/:id/credit')
  updateUserCredit(
    @Param('id') id: number,
    @Body('creditScore') creditScore: number,
  ) {
    return this.adminService.updateUserCredit(id, creditScore);
  }

  // 灵豆余额调整
  @Put('users/:id/bean-balance')
  updateBeanBalance(
    @Param('id') id: number,
    @Body() body: { amount: number; remark?: string },
  ) {
    return this.adminService.updateBeanBalance(id, body.amount, body.remark);
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

  @Get('users/:id/name')
  userName(@Param('id') id: number) {
    return this.adminService.userName(id);
  }

  // 用户详情
  @Get('users/:id/detail')
  userDetail(@Param('id') id: number) {
    return this.adminService.userDetail(id);
  }

  // 数据统计
  @Get('stats/overview')
  statsOverview() {
    return this.adminService.statsOverview();
  }

  @Get('pending-counts')
  pendingCounts() {
    return this.adminService.pendingCounts();
  }

  // 管理员账号管理
  @Get('admins')
  adminList() {
    return this.adminService.adminList();
  }

  @Post('admins')
  createAdmin(@Body() dto: any) {
    return this.adminService.createAdmin(dto);
  }

  @Put('admins/:id/toggle')
  toggleAdmin(@Param('id') id: number) {
    return this.adminService.toggleAdmin(id);
  }

  @Put('admins/:id/reset-pwd')
  resetAdminPwd(@Param('id') id: number) {
    return this.adminService.resetAdminPwd(id);
  }

  // 工种管理
  @Get('job-types')
  jobTypeList() {
    return this.adminService.jobTypeList();
  }

  @Post('job-types')
  addJobType(
    @Body()
    body: {
      name: string;
      defaultSettlement?: string;
      sort?: number;
      iconUrl?: string;
    },
  ) {
    return this.adminService.addJobType(
      body.name,
      body.defaultSettlement,
      body.sort,
      body.iconUrl,
    );
  }

  @Put('job-types/:id')
  updateJobType(@Param('id') id: number, @Body() body: any) {
    return this.adminService.updateJobType(id, body);
  }

  @Put('job-types/:id/toggle')
  toggleJobType(@Param('id') id: number) {
    return this.adminService.toggleJobType(id);
  }

  // 开放城市管理
  @Get('cities')
  cityList() {
    return this.adminService.cityList();
  }

  @Post('cities')
  addCity(@Body('name') name: string) {
    return this.adminService.addCity(name);
  }

  @Put('cities/:id/toggle')
  toggleCity(@Param('id') id: number) {
    return this.adminService.toggleCity(id);
  }

  // 广告管理
  @Get('ads')
  adList(@Query() query: any) {
    return this.adminService.adList(query);
  }

  @Post('ads')
  createAd(@Body() body: any) {
    return this.adminService.createAd(body);
  }

  @Put('ads/:id')
  updateAd(@Param('id') id: number, @Body() body: any) {
    return this.adminService.updateAd(id, body);
  }

  @Put('ads/:id/audit')
  auditAd(@Param('id') id: number, @Body('action') action: string) {
    return this.adminService.auditAd(id, action);
  }

  @Put('ads/:id/takedown')
  takedownAd(@Param('id') id: number) {
    return this.adminService.takedownAd(id);
  }

  // 品类标签管理
  @Get('categories')
  categoryList() {
    return this.adminService.categoryList();
  }

  @Post('categories')
  addCategory(
    @Body()
    body: {
      name: string;
      parentId?: number;
      level?: number;
      bizType?: string;
      iconUrl?: string;
    },
  ) {
    return this.adminService.addCategory(
      body.name,
      body.parentId || 0,
      body.level || 1,
      body.bizType,
      body.iconUrl,
    );
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: number, @Body() body: any) {
    return this.adminService.updateCategory(id, body);
  }

  @Put('categories/:id/toggle')
  toggleCategory(@Param('id') id: number) {
    return this.adminService.toggleCategory(id);
  }

  // 临时工业务看板
  @Get('job-dashboard')
  jobDashboard(@Query() query: any) {
    return this.adminService.jobDashboard(query);
  }

  @Get('job-dashboard/:id')
  jobDashboardDetail(@Param('id') id: number) {
    return this.adminService.jobDashboardDetail(Number(id));
  }

  // 财务管理
  @Get('finance')
  financeOverview() {
    return this.adminService.financeOverview();
  }

  @Get('finance-detail')
  financeDetail(@Query() query: any) {
    return this.adminService.financeDetail(query);
  }

  @Get('transactions')
  transactionList(@Query() query: any) {
    return this.adminService.transactionList(query);
  }

  // 用工订单管理
  @Get('job-orders')
  jobOrderList(@Query() query: any) {
    return this.adminService.jobOrderList(query);
  }

  @Get('job-orders/:id')
  jobOrderDetail(@Param('id') id: number) {
    return this.adminService.jobOrderDetail(id);
  }

  @Post('job-orders/:id/assign')
  assignWorkers(
    @Param('id') id: number,
    @Body() body: { workerIds: number[]; supervisorId: number },
  ) {
    return this.adminService.assignWorkers(id, body);
  }

  @Post('job-orders/:id/supervisor')
  setJobSupervisor(
    @Param('id') id: number,
    @Body() body: { workerId: number },
  ) {
    return this.adminService.setJobSupervisor(id, body);
  }

  @Put('job-orders/:id/manager-share')
  adjustManagerShare(
    @Param('id') id: number,
    @Body('managerShareRate') rate: number,
  ) {
    return this.adminService.adjustManagerShare(id, rate);
  }
}
