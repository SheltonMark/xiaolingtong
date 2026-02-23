import { Controller, Post, Body } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
}
