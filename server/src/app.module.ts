import { Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { JobModule } from './modules/job/job.module';
import { ApplicationModule } from './modules/application/application.module';
import { WorkModule } from './modules/work/work.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { BeanModule } from './modules/bean/bean.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ExposureModule } from './modules/exposure/exposure.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { ReportModule } from './modules/report/report.module';
import { RatingModule } from './modules/rating/rating.module';
import { MembershipModule } from './modules/membership/membership.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ConfigModule } from './modules/config/config.module';
import { InviteModule } from './modules/invite/invite.module';
import { DisputeModule } from './modules/dispute/dispute.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USERNAME', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_DATABASE', 'xiaolingtong'),
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') === 'development',
        charset: 'utf8mb4',
      }),
    }),
    AuthModule,
    UserModule,
    PostModule,
    JobModule,
    ApplicationModule,
    WorkModule,
    SettlementModule,
    WalletModule,
    BeanModule,
    ChatModule,
    NotificationModule,
    ExposureModule,
    FavoriteModule,
    ReportModule,
    RatingModule,
    MembershipModule,
    PromotionModule,
    UploadModule,
    AdminModule,
    PaymentModule,
    TasksModule,
    ConfigModule,
    InviteModule,
    DisputeModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
