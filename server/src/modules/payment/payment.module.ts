import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Job } from '../../entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    MemberOrder, User, BeanTransaction, AdOrder,
    Settlement, SettlementItem, Wallet, WalletTransaction, Job,
  ])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
