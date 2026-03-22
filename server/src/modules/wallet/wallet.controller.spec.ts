/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { BadRequestException } from '@nestjs/common';

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: jest.Mocked<WalletService>;

  beforeEach(async () => {
    walletService = {
      getBalance: jest.fn(),
      getTransactions: jest.fn(),
      getIncome: jest.fn(),
      withdraw: jest.fn(),
    } as jest.Mocked<WalletService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: walletService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
      const userId = 1;
      const mockBalance = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };

      walletService.getBalance.mockResolvedValue(mockBalance);

      const result = await controller.getBalance(userId);

      expect(walletService.getBalance).toHaveBeenCalledWith(userId);
      expect(result.balance).toBe(1000);
      expect(result.totalIncome).toBe(5000);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;

      walletService.getBalance.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.getBalance(userId as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const userId = 1;

      walletService.getBalance.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.getBalance(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle userId as 0', async () => {
      const userId = 0;

      walletService.getBalance.mockRejectedValue(
        new BadRequestException('Invalid user id'),
      );

      await expect(controller.getBalance(userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTransactions', () => {
    it('should return transactions with pagination', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const mockResult = {
        list: [
          { id: 1, userId, type: 'income', amount: 100, createdAt: new Date() },
          {
            id: 2,
            userId,
            type: 'withdraw',
            amount: 50,
            createdAt: new Date(),
          },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };

      walletService.getTransactions.mockResolvedValue(mockResult);

      const result = await controller.getTransactions(userId, query);

      expect(walletService.getTransactions).toHaveBeenCalledWith(userId, query);
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw error when pagination is invalid', async () => {
      const userId = 1;
      const query = { page: -1, pageSize: 0 };

      walletService.getTransactions.mockRejectedValue(
        new BadRequestException('Invalid pagination'),
      );

      await expect(controller.getTransactions(userId, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const query = { page: 1, pageSize: 20 };

      walletService.getTransactions.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.getTransactions(userId as any, query),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };

      walletService.getTransactions.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.getTransactions(userId, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty transaction list', async () => {
      const userId = 1;
      const query = { page: 1, pageSize: 20 };
      const mockResult = {
        list: [],
        total: 0,
        page: 1,
        pageSize: 20,
      };

      walletService.getTransactions.mockResolvedValue(mockResult);

      const result = await controller.getTransactions(userId, query);

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getIncome', () => {
    it('should return income transactions', async () => {
      const userId = 1;
      const query = { month: '2026-03' };
      const mockResult = {
        list: [
          {
            id: 1,
            userId,
            type: 'income',
            amount: 500,
            status: 'success',
            createdAt: new Date(),
          },
        ],
        totalAmount: 500,
        month: '2026-03',
      };

      walletService.getIncome.mockResolvedValue(mockResult);

      const result = await controller.getIncome(userId, query);

      expect(walletService.getIncome).toHaveBeenCalledWith(userId, query);
      expect(result.list).toHaveLength(1);
      expect(result.totalAmount).toBe(500);
    });

    it('should throw error when month is invalid', async () => {
      const userId = 1;
      const query = { month: 'invalid_month' };

      walletService.getIncome.mockRejectedValue(
        new BadRequestException('Invalid month format'),
      );

      await expect(controller.getIncome(userId, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const query = { month: '2026-03' };

      walletService.getIncome.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.getIncome(userId as any, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const query = { month: '2026-03' };

      walletService.getIncome.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.getIncome(userId, query)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return zero income when no records', async () => {
      const userId = 1;
      const query = { month: '2026-03' };
      const mockResult = {
        list: [],
        totalAmount: 0,
        month: '2026-03',
      };

      walletService.getIncome.mockResolvedValue(mockResult);

      const result = await controller.getIncome(userId, query);

      expect(result.list).toEqual([]);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('withdraw', () => {
    it('should successfully withdraw', async () => {
      const userId = 1;
      const amount = 500;
      const mockResult = {
        message: '提现申请已提交',
        balance: 500,
        status: 'pending',
      };

      walletService.withdraw.mockResolvedValue(mockResult);

      const result = await controller.withdraw(userId, amount);

      expect(walletService.withdraw).toHaveBeenCalledWith(userId, amount);
      expect(result.message).toBe('提现申请已提交');
      expect(result.balance).toBe(500);
      expect(result.status).toBe('pending');
    });

    it('should throw error when amount is negative', async () => {
      const userId = 1;
      const amount = -100;

      walletService.withdraw.mockRejectedValue(
        new BadRequestException('Amount must be positive'),
      );

      await expect(controller.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when amount is zero', async () => {
      const userId = 1;
      const amount = 0;

      walletService.withdraw.mockRejectedValue(
        new BadRequestException('Amount must be greater than zero'),
      );

      await expect(controller.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const amount = 500;

      walletService.withdraw.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.withdraw(userId as any, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const amount = 500;

      walletService.withdraw.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      );

      await expect(controller.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle very large amount', async () => {
      const userId = 1;
      const amount = 999999999;

      walletService.withdraw.mockRejectedValue(
        new BadRequestException('Amount exceeds limit'),
      );

      await expect(controller.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
