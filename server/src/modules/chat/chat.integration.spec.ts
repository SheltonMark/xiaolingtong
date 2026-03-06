/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { User } from '../../entities/user.entity';

describe('ChatModule Integration Tests', () => {
  let controller: ChatController;
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
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations Integration', () => {
    it('should return user conversations', async () => {
      const mockConversations = [
        { id: 1, userAId: 1, userBId: 2, lastMessage: 'Hello', lastMessageAt: new Date() },
      ];

      conversationRepository.find.mockResolvedValue(mockConversations);
      chatMessageRepository.count.mockResolvedValue(0);
      userRepository.findOne.mockResolvedValue({ id: 2, nickname: 'User 2', avatar: 'avatar.jpg' });

      const result = await controller.getConversations(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no conversations', async () => {
      conversationRepository.find.mockResolvedValue([]);

      const result = await controller.getConversations(1);

      expect(result).toEqual([]);
    });

    it('should include unread counts', async () => {
      const mockConversations = [
        { id: 1, userAId: 1, userBId: 2, lastMessage: 'Hello' },
      ];

      conversationRepository.find.mockResolvedValue(mockConversations);
      chatMessageRepository.count.mockResolvedValue(3);
      userRepository.findOne.mockResolvedValue({ id: 2, nickname: 'User 2' });

      const result = await controller.getConversations(1);

      expect(result).toBeDefined();
      expect(result[0].unreadCount).toBe(3);
    });
  });

  describe('getMessages Integration', () => {
    it('should return paginated messages', async () => {
      const mockMessages = [
        { id: 1, conversationId: 1, senderId: 1, content: 'Hello', type: 'text', createdAt: new Date() },
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

      const result = await controller.getMessages(1, 1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });

    it('should mark messages as read', async () => {
      const mockMessages = [];

      conversationRepository.findOne.mockResolvedValue({ id: 1, userAId: 1, userBId: 2 });
      chatMessageRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockMessages, 0]),
      });
      chatMessageRepository.update.mockResolvedValue({ affected: 0 });

      const result = await controller.getMessages(1, 1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
    });

    it('should throw error on unauthorized access', async () => {
      conversationRepository.findOne.mockResolvedValue({ id: 1, userAId: 2, userBId: 3 });

      await expect(controller.getMessages(1, 1, { page: 1, pageSize: 20 })).rejects.toThrow();
    });
  });

  describe('sendMessage Integration', () => {
    it('should send text message successfully', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };
      const mockMessage = { id: 1, conversationId: 1, senderId: 1, content: 'Hello', type: 'text' };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await controller.sendMessage(1, 1, { content: 'Hello', type: 'text' });

      expect(result).toBeDefined();
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should send image message successfully', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };
      const mockMessage = { id: 1, conversationId: 1, senderId: 1, content: 'image_url', type: 'image' };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await controller.sendMessage(1, 1, { content: 'image_url', type: 'image' });

      expect(result).toBeDefined();
      expect(chatMessageRepository.save).toHaveBeenCalled();
    });

    it('should throw error on empty content', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      await expect(controller.sendMessage(1, 1, { content: '', type: 'text' })).rejects.toThrow();
    });
  });

  describe('getOrCreateConversation Integration', () => {
    it('should return existing conversation', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };

      conversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await controller.getOrCreateConversation(1, 2);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should create new conversation', async () => {
      const mockConversation = { id: 1, userAId: 1, userBId: 2 };

      conversationRepository.findOne.mockResolvedValue(null);
      conversationRepository.create.mockReturnValue(mockConversation);
      conversationRepository.save.mockResolvedValue(mockConversation);

      const result = await controller.getOrCreateConversation(1, 2);

      expect(result).toBeDefined();
      expect(conversationRepository.save).toHaveBeenCalled();
    });

    it('should throw error on self-conversation', async () => {
      await expect(controller.getOrCreateConversation(1, 1)).rejects.toThrow();
    });
  });
});
