/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

describe('MembershipModule Integration Tests', () => {
  let controller: MembershipController;
  let service: MembershipService;
  let orderRepository: any;
  let userRepository: any;
  let paymentService: any;
  let configService: any;

  beforeEach(async () => {
    orderRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn((prefix, id) => `${prefix}_${id}_${Date.now()}`),
      createJsapiOrder: jest.fn().mockResolvedValue({ prepayId: 'test_prepay_id' }),
    };

    configService = {
      get: jest.fn().mockReturnValue('https://quanqiutong888.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [
        MembershipService,
        {
          provide: getRepositoryToken(MemberOrder),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
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

    controller = module.get<MembershipController>(MembershipController);
    service = module.get<MembershipService>(MembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribe Integration', () => {
    it('should create membership subscription', async () => {
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockOrder = { id: 1, userId: 1, planName: 'Premium', price: 99.99, durationDays: 30, payStatus: 'pending' };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);
      paymentService.generateOutTradeNo.mockReturnValue('MBR_1_123456');
      paymentService.createJsapiOrder.mockResolvedValue({ prepayId: 'test_prepay_id' });

      const result = await controller.subscribe(1, { planName: 'Premium', price: 99.99, durationDays: 30 });

      expect(result).toBeDefined();
      expect(result.orderId).toBe(1);
      expect(result.prepayId).toBe('test_prepay_id');
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(controller.subscribe(999, { planName: 'Premium', price: 99.99, durationDays: 30 })).rejects.toThrow();
    });

    it('should generate correct trade number', async () => {
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockOrder = { id: 5, userId: 1, planName: 'Premium', price: 99.99, durationDays: 30, payStatus: 'pending' };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      orderRepository.create.mockReturnValue(mockOrder);
      orderRepository.save.mockResolvedValue(mockOrder);
      paymentService.generateOutTradeNo.mockReturnValue('MBR_5_123456');
      paymentService.createJsapiOrder.mockResolvedValue({ prepayId: 'test_prepay_id' });

      const result = await controller.subscribe(1, { planName: 'Premium', price: 99.99, durationDays: 30 });

      expect(paymentService.generateOutTradeNo).toHaveBeenCalledWith('MBR', mockOrder.id);
      expect(result.orderId).toBe(5);
    });
  });
});
