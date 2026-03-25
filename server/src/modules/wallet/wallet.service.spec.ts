/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { PaymentService } from '../payment/payment.service';

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
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    userRepo = {
      findOneBy: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn(),
      generateTransferBatchNo: jest.fn(),
      createTransferBill: jest.fn(),
      queryTransferBill: jest.fn(),
      buildTransferConfirmation: jest.fn((packageInfo: string) =>
        packageInfo
          ? { appId: 'wx_appid', mchId: '1900000001', package: packageInfo }
          : null,
      ),
      queryTransferDetail: jest.fn(),
      isWalletTransferReady: jest.fn().mockReturnValue(true),
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
    txRepo.find.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('returns existing wallet balance and withdraw capability', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: 'test_openid' });

      const result = await service.getBalance(userId);

      expect(walletRepo.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toMatchObject({
        ...mockWallet,
        canWithdraw: true,
        withdrawStatus: 'enabled',
        withdrawDisabledReason: '',
        pendingWithdrawAction: null,
      });
    });

    it('creates wallet when user wallet does not exist', async () => {
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
      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: 'test_openid' });

      const result = await service.getBalance(userId);

      expect(walletRepo.create).toHaveBeenCalledWith({ userId });
      expect(result.balance).toBe(0);
    });

    it('reconciles pending withdrawals before returning balance', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        userId,
        balance: 1000,
        totalIncome: 5000,
        totalWithdraw: 4000,
      };
      const mockTx = {
        id: 9,
        userId,
        type: 'withdraw',
        amount: 20,
        status: 'pending',
        refType: 'WD_9_123456_abcd',
        refId: 9,
        remark: '提现处理中',
      };

      txRepo.find.mockResolvedValue([mockTx]);
      txRepo.save.mockResolvedValue(mockTx);
      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: 'test_openid' });
      paymentService.queryTransferDetail.mockResolvedValue({
        detail_status: 'SUCCESS',
      });

      const result = await service.getBalance(userId);

      expect(paymentService.queryTransferDetail).toHaveBeenCalledWith({
        outBatchNo: 'WD_9_123456_abcd',
        outDetailNo: '00009',
      });
      expect(mockTx.status).toBe('success');
      expect(result.balance).toBe(1000);
    });

    it('returns pending withdraw action when a confirmation is still required', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        userId,
        balance: 300,
        totalIncome: 500,
        totalWithdraw: 200,
      };
      const pendingTx = {
        id: 11,
        userId,
        type: 'withdraw',
        amount: 50,
        status: 'pending',
        refType: 'WD_11_123456_abcd',
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: 'test_openid' });
      txRepo.find.mockResolvedValue([pendingTx]);
      paymentService.queryTransferBill.mockResolvedValue({
        outBillNo: 'WD_11_123456_abcd',
        state: 'WAIT_USER_CONFIRM',
        packageInfo: 'pending_package',
      });

      const result = await service.getBalance(userId);

      expect(result.pendingWithdrawAction).toMatchObject({
        message: '存在待确认提现，请先完成微信收款确认',
        status: 'pending',
        transferState: 'WAIT_USER_CONFIRM',
        existingPending: true,
        txId: 11,
        confirmation: {
          appId: 'wx_appid',
          mchId: '1900000001',
          package: 'pending_package',
        },
      });
    });

    it('disables withdraw when user has not bound wechat', async () => {
      const userId = 1;
      const mockWallet = {
        id: 1,
        userId,
        balance: 100,
        totalIncome: 100,
        totalWithdraw: 0,
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: '' });

      const result = await service.getBalance(userId);

      expect(result).toMatchObject({
        canWithdraw: false,
        withdrawStatus: 'wechat_unbound',
        withdrawDisabledReason: '请先绑定微信后再提现',
      });
    });
  });

  describe('getTransactions', () => {
    it('returns paginated transactions', async () => {
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

      const result = await service.getTransactions(userId, {
        type: 'income',
        page: 1,
        pageSize: 20,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('t.type = :type', {
        type: 'income',
      });
      expect(result.total).toBe(2);
      expect(result.list).toEqual(mockTransactions);
    });
  });

  describe('getIncome', () => {
    it('returns income summary and month filter', async () => {
      const userId = 1;
      const mockTransactions = [
        {
          id: 1,
          userId,
          type: 'income',
          amount: 100,
          status: 'success',
          createdAt: new Date(),
        },
        {
          id: 2,
          userId,
          type: 'income',
          amount: 200,
          status: 'success',
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getIncome(userId, { month: '2026-03' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'DATE_FORMAT(t.createdAt, "%Y-%m") = :month',
        { month: '2026-03' },
      );
      expect(result.totalAmount).toBe(300);
    });
  });

  describe('withdraw', () => {
    it('keeps withdrawal pending and returns confirmation when user confirmation is required', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid', role: 'worker' };
      const mockTx = {
        id: 1,
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateTransferBatchNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.createTransferBill.mockResolvedValue({
        outBillNo: 'WD_1_123456_abcd',
        state: 'WAIT_USER_CONFIRM',
        packageInfo: 'mock_package',
      });

      const result = await service.withdraw(userId, amount);

      expect(result).toMatchObject({
        message: '提现申请已提交，请在微信中确认收款',
        balance: 400,
        status: 'pending',
        transferState: 'WAIT_USER_CONFIRM',
        existingPending: false,
        txId: 1,
        confirmation: {
          appId: 'wx_appid',
          mchId: '1900000001',
          package: 'mock_package',
        },
      });
      expect(mockTx.status).toBe('pending');
      expect(mockTx.refType).toBe('WD_1_123456_abcd');
      expect(mockTx.refId).toBe(1);
      expect(mockTx.remark).toBe('提现处理中');
      expect(paymentService.createTransferBill).toHaveBeenCalledWith({
        outBillNo: 'WD_1_123456_abcd',
        openid: 'test_openid',
        amount: 10000,
        remark: '临工提现',
        userRole: 'worker',
      });
    });

    it('reuses existing pending confirmation instead of creating a new bill', async () => {
      const userId = 1;
      const amount = 100;
      const mockUser = { id: 1, openid: 'test_openid', role: 'worker' };
      const pendingTx = {
        id: 11,
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
        refType: 'WD_11_123456_abcd',
      };

      userRepo.findOneBy.mockResolvedValue(mockUser);
      walletRepo.findOne.mockResolvedValue({
        id: 1,
        userId,
        balance: 350,
        totalWithdraw: 150,
      });
      txRepo.find.mockResolvedValue([pendingTx]);
      paymentService.queryTransferBill.mockResolvedValue({
        outBillNo: 'WD_11_123456_abcd',
        state: 'WAIT_USER_CONFIRM',
        packageInfo: 'existing_package',
      });

      const result = await service.withdraw(userId, amount);

      expect(paymentService.createTransferBill).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        message: '存在待确认提现，请先完成微信收款确认',
        balance: 350,
        status: 'pending',
        transferState: 'WAIT_USER_CONFIRM',
        existingPending: true,
        txId: 11,
        confirmation: {
          appId: 'wx_appid',
          mchId: '1900000001',
          package: 'existing_package',
        },
      });
    });

    it('returns success immediately when transfer bill is already successful', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid', role: 'worker' };
      const mockTx = {
        id: 1,
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateTransferBatchNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.createTransferBill.mockResolvedValue({
        outBillNo: 'WD_1_123456_abcd',
        state: 'SUCCESS',
      });

      const result = await service.withdraw(userId, amount);

      expect(result).toEqual({
        message: '提现成功',
        balance: 400,
        status: 'success',
        transferState: 'SUCCESS',
      });
      expect(mockTx.status).toBe('success');
      expect(mockTx.remark).toBe('提现成功');
    });

    it('rejects zero or negative amount', async () => {
      await expect(service.withdraw(1, 0)).rejects.toThrow(BadRequestException);
      await expect(service.withdraw(1, -100)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws explicit error when transfer channel is unavailable', async () => {
      const userId = 1;

      paymentService.isWalletTransferReady.mockReturnValue(false);
      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: 'test_openid' });

      await expect(service.withdraw(userId, 100)).rejects.toThrow(
        '提现通道未开通，请联系管理员',
      );
    });

    it('throws error when balance is insufficient', async () => {
      const userId = 1;

      userRepo.findOneBy.mockResolvedValue({ id: userId, openid: 'test_openid' });
      walletRepo.findOne.mockResolvedValue({
        id: 1,
        userId,
        balance: 100,
        totalWithdraw: 0,
      });

      await expect(service.withdraw(userId, 1000)).rejects.toThrow('余额不足');
    });

    it('throws error when user does not exist', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.withdraw(1, 100)).rejects.toThrow('用户不存在');
    });

    it('rolls back wallet when transfer bill request fails', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid', role: 'worker' };
      const mockTx = {
        id: 1,
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateTransferBatchNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.createTransferBill.mockRejectedValue(
        new Error('Transfer failed'),
      );

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockTx.status).toBe('failed');
      expect(mockWallet.balance).toBe(500);
      expect(mockWallet.totalWithdraw).toBe(0);
    });

    it('maps permission errors to a user-friendly message', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid', role: 'worker' };
      const mockTx = {
        id: 1,
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateTransferBatchNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.createTransferBill.mockRejectedValue(
        new Error('no_auth: merchant transfer permission denied'),
      );

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        '提现通道暂不可用，请联系管理员',
      );

      expect(mockTx.status).toBe('failed');
      expect(mockTx.remark).toBe('提现失败：提现通道暂不可用，请联系管理员');
      expect(mockWallet.balance).toBe(500);
      expect(mockWallet.totalWithdraw).toBe(0);
    });

    it('maps wechat transfer ip whitelist errors to a user-friendly message', async () => {
      const userId = 1;
      const amount = 100;
      const mockWallet = { id: 1, userId, balance: 500, totalWithdraw: 0 };
      const mockUser = { id: 1, openid: 'test_openid', role: 'worker' };
      const mockTx = {
        id: 1,
        userId,
        type: 'withdraw',
        amount,
        status: 'pending',
      };

      walletRepo.findOne.mockResolvedValue(mockWallet);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      txRepo.create.mockReturnValue(mockTx);
      txRepo.save.mockResolvedValue(mockTx);
      paymentService.generateTransferBatchNo.mockReturnValue('WD_1_123456_abcd');
      paymentService.createTransferBill.mockRejectedValue(
        new Error('INVALID_REQUEST: 此IP地址不允许调用接口，请按开发指引设置'),
      );

      await expect(service.withdraw(userId, amount)).rejects.toThrow(
        '微信提现未配置服务器IP白名单，请联系管理员处理',
      );
    });

    it('syncs pending withdrawal to success after transfer detail succeeds', async () => {
      const mockTx = {
        id: 9,
        userId: 2,
        type: 'withdraw',
        amount: 20,
        status: 'pending',
        refType: 'WD_9_123456_abcd',
        refId: 9,
        remark: '提现处理中',
      };

      txRepo.find.mockResolvedValue([mockTx]);
      paymentService.queryTransferDetail.mockResolvedValue({
        detail_status: 'SUCCESS',
      });

      await service.syncPendingWithdrawals();

      expect(paymentService.queryTransferDetail).toHaveBeenCalledWith({
        outBatchNo: 'WD_9_123456_abcd',
        outDetailNo: '00009',
      });
      expect(mockTx.status).toBe('success');
      expect(mockTx.remark).toBe('提现成功');
      expect(txRepo.save).toHaveBeenCalledWith(mockTx);
    });

    it('rolls back wallet when pending withdrawal detail fails', async () => {
      const mockTx = {
        id: 10,
        userId: 3,
        type: 'withdraw',
        amount: 20,
        status: 'pending',
        refType: 'WD_10_123456_abcd',
        refId: 10,
        remark: '提现处理中',
      };
      const mockWallet = {
        id: 3,
        userId: 3,
        balance: 100,
        totalWithdraw: 50,
      };

      txRepo.find.mockResolvedValue([mockTx]);
      walletRepo.findOne.mockResolvedValue(mockWallet);
      paymentService.queryTransferDetail.mockResolvedValue({
        detail_status: 'FAIL',
        fail_reason: 'ACCOUNT_FROZEN',
      });

      await service.syncPendingWithdrawals();

      expect(mockTx.status).toBe('failed');
      expect(mockTx.remark).toBe('提现失败：微信零钱账户状态异常，请核对后重试');
      expect(mockWallet.balance).toBe(120);
      expect(mockWallet.totalWithdraw).toBe(30);
      expect(walletRepo.save).toHaveBeenCalledWith(mockWallet);
    });
  });
});
