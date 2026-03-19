/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ChatRealtimeService } from './chat-realtime.service';

describe('Phase 2: Real-time Chat - WebSocket & Notifications', () => {
  let service: ChatService;
  let convRepo: any;
  let msgRepo: any;
  let realtimeService: any;

  beforeEach(async () => {
    convRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    msgRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    realtimeService = {
      sendToUser: jest.fn(),
      broadcastToConversation: jest.fn(),
      isUserOnline: jest.fn(),
      emitToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: convRepo,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: msgRepo,
        },
        {
          provide: ChatRealtimeService,
          useValue: realtimeService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Real-time Message Delivery', () => {
    it('should send message and notify recipient via realtime service', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2, lastMessageAt: new Date() };
      const mockMsg = {
        id: 1,
        conversationId: 1,
        senderId: 1,
        type: 'text',
        content: 'Hello',
        createdAt: new Date(),
        sender: { id: 1, nickname: 'User1', avatarUrl: 'url1' },
      };

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.create.mockReturnValue(mockMsg);
      msgRepo.save.mockResolvedValue(mockMsg);
      convRepo.update.mockResolvedValue({ affected: 1 });
      realtimeService.emitToUser.mockResolvedValue(true);

      const result = await service.sendMessage(1, 1, {
        type: 'text',
        content: 'Hello',
      });

      expect(result).toBeDefined();
      expect(realtimeService.emitToUser).toHaveBeenCalledWith(
        2,
        'new_message',
        expect.any(Object),
      );
    });

    it('should get messages and mark as read', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2 };
      const mockMessages = [
        {
          id: 1,
          conversationId: 1,
          senderId: 2,
          type: 'text',
          content: 'Hi',
          createdAt: new Date(),
          sender: { id: 2, nickname: 'User2', avatarUrl: 'url2' },
        },
      ];

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.findAndCount.mockResolvedValue([mockMessages, 1]);
      msgRepo.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      });

      const result = await service.getMessages(1, 1, { page: 1, pageSize: 50 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(msgRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle offline user gracefully (no realtime notification)', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2 };
      const mockMsg = {
        id: 1,
        conversationId: 1,
        senderId: 1,
        type: 'text',
        content: 'Offline message',
        createdAt: new Date(),
        sender: { id: 1, nickname: 'User1', avatarUrl: 'url1' },
      };

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.create.mockReturnValue(mockMsg);
      msgRepo.save.mockResolvedValue(mockMsg);
      convRepo.update.mockResolvedValue({ affected: 1 });
      realtimeService.emitToUser.mockResolvedValue(false);

      const result = await service.sendMessage(1, 1, {
        type: 'text',
        content: 'Offline message',
      });

      expect(result).toBeDefined();
      expect(realtimeService.emitToUser).toHaveBeenCalled();
    });
  });

  describe('Conversation Management', () => {
    it('should return conversation list with unread counts', async () => {
      const mockConversations = [
        {
          id: 1,
          userA: 1,
          userB: 2,
          lastMessageAt: new Date(),
          lastMessage: 'Hi',
          userARef: { id: 1, nickname: 'User1', avatarUrl: 'url1' },
          userBRef: { id: 2, nickname: 'User2', avatarUrl: 'url2' },
        },
        {
          id: 2,
          userA: 1,
          userB: 3,
          lastMessageAt: new Date(),
          lastMessage: 'Hello',
          userARef: { id: 1, nickname: 'User1', avatarUrl: 'url1' },
          userBRef: { id: 3, nickname: 'User3', avatarUrl: 'url3' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockConversations),
      };

      convRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      msgRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { conversationId: 1, count: 3 },
          { conversationId: 2, count: 1 },
        ]),
      });

      const result = await service.listConversations(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should create or get existing conversation', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2, createdAt: new Date() };

      convRepo.findOne.mockResolvedValue(null);
      convRepo.create.mockReturnValue(mockConv);
      convRepo.save.mockResolvedValue(mockConv);

      const result = await service.getOrCreateConversation(1, 2);

      expect(result).toBeDefined();
      expect(convRepo.save).toHaveBeenCalled();
    });

    it('should handle duplicate conversation creation gracefully', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2, createdAt: new Date() };

      convRepo.findOne.mockResolvedValue(mockConv);

      const result = await service.getOrCreateConversation(1, 2);

      expect(result).toEqual(mockConv);
      expect(convRepo.save).not.toHaveBeenCalled();
    });

    it('should reject conversation with same user', async () => {
      await expect(service.getOrCreateConversation(1, 1)).rejects.toThrow(
        '不能和自己发起会话',
      );
    });

    it('should reject conversation with missing user info', async () => {
      await expect(service.getOrCreateConversation(0, 2)).rejects.toThrow(
        '用户信息不完整',
      );
    });
  });

  describe('Message Pagination & State', () => {
    it('should paginate messages correctly', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2 };
      const mockMessages = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        conversationId: 1,
        senderId: i % 2 === 0 ? 1 : 2,
        type: 'text',
        content: `Message ${i + 1}`,
        createdAt: new Date(Date.now() - i * 1000),
        sender: {
          id: i % 2 === 0 ? 1 : 2,
          nickname: `User${i % 2}`,
          avatarUrl: 'url',
        },
      }));

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.findAndCount.mockResolvedValue([mockMessages, 20]);
      msgRepo.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      });

      const result = await service.getMessages(1, 1, { page: 1, pageSize: 10 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(10);
      expect(result.total).toBe(20);
    });

    it('should handle empty conversation', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2 };

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.findAndCount.mockResolvedValue([[], 0]);
      msgRepo.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const result = await service.getMessages(1, 1, { page: 1, pageSize: 10 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should update last message on send', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2, lastMessageAt: new Date() };
      const mockMsg = {
        id: 1,
        conversationId: 1,
        senderId: 1,
        type: 'text',
        content: 'Last message',
        createdAt: new Date(),
        sender: { id: 1, nickname: 'User1', avatarUrl: 'url1' },
      };

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.create.mockReturnValue(mockMsg);
      msgRepo.save.mockResolvedValue(mockMsg);
      convRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.sendMessage(1, 1, {
        type: 'text',
        content: 'Last message',
      });

      expect(result).toBeDefined();
      expect(convRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          lastMessage: expect.any(String),
          lastMessageAt: expect.any(Date),
        }),
      );
    });

    it('should handle concurrent message sends', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2 };
      const mockMsg = {
        id: 1,
        conversationId: 1,
        senderId: 1,
        type: 'text',
        content: 'Concurrent message',
        createdAt: new Date(),
        sender: { id: 1, nickname: 'User1', avatarUrl: 'url1' },
      };

      convRepo.findOne.mockResolvedValue(mockConv);
      msgRepo.create.mockReturnValue(mockMsg);
      msgRepo.save.mockResolvedValue(mockMsg);
      convRepo.update.mockResolvedValue({ affected: 1 });

      const promises = Array.from({ length: 5 }, (_, i) =>
        service.sendMessage(1, 1, {
          type: 'text',
          content: `Message ${i + 1}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(msgRepo.save).toHaveBeenCalledTimes(5);
    });

    it('should reject message to unauthorized conversation', async () => {
      convRepo.findOne.mockResolvedValue(null);

      await expect(
        service.sendMessage(1, 1, { type: 'text', content: 'Unauthorized' }),
      ).rejects.toThrow('无权发送消息到此会话');
    });

    it('should reject empty message content', async () => {
      const mockConv = { id: 1, userA: 1, userB: 2 };
      convRepo.findOne.mockResolvedValue(mockConv);

      await expect(
        service.sendMessage(1, 1, { type: 'text', content: '' }),
      ).rejects.toThrow('消息内容不能为空');
    });
  });
});
