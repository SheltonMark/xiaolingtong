import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { Promotion } from '../../entities/promotion.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { Notification } from '../../entities/notification.entity';
import { Notice } from '../../entities/notice.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promotion,
      AdOrder,
      User,
      BeanTransaction,
      SysConfig,
      Notification,
      Notice,
    ]),
    PaymentModule,
  ],
  controllers: [PromotionController],
  providers: [PromotionService],
})
export class PromotionModule {}
