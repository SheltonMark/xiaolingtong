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
import { User } from '../../entities/user.entity';
import { ChatRealtimeService } from './chat-realtime.service';

const VOICE_PREFIX = '__VOICE__';
const RECENT_ACTIVE_WINDOW_MS = 10 * 60 * 1000;

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

  private formatDateTime(date?: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day} ${this.formatTime(d)}`;
  }

  private formatActiveText(lastActiveAt?: Date | null, isOnline = false): string {
    if (isOnline) return '在线';
    if (!lastActiveAt) return '';

    const activeDate = new Date(lastActiveAt);
    if (Number.isNaN(activeDate.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - activeDate.getTime();
    if (diffMs <= RECENT_ACTIVE_WINDOW_MS) {
      return '刚刚活跃';
    }

    const isSameDay =
      now.getFullYear() === activeDate.getFullYear() &&
      now.getMonth() === activeDate.getMonth() &&
      now.getDate() === activeDate.getDate();

    if (isSameDay) {
      return '今天活跃';
    }

    return `最近活跃于 ${this.formatDateTime(activeDate)}`;
  }

  private buildPresence(user?: User | null, isOnline = false) {
    const lastActiveAt = user?.lastActiveAt || null;
    return {
      isOnline,
      lastActiveAt,
      activeText: this.formatActiveText(lastActiveAt, isOnline),
    };
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

  private resolveDisplayName(
    fallbackUser: User | null | undefined,
    otherId: number,
    entCertMap: Map<number, EnterpriseCert>,
    workerCertMap: Map<number, WorkerCert>,
  ): string {
    const entCert = entCertMap.get(otherId);
    if (entCert?.companyName) {
      return entCert.companyName;
    }

    const workerCert = workerCertMap.get(otherId);
    if (workerCert?.realName) {
      return workerCert.realName;
    }

    return fallbackUser?.nickname || `用户${otherId}`;
  }

  async listConversations(userId: number) {
    await this.realtime.markUserActive(userId);

    const list = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.userARef', 'ua')
      .leftJoinAndSelect('c.userBRef', 'ub')
      .where('c.userA = :userId OR c.userB = :userId', { userId })
      .orderBy('c.lastMessageAt', 'DESC')
      .getMany();

    if (!list.length) return [];

    const otherUserIds = list.map((item) => {
      const isUserA = this.toNumber(item.userA) === this.toNumber(userId);
      return this.toNumber(isUserA ? item.userB : item.userA);
    });

    const entCerts = await this.entCertRepo
      .createQueryBuilder('c')
      .where('c.userId IN (:...userIds)', { userIds: otherUserIds })
      .andWhere('c.status = :status', { status: 'approved' })
      .orderBy('c.userId', 'ASC')
      .addOrderBy('c.id', 'DESC')
      .getMany();

    const workerCerts = await this.workerCertRepo
      .createQueryBuilder('c')
      .where('c.userId IN (:...userIds)', { userIds: otherUserIds })
      .andWhere('c.status = :status', { status: 'approved' })
      .orderBy('c.userId', 'ASC')
      .addOrderBy('c.id', 'DESC')
      .getMany();

    const entCertMap = new Map<number, EnterpriseCert>();
    entCerts.forEach((cert) => {
      const certUserId = Number(cert.userId);
      if (!entCertMap.has(certUserId)) {
        entCertMap.set(certUserId, cert);
      }
    });

    const workerCertMap = new Map<number, WorkerCert>();
    workerCerts.forEach((cert) => {
      const certUserId = Number(cert.userId);
      if (!workerCertMap.has(certUserId)) {
        workerCertMap.set(certUserId, cert);
      }
    });

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
      const other = (isUserA ? item.userBRef : item.userARef) as User | null;
      const otherId = this.toNumber(isUserA ? item.userB : item.userA);
      const displayName = this.resolveDisplayName(
        other,
        otherId,
        entCertMap,
        workerCertMap,
      );
      const presence = this.buildPresence(
        other,
        this.realtime.isUserOnline(otherId),
      );

      return {
        id: item.id,
        otherUserId: otherId,
        postId: this.toNumber(item.postId),
        jobId: this.toNumber(item.jobId),
        name: displayName,
        avatarUrl: other?.avatarUrl || '',
        avatarText: displayName ? displayName[0] : '聊',
        avatarBg: otherId % 2 === 0 ? '#3B82F6' : '#10B981',
        time: this.formatTime(item.lastMessageAt || item.createdAt),
        lastMsg:
          this.buildLastMessagePreview('text', item.lastMessage || '') ||
          '暂无消息',
        unreadCount: unreadMap.get(this.toNumber(item.id)) || 0,
        lastMessageAt: item.lastMessageAt,
        ...presence,
      };
    });
  }

  async getMessages(conversationId: number, userId: number, query: any) {
    const conv = await this.convRepo
      .createQueryBuilder('c')
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

    await this.realtime.markUserActive(userId);

    const isUserA = this.toNumber(conv.userA) === this.toNumber(userId);
    const otherId = this.toNumber(isUserA ? conv.userB : conv.userA);
    const other = (isUserA ? conv.userBRef : conv.userARef) as User | null;

    const entCert = await this.entCertRepo.findOne({
      where: { userId: otherId, status: 'approved' },
      order: { id: 'DESC' },
    });

    const workerCert = await this.workerCertRepo.findOne({
      where: { userId: otherId, status: 'approved' },
      order: { id: 'DESC' },
    });

    const entCertMap = new Map<number, EnterpriseCert>();
    if (entCert) entCertMap.set(otherId, entCert);
    const workerCertMap = new Map<number, WorkerCert>();
    if (workerCert) workerCertMap.set(otherId, workerCert);

    return {
      list: list.map((item) => this.mapMessage(item)),
      total,
      page,
      pageSize,
      otherUser: {
        id: otherId,
        name: this.resolveDisplayName(other, otherId, entCertMap, workerCertMap),
        avatarUrl: other?.avatarUrl || '',
        ...this.buildPresence(other, this.realtime.isUserOnline(otherId)),
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

    await this.realtime.markUserActive(senderId);

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
    jobId?: number | string,
  ) {
    if (!userA || !userB) throw new BadRequestException('用户信息不完整');
    if (this.toNumber(userA) === this.toNumber(userB)) {
      throw new BadRequestException('不能和自己发起会话');
    }

    const normalizedPostId = Math.max(0, this.toNumber(postId));
    const normalizedJobId = Math.max(0, this.toNumber(jobId));

    if (normalizedPostId > 0 && normalizedJobId > 0) {
      throw new BadRequestException('postId 和 jobId 不能同时传入');
    }

    const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
    let conv = await this.convRepo.findOne({
      where: {
        userA: a,
        userB: b,
        postId: normalizedPostId,
        jobId: normalizedJobId,
      },
    });

    if (!conv) {
      if (normalizedJobId <= 0) {
        const hasUnlock = await this.checkContactUnlock(userA, userB);
        if (!hasUnlock) {
          throw new ForbiddenException('请先解锁对方联系方式后再发起聊天');
        }
      }

      conv = await this.convRepo.save(
        this.convRepo.create({
          userA: a,
          userB: b,
          postId: normalizedPostId,
          jobId: normalizedJobId,
        }),
      );
    }

    return conv;
  }

  private async checkContactUnlock(
    initiator: number,
    target: number,
  ): Promise<boolean> {
    const unlock = await this.unlockRepo
      .createQueryBuilder('u')
      .innerJoin(Post, 'p', 'u.postId = p.id')
      .where('u.userId = :initiator', { initiator })
      .andWhere('p.userId = :target', { target })
      .getOne();
    return !!unlock;
  }
}
