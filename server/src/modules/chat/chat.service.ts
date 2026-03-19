import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { Post } from '../../entities/post.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ChatRealtimeService } from './chat-realtime.service';

const VOICE_PREFIX = '__VOICE__';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(ChatMessage) private msgRepo: Repository<ChatMessage>,
    @InjectRepository(ContactUnlock)
    private unlockRepo: Repository<ContactUnlock>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(EnterpriseCert)
    private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert)
    private workerCertRepo: Repository<WorkerCert>,
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

  private async findConversationForUser(
    conversationId: number,
    userId: number,
  ) {
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
    const list = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.userARef', 'ua')
      .leftJoinAndSelect('c.userBRef', 'ub')
      .where('c.userA = :userId OR c.userB = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC')
      .getMany();

    if (!list.length) return [];

    // 获取所有对方用户的ID
    const otherUserIds = list.map((item) => {
      const isUserA = this.toNumber(item.userA) === this.toNumber(userId);
      return this.toNumber(isUserA ? item.userB : item.userA);
    });

    // 获取企业认证信息
    const entCerts = await this.entCertRepo
      .createQueryBuilder('c')
      .where('c.userId IN (:...userIds)', { userIds: otherUserIds })
      .andWhere('c.status = :status', { status: 'approved' })
      .orderBy('c.userId', 'ASC')
      .addOrderBy('c.id', 'DESC')
      .getMany();

    const entCertMap = new Map<number, EnterpriseCert>();
    for (const cert of entCerts) {
      const certUserId = Number(cert.userId);
      if (!entCertMap.has(certUserId)) {
        entCertMap.set(certUserId, cert);
      }
    }

    // 获取临工认证信息
    const workerCerts = await this.workerCertRepo
      .createQueryBuilder('c')
      .where('c.userId IN (:...userIds)', { userIds: otherUserIds })
      .andWhere('c.status = :status', { status: 'approved' })
      .orderBy('c.userId', 'ASC')
      .addOrderBy('c.id', 'DESC')
      .getMany();

    const workerCertMap = new Map<number, WorkerCert>();
    for (const cert of workerCerts) {
      const certUserId = Number(cert.userId);
      if (!workerCertMap.has(certUserId)) {
        workerCertMap.set(certUserId, cert);
      }
    }

    const conversationIds = list.map((item) => item.id);
    const unreadRows = await this.msgRepo
      .createQueryBuilder('m')
      .select('m.conversationId', 'conversationId')
      .addSelect('COUNT(*)', 'count')
      .where('m.conversationId IN (:...conversationIds)', { conversationIds })
      .andWhere('m.senderId != :userId', { userId })
      .andWhere('m.readAt IS NULL')
      .groupBy('m.conversationId')
      .getRawMany();

    const unreadMap = new Map<number, number>();
    unreadRows.forEach((row) => {
      unreadMap.set(
        this.toNumber(row.conversationId),
        this.toNumber(row.count),
      );
    });

    return list.map((item) => {
      const isUserA = this.toNumber(item.userA) === this.toNumber(userId);
      const other = isUserA ? item.userBRef : item.userARef;
      const otherId = this.toNumber(isUserA ? item.userB : item.userA);
      const preview = this.buildLastMessagePreview(
        'text',
        item.lastMessage || '',
      );

      // 获取认证名称
      const entCert = entCertMap.get(otherId);
      const workerCert = workerCertMap.get(otherId);
      let displayName = (other && other.nickname) || `用户${otherId}`;

      if (entCert && entCert.companyName) {
        displayName = entCert.companyName;
      } else if (workerCert && workerCert.realName) {
        displayName = workerCert.realName;
      }

      return {
        id: item.id,
        otherUserId: otherId,
        name: displayName,
        avatarUrl: (other && other.avatarUrl) || '',
        avatarText: displayName ? displayName[0] : '聊',
        avatarBg: otherId % 2 === 0 ? '#3B82F6' : '#10B981',
        time: this.formatTime(item.lastMessageAt || item.createdAt),
        lastMsg: preview || '暂无消息',
        unreadCount: unreadMap.get(this.toNumber(item.id)) || 0,
        lastMessageAt: item.lastMessageAt,
      };
    });
  }

  async getMessages(conversationId: number, userId: number, query: any) {
    const conv = await this.convRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.userARef', 'ua')
      .leftJoinAndSelect('c.userBRef', 'ub')
      .where('c.id = :conversationId', { conversationId })
      .andWhere('(c.userA = :userId OR c.userB = :userId)', { userId })
      .getOne();

    if (!conv) throw new ForbiddenException('无权访问此会话');

    const page = Math.max(1, this.toNumber(query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, this.toNumber(query.pageSize) || 50),
    );

    const [list, total] = await this.msgRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['sender'],
    });

    await this.msgRepo
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('readAt IS NULL')
      .execute();

    // 获取对方用户ID
    const isUserA = this.toNumber(conv.userA) === this.toNumber(userId);
    const otherId = this.toNumber(isUserA ? conv.userB : conv.userA);

    // 获取对方的认证信息
    const entCert = await this.entCertRepo.findOne({
      where: { userId: otherId, status: 'approved' },
      order: { id: 'DESC' },
    });

    const workerCert = await this.workerCertRepo.findOne({
      where: { userId: otherId, status: 'approved' },
      order: { id: 'DESC' },
    });

    // 构建对方用户信息
    const other = isUserA ? conv.userBRef : conv.userARef;
    let otherName = (other && other.nickname) || `用户${otherId}`;

    if (entCert && entCert.companyName) {
      otherName = entCert.companyName;
    } else if (workerCert && workerCert.realName) {
      otherName = workerCert.realName;
    }

    const otherAvatarUrl = (other && other.avatarUrl) || '';
    console.log('=== Chat getMessages Debug ===');
    console.log('conversationId:', conversationId);
    console.log('otherId:', otherId);
    console.log('other:', other ? { id: other.id, nickname: other.nickname, avatarUrl: other.avatarUrl } : null);
    console.log('otherAvatarUrl:', otherAvatarUrl);
    console.log('=============================');

    return {
      list: list.map((item) => this.mapMessage(item)),
      total,
      page,
      pageSize,
      otherUser: {
        id: otherId,
        name: otherName,
        avatarUrl: otherAvatarUrl,
      },
    };
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
    const receiverId =
      this.toNumber(conv.userA) === this.toNumber(senderId)
        ? this.toNumber(conv.userB)
        : this.toNumber(conv.userA);
    if (receiverId) {
      this.realtime.emitToUser(receiverId, 'new_message', mapped);
    }

    return mapped;
  }

  async getOrCreateConversation(
    userA: number,
    userB: number,
    postId?: number | string,
  ) {
    if (!userA || !userB) throw new BadRequestException('用户信息不完整');
    if (this.toNumber(userA) === this.toNumber(userB)) {
      throw new BadRequestException('不能和自己发起会话');
    }
    const normalizedPostId = Math.max(0, this.toNumber(postId));
    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    let conv = await this.convRepo.findOne({
      where: { userA: a, userB: b, postId: normalizedPostId },
    });
    if (!conv) {
      // 新会话：校验发起方是否已解锁对方联系方式
      const hasUnlock = await this.checkContactUnlock(userA, userB);
      if (!hasUnlock) {
        throw new ForbiddenException('请先解锁对方联系方式后再发起聊天');
      }
      conv = await this.convRepo.save(
        this.convRepo.create({ userA: a, userB: b, postId: normalizedPostId }),
      );
    }
    return conv;
  }

  private async checkContactUnlock(
    initiator: number,
    target: number,
  ): Promise<boolean> {
    // 查找 initiator 是否解锁过 target 发布的任意帖子的联系方式
    const unlock = await this.unlockRepo
      .createQueryBuilder('u')
      .innerJoin(Post, 'p', 'u.postId = p.id')
      .where('u.userId = :initiator', { initiator })
      .andWhere('p.userId = :target', { target })
      .getOne();
    return !!unlock;
  }
}
