import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class BeanService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  async getBalance(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    return { beanBalance: user.beanBalance };
  }

  async recharge(userId: number, dto: { amount: number; price: number }) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const outTradeNo = this.paymentService.generateOutTradeNo('BEAN', 0);
    const host = this.config.get('API_HOST', 'https://quanqiutong888.com');
    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `小灵通灵豆充值-${dto.amount}个`,
      totalFee: Math.round(dto.price * 100),
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return { outTradeNo, ...result };
  }

  async getTransactions(userId: number, query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.beanTxRepo.createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }
}
