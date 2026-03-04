import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ChatRealtimeService } from './chat-realtime.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ChatMessage]),
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatRealtimeService],
})
export class ChatModule {}
