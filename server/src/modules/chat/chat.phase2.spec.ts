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

function createUnlockQuery(unlock: any) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(unlock),
  };
}

describe('Phase 2: Chat regressions', () => {
  let service: ChatService;
  let convRepo: any;
  let msgRepo: any;
  let unlockRepo: any;
  let entCertRepo: any;
  let workerCertRepo: any;
  let realtimeService: any;

  beforeEach(async () => {
    convRepo = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    msgRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    unlockRepo = {
      createQueryBuilder: jest.fn(),
    };

    entCertRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    workerCertRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    realtimeService = {
      emitToUser: jest.fn(),
      isUserOnline: jest.fn().mockReturnValue(false),
      markUserActive: jest.fn().mockResolvedValue(undefined),
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
          provide: getRepositoryToken(ContactUnlock),
          useValue: unlockRepo,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: {},
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: entCertRepo,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepo,
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

  it('reuses the same job conversation for the same worker, enterprise and job', async () => {
    const existing = { id: 1, userA: 2, userB: 9, postId: 0, jobId: 11 };
    convRepo.findOne.mockResolvedValue(existing);

    const result = await service.getOrCreateConversation(9, 2, undefined, 11);

    expect(result).toEqual(existing);
    expect(convRepo.save).not.toHaveBeenCalled();
  });

  it('keeps job and post contexts distinct for the same two users', async () => {
    convRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    convRepo.save
      .mockResolvedValueOnce({ id: 1, userA: 2, userB: 9, postId: 0, jobId: 11 })
      .mockResolvedValueOnce({ id: 2, userA: 2, userB: 9, postId: 5, jobId: 0 });
    unlockRepo.createQueryBuilder.mockReturnValue(createUnlockQuery({ id: 99 }));

    const jobConversation = await service.getOrCreateConversation(
      9,
      2,
      undefined,
      11,
    );
    const postConversation = await service.getOrCreateConversation(
      9,
      2,
      5,
      undefined,
    );

    expect(jobConversation).toEqual(
      expect.objectContaining({ id: 1, jobId: 11, postId: 0 }),
    );
    expect(postConversation).toEqual(
      expect.objectContaining({ id: 2, jobId: 0, postId: 5 }),
    );
  });

  it('marks sender active and emits realtime events when sending a message', async () => {
    convRepo.findOne.mockResolvedValue({ id: 1, userA: 1, userB: 2 });
    msgRepo.save.mockResolvedValue({
      id: 3,
      conversationId: 1,
      senderId: 1,
      type: 'text',
      content: 'hello',
      createdAt: new Date('2026-03-21T09:31:00.000Z'),
    });

    await service.sendMessage(1, 1, { type: 'text', content: 'hello' });

    expect(realtimeService.markUserActive).toHaveBeenCalledWith(1);
    expect(realtimeService.emitToUser).toHaveBeenCalledWith(
      2,
      'new_message',
      expect.any(Object),
    );
  });
});
