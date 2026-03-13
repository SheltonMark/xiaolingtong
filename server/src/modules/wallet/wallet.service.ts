import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private paymentService: PaymentService,
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
    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId });
    if (type) qb.andWhere('t.type = :type', { type });
    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async getIncome(userId: number, query: any) {
    const { month } = query; // 格式 2026-02
    const qb = this.txRepo
      .createQueryBuilder('t')
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
    if (!amount || amount <= 0)
      throw new BadRequestException('提现金额必须大于0');
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet || +wallet.balance <= 0 || +wallet.balance < amount)
      throw new BadRequestException('余额不足');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    wallet.balance = +wallet.balance - amount;
    wallet.totalWithdraw = +wallet.totalWithdraw + amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      userId,
      type: 'withdraw',
      amount,
      status: 'pending',
      remark: '提现到微信',
    });
    await this.txRepo.save(tx);

    try {
      const outBatchNo = this.paymentService.generateOutTradeNo('WD', tx.id);
      const outDetailNo = `WDD_${tx.id}_${Date.now()}`;
      await this.paymentService.transferToWallet({
        outBatchNo,
        outDetailNo,
        openid: user.openid,
        amount: Math.round(amount * 100),
        remark: '临工提现',
      });
      tx.status = 'success';
      await this.txRepo.save(tx);
    } catch (e) {
      // 转账失败，回滚余额
      tx.status = 'failed';
      tx.remark = `提现失败: ${e.message}`;
      await this.txRepo.save(tx);
      wallet.balance = +wallet.balance + amount;
      wallet.totalWithdraw = +wallet.totalWithdraw - amount;
      await this.walletRepo.save(wallet);
      throw new BadRequestException('提现失败，请稍后重试');
    }

    return { message: '提现成功', balance: wallet.balance };
  }
}
