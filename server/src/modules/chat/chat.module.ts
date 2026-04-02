import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { Post } from '../../entities/post.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ChatRealtimeService } from './chat-realtime.service';
import { User } from '../../entities/user.entity';
import { WechatSecurityModule } from '../wechat-security/wechat-security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ChatMessage,
      ContactUnlock,
      Post,
      EnterpriseCert,
      WorkerCert,
      User,
    ]),
    AuthModule,
    WechatSecurityModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatRealtimeService],
})
export class ChatModule {}
