import { Controller, Get, Post, Param } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('settlements')
export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  @Get(':jobId')
  detail(@Param('jobId') jobId: number) {
    return this.settlementService.detail(jobId);
  }

  @Post(':jobId/create')
  create(@Param('jobId') jobId: number, @CurrentUser('sub') userId: number) {
    return this.settlementService.createSettlement(jobId, userId);
  }

  @Post(':jobId/pay')
  pay(@Param('jobId') jobId: number, @CurrentUser('sub') userId: number) {
    return this.settlementService.pay(jobId, userId);
  }

  @Post(':jobId/confirm')
  confirmByWorker(
    @Param('jobId') jobId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.settlementService.confirmByWorker(jobId, userId);
  }
}
