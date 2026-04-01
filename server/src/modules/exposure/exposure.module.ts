import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExposureController } from './exposure.controller';
import { ExposureService } from './exposure.service';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { WechatSecurityModule } from '../wechat-security/wechat-security.module';

@Module({
  imports: [TypeOrmModule.forFeature([Exposure, ExposureComment, SysConfig]), WechatSecurityModule],
  controllers: [ExposureController],
  providers: [ExposureService],
})
export class ExposureModule {}
