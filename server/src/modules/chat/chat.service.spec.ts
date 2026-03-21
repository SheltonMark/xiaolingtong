/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { Conversation } from '../../entities/conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { Post } from '../../entities/post.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';

function createConversationListQuery(result: any[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

function createConversationDetailQuery(result: any) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
  };
}

function createUnreadQuery(rows: any[]) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

function createReadUpdateQuery() {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
}

function createCertQuery(certs: any[]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(certs),
  };
}

function createUnlockQuery(unlock: any) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(unlock),
  };
}

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepository: any;
  let chatMessageRepository: any;
  let unlockRepository: any;
  let postRepository: any;
  let enterpriseCertRepository: any;
  let workerCertRepository: any;
  let chatRealtimeService: any;

  beforeEach(async () => {
    conversationRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    chatMessageRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    unlockRepository = {
      createQueryBuilder: jest.fn(),
    };

    postRepository = {};

    enterpriseCertRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    workerCertRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    chatRealtimeService = {
      emitToUser: jest.fn(),
      isUserOnline: jest.fn().mockReturnValue(false),
      markUserActive: jest.fn().mockResolvedValue(undefined),
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
          provide: getRepositoryToken(ContactUnlock),
          useValue: unlockRepository,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: postRepository,
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: enterpriseCertRepository,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepository,
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

  describe('buildLastMessagePreview', () => {
    it('returns an image placeholder for image payloads', () => {
      expect(service['buildLastMessagePreview']('image', 'image-url')).toBe(
        '[图片]',
      );
    });

    it('returns a voice placeholder for voice payloads', () => {
      expect(service['buildLastMessagePreview']('text', '__VOICE__payload')).toBe(
        '[语音]',
      );
    });
  });

  describe('listConversations', () => {
    it('includes presence fields for the counterpart', async () => {
      const lastActiveAt = new Date('2026-03-21T09:30:00.000Z');
      conversationRepository.createQueryBuilder.mockReturnValue(
        createConversationListQuery([
          {
            id: 1,
            userA: 1,
            userB: 2,
            postId: 0,
            jobId: 7,
            lastMessage: 'Hello',
            lastMessageAt: new Date('2026-03-21T09:31:00.000Z'),
            createdAt: new Date('2026-03-21T09:20:00.000Z'),
            userARef: { id: 1, nickname: 'Worker 1', avatarUrl: '' },
            userBRef: {
              id: 2,
              nickname: 'Factory 2',
              avatarUrl: '',
              lastActiveAt,
            },
          },
        ]),
      );
      enterpriseCertRepository.createQueryBuilder.mockReturnValue(
        createCertQuery([]),
      );
      workerCertRepository.createQueryBuilder.mockReturnValue(
        createCertQuery([]),
      );
      chatMessageRepository.createQueryBuilder.mockReturnValue(
        createUnreadQuery([{ conversationId: 1, count: 2 }]),
      );
      chatRealtimeService.isUserOnline.mockReturnValue(true);

      const result = await service.listConversations(1);

      expect(chatRealtimeService.markUserActive).toHaveBeenCalledWith(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 1,
          postId: 0,
          jobId: 7,
          unreadCount: 2,
          isOnline: true,
          lastActiveAt,
          activeText: '在线',
        }),
      );
    });
  });

  describe('getMessages', () => {
    it('returns counterpart presence in otherUser', async () => {
      const lastActiveAt = new Date('2026-03-21T09:30:00.000Z');
      conversationRepository.createQueryBuilder.mockReturnValue(
        createConversationDetailQuery({
          id: 1,
          userA: 1,
          userB: 2,
          userARef: { id: 1, nickname: 'Worker 1', avatarUrl: '' },
          userBRef: {
            id: 2,
            nickname: 'Factory 2',
            avatarUrl: 'avatar.png',
            lastActiveAt,
          },
        }),
      );
      chatMessageRepository.findAndCount.mockResolvedValue([[], 0]);
      chatMessageRepository.createQueryBuilder.mockReturnValue(
        createReadUpdateQuery(),
      );
      enterpriseCertRepository.findOne.mockResolvedValue(null);
      workerCertRepository.findOne.mockResolvedValue(null);

      const result = await service.getMessages(1, 1, { page: 1, pageSize: 20 });

      expect(chatRealtimeService.markUserActive).toHaveBeenCalledWith(1);
      expect(result.otherUser).toEqual(
        expect.objectContaining({
          id: 2,
          name: 'Factory 2',
          avatarUrl: 'avatar.png',
          isOnline: false,
          lastActiveAt,
          activeText: expect.any(String),
        }),
      );
    });
  });

  describe('sendMessage', () => {
    it('marks the sender active after sending', async () => {
      const mockConversation = { id: 1, userA: 1, userB: 2 };
      const mockMessage = {
        id: 5,
        conversationId: 1,
        senderId: 1,
        type: 'text',
        content: 'Hello',
        createdAt: new Date('2026-03-21T09:31:00.000Z'),
      };

      conversationRepository.findOne.mockResolvedValue(mockConversation);
      chatMessageRepository.create.mockReturnValue(mockMessage);
      chatMessageRepository.save.mockResolvedValue(mockMessage);
      conversationRepository.update.mockResolvedValue({ affected: 1 });

      await service.sendMessage(1, 1, { type: 'text', content: 'Hello' });

      expect(chatRealtimeService.markUserActive).toHaveBeenCalledWith(1);
      expect(chatRealtimeService.emitToUser).toHaveBeenCalledWith(
        2,
        'new_message',
        expect.any(Object),
      );
    });
  });

  describe('getOrCreateConversation', () => {
    it('allows creating a job conversation without requiring unlock', async () => {
      conversationRepository.findOne.mockResolvedValue(null);
      conversationRepository.save.mockImplementation(async (value) => ({
        id: 11,
        ...value,
      }));

      const result = await service.getOrCreateConversation(9, 2, undefined, 7);

      expect(unlockRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          id: 11,
          userA: 2,
          userB: 9,
          postId: 0,
          jobId: 7,
        }),
      );
    });

    it('keeps post conversations behind the unlock rule', async () => {
      conversationRepository.findOne.mockResolvedValue(null);
      unlockRepository.createQueryBuilder.mockReturnValue(createUnlockQuery(null));

      await expect(
        service.getOrCreateConversation(9, 2, 5, undefined),
      ).rejects.toThrow('请先解锁对方联系方式后再发起聊天');
    });
  });
});
