import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private paymentService: PaymentService,
  ) {}

  async getBalance(userId: number) {
    await this.syncPendingWithdrawals(userId);

    let wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) {
      wallet = await this.walletRepo.save(this.walletRepo.create({ userId }));
    }
    const capability = await this.getWithdrawCapability(userId);
    return {
      ...wallet,
      canWithdraw: capability.canWithdraw,
      withdrawStatus: capability.status,
      withdrawDisabledReason: capability.reason,
    };
  }

  async getTransactions(userId: number, query: any) {
    await this.syncPendingWithdrawals(userId);

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
    const capability = await this.getWithdrawCapability(userId);
    if (!capability.canWithdraw) {
      throw new BadRequestException(capability.reason || '提现通道暂不可用');
    }
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
      remark: '提现处理中',
    });
    await this.txRepo.save(tx);

    try {
      const outBatchNo = this.paymentService.generateOutTradeNo('WD', tx.id);
      const outDetailNo = String(tx.id);
      tx.refType = outBatchNo;
      tx.refId = tx.id;
      tx.remark = '提现处理中';
      await this.txRepo.save(tx);

      await this.paymentService.transferToWallet({
        outBatchNo,
        outDetailNo,
        openid: user.openid,
        amount: Math.round(amount * 100),
        remark: '临工提现',
      });
    } catch (e) {
      tx.status = 'failed';
      tx.remark = this.buildWithdrawFailureRemark(e?.message);
      await this.txRepo.save(tx);
      await this.rollbackWalletWithdraw(tx, wallet);
      throw new BadRequestException(this.getWithdrawSubmitErrorMessage(e?.message));
    }

    return {
      message: '提现申请已提交',
      balance: wallet.balance,
      status: 'pending',
    };
  }

  async syncPendingWithdrawals(userId?: number) {
    const where: any = {
      type: 'withdraw',
      status: 'pending',
    };

    if (typeof userId === 'number') {
      where.userId = userId;
    }

    const pendingTxs = await this.txRepo.find({ where });

    for (const tx of pendingTxs) {
      if (!tx.refType || tx.refId === null || tx.refId === undefined) {
        continue;
      }

      try {
        const detail = await this.paymentService.queryTransferDetail({
          outBatchNo: tx.refType,
          outDetailNo: String(tx.refId),
        });

        if (detail?.detail_status === 'SUCCESS') {
          tx.status = 'success';
          tx.remark = '提现成功';
          await this.txRepo.save(tx);
          continue;
        }

        if (detail?.detail_status === 'FAIL') {
          tx.status = 'failed';
          tx.remark = this.buildWithdrawFailureRemark(detail.fail_reason);
          await this.txRepo.save(tx);
          await this.rollbackWalletWithdraw(tx);
        }
      } catch (e) {
        this.logger.warn(
          `同步提现状态失败: txId=${tx.id}, error=${e?.message || 'unknown'}`,
        );
      }
    }
  }

  private buildWithdrawFailureRemark(reason?: string) {
    return `提现失败${reason ? `: ${reason}` : ''}`.slice(0, 128);
  }

  private async getWithdrawCapability(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      return {
        canWithdraw: false,
        status: 'user_missing',
        reason: '用户不存在',
      };
    }

    if (!user.openid) {
      return {
        canWithdraw: false,
        status: 'wechat_unbound',
        reason: '请先绑定微信后再提现',
      };
    }

    if (!this.paymentService.isWalletTransferReady()) {
      return {
        canWithdraw: false,
        status: 'channel_unavailable',
        reason: '提现通道未开通，请联系管理员',
      };
    }

    return {
      canWithdraw: true,
      status: 'enabled',
      reason: '',
    };
  }

  private getWithdrawSubmitErrorMessage(reason?: string) {
    const message = String(reason || '').trim();
    if (!message) {
      return '提现失败，请稍后重试';
    }
    if (message.includes('未初始化')) {
      return '提现通道未开通，请联系管理员';
    }
    if (
      message.includes('NO_AUTH')
      || message.includes('产品')
      || message.includes('权限')
      || message.includes('商家转账')
    ) {
      return '提现通道暂不可用，请联系管理员';
    }
    if (message.includes('openid') || message.includes('绑定微信')) {
      return '请先绑定微信后再提现';
    }
    return '提现失败，请稍后重试';
  }

  private async rollbackWalletWithdraw(tx: WalletTransaction, wallet?: Wallet) {
    const targetWallet =
      wallet || (await this.walletRepo.findOne({ where: { userId: tx.userId } }));

    if (!targetWallet) {
      this.logger.warn(`提现回滚失败，钱包不存在: userId=${tx.userId}`);
      return;
    }

    targetWallet.balance = +targetWallet.balance + +tx.amount;
    targetWallet.totalWithdraw = Math.max(
      0,
      +targetWallet.totalWithdraw - +tx.amount,
    );
    await this.walletRepo.save(targetWallet);
  }
}
