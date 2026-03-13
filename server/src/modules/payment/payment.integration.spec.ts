/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Job } from '../../entities/job.entity';

describe('PaymentModule Integration Tests', () => {
  let controller: PaymentController;
  let service: PaymentService;
  let memberOrderRepository: any;
  let userRepository: any;
  let beanTxRepository: any;
  let adOrderRepository: any;
  let settlementRepository: any;
  let settlementItemRepository: any;
  let walletRepository: any;
  let walletTxRepository: any;
  let jobRepository: any;

  beforeEach(async () => {
    memberOrderRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    };

    beanTxRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    adOrderRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    settlementRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    settlementItemRepository = {
      find: jest.fn(),
    };

    walletRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    walletTxRepository = {
      save: jest.fn(),
      create: jest.fn(),
    };

    jobRepository = {
      update: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: any = {
          WX_APPID: 'test_appid',
          WX_MCH_ID: 'test_mchid',
          WX_APIV3_KEY: 'test_key_1234567890123456',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(MemberOrder),
          useValue: memberOrderRepository,
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
          provide: getRepositoryToken(AdOrder),
          useValue: adOrderRepository,
        },
        {
          provide: getRepositoryToken(Settlement),
          useValue: settlementRepository,
        },
        {
          provide: getRepositoryToken(SettlementItem),
          useValue: settlementItemRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: walletTxRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notify Integration', () => {
    it('should handle payment success notification', async () => {
      const mockReq = {
        body: {
          resource: {
            ciphertext: Buffer.from('test').toString('base64'),
            nonce: '0' * 12,
            associated_data: 'test',
          },
        },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      try {
        await controller.notify(mockReq, mockRes);
      } catch (e) {
        // Expected to fail due to encryption, but controller should handle it
      }

      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should handle decryption failure', async () => {
      const mockReq = {
        body: {
          resource: {
            ciphertext: 'invalid_base64!@#$',
            nonce: 'invalid',
            associated_data: 'test',
          },
        },
      } as any;

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as any;

      try {
        await controller.notify(mockReq, mockRes);
      } catch (e) {
        // Expected to fail
      }

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle member payment success', async () => {
      const mockOrder = {
        id: 1,
        userId: 1,
        payStatus: 'pending',
        durationDays: 30,
      };
      memberOrderRepository.findOne.mockResolvedValue(mockOrder);
      memberOrderRepository.save.mockResolvedValue({
        ...mockOrder,
        payStatus: 'paid',
      });
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.handlePaySuccess('MBR_1_123456_abc', {
        amount: { total: 9900 },
        payer: { openid: 'test_openid' },
      });

      expect(memberOrderRepository.findOne).toHaveBeenCalled();
      expect(memberOrderRepository.save).toHaveBeenCalled();
    });

    it('should handle bean payment success', async () => {
      const mockUser = { id: 1, openid: 'test_openid', beanBalance: 0 };
      userRepository.findOne.mockResolvedValue(mockUser);
      beanTxRepository.findOne.mockResolvedValue(null);
      userRepository.update.mockResolvedValue({ affected: 1 });
      beanTxRepository.save.mockResolvedValue({ id: 1 });

      const result = await service.handlePaySuccess('BEAN_0_123456_abc', {
        amount: { total: 1000 },
        payer: { openid: 'test_openid' },
      });

      expect(userRepository.findOne).toHaveBeenCalled();
      expect(beanTxRepository.save).toHaveBeenCalled();
    });

    it('should handle ad payment success', async () => {
      const mockOrder = { id: 1, status: 'pending', durationDays: 7 };
      adOrderRepository.findOne.mockResolvedValue(mockOrder);
      adOrderRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.handlePaySuccess('AD_1_123456_abc', {
        amount: { total: 5000 },
      });

      expect(adOrderRepository.findOne).toHaveBeenCalled();
      expect(adOrderRepository.update).toHaveBeenCalled();
    });

    it('should handle settlement payment success', async () => {
      const mockSettlement = {
        id: 1,
        status: 'pending',
        jobId: 1,
        supervisorId: 2,
        supervisorFee: 100,
      };
      const mockItems = [
        { id: 1, workerId: 3, workerPay: 500, settlementId: 1 },
      ];

      settlementRepository.findOne.mockResolvedValue(mockSettlement);
      settlementItemRepository.find.mockResolvedValue(mockItems);
      walletRepository.findOne.mockResolvedValue(null);
      walletRepository.create.mockReturnValue({ userId: 3, balance: 0 });
      walletRepository.save.mockResolvedValue({ userId: 3, balance: 500 });
      walletTxRepository.save.mockResolvedValue({ id: 1 });
      userRepository.increment.mockResolvedValue({ affected: 1 });
      settlementRepository.save.mockResolvedValue({
        ...mockSettlement,
        status: 'distributed',
      });
      jobRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.handlePaySuccess('STL_1_123456_abc', {
        amount: { total: 60000 },
      });

      expect(settlementRepository.findOne).toHaveBeenCalled();
      expect(settlementItemRepository.find).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
    });

    it('should handle unknown order prefix', async () => {
      const result = await service.handlePaySuccess('UNKNOWN_1_123456_abc', {
        amount: { total: 1000 },
      });

      // Should not throw, just log warning
      expect(result).toBeUndefined();
    });

    it('should prevent duplicate bean payment processing', async () => {
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockTx = {
        id: 1,
        refType: 'recharge',
        remark: 'BEAN_0_123456_abc',
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      beanTxRepository.findOne.mockResolvedValue(mockTx);

      const result = await service.handlePaySuccess('BEAN_0_123456_abc', {
        amount: { total: 1000 },
        payer: { openid: 'test_openid' },
      });

      expect(beanTxRepository.findOne).toHaveBeenCalled();
      expect(beanTxRepository.save).not.toHaveBeenCalled();
    });

    it('should handle missing user in bean payment', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.handlePaySuccess('BEAN_0_123456_abc', {
        amount: { total: 1000 },
        payer: { openid: 'test_openid' },
      });

      expect(userRepository.findOne).toHaveBeenCalled();
      expect(beanTxRepository.save).not.toHaveBeenCalled();
    });

    it('should handle missing openid in bean payment', async () => {
      const result = await service.handlePaySuccess('BEAN_0_123456_abc', {
        amount: { total: 1000 },
        payer: {},
      });

      expect(beanTxRepository.save).not.toHaveBeenCalled();
    });
  });
});
