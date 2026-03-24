import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ContactProfile } from '../../entities/contact-profile.entity';
import { VerificationSession } from '../../entities/verification-session.entity';
import { WechatSecurityModule } from '../wechat-security/wechat-security.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, EnterpriseCert, WorkerCert, ContactProfile, VerificationSession]), WechatSecurityModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
