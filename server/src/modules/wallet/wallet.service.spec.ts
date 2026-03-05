/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: jest.Mocked<any>;
  let txRepo: jest.Mocked<any>;
  let userRepo: jest.Mocked<any>;
  let paymentService: jest.Mocked<any>;

  beforeEach(async () => {
    walletRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    txRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as jest.Mocked<any>;

    userRepo = {
      findOneBy: jest.fn(),
    } as jest.Mocked<any>;

    paymentService = {
      generateOutTradeNo: jest.fn(),
      transferToWallet: jest.fn(),
    } as jest.Mocked<any>;

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

  describe('getBalance', () => {
    it('should return existing wallet', async () => {
      const userId = 1;
      const wallet = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };

      walletRepo.findOne.mockResolvedValue(wallet);

      const result = await service.getBalance(userId);

      expect(walletRepo.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual(wallet);
    });

    it('should create new wallet if not exists', async () => {
      const userId = 1;
      const newWallet = {
        id: 1,
        userId,
        balance: 0,
        totalIncome: 0,
        totalWithdraw: 0,
      };

      walletRepo.findOne.mockResolvedValue(null);
      walletRepo.create.mockReturnValue(newWallet);
      walletRepo.save.mockResolvedValue(newWallet);

      const result = await service.getBalance(userId);

      expect(walletRepo.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(walletRepo.create).toHaveBeenCalledWith({ userId });
      expect(walletRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newWallet);
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const transactions = [
        { id: 1, userId, type: 'income', amount: 100, createdAt: new Date() },
        { id: 2, userId, type: 'withdraw', amount: 50, createdAt: new Date() },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([transactions, 2]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactions(userId, query);

      expect(result.list).toEqual(transactions);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter transactions by type', async () => {
      const userId = 1;
      const query = { type: 'income', page: 1, pageSize: 20 };
      const transactions = [
        { id: 1, userId, type: 'income', amount: 100, createdAt: new Date() },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([transactions, 1]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactions(userId, query);

      expect(result.list).toEqual(transactions);
      expect(result.total).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const userId = 1;
      const query = { page: 2, pageSize: 10 };
      const transactions = [];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([transactions, 0]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactions(userId, query);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.page).toBe(2);
    });
  });

  describe('getIncome', () => {
    it('should return income transactions', async () => {
      const userId = 1;
      const query = {};
      const transactions = [
        {
          id: 1,
          userId,
          type: 'income',
          amount: 500,
          status: 'success',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId,
          type: 'income',
          amount: 300,
          status: 'success',
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(transactions),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, query);

      expect(result.list).toEqual(transactions);
      expect(result.totalAmount).toBe(800);
    });

    it('should filter income by month', async () => {
      const userId = 1;
      const query = { month: '2026-02' };
      const transactions = [
        {
          id: 1,
          userId,
          type: 'income',
          amount: 1000,
          status: 'success',
          createdAt: new Date('2026-02-15'),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(transactions),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, query);

      expect(result.list).toEqual(transactions);
      expect(result.totalAmount).toBe(1000);
      expect(result.month).toBe('2026-02');
    });

    it('should return zero total amount when no transactions', async () => {
      const userId = 1;
      const query = {};

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, query);

      expect(result.list).toEqual([]);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('withdraw', () => {
    it('should successfully withdraw when balance is sufficient', async () => {
      const userId = 1;
      const amount = 500;
      const wallet = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };
      const user = { id: userId, openid: 'test_openid' };
      const tx = { id: 1, userId, type: 'withdraw', amount, status: 'pending' };

      walletRepo.findOne.mockResolvedValue(wallet);
      userRepo.findOneBy.mockResolvedValue(user);
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);
      paymentService.generateOutTradeNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.transferToWallet.mockResolvedValue({ success: true });

      const result = await service.withdraw(userId, amount);

      expect(walletRepo.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: userId });
      expect(txRepo.create).toHaveBeenCalled();
      expect(paymentService.transferToWallet).toHaveBeenCalled();
      expect(result.message).toBe('提现成功');
      expect(result.balance).toBe(500);
    });

    it('should throw error when amount is invalid', async () => {
      const userId = 1;

      await expect(service.withdraw(userId, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.withdraw(userId, -100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when wallet not found', async () => {
      const userId = 1;
      const amount = 500;

      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when balance is insufficient', async () => {
      const userId = 1;
      const amount = 2000;
      const wallet = {
        id: 1,
        userId,
        balance: 500,
        totalIncome: 5000,
        totalWithdraw: 4500,
      };

      walletRepo.findOne.mockResolvedValue(wallet);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not found', async () => {
      const userId = 1;
      const amount = 500;
      const wallet = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };

      walletRepo.findOne.mockResolvedValue(wallet);
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback balance when transfer fails', async () => {
      const userId = 1;
      const amount = 500;
      const wallet = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };
      const user = { id: userId, openid: 'test_openid' };
      const tx = { id: 1, userId, type: 'withdraw', amount, status: 'pending' };

      walletRepo.findOne.mockResolvedValue(wallet);
      userRepo.findOneBy.mockResolvedValue(user);
      txRepo.create.mockReturnValue(tx);
      txRepo.save.mockResolvedValue(tx);
      paymentService.generateOutTradeNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.transferToWallet.mockRejectedValue(
        new Error('Transfer failed'),
      );

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );

      // Verify rollback was called
      expect(walletRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should handle zero balance wallet', async () => {
      const userId = 1;
      const amount = 100;
      const wallet = {
        id: 1,
        userId,
        balance: 0,
        totalIncome: 0,
        totalWithdraw: 0,
      };

      walletRepo.findOne.mockResolvedValue(wallet);

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
