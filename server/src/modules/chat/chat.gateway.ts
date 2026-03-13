import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/ws/chat', cors: true })
export class ChatGateway {
  @WebSocketServer() server: Server;

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) client.join(`user_${userId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const { conversationId, senderId, content, type } = data;
    const msg = await this.chatService.sendMessage(conversationId, senderId, {
      content,
      type,
    });

    // 广播给会话中的对方
    this.server.to(`user_${data.receiverId}`).emit('newMessage', msg);
    return msg;
  }
}
