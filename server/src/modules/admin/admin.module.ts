import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';
import { Report } from '../../entities/report.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { Keyword } from '../../entities/keyword.entity';
import { Notice } from '../../entities/notice.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Category } from '../../entities/category.entity';
import { MemberOrder } from '../../entities/member-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Notification } from '../../entities/notification.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { AttendanceSheet } from '../../entities/attendance-sheet.entity';
import { WorkLog } from '../../entities/work-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      User,
      Post,
      Job,
      Exposure,
      Report,
      EnterpriseCert,
      WorkerCert,
      Keyword,
      Notice,
      SysConfig,
      OpenCity,
      JobType,
      AdOrder,
      Category,
      MemberOrder,
      Settlement,
      SettlementItem,
      AttendanceSheet,
      WorkLog,
      Wallet,
      WalletTransaction,
      BeanTransaction,
      JobApplication,
      Notification,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'xiaolingtong_jwt_secret_2026'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule implements OnModuleInit {
  constructor(private adminService: AdminService) {}

  async onModuleInit() {
    await this.adminService.initSuperAdmin();
    await this.adminService.initDefaultConfigs();
  }
}
