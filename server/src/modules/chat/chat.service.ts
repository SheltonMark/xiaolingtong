import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { Post } from '../../entities/post.entity';
import { ChatRealtimeService } from './chat-realtime.service';

const VOICE_PREFIX = '__VOICE__';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage) private msgRepo: Repository<ChatMessage>,
    @InjectRepository(ContactUnlock) private unlockRepo: Repository<ContactUnlock>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    private realtime: ChatRealtimeService,
  ) {}

  private toNumber(value: any): number {
    return Number(value || 0);
  }

  private formatTime(date?: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private isVoicePayload(content: string): boolean {
    return typeof content === 'string' && content.startsWith(VOICE_PREFIX);
  }

  private buildLastMessagePreview(type: string, content: string): string {
    if (type === 'image') return '[图片]';
    if (this.isVoicePayload(content)) return '[语音]';
    const text = (content || '').trim();
    return text.length > 60 ? `${text.slice(0, 60)}...` : text;
  }

  private async findConversationForUser(conversationId: number, userId: number) {
    return this.convRepo.findOne({
      where: [
        { id: conversationId, userA: userId },
        { id: conversationId, userB: userId },
      ],
    });
  }

  private mapMessage(msg: ChatMessage) {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      type: msg.type,
      content: msg.content,
      createdAt: msg.createdAt,
      time: this.formatTime(msg.createdAt),
      sender: msg.sender
        ? {
            id: msg.sender.id,
            nickname: msg.sender.nickname,
            avatarUrl: msg.sender.avatarUrl,
          }
        : null,
    };
  }

  async listConversations(userId: number) {
    const list = await this.convRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.userARef', 'ua')
      .leftJoinAndSelect('c.userBRef', 'ub')
      .where('c.userA = :userId OR c.userB = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC')
      .getMany();

    if (!list.length) return [];

    const conversationIds = list.map((item) => item.id);
    const unreadRows = await this.msgRepo.createQueryBuilder('m')
      .select('m.conversationId', 'conversationId')
      .addSelect('COUNT(*)', 'count')
      .where('m.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('m.senderId != :userId', { userId })
      .andWhere('m.readAt IS NULL')
      .groupBy('m.conversationId')
      .getRawMany();

    const unreadMap = new Map<number, number>();
    unreadRows.forEach((row) => {
      unreadMap.set(this.toNumber(row.conversationId), this.toNumber(row.count));
    });

    return list.map((item) => {
      const isUserA = this.toNumber(item.userA) === this.toNumber(userId);
      const other = isUserA ? item.userBRef : item.userARef;
      const otherId = isUserA ? item.userB : item.userA;
      const preview = this.buildLastMessagePreview('text', item.lastMessage || '');
      const name = (other && other.nickname) || `用户${otherId}`;

      return {
        id: item.id,
        otherUserId: this.toNumber(otherId),
        name,
        avatarUrl: (other && other.avatarUrl) || '',
        avatarText: name ? name[0] : '聊',
        avatarBg: this.toNumber(otherId) % 2 === 0 ? '#3B82F6' : '#10B981',
        time: this.formatTime(item.lastMessageAt || item.createdAt),
        lastMsg: preview || '暂无消息',
        unreadCount: unreadMap.get(this.toNumber(item.id)) || 0,
        lastMessageAt: item.lastMessageAt,
      };
    });
  }

  async getMessages(conversationId: number, userId: number, query: any) {
    const conv = await this.findConversationForUser(conversationId, userId);
    if (!conv) throw new ForbiddenException('无权访问此会话');

    const page = Math.max(1, this.toNumber(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, this.toNumber(query.pageSize) || 50));

    const [list, total] = await this.msgRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['sender'],
    });

    await this.msgRepo.createQueryBuilder()
      .update(ChatMessage)
      .set({ readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();

    return { list: list.map((item) => this.mapMessage(item)), total, page, pageSize };
  }

  async sendMessage(conversationId: number, senderId: number, dto: any) {
    const conv = await this.findConversationForUser(conversationId, senderId);
    if (!conv) throw new ForbiddenException('无权发送消息到此会话');

    const type = dto.type === 'image' ? 'image' : 'text';
    const content = String(dto.content || '').trim();
    if (!content) throw new BadRequestException('消息内容不能为空');

    const msg = this.msgRepo.create({
      conversationId,
      senderId,
      content,
      type,
    });
    const saved = await this.msgRepo.save(msg);

    await this.convRepo.update(conversationId, {
      lastMessage: this.buildLastMessagePreview(type, content),
      lastMessageAt: new Date(),
    });

    const mapped = this.mapMessage(saved);
    const receiverId = this.toNumber(conv.userA) === this.toNumber(senderId)
      ? this.toNumber(conv.userB)
      : this.toNumber(conv.userA);
    if (receiverId) {
      this.realtime.emitToUser(receiverId, 'new_message', mapped);
    }

    return mapped;
  }

  async getOrCreateConversation(userA: number, userB: number, postId?: number | string) {
    if (!userA || !userB) throw new BadRequestException('用户信息不完整');
    if (this.toNumber(userA) === this.toNumber(userB)) {
      throw new BadRequestException('不能和自己发起会话');
    }
    const normalizedPostId = Math.max(0, this.toNumber(postId));
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    let conv = await this.convRepo.findOne({ where: { userA: a, userB: b, postId: normalizedPostId } });
    if (!conv) {
      // 新会话：校验发起方是否已解锁对方联系方式
      const hasUnlock = await this.checkContactUnlock(userA, userB);
      if (!hasUnlock) {
        throw new ForbiddenException('请先解锁对方联系方式后再发起聊天');
      }
      conv = await this.convRepo.save(this.convRepo.create({ userA: a, userB: b, postId: normalizedPostId }));
    }
    return conv;
  }

  private async checkContactUnlock(initiator: number, target: number): Promise<boolean> {
    // 查找 initiator 是否解锁过 target 发布的任意帖子的联系方式
    const unlock = await this.unlockRepo.createQueryBuilder('u')
      .innerJoin(Post, 'p', 'u.postId = p.id')
      .where('u.userId = :initiator', { initiator })
      .andWhere('p.userId = :target', { target })
      .getOne();
    return !!unlock;
  }
}
