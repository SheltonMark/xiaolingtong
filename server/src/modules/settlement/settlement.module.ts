import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Job } from '../../entities/job.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settlement, SettlementItem, Job, WorkLog, Wallet, WalletTransaction, User, JobApplication, SysConfig])],
  controllers: [SettlementController],
  providers: [SettlementService],
})
export class SettlementModule {}
