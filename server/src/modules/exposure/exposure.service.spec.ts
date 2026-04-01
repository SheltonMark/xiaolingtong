import { BadRequestException } from '@nestjs/common';
import { ExposureService } from './exposure.service';

describe('ExposureService', () => {
  let service: ExposureService;
  let expRepo: any;
  let commentRepo: any;
  let configRepo: any;
  let wechatSecurityService: any;

  beforeEach(() => {
    expRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
    };
    commentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    configRepo = {
      find: jest.fn().mockResolvedValue([
        { key: 'exposure_category_false_info_label', value: '维权经历' },
        { key: 'exposure_category_fraud_label', value: '协商过程' },
        { key: 'exposure_category_wage_theft_label', value: '结果反馈' },
      ]),
    };
    wechatSecurityService = {
      assertSafeSubmission: jest.fn().mockResolvedValue(undefined),
    };

    service = new ExposureService(
      expRepo,
      commentRepo,
      configRepo,
      wechatSecurityService,
    );
  });

  it('list should prefer enterprise company name as publisherName', async () => {
    expRepo.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 1,
            category: 'false_info',
            amount: 1200,
            description: '维权记录',
            images: [],
            createdAt: new Date('2026-03-20T00:00:00.000Z'),
            publisher: {
              id: 10,
              role: 'enterprise',
              nickname: '平台昵称',
            },
          },
        ],
        1,
      ]),
    });
    expRepo.manager.findOne.mockImplementation((entity: any) => {
      if (entity.name === 'EnterpriseCert') {
        return Promise.resolve({
          userId: 10,
          status: 'approved',
          companyName: '示例企业',
        });
      }
      return Promise.resolve(null);
    });

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.list[0]).toEqual(
      expect.objectContaining({
        publisherName: '示例企业',
        avatarText: '维',
        type: '维权经历',
      }),
    );
  });

  it('comment should create a saved comment after content safety check', async () => {
    expRepo.findOne.mockResolvedValue({ id: 1 });
    expRepo.manager.findOne.mockImplementation((entity: any) => {
      if (entity.name === 'User') {
        return Promise.resolve({ id: 2, openid: 'openid-2' });
      }
      return Promise.resolve(null);
    });
    commentRepo.create.mockImplementation((payload: any) => payload);
    commentRepo.save.mockImplementation(async (payload: any) => ({
      id: 99,
      ...payload,
    }));

    const result = await service.comment(1, 2, '这是我的评论');

    expect(wechatSecurityService.assertSafeSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        texts: ['这是我的评论'],
        openid: 'openid-2',
      }),
    );
    expect(commentRepo.create).toHaveBeenCalledWith({
      exposureId: 1,
      userId: 2,
      content: '这是我的评论',
    });
    expect(result).toEqual({
      id: 99,
      exposureId: 1,
      userId: 2,
      content: '这是我的评论',
    });
  });

  it('comment should reject empty content', async () => {
    await expect(service.comment(1, 2, '   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
