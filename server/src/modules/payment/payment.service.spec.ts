/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { BeanOrder } from '../../entities/bean-order.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Job } from '../../entities/job.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { Notification } from '../../entities/notification.entity';

describe('PaymentService', () => {
  let service: PaymentService;
  let configService: jest.Mocked<any>;
  let memberOrderRepo: jest.Mocked<any>;
  let userRepo: jest.Mocked<any>;
  let beanTxRepo: jest.Mocked<any>;
  let beanOrderRepo: jest.Mocked<any>;
  let adOrderRepo: jest.Mocked<any>;
  let settlementRepo: jest.Mocked<any>;
  let settlementItemRepo: jest.Mocked<any>;
  let walletRepo: jest.Mocked<any>;
  let walletTxRepo: jest.Mocked<any>;
  let jobRepo: jest.Mocked<any>;
  let sysConfigRepo: jest.Mocked<any>;
  let notiRepo: jest.Mocked<any>;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          WX_APPID: '',
          WX_MCH_ID: '',
          WX_APIV3_KEY: 'test_key_1234567890123456',
          WX_MCH_KEY_PATH: null,
          WX_MCH_SERIAL: null,
          WX_PAY_PUBLIC_KEY_PATH: null,
          WX_PAY_PUBLIC_KEY_ID: null,
        };
        return config[key] ?? defaultValue;
      }),
    } as jest.Mocked<any>;

    memberOrderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    userRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    } as jest.Mocked<any>;

    beanTxRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    beanOrderRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    adOrderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<any>;

    settlementRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    settlementItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as jest.Mocked<any>;

    walletRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    walletTxRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    jobRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<any>;

    sysConfigRepo = {
      findOne: jest.fn(),
    } as jest.Mocked<any>;

    notiRepo = {
      create: jest.fn((payload: any) => payload),
      save: jest.fn(),
    } as jest.Mocked<any>;

    const transactionalManager = {
      getRepository: jest.fn((entity: any) => {
        if (entity === Settlement) return settlementRepo;
        if (entity === SettlementItem) return settlementItemRepo;
        if (entity === Wallet) return walletRepo;
        if (entity === WalletTransaction) return walletTxRepo;
        if (entity === Notification) return notiRepo;
        throw new Error(
          `Unexpected repository request: ${entity && entity.name}`,
        );
      }),
      increment: jest.fn(),
      update: jest.fn(),
    };

    settlementRepo.manager = {
      transaction: jest.fn(async (callback: any) =>
        callback(transactionalManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: getRepositoryToken(MemberOrder),
          useValue: memberOrderRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(BeanTransaction),
          useValue: beanTxRepo,
        },
        {
          provide: getRepositoryToken(BeanOrder),
          useValue: beanOrderRepo,
        },
        {
          provide: getRepositoryToken(AdOrder),
          useValue: adOrderRepo,
        },
        {
          provide: getRepositoryToken(Settlement),
          useValue: settlementRepo,
        },
        {
          provide: getRepositoryToken(SettlementItem),
          useValue: settlementItemRepo,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepo,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: walletTxRepo,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepo,
        },
        {
          provide: getRepositoryToken(SysConfig),
          useValue: sysConfigRepo,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notiRepo,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('generateOutTradeNo', () => {
    it('should generate out trade no with prefix and order id', () => {
      const prefix = 'MBR';
      const orderId = 123;

      const result = service.generateOutTradeNo(prefix, orderId);

      expect(result).toMatch(/^MBR_123_[a-z0-9]+_[a-f0-9]{8}$/);
    });

    it('should generate out trade no with prefix only', () => {
      const prefix = 'BEAN';

      const result = service.generateOutTradeNo(prefix);

      expect(result).toMatch(/^BEAN_0_[a-z0-9]+_[a-f0-9]{8}$/);
    });

    it('should generate unique out trade nos', () => {
      const prefix = 'AD';
      const orderId = 456;

      const result1 = service.generateOutTradeNo(prefix, orderId);
      const result2 = service.generateOutTradeNo(prefix, orderId);

      expect(result1).not.toBe(result2);
      expect(result1).toMatch(/^AD_456_/);
      expect(result2).toMatch(/^AD_456_/);
    });

    it('should handle different prefixes', () => {
      const prefixes = ['MBR', 'BEAN', 'AD', 'STL'];

      prefixes.forEach((prefix) => {
        const result = service.generateOutTradeNo(prefix);
        expect(result.startsWith(prefix)).toBe(true);
      });
    });
  });

  describe('transferToWallet', () => {
    it('should return accepted transfer batch data', async () => {
      const createTime = new Date();
      const batchesTransfer = jest.fn().mockResolvedValue({
        status: 200,
        data: {
          out_batch_no: 'WD_1_abc123',
          batch_id: '1030000071100999991182020050700019480001',
          create_time: createTime,
        },
      });

      (service as any).pay = { batches_transfer: batchesTransfer };

      const result = await service.transferToWallet({
        outBatchNo: 'WD_1_abc123',
        outDetailNo: '1',
        openid: 'openid_1',
        amount: 2000,
        remark: '临工提现',
      });

      expect(batchesTransfer).toHaveBeenCalledWith({
        appid: '',
        out_batch_no: 'WD_1_abc123',
        batch_name: '临工提现',
        batch_remark: '临工提现',
        total_amount: 2000,
        total_num: 1,
        transfer_detail_list: [
          {
            out_detail_no: '1',
            transfer_amount: 2000,
            transfer_remark: '临工提现',
            openid: 'openid_1',
          },
        ],
      });
      expect(result).toEqual({
        out_batch_no: 'WD_1_abc123',
        batch_id: '1030000071100999991182020050700019480001',
        create_time: createTime,
      });
    });

    it('should throw when transfer response is not accepted', async () => {
      (service as any).pay = {
        batches_transfer: jest.fn().mockResolvedValue({
          status: 400,
          error: 'PARAM_ERROR',
        }),
      };

      await expect(
        service.transferToWallet({
          outBatchNo: 'WD_1_abc123',
          outDetailNo: '1',
          openid: 'openid_1',
          amount: 2000,
          remark: '临工提现',
        }),
      ).rejects.toThrow('PARAM_ERROR');
    });
  });

  describe('queryTransferDetail', () => {
    it('should return transfer detail data', async () => {
      const queryDetail = jest.fn().mockResolvedValue({
        status: 200,
        data: {
          out_batch_no: 'WD_1_abc123',
          out_detail_no: '1',
          detail_status: 'SUCCESS',
        },
      });

      (service as any).pay = { query_batches_transfer_detail: queryDetail };

      const result = await service.queryTransferDetail({
        outBatchNo: 'WD_1_abc123',
        outDetailNo: '1',
      });

      expect(queryDetail).toHaveBeenCalledWith({
        out_batch_no: 'WD_1_abc123',
        out_detail_no: '1',
      });
      expect(result).toEqual({
        out_batch_no: 'WD_1_abc123',
        out_detail_no: '1',
        detail_status: 'SUCCESS',
      });
    });

    it('should throw when transfer detail query fails', async () => {
      (service as any).pay = {
        query_batches_transfer_detail: jest.fn().mockResolvedValue({
          status: 500,
          error: 'SYSTEM_ERROR',
        }),
      };

      await expect(
        service.queryTransferDetail({
          outBatchNo: 'WD_1_abc123',
          outDetailNo: '1',
        }),
      ).rejects.toThrow('SYSTEM_ERROR');
    });
  });

  describe('decryptNotify', () => {
    it('should handle decryption with valid parameters', () => {
      // 这个测试验证 decryptNotify 方法的存在和基本结构
      // 实际的加密/解密测试应该在集成测试中进行
      expect(typeof service.decryptNotify).toBe('function');
    });
  });

  describe('handlePaySuccess', () => {
    it('should handle member payment success', async () => {
      const outTradeNo = 'MBR_1_1234567890_abcd1234';
      const result = { amount: { total: 9900 } };

      const order = {
        id: 1,
        userId: 1,
        payStatus: 'pending',
        durationDays: 30,
      };

      memberOrderRepo.findOne.mockResolvedValue(order);
      memberOrderRepo.save.mockResolvedValue({ ...order, payStatus: 'paid' });
      userRepo.update.mockResolvedValue({ affected: 1 });

      await service.handlePaySuccess(outTradeNo, result);

      expect(memberOrderRepo.findOne).toHaveBeenCalled();
      expect(memberOrderRepo.save).toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalled();
    });

    it('should handle bean payment success', async () => {
      const outTradeNo = 'BEAN_0_1234567890_abcd1234';
      const result = {
        amount: { total: 1000 },
        payer: { openid: 'test_openid' },
      };

      const user = { id: 1, openid: 'test_openid', beanBalance: 100 };
      const order = {
        id: 1,
        userId: 1,
        outTradeNo,
        beanAmount: 200,
        totalFee: 1000,
        payStatus: 'pending',
      };

      beanOrderRepo.findOne.mockResolvedValue(order);
      userRepo.findOneBy.mockResolvedValue(user);
      beanTxRepo.findOne.mockResolvedValue(null);
      userRepo.update.mockResolvedValue({ affected: 1 });
      beanTxRepo.create.mockReturnValue({
        userId: 1,
        type: 'income',
        amount: 200,
        refType: 'recharge',
        remark: outTradeNo,
      });
      beanTxRepo.save.mockResolvedValue({
        userId: 1,
        type: 'income',
        amount: 200,
      });
      beanOrderRepo.save.mockResolvedValue({
        ...order,
        payStatus: 'paid',
        paidAt: new Date(),
      });

      await service.handlePaySuccess(outTradeNo, result);

      expect(beanOrderRepo.findOne).toHaveBeenCalled();
      expect(userRepo.findOneBy).toHaveBeenCalled();
      expect(beanTxRepo.findOne).toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalled();
      expect(beanTxRepo.save).toHaveBeenCalled();
      expect(beanOrderRepo.save).toHaveBeenCalled();
    });

    it('should skip bean payment if already processed', async () => {
      const outTradeNo = 'BEAN_0_1234567890_abcd1234';
      const result = {
        amount: { total: 1000 },
        payer: { openid: 'test_openid' },
      };

      const order = {
        id: 1,
        userId: 1,
        outTradeNo,
        beanAmount: 200,
        totalFee: 1000,
        payStatus: 'paid',
      };

      beanOrderRepo.findOne.mockResolvedValue(order);

      await service.handlePaySuccess(outTradeNo, result);

      expect(beanTxRepo.save).not.toHaveBeenCalled();
    });

    it('should handle bean payment when order not found (fallback)', async () => {
      const outTradeNo = 'BEAN_0_1234567890_abcd1234';
      const result = {
        amount: { total: 1000 },
        payer: { openid: 'test_openid' },
      };

      const user = { id: 1, openid: 'test_openid', beanBalance: 100 };

      beanOrderRepo.findOne.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(user);
      beanTxRepo.findOne.mockResolvedValue(null);
      userRepo.update.mockResolvedValue({ affected: 1 });
      beanTxRepo.create.mockReturnValue({
        userId: 1,
        type: 'income',
        amount: 100,
        refType: 'recharge',
        remark: outTradeNo,
      });
      beanTxRepo.save.mockResolvedValue({
        userId: 1,
        type: 'income',
        amount: 100,
      });

      await service.handlePaySuccess(outTradeNo, result);

      // 应该使用备用方案，从支付金额反推灵豆数量
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { openid: 'test_openid' },
      });
      expect(userRepo.update).toHaveBeenCalled();
      expect(beanTxRepo.save).toHaveBeenCalled();
    });

    it('should handle ad payment success', async () => {
      const outTradeNo = 'AD_2_1234567890_abcd1234';
      const result = { amount: { total: 5000 } };

      const order = {
        id: 2,
        status: 'pending',
        durationDays: 7,
        startAt: null,
        endAt: null,
      };

      adOrderRepo.findOne.mockResolvedValue(order);
      adOrderRepo.update.mockResolvedValue({ affected: 1 });

      await service.handlePaySuccess(outTradeNo, result);

      expect(adOrderRepo.findOne).toHaveBeenCalled();
      expect(adOrderRepo.update).toHaveBeenCalled();
    });

    it('should handle settlement payment success', async () => {
      const outTradeNo = 'STL_3_1234567890_abcd1234';
      const result = { amount: { total: 10000 } };

      const settlement = {
        id: 3,
        status: 'pending',
        totalAmount: 10000,
      };

      const items = [
        { id: 1, settlementId: 3, workerId: 1, amount: 5000, workerPay: 5000 },
        { id: 2, settlementId: 3, workerId: 2, amount: 5000, workerPay: 5000 },
      ];

      const wallet1 = { id: 1, userId: 1, balance: 0, totalIncome: 0 };
      const wallet2 = { id: 2, userId: 2, balance: 0, totalIncome: 0 };

      settlementRepo.findOne.mockResolvedValue(settlement);
      settlementItemRepo.find.mockResolvedValue(items);
      walletRepo.findOne
        .mockResolvedValueOnce(wallet1)
        .mockResolvedValueOnce(wallet2);
      walletRepo.save.mockResolvedValue({ balance: 5000, totalIncome: 5000 });
      userRepo.increment.mockResolvedValue({ affected: 1 });
      walletTxRepo.create.mockReturnValue({
        walletId: 1,
        type: 'income',
        amount: 5000,
      });
      walletTxRepo.save.mockResolvedValue({
        walletId: 1,
        type: 'income',
        amount: 5000,
      });
      settlementRepo.save.mockResolvedValue({
        ...settlement,
        status: 'completed',
      });
      jobRepo.update.mockResolvedValue({ affected: 1 });

      await service.handlePaySuccess(outTradeNo, result);

      expect(settlementRepo.findOne).toHaveBeenCalled();
      expect(settlementItemRepo.find).toHaveBeenCalled();
      expect(walletRepo.save).toHaveBeenCalled();
    });

    it('should resume settlement distribution when callback is retried in paid status', async () => {
      const outTradeNo = 'STL_3_1234567890_abcd1234';
      const result = { amount: { total: 10000 } };
      const settlement = {
        id: 3,
        status: 'paid',
        jobId: 9,
        supervisorId: null,
        supervisorFee: 0,
      };
      const items = [{ id: 1, settlementId: 3, workerId: 1, workerPay: 5000 }];
      const wallet = { id: 1, userId: 1, balance: 0, totalIncome: 0 };

      settlementRepo.findOne.mockResolvedValue(settlement);
      settlementItemRepo.find.mockResolvedValue(items);
      walletTxRepo.findOne.mockResolvedValue(null);
      walletRepo.findOne.mockResolvedValue(wallet);
      walletRepo.save.mockResolvedValue(wallet);
      walletTxRepo.create.mockImplementation((payload: any) => payload);
      walletTxRepo.save.mockResolvedValue({ id: 1 });
      settlementRepo.save.mockResolvedValue({
        ...settlement,
        status: 'distributed',
      });

      await service.handlePaySuccess(outTradeNo, result);

      expect(walletRepo.save).toHaveBeenCalled();
      expect(settlementRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'distributed' }),
      );
    });

    it('should skip unknown payment prefix', async () => {
      const outTradeNo = 'UNKNOWN_4_1234567890_abcd1234';
      const result = { amount: { total: 1000 } };

      await service.handlePaySuccess(outTradeNo, result);

      expect(memberOrderRepo.findOne).not.toHaveBeenCalled();
      expect(beanTxRepo.findOne).not.toHaveBeenCalled();
      expect(adOrderRepo.findOne).not.toHaveBeenCalled();
      expect(settlementRepo.findOne).not.toHaveBeenCalled();
    });

    it('should skip payment if order not found', async () => {
      const outTradeNo = 'MBR_1_1234567890_abcd1234';
      const result = { amount: { total: 9900 } };

      memberOrderRepo.findOne.mockResolvedValue(null);

      await service.handlePaySuccess(outTradeNo, result);

      expect(memberOrderRepo.save).not.toHaveBeenCalled();
    });

    it('should skip payment if already paid', async () => {
      const outTradeNo = 'MBR_1_1234567890_abcd1234';
      const result = { amount: { total: 9900 } };

      const order = {
        id: 1,
        userId: 1,
        payStatus: 'paid',
        durationDays: 30,
      };

      memberOrderRepo.findOne.mockResolvedValue(order);

      await service.handlePaySuccess(outTradeNo, result);

      expect(memberOrderRepo.save).not.toHaveBeenCalled();
    });
  });
});
