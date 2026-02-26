import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { BeanService } from './bean.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('beans')
export class BeanController {
  constructor(private beanService: BeanService) {}

  @Get('balance')
  getBalance(@CurrentUser('sub') userId: number) {
    return this.beanService.getBalance(userId);
  }

  @Post('recharge')
  recharge(@CurrentUser('sub') userId: number, @Body() dto: { amount: number; price: number }) {
    return this.beanService.recharge(userId, dto);
  }

  @Get('transactions')
  getTransactions(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.beanService.getTransactions(userId, query);
  }
}
