import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';

const PLATFORM_FEE_RATE = 0.05;

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(Settlement) private settleRepo: Repository<Settlement>,
    @InjectRepository(SettlementItem) private itemRepo: Repository<SettlementItem>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private walletTxRepo: Repository<WalletTransaction>,
  ) {}

  async detail(jobId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId }, relations: ['job'] });
    if (!settlement) throw new BadRequestException('结算单不存在');
    const items = await this.itemRepo.find({ where: { settlementId: settlement.id }, relations: ['worker'] });
    return { ...settlement, items };
  }

  async pay(jobId: number, enterpriseId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');
    if (settlement.enterpriseId !== enterpriseId) throw new ForbiddenException('无权操作');
    if (settlement.status !== 'pending') throw new BadRequestException('结算单状态异常');

    settlement.status = 'paid';
    settlement.paidAt = new Date();
    await this.settleRepo.save(settlement);

    // 分发到工人钱包
    const items = await this.itemRepo.find({ where: { settlementId: settlement.id } });
    for (const item of items) {
      let wallet = await this.walletRepo.findOne({ where: { userId: item.workerId } });
      if (!wallet) {
        wallet = this.walletRepo.create({ userId: item.workerId });
        wallet = await this.walletRepo.save(wallet);
      }
      wallet.balance = +wallet.balance + +item.workerPay;
      wallet.totalIncome = +wallet.totalIncome + +item.workerPay;
      await this.walletRepo.save(wallet);

      await this.walletTxRepo.save(this.walletTxRepo.create({
        userId: item.workerId, type: 'income', amount: item.workerPay,
        refType: 'settlement', refId: settlement.id, status: 'success',
        remark: '工资结算',
      }));
    }

    settlement.status = 'distributed';
    await this.settleRepo.save(settlement);
    return { message: '支付成功，工资已发放' };
  }

  async confirmByWorker(jobId: number, workerId: number) {
    const settlement = await this.settleRepo.findOne({ where: { jobId } });
    if (!settlement) throw new BadRequestException('结算单不存在');

    const item = await this.itemRepo.findOne({ where: { settlementId: settlement.id, workerId } });
    if (!item) throw new BadRequestException('未找到结算记录');

    item.confirmed = 1;
    item.confirmedAt = new Date();
    await this.itemRepo.save(item);
    return { message: '已确认' };
  }
}
