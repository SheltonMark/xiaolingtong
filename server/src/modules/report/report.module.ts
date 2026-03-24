import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Report } from '../../entities/report.entity';
import { WechatSecurityModule } from '../wechat-security/wechat-security.module';

@Module({
  imports: [TypeOrmModule.forFeature([Report]), WechatSecurityModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
