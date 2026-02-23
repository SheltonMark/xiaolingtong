import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MemberOrder, User])],
  controllers: [MembershipController],
  providers: [MembershipService],
})
export class MembershipModule {}
