import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { User } from '../../entities/user.entity';
import { InviteRecord } from '../../entities/invite-record.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, InviteRecord, SysConfig])],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
