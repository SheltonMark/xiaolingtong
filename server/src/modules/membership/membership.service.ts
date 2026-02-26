import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MemberOrder) private orderRepo: Repository<MemberOrder>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  async subscribe(userId: number, dto: any) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new Error('用户不存在');

    const order = this.orderRepo.create({
      userId, planName: dto.planName, price: dto.price,
      durationDays: dto.durationDays, payStatus: 'pending',
    });
    await this.orderRepo.save(order);

    const outTradeNo = this.paymentService.generateOutTradeNo('MBR', order.id);
    const host = this.config.get('API_HOST', 'http://49.235.166.177:3000');
    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `小灵通会员-${dto.planName}`,
      totalFee: Math.round(dto.price * 100),
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return { orderId: order.id, ...result };
  }
}
