/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

describe('PromotionController', () => {
  let controller: PromotionController;
  let service: jest.Mocked<PromotionService>;

  beforeEach(async () => {
    service = {
      getTopPricing: jest.fn(),
      promote: jest.fn(),
      purchaseAd: jest.fn(),
      getActiveAds: jest.fn(),
      getAdPricing: jest.fn(),
      getEnterpriseHomeBanners: jest.fn(),
    } as unknown as jest.Mocked<PromotionService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should expose enterprise home banners through the promotion service', async () => {
    service.getEnterpriseHomeBanners.mockResolvedValue({
      list: [{ id: 'notice-1', kind: 'notice', title: '系统升级公告' }],
    } as any);

    const result = await (controller as any).getEnterpriseHomeBanners();

    expect(service.getEnterpriseHomeBanners).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      list: [{ id: 'notice-1', kind: 'notice', title: '系统升级公告' }],
    });
  });
});
