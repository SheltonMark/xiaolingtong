import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage) private msgRepo: Repository<ChatMessage>,
  ) {}

  async listConversations(userId: number) {
    return this.convRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.userARef', 'ua')
      .leftJoinAndSelect('c.userBRef', 'ub')
      .where('c.userA = :userId OR c.userB = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC')
      .getMany();
  }

  async getMessages(conversationId: number, query: any) {
    const { page = 1, pageSize = 50 } = query;
    const [list, total] = await this.msgRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['sender'],
    });
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async sendMessage(conversationId: number, senderId: number, dto: any) {
    const msg = this.msgRepo.create({
      conversationId, senderId,
      content: dto.content,
      type: dto.type || 'text',
    });
    const saved = await this.msgRepo.save(msg);

    await this.convRepo.update(conversationId, {
      lastMessage: dto.content,
      lastMessageAt: new Date(),
    });

    return saved;
  }

  async getOrCreateConversation(userA: number, userB: number) {
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    let conv = await this.convRepo.findOne({ where: { userA: a, userB: b } });
    if (!conv) {
      conv = await this.convRepo.save(this.convRepo.create({ userA: a, userB: b }));
    }
    return conv;
  }
}
