/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';
import { BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: any;
  let txRepo: any;
  let userRepo: any;
  let paymentService: any;

  beforeEach(async () => {
    walletRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    txRepo = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    userRepo = {
      findOneBy: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn(),
      transferToWallet: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepo,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: txRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return existing wallet', async () => {
      const userId = 1;
      const mockWallet = { id: 1, userId, balance: 1000, totalIncome: 5000, totalWithdraw: 4000 };

      walletRepo.findOne.mockResolvedValue(mockWallet);

      const result = await service.getBalance(userId);

      expect(walletRepo.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual(mockWallet);
    });

    it('should create wallet if not exists', async () => {
      const userId = 1;
      const newWallet = { id: 1, userId, balance: 0, totalIncome: 0, totalWithdraw: 0 };

      walletRepo.findOne.mockResolvedValue(null);
      walletRepo.create.mockReturnValue(newWallet);
      walletRepo.save.mockResolvedValue(newWallet);

      const result = await service.getBalance(userId);

      expect(walletRepo.create).toHaveBeenCalledWith({ userId });
      expect(walletRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newWallet);
    });

    it('should handle wallet with zero balance', async () => {
      const userId = 1;
      const mockWallet = { id: 1, userId, balance: 0, totalIncome: 0, totalWithdraw: 0 };

      walletRepo.findOne.mockResolvedValue(mockWallet);

      const result = await service.getBalance(userId);

      expect(result.balance).toBe(0);
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const userId = 1;
      const mockTransactions = [
        { id: 1, userId, type: 'income', amount: 100, createdAt: new Date() },
        { id: 2, userId, type: 'withdraw', amount: 50, createdAt: new Date() },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockTransactions, 2]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactions(userId, { page: 1, pageSize: 20 });

      expect(result.list).toEqual(mockTransactions);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter transactions by type', async () => {
      const userId = 1;
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getTransactions(userId, { type: 'income', page: 1, pageSize: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('t.type = :type', { type: 'income' });
    });

    it('should handle pagination correctly', async () => {
      const userId = 1;
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getTransactions(userId, { page: 3, pageSize: 10 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should return empty list when no transactions', async () => {
      const userId = 1;
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactions(userId, { page: 1, pageSize: 20 });

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getIncome', () => {
    it('should return income transactions', async () => {
      const userId = 1;
      const mockTransactions = [
        { id: 1, userId, type: 'income', amount: 100, status: 'success', createdAt: new Date() },
        { id: 2, userId, type: 'income', amount: 200, status: 'success', createdAt: new Date() },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, {});

      expect(result.list).toEqual(mockTransactions);
      expect(result.totalAmount).toBe(300);
    });

    it('should filter income by month', async () => {
      const userId = 1;
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getIncome(userId, { month: '2026-02' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE_FORMAT(t.createdAt, "%Y-%m") = :month',
        { month: '2026-02' }
      );
    });

    it('should return zero total amount when no income', async () => {
      const userId = 1;
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, {});

      expect(result.totalAmount).toBe(0);
    });

    it('should calculate total amount correctly', async () => {
      const userId = 1;
      const mockTransactions = [
        { id: 1, userId, type: 'income', amount: 100, status: 'success', createdAt: new Date() },
        { id: 2, userId, type: 'income', amount: 250, status: 'success', createdAt: new Date() },
        { id: 3, userId, type: 'income', amount: 150, status: 'success', createdAt: new Date() },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, {});

      expect(result.totalAmount).toBe(500);
    });
  });

  describe('withdraw', () => {
    it('should withdraw successfully', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockTx = { id: 1, userId, type: 'withdraw', amount, status: 'pending' };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateOutTradeNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.transferToWallet.mockResolvedValue({ success: true });

      const result = await service.withdraw(userId, amount);

      expect(result.message).toBe('提现成功');
      expect(result.balance).toBe(400);
      expect(walletRepo.save).toHaveBeenCalled();
      expect(txRepo.save).toHaveBeenCalled();
    });

    it('should throw error when amount is zero', async () => {
      const userId = 1;

      await expect(service.withdraw(userId, 0)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when amount is negative', async () => {
      const userId = 1;

      await expect(service.withdraw(userId, -100)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when wallet not found', async () => {
      const userId = 1;
      const amount = 100;

      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when balance is insufficient', async () => {
      const userId = 1;
      const amount = 1000;
      const mockWallet = { id: 1, userId, balance: 100, totalWithdraw: 0 };

      walletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not found', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(BadRequestException);
    });

    it('should handle transfer failure and rollback', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockTx = { id: 1, userId, type: 'withdraw', amount, status: 'pending' };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateOutTradeNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.transferToWallet.mockRejectedValue(new Error('Transfer failed'));

      await expect(service.withdraw(userId, amount)).rejects.toThrow(BadRequestException);

      // Verify rollback
      expect(mockWallet.balance).toBe(500);
      expect(mockWallet.totalWithdraw).toBe(0);
    });

    it('should handle wallet with zero balance', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 0, totalWithdraw: 0 };

      walletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(BadRequestException);
    });

    it('should update wallet balance and total withdraw', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 200 };
      const mockUser = { id: 1, openid: 'test_openid' };
      const mockTx = { id: 1, userId, type: 'withdraw', amount, status: 'pending' };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateOutTradeNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.transferToWallet.mockResolvedValue({ success: true });

      await service.withdraw(userId, amount);

      expect(mockWallet.balance).toBe(400);
      expect(mockWallet.totalWithdraw).toBe(300);
    });
  });
});
