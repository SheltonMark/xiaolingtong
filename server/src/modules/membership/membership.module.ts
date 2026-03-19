import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemberOrder, User, SysConfig]),
    PaymentModule,
  ],
  controllers: [MembershipController],
  providers: [MembershipService],
})
export class MembershipModule {}
