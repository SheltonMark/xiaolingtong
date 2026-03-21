/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController contract', () => {
  let controller: ChatController;
  let chatService: any;

  beforeEach(async () => {
    chatService = {
      listConversations: jest.fn(),
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
      getOrCreateConversation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: chatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards jobId when creating a job conversation', async () => {
    chatService.getOrCreateConversation.mockResolvedValue({
      id: 8,
      postId: 0,
      jobId: 12,
    });

    const result = await controller.withUser(1, 2, { jobId: 12 });

    expect(chatService.getOrCreateConversation).toHaveBeenCalledWith(
      1,
      2,
      undefined,
      12,
    );
    expect(result).toEqual(expect.objectContaining({ jobId: 12 }));
  });

  it('returns presence fields from the conversation list contract', async () => {
    chatService.listConversations.mockResolvedValue([
      {
        id: 1,
        name: 'Factory 2',
        isOnline: true,
        lastActiveAt: new Date('2026-03-21T09:30:00.000Z'),
        activeText: '鍦ㄧ嚎',
      },
    ]);

    const result = await controller.list(1);

    expect(result[0]).toEqual(
      expect.objectContaining({
        isOnline: true,
        activeText: '鍦ㄧ嚎',
      }),
    );
  });

  it('returns counterpart presence from the message detail contract', async () => {
    chatService.getMessages.mockResolvedValue({
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
      otherUser: {
        id: 2,
        name: 'Factory 2',
        isOnline: false,
        lastActiveAt: new Date('2026-03-21T09:30:00.000Z'),
        activeText: '浠婂ぉ娲昏穬',
      },
    });

    const result = await controller.messages(1, 1, { page: 1, pageSize: 20 });

    expect(result.otherUser).toEqual(
      expect.objectContaining({
        isOnline: false,
        activeText: '浠婂ぉ娲昏穬',
      }),
    );
  });
});
