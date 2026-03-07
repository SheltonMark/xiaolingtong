/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepository: any;
  let chatMessageRepository: any;
  let chatRealtimeService: any;

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

    chatRealtimeService = {
      sendMessage: jest.fn(),
      notifyNewMessage: jest.fn(),
      emitToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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
          useValue: chatRealtimeService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2026-03-06T14:30:00');
      const result = service['formatTime'](date);
      expect(result).toBe('14:30');
    });

    it('should return empty string for null', () => {
      expect(service['formatTime'](null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(service['formatTime'](undefined)).toBe('');
    });
  });

  describe('buildLastMessagePreview', () => {
    it('should return text message preview', () => {
      const result = service['buildLastMessagePreview']('text', 'Hello world');
      expect(result).toBe('Hello world');
    });

    it('should truncate long text at 60 characters', () => {
      const result = service['buildLastMessagePreview']('text', 'a'.repeat(100));
      expect(result).toBe('a'.repeat(60) + '...');
    });

    it('should return image indicator', () => {
      const result = service['buildLastMessagePreview']('image', 'image_url');
      expect(result).toBe('[图片]');
    });

    it('should return voice indicator', () => {
      const result = service['buildLastMessagePreview']('text', '__VOICE__test');
      expect(result).toBe('[语音]');
    });
  });

  describe('listConversations', () => {
    it('should return user conversations', async () => {
      const mockConversations = [
        { id: 1, userA: 1, userB: 2, lastMessage: 'Hello', lastMessageAt: new Date(), createdAt: new Date(), userARef: { id: 1, nickname: 'User 1' }, userBRef: { id: 2, nickname: 'User 2' } },
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

      const result = await service.listConversations(1);

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

      const result = await service.listConversations(1);

      expect(result).toEqual([]);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      const mockMessages = [
        { id: 1, conversationId: 1, senderId: 1, content: 'Hello', type: 'text', createdAt: new Date(), sender: { id: 1, nickname: 'User 1', avatarUrl: '' } },
      ];

      conversationRepository.findOne.mockResolvedValue({ id: 1, userA: 1, userB: 2 });
      chatMessageRepository.findAndCount.mockResolvedValue([mockMessages, 1]);
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await service.getMessages(1, 1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should throw error when conversation not found', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(service.getMessages(1, 999, { page: 1, pageSize: 20 })).rejects.toThrow();
    });

    it('should throw error on unauthorized access', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 1, userA: 2, userB: 3 });

      await expect(service.getMessages(1, 1, { page: 1, pageSize: 20 })).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };
      const mockMessage = { id: 1, conversationId: 1, senderId: 1, content: 'Hello', type: 'text', createdAt: new Date() };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await service.sendMessage(1, 1, { content: 'Hello', type: 'text' });

      expect(result).toBeDefined();
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should throw error on empty content', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      await expect(service.sendMessage(1, 1, { content: '', type: 'text' })).rejects.toThrow();
    });

    it('should throw error when conversation not found', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(service.sendMessage(1, 999, { content: 'Hello', type: 'text' })).rejects.toThrow();
    });
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation(1, 2);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should create new conversation', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };

      conversationRepository.findOne.mockResolvedValue(null);
      conversationRepository.create.mockReturnValue(mockConversation);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation(1, 2);

      expect(result).toBeDefined();
      expect(conversationRepository.save).toHaveBeenCalled();
    });

    it('should throw error on self-conversation', async () => {
      await expect(service.getOrCreateConversation(1, 1)).rejects.toThrow();
    });
  });
});
