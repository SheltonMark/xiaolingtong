/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

describe('ChatModule Integration Tests', () => {
  let controller: ChatController;
  let service: ChatService;
  let conversationRepository: any;
  let chatMessageRepository: any;
  let realtimeService: any;

  beforeEach(async () => {
    conversationRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    chatMessageRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    realtimeService = {
      notifyNewMessage: jest.fn(),
      emitToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: conversationRepository,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: chatMessageRepository,
        },
        {
          provide: ChatRealtimeService,
          useValue: realtimeService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list Integration', () => {
    it('should return user conversations', async () => {
      const mockConversations = [
        {
          id: 1,
          userA: 1,
          userB: 2,
          lastMessage: 'Hello',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          userARef: { id: 1, nickname: 'User 1' },
          userBRef: { id: 2, nickname: 'User 2' },
        },
      ];

      conversationRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockConversations),
      });
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      });

      const result = await controller.list(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no conversations', async () => {
      conversationRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      const result = await controller.list(1);

      expect(result).toEqual([]);
    });

    it('should include unread counts', async () => {
      const mockConversations = [
        {
          id: 1,
          userA: 1,
          userB: 2,
          lastMessage: 'Hello',
          lastMessageAt: new Date(),
          createdAt: new Date(),
          userARef: { id: 1, nickname: 'User 1' },
          userBRef: { id: 2, nickname: 'User 2' },
        },
      ];

      conversationRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockConversations),
      });
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ conversationId: 1, count: 3 }]),
      });

      const result = await controller.list(1);

      expect(result).toBeDefined();
      expect(result[0].unreadCount).toBe(3);
    });
  });

  describe('messages Integration', () => {
    it('should return paginated messages', async () => {
      const mockMessages = [
        {
          id: 1,
          conversationId: 1,
          senderId: 1,
          content: 'Hello',
          type: 'text',
          createdAt: new Date(),
          sender: { id: 1, nickname: 'User 1', avatarUrl: '' },
        },
      ];

      conversationRepository.findOne.mockResolvedValue({
        id: 1,
        userA: 1,
        userB: 2,
      });
      chatMessageRepository.findAndCount.mockResolvedValue([mockMessages, 1]);
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await controller.messages(1, 1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should mark messages as read', async () => {
      const mockMessages = [];

      conversationRepository.findOne.mockResolvedValue({
        id: 1,
        userA: 1,
        userB: 2,
      });
      chatMessageRepository.findAndCount.mockResolvedValue([mockMessages, 0]);
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await controller.messages(1, 1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
    });

    it('should throw error on unauthorized access', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.messages(1, 1, { page: 1, pageSize: 20 }),
      ).rejects.toThrow();
    });
  });

  describe('send Integration', () => {
    it('should send text message successfully', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };
      const mockMessage = {
        id: 1,
        conversationId: 1,
        senderId: 1,
        content: 'Hello',
        type: 'text',
        createdAt: new Date(),
      };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await controller.send(1, 1, {
        content: 'Hello',
        type: 'text',
      });

      expect(result).toBeDefined();
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should send image message successfully', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };
      const mockMessage = {
        id: 1,
        conversationId: 1,
        senderId: 1,
        content: 'image_url',
        type: 'image',
        createdAt: new Date(),
      };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await controller.send(1, 1, {
        content: 'image_url',
        type: 'image',
      });

      expect(result).toBeDefined();
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should throw error on empty content', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      await expect(
        controller.send(1, 1, { content: '', type: 'text' }),
      ).rejects.toThrow();
    });
  });

  describe('withUser Integration', () => {
    it('should return existing conversation', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await controller.withUser(1, 2);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should create new conversation', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };

      conversationRepository.findOne.mockResolvedValue(null);
      conversationRepository.create.mockReturnValue(mockConversation);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await controller.withUser(1, 2);

      expect(result).toBeDefined();
      expect(conversationRepository.save).toHaveBeenCalled();
    });

    it('should throw error on self-conversation', async () => {
      await expect(controller.withUser(1, 1)).rejects.toThrow();
    });
  });
});
