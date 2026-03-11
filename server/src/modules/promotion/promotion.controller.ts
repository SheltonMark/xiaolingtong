import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class PromotionController {
  constructor(private promoService: PromotionService) {}

  @Post('promotions')
  promote(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.promoService.promote(userId, dto);
  }

  @Post('ads/purchase')
  purchaseAd(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.promoService.purchaseAd(userId, dto);
  }

  @Public()
  @Get('ads/active')
  getActiveAds(@Query('slot') slot?: string) {
    return this.promoService.getActiveAds(slot || 'banner');
  }
}
