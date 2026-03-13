import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDisputeDto, ResolveDisputeDto } from './dispute.dto';

@Controller('disputes')
export class DisputeController {
  constructor(private disputeService: DisputeService) {}

  @Post()
  @Roles('worker', 'enterprise')
  async createDispute(
    @CurrentUser('sub') userId: number,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputeService.createDispute(userId, dto);
  }

  @Get()
  @Roles('admin')
  async getDisputes(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.disputeService.getDisputes(page, pageSize);
  }

  @Get('user/:userId')
  async getUserDisputes(
    @Param('userId') userId: number,
    @Query('role') role: 'complainant' | 'respondent',
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.disputeService.getDisputesByUser(userId, role, page, pageSize);
  }

  @Get(':id')
  async getDisputeById(@Param('id') id: number) {
    return this.disputeService.getDisputeById(id);
  }

  @Post(':id/resolve')
  @Roles('admin')
  async resolveDispute(
    @Param('id') id: number,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(id, dto);
  }

  @Get('stats/overview')
  @Roles('admin')
  async getDisputeStats() {
    return this.disputeService.getDisputeStats();
  }
}
