import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscribeMessageService } from './subscribe-message.service';
import { SubscribeMessageController } from './subscribe-message.controller';
import { SysConfig } from '../../entities/sys-config.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SysConfig, User])],
  controllers: [SubscribeMessageController],
  providers: [SubscribeMessageService],
  exports: [SubscribeMessageService],
})
export class SubscribeMessageModule {}
