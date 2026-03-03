import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('conversations')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  list(@CurrentUser('sub') userId: number) {
    return this.chatService.listConversations(userId);
  }

  @Get(':id/messages')
  messages(@Param('id') id: number, @CurrentUser('sub') userId: number, @Query() query: any) {
    return this.chatService.getMessages(id, userId, query);
  }

  @Post(':id/send')
  send(@Param('id') id: number, @CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.chatService.sendMessage(id, userId, dto);
  }

  @Post('with-user/:userId')
  withUser(@CurrentUser('sub') currentUserId: number, @Param('userId') userId: number) {
    return this.chatService.getOrCreateConversation(currentUserId, userId);
  }
}
