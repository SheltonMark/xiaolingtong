/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { Promotion } from '../../entities/promotion.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { PaymentService } from '../payment/payment.service';

describe('PromotionModule Integration Tests', () => {
  let controller: PromotionController;
  let service: PromotionService;
  let promotionRepository: any;
  let adRepository: any;
  let userRepository: any;
  let beanTxRepository: any;
  let paymentService: any;
  let configService: any;

  beforeEach(async () => {
    promotionRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    adRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    beanTxRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn((prefix, id) => `${prefix}_${id}_${Date.now()}`),
      createJsapiOrder: jest.fn().mockResolvedValue({ prepayId: 'test_prepay_id' }),
    };

    configService = {
      get: jest.fn().mockReturnValue('https://quanqiutong888.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        PromotionService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: promotionRepository,
        },
        {
          provide: getRepositoryToken(AdOrder),
          useValue: adRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(BeanTransaction),
          useValue: beanTxRepository,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
    service = module.get<PromotionService>(PromotionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('promote Integration', () => {
    it('should promote post successfully', async () => {
      const mockUser = { id: 1, beanBalance: 1000 };
      const mockPromo = { id: 1, userId: 1, postId: 1, beanCost: 100, durationDays: 7, boostType: 'top' };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      promotionRepository.create.mockReturnValue(mockPromo);
      promotionRepository.save.mockResolvedValue(mockPromo);
      beanTxRepository.create.mockReturnValue({ id: 1 });
      beanTxRepository.save.mockResolvedValue({ id: 1 });
      userRepository.save.mockResolvedValue({ ...mockUser, beanBalance: 900 });

      const result = await controller.promote(1, { postId: 1, beanCost: 100, durationDays: 7 });

      expect(result).toBeDefined();
      expect(result.message).toBe('推广成功');
      expect(result.beanBalance).toBe(900);
      expect(promotionRepository.save).toHaveBeenCalled();
    });

    it('should throw error when insufficient beans', async () => {
      const mockUser = { id: 1, beanBalance: 50 };

      userRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(controller.promote(1, { postId: 1, beanCost: 100, durationDays: 7 })).rejects.toThrow();
    });

    it('should throw error when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(controller.promote(999, { postId: 1, beanCost: 100, durationDays: 7 })).rejects.toThrow();
    });
  });

  describe('purchaseAd Integration', () => {
    it('should purchase ad successfully', async () => {
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockAd = { id: 1, userId: 1, slot: 'top', title: 'Ad Title', price: 99.99, durationDays: 30, status: 'pending' };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      adRepository.create.mockReturnValue(mockAd);
      adRepository.save.mockResolvedValue(mockAd);
      paymentService.generateOutTradeNo.mockReturnValue('AD_1_123456');
      paymentService.createJsapiOrder.mockResolvedValue({ prepayId: 'test_prepay_id' });

      const result = await controller.purchaseAd(1, { slot: 'top', title: 'Ad Title', imageUrl: 'image.jpg', link: 'http://example.com', durationDays: 30, price: 99.99 });

      expect(result).toBeDefined();
      expect(result.orderId).toBe(1);
      expect(result.prepayId).toBe('test_prepay_id');
      expect(adRepository.save).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(controller.purchaseAd(999, { slot: 'top', title: 'Ad Title', imageUrl: 'image.jpg', link: 'http://example.com', durationDays: 30, price: 99.99 })).rejects.toThrow();
    });
  });
});
