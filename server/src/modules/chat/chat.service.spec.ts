/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { User } from '../../entities/user.entity';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepository: any;
  let chatMessageRepository: any;
  let userRepository: any;

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
      createQueryBuilder: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
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
          provide: getRepositoryToken(User),
          useValue: userRepository,
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
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('buildLastMessagePreview', () => {
    it('should return text message preview', () => {
      const message = { type: 'text', content: 'Hello world' };
      const result = service['buildLastMessagePreview'](message);
      expect(result).toBe('Hello world');
    });

    it('should truncate long text', () => {
      const message = { type: 'text', content: 'a'.repeat(100) };
      const result = service['buildLastMessagePreview'](message);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should return image indicator', () => {
      const message = { type: 'image', content: 'image_url' };
      const result = service['buildLastMessagePreview'](message);
      expect(result).toContain('图片');
    });

    it('should return voice indicator', () => {
      const message = { type: 'voice', content: 'voice_url' };
      const result = service['buildLastMessagePreview'](message);
      expect(result).toContain('语音');
    });
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const mockConversations = [
        { id: 1, userAId: 1, userBId: 2, lastMessage: 'Hello' },
      ];

      conversationRepository.find.mockResolvedValue(mockConversations);
      chatMessageRepository.count.mockResolvedValue(0);
      userRepository.findOne.mockResolvedValue({ id: 2, nickname: 'User 2' });

      const result = await service.getConversations(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no conversations', async () => {
      conversationRepository.find.mockResolvedValue([]);

      const result = await service.getConversations(1);

      expect(result).toEqual([]);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages', async () => {
      const mockMessages = [
        { id: 1, conversationId: 1, senderId: 1, content: 'Hello', type: 'text' },
      ];

      conversationRepository.findOne.mockResolvedValue({ id: 1, userAId: 1, userBId: 2 });
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockMessages, 1]),
      });
      chatMessageRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.getMessages(1, 1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should throw error when conversation not found', async () => {
      conversationRepository.findOne.mockResolvedValue(null);

      await expect(service.getMessages(1, 999, { page: 1, pageSize: 20 })).rejects.toThrow();
    });

    it('should throw error on unauthorized access', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 1, userAId: 2, userBId: 3 });

      await expect(service.getMessages(1, 1, { page: 1, pageSize: 20 })).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };
      const mockMessage = { id: 1, conversationId: 1, senderId: 1, content: 'Hello', type: 'text' };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await service.sendMessage(1, 1, { content: 'Hello', type: 'text' });

      expect(result).toBeDefined();
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should throw error on empty content', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };

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
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation(1, 2);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should create new conversation', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };

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
