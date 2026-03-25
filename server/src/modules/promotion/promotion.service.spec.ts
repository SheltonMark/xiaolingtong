/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PromotionService } from './promotion.service';
import { Promotion } from '../../entities/promotion.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { Notification } from '../../entities/notification.entity';
import { Notice } from '../../entities/notice.entity';
import { PaymentService } from '../payment/payment.service';

describe('PromotionService', () => {
  let service: PromotionService;
  let adRepo: any;
  let noticeRepo: any;

  beforeEach(async () => {
    adRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    noticeRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: getRepositoryToken(Promotion), useValue: {} },
        { provide: getRepositoryToken(AdOrder), useValue: adRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(BeanTransaction), useValue: {} },
        { provide: getRepositoryToken(SysConfig), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Notification), useValue: {} },
        { provide: getRepositoryToken(Notice), useValue: noticeRepo },
        {
          provide: PaymentService,
          useValue: {
            generateOutTradeNo: jest.fn(),
            createJsapiOrder: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnterpriseHomeBanners', () => {
    it('should interleave active ads and notices before appending fallback banners', async () => {
      adRepo.find.mockResolvedValue([
        {
          id: 11,
          imageUrl: 'https://img.example.com/a.png',
          link: '/pages/a',
          linkType: 'internal',
          createdAt: new Date('2026-03-20T08:00:00.000Z'),
        },
        {
          id: 12,
          imageUrl: 'https://img.example.com/b.png',
          link: '/pages/b',
          linkType: 'internal',
          createdAt: new Date('2026-03-21T08:00:00.000Z'),
        },
      ]);
      noticeRepo.find.mockResolvedValue([
        {
          id: 21,
          title: '系统升级公告',
          content: '今晚维护，请提前处理紧急事项。',
          isActive: 1,
          expireAt: null,
          createdAt: new Date('2026-03-25T08:00:00.000Z'),
        },
        {
          id: 22,
          title: '活动通知',
          content: '本周上线新活动。',
          isActive: 1,
          expireAt: null,
          createdAt: new Date('2026-03-24T08:00:00.000Z'),
        },
      ]);

      const result = await (service as any).getEnterpriseHomeBanners();

      expect(result.list.map((item: any) => item.kind)).toEqual([
        'ad',
        'notice',
        'ad',
        'notice',
        'default',
        'default',
        'default',
      ]);
      expect(result.list[1]).toMatchObject({
        kind: 'notice',
        title: '系统升级公告',
        sub: '今晚维护，请提前处理紧急事项。',
      });
      expect(result.list[4]).toMatchObject({
        kind: 'default',
      });
    });

    it('should exclude inactive or expired notices and keep defaults when dynamic banners are empty', async () => {
      adRepo.find.mockResolvedValue([]);
      noticeRepo.find.mockResolvedValue([
        {
          id: 31,
          title: '已过期公告',
          content: '过期内容',
          isActive: 1,
          expireAt: new Date('2026-03-01T08:00:00.000Z'),
          createdAt: new Date('2026-03-01T08:00:00.000Z'),
        },
        {
          id: 32,
          title: '已停用公告',
          content: '停用内容',
          isActive: 0,
          expireAt: null,
          createdAt: new Date('2026-03-02T08:00:00.000Z'),
        },
      ]);

      const result = await (service as any).getEnterpriseHomeBanners();

      expect(result.list).toHaveLength(3);
      expect(result.list.every((item: any) => item.kind === 'default')).toBe(
        true,
      );
    });
  });
});
