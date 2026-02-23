import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';

@Injectable()
export class BeanService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
  ) {}

  async getBalance(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    return { beanBalance: user.beanBalance };
  }

  async recharge(userId: number, amount: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    user.beanBalance += amount;
    await this.userRepo.save(user);

    await this.beanTxRepo.save(this.beanTxRepo.create({
      userId, type: 'recharge', amount,
      remark: `充值${amount}灵豆`,
    }));

    return { beanBalance: user.beanBalance };
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
