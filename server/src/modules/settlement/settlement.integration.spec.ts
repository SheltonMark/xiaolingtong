/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { PaymentService } from '../payment/payment.service';

describe('SettlementModule Integration Tests', () => {
  let controller: SettlementController;
  let service: SettlementService;
  let settlementRepository: any;
  let settlementItemRepository: any;
  let jobRepository: any;
  let jobApplicationRepository: any;
  let workLogRepository: any;
  let walletRepository: any;
  let walletTransactionRepository: any;
  let userRepository: any;
  let sysConfigRepository: any;
  let paymentService: any;
  let configService: any;

  beforeEach(async () => {
    settlementRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    settlementItemRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    jobApplicationRepository = {
      find: jest.fn(),
    };

    workLogRepository = {
      find: jest.fn(),
    };

    walletRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    walletTransactionRepository = {
      save: jest.fn(),
      create: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    sysConfigRepository = {
      findOne: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn(
        (prefix, id) => `${prefix}_${id}_${Date.now()}`,
      ),
      createJsapiOrder: jest
        .fn()
        .mockResolvedValue({ prepayId: 'test_prepay_id' }),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [
        SettlementService,
        {
          provide: getRepositoryToken(Settlement),
          useValue: settlementRepository,
        },
        {
          provide: getRepositoryToken(SettlementItem),
          useValue: settlementItemRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: workLogRepository,
        },
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
          provide: getRepositoryToken(SysConfig),
          useValue: sysConfigRepository,
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

    controller = module.get<SettlementController>(SettlementController);
    service = module.get<SettlementService>(SettlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create Integration', () => {
    it('should create settlement successfully', async () => {
      const mockJob = {
        id: 1,
        userId: 1,
        title: 'Test Job',
        salary: 100,
        salaryType: 'hourly',
      };
      const mockApplications = [
        { id: 1, workerId: 2, status: 'confirmed', isSupervisor: 0 },
        { id: 2, workerId: 3, status: 'confirmed', isSupervisor: 0 },
      ];
      const mockWorkLogs = [
        { id: 1, applicationId: 1, hours: 8, pieces: 0, jobId: 1, workerId: 2 },
        { id: 2, applicationId: 2, hours: 8, pieces: 0, jobId: 1, workerId: 3 },
      ];
      const mockSettlement = {
        id: 1,
        jobId: 1,
        enterpriseId: 1,
        status: 'pending',
      };

      jobRepository.findOneBy.mockResolvedValue(mockJob);
      settlementRepository.findOne.mockResolvedValue(null);
      jobApplicationRepository.find.mockResolvedValue(mockApplications);
      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      sysConfigRepository.findOne.mockResolvedValue(null);
      settlementRepository.create.mockReturnValue(mockSettlement);
      settlementRepository.save.mockResolvedValue(mockSettlement);
      settlementItemRepository.create.mockReturnValue({});
      settlementItemRepository.save.mockResolvedValue({});
      jobRepository.update.mockResolvedValue({});

      const result = await controller.create(1, 1);

      expect(result).toBeDefined();
      expect(settlementRepository.save).toHaveBeenCalled();
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOneBy.mockResolvedValue(null);

      await expect(controller.create(1, 999)).rejects.toThrow();
    });
  });

  describe('detail Integration', () => {
    it('should return settlement detail', async () => {
      const mockSettlement = { id: 1, jobId: 1, userId: 1, status: 'pending' };

      settlementRepository.findOne.mockResolvedValue(mockSettlement);
      settlementItemRepository.find.mockResolvedValue([]);

      const result = await controller.detail(1, 1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should throw error when settlement not found', async () => {
      settlementRepository.findOne.mockResolvedValue(null);

      await expect(controller.detail(1, 999)).rejects.toThrow();
    });
  });

  describe('pay Integration', () => {
    it('should initiate payment successfully', async () => {
      const mockSettlement = {
        id: 1,
        jobId: 1,
        enterpriseId: 1,
        status: 'pending',
        factoryTotal: 1000,
        totalWorkers: 2,
      };
      const mockUser = { id: 1, openid: 'test_openid' };

      settlementRepository.findOne.mockResolvedValue(mockSettlement);
      userRepository.findOneBy.mockResolvedValue(mockUser);
      paymentService.createJsapiOrder.mockResolvedValue({
        prepayId: 'test_prepay_id',
      });

      const result = await controller.pay(1, 1);

      expect(result).toBeDefined();
      expect(paymentService.createJsapiOrder).toHaveBeenCalled();
    });
  });

  describe('confirmByWorker Integration', () => {
    it('should confirm settlement item', async () => {
      const mockSettlement = { id: 1, jobId: 1, status: 'pending' };
      const mockItem = {
        id: 1,
        settlementId: 1,
        workerId: 2,
        status: 'pending',
        confirmed: 0,
      };

      settlementRepository.findOne.mockResolvedValue(mockSettlement);
      settlementItemRepository.findOne.mockResolvedValue(mockItem);
      settlementItemRepository.save.mockResolvedValue({
        ...mockItem,
        confirmed: 1,
      });

      const result = await controller.confirmByWorker(2, 1);

      expect(result).toBeDefined();
      expect(settlementItemRepository.save).toHaveBeenCalled();
    });
  });
});
