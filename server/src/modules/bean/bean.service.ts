import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { BeanOrder } from '../../entities/bean-order.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class BeanService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction)
    private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(BeanOrder) private beanOrderRepo: Repository<BeanOrder>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  async getBalance(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const transactions = await this.beanTxRepo.find({ where: { userId } });
    let totalIn = 0;
    let totalOut = 0;
    const inTypes = ['income', 'invite_reward', 'admin_add', 'recharge', 'reward'];
    const outTypes = ['expense', 'admin_deduct', 'unlock_contact', 'promote', 'promotion'];
    transactions.forEach((tx) => {
      if (inTypes.includes(tx.type)) {
        totalIn += Math.abs(tx.amount);
      } else if (outTypes.includes(tx.type) || tx.amount < 0) {
        totalOut += Math.abs(tx.amount);
      } else if (tx.amount > 0) {
        totalIn += tx.amount;
      }
    });

    return { beanBalance: user.beanBalance, totalIn, totalOut };
  }

  async recharge(userId: number, dto: { amount: number; price: number }) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const outTradeNo = this.paymentService.generateOutTradeNo('BEAN', 0);
    const totalFee = Math.round(dto.price * 100);
    const host = this.config.get('API_HOST', 'https://quanqiutong888.com');

    // 保存订单信息
    await this.beanOrderRepo.save(
      this.beanOrderRepo.create({
        userId,
        outTradeNo,
        beanAmount: dto.amount,
        totalFee,
        payStatus: 'pending',
      }),
    );

    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `小灵通灵豆充值-${dto.amount}个`,
      totalFee,
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return { outTradeNo, ...result };
  }

  async getTransactions(userId: number, query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.beanTxRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }
}
