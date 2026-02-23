import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MemberOrder) private orderRepo: Repository<MemberOrder>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async subscribe(userId: number, dto: any) {
    // TODO: 接入微信支付
    const order = this.orderRepo.create({
      userId, planName: dto.planName, price: dto.price,
      durationDays: dto.durationDays, payStatus: 'paid', paidAt: new Date(),
    });

    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + dto.durationDays);
    order.expireAt = expireAt;
    await this.orderRepo.save(order);

    await this.userRepo.update(userId, { isMember: 1, memberExpireAt: expireAt });
    return { message: '开通成功', expireAt };
  }
}
