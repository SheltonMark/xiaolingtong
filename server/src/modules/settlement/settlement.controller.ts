import { Controller, Get, Param } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('settlement')
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  @Get('dashboard')
  @Roles('enterprise')
  getDashboard(@CurrentUser('sub') userId: number) {
    return this.settlementService.getSettlementDashboard(userId);
  }

  @Get('jobs/:jobId/applications')
  @Roles('enterprise')
  getJobApplications(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.settlementService.getJobApplications(jobId, userId);
  }

  @Get('records')
  @Roles('enterprise')
  getSettlementRecords(@CurrentUser('sub') userId: number) {
    return this.settlementService.getSettlementRecords(userId);
  }

  @Get('payments')
  @Roles('enterprise')
  getPaymentRecords(@CurrentUser('sub') userId: number) {
    return this.settlementService.getPaymentRecords(userId);
  }
}

@Controller('settlements')
export class SettlementsController {
  constructor(private settlementService: SettlementService) {}

  @Get(':jobId')
  @Roles('enterprise')
  getSettlement(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.settlementService.getSettlement(jobId, userId);
  }
}
