import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeanController } from './bean.controller';
import { BeanService } from './bean.service';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { BeanOrder } from '../../entities/bean-order.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, BeanTransaction, BeanOrder]),
    PaymentModule,
  ],
  controllers: [BeanController],
  providers: [BeanService],
})
export class BeanModule {}
