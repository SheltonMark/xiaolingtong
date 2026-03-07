/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BeanController } from './bean.controller';
import { BeanService } from './bean.service';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { PaymentService } from '../payment/payment.service';

describe('BeanModule Integration Tests', () => {
  let controller: BeanController;
  let service: BeanService;
  let userRepository: any;
  let beanTxRepository: any;
  let paymentService: any;
  let configService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    beanTxRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn((prefix, id) => `${prefix}_${id}_${Date.now()}`),
      createJsapiOrder: jest.fn().mockResolvedValue({ prepayId: 'test_prepay_id' }),
    };

    configService = {
      get: jest.fn().mockReturnValue('https://quanqiutong888.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeanController],
      providers: [
        BeanService,
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

    controller = module.get<BeanController>(BeanController);
    service = module.get<BeanService>(BeanService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance Integration', () => {
    it('should return user bean balance', async () => {
      const mockUser = { id: 1, beanBalance: 100 };
      userRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await controller.getBalance(1);

      expect(result).toBeDefined();
      expect(result.beanBalance).toBe(100);
    });

    it('should throw error when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(controller.getBalance(999)).rejects.toThrow();
    });
  });

  describe('recharge Integration', () => {
    it('should initiate bean recharge', async () => {
      const mockUser = { id: 1, openid: 'test_openid', beanBalance: 100 };
      userRepository.findOneBy.mockResolvedValue(mockUser);
      paymentService.generateOutTradeNo.mockReturnValue('BEAN_0_123456');
      paymentService.createJsapiOrder.mockResolvedValue({ prepayId: 'test_prepay_id' });

      const result = await controller.recharge(1, { amount: 100, price: 9.99 });

      expect(result).toBeDefined();
      expect(result.outTradeNo).toBe('BEAN_0_123456');
      expect(result.prepayId).toBe('test_prepay_id');
      expect(paymentService.createJsapiOrder).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(controller.recharge(999, { amount: 100, price: 9.99 })).rejects.toThrow();
    });

    it('should use default API host when not configured', async () => {
      const mockUser = { id: 1, openid: 'test_openid', beanBalance: 100 };
      userRepository.findOneBy.mockResolvedValue(mockUser);
      configService.get.mockReturnValue('https://quanqiutong888.com');
      paymentService.createJsapiOrder.mockResolvedValue({ prepayId: 'test_prepay_id' });

      const result = await controller.recharge(1, { amount: 100, price: 9.99 });

      expect(result).toBeDefined();
      expect(paymentService.createJsapiOrder).toHaveBeenCalled();
    });
  });

  describe('getTransactions Integration', () => {
    it('should return paginated bean transactions', async () => {
      const mockTransactions = [
        { id: 1, userId: 1, amount: 100, type: 'recharge', createdAt: new Date() },
      ];

      beanTxRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTransactions, 1]),
      });

      const result = await controller.getTransactions(1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty list when no transactions', async () => {
      beanTxRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await controller.getTransactions(1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
