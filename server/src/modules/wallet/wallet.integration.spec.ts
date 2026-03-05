/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

describe('WalletModule Integration Tests', () => {
  let controller: WalletController;
  let service: WalletService;
  let walletRepository: any;
  let walletTransactionRepository: any;
  let userRepository: any;
  let paymentService: any;

  beforeEach(async () => {
    walletRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    walletTransactionRepository = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    paymentService = {
      transferToWallet: jest.fn(),
      generateOutTradeNo: jest.fn().mockReturnValue('WD_1_123456_abc'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: walletTransactionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance Integration', () => {
    it('should return wallet balance', async () => {
      const mockBalance = { id: 1, userId: 1, balance: 1000 };

      walletRepository.findOne.mockResolvedValue(mockBalance);

      const result = await controller.getBalance(1);

      expect(result.balance).toBe(1000);
      expect(walletRepository.findOne).toHaveBeenCalled();
    });

    it('should create wallet if not found', async () => {
      const mockWallet = { id: 1, userId: 1, balance: 0 };

      walletRepository.findOne.mockResolvedValue(null);
      walletRepository.create.mockReturnValue(mockWallet);
      walletRepository.save.mockResolvedValue(mockWallet);

      const result = await controller.getBalance(1);

      expect(result).toBeDefined();
      expect(walletRepository.save).toHaveBeenCalled();
    });
  });

  describe('getTransactions Integration', () => {
    it('should return transactions with pagination', async () => {
      const mockResult = {
        list: [{ id: 1, type: 'income', amount: 100 }],
        total: 1,
        page: 1,
        pageSize: 20,
      };

      walletTransactionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
      });

      const result = await controller.getTransactions(1, { page: 1, pageSize: 20 });

      expect(result).toBeDefined();
    });

    it('should return empty transaction list', async () => {
      walletTransactionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      });

      const result = await controller.getTransactions(1, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
    });
  });

  describe('getIncome Integration', () => {
    it('should return income transactions', async () => {
      const mockResult = {
        list: [{ id: 1, type: 'income', amount: 500 }],
        totalAmount: 500,
        month: '2026-03',
      };

      walletTransactionRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 1, amount: 500 }]),
      });

      const result = await controller.getIncome(1, { month: '2026-03' });

      expect(result).toBeDefined();
    });
  });

  describe('withdraw Integration', () => {
    it('should withdraw successfully', async () => {
      const mockWallet = { id: 1, userId: 1, balance: 1000 };
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockTx = { id: 1, userId: 1, type: 'withdraw', amount: 100, status: 'pending' };

      walletRepository.findOne.mockResolvedValue(mockWallet);
      userRepository.findOneBy.mockResolvedValue(mockUser);
      walletTransactionRepository.create.mockReturnValue(mockTx);
      walletTransactionRepository.save.mockResolvedValue(mockTx);
      walletRepository.save.mockResolvedValue({ ...mockWallet, balance: 900 });
      paymentService.transferToWallet.mockResolvedValue({ success: true });

      const result = await controller.withdraw(1, 100);

      expect(result).toBeDefined();
      expect(walletRepository.findOne).toHaveBeenCalled();
    });

    it('should handle insufficient balance', async () => {
      const mockWallet = { id: 1, userId: 1, balance: 50 };

      walletRepository.findOne.mockResolvedValue(mockWallet);

      await expect(controller.withdraw(1, 100)).rejects.toThrow();
    });
  });
});
