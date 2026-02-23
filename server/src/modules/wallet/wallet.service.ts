import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private txRepo: Repository<WalletTransaction>,
  ) {}

  async getBalance(userId: number) {
    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.walletRepo.save(this.walletRepo.create({ userId }));
    }
    return wallet;
  }

  async getTransactions(userId: number, query: any) {
    const { type, page = 1, pageSize = 20 } = query;
    const qb = this.txRepo.createQueryBuilder('t')
      .where('t.userId = :userId', { userId });
    if (type) qb.andWhere('t.type = :type', { type });
    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async getIncome(userId: number, query: any) {
    const { month } = query; // 格式 2026-02
    const qb = this.txRepo.createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :type', { type: 'income' })
      .andWhere('t.status = :status', { status: 'success' });
    if (month) {
      qb.andWhere('DATE_FORMAT(t.createdAt, "%Y-%m") = :month', { month });
    }
    qb.orderBy('t.createdAt', 'DESC');
    const list = await qb.getMany();
    const totalAmount = list.reduce((sum, t) => sum + +t.amount, 0);
    return { list, totalAmount, month };
  }

  async withdraw(userId: number, amount: number) {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet || +wallet.balance < amount) throw new BadRequestException('余额不足');

    wallet.balance = +wallet.balance - amount;
    wallet.totalWithdraw = +wallet.totalWithdraw + amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      userId, type: 'withdraw', amount,
      status: 'pending', remark: '提现到微信',
    });
    await this.txRepo.save(tx);

    // TODO: 调用微信企业付款到零钱接口
    tx.status = 'success';
    await this.txRepo.save(tx);

    return { message: '提现成功', balance: wallet.balance };
  }
}
