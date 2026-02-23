import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  getBalance(@CurrentUser('sub') userId: number) {
    return this.walletService.getBalance(userId);
  }

  @Get('transactions')
  getTransactions(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.walletService.getTransactions(userId, query);
  }

  @Get('income')
  getIncome(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.walletService.getIncome(userId, query);
  }

  @Post('withdraw')
  withdraw(@CurrentUser('sub') userId: number, @Body('amount') amount: number) {
    return this.walletService.withdraw(userId, amount);
  }
}
