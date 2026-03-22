/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { AttendanceSheet } from '../../entities/attendance-sheet.entity';
import { AttendanceSheetItem } from '../../entities/attendance-sheet-item.entity';
import { PaymentService } from '../payment/payment.service';

describe('SettlementService', () => {
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
  let enterpriseCertRepository: any;
  let workerCertRepository: any;
  let attendanceSheetRepository: any;
  let attendanceSheetItemRepository: any;
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
      createQueryBuilder: jest.fn(),
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
      update: jest.fn(),
    };

    sysConfigRepository = {
      findOne: jest.fn(),
    };

    enterpriseCertRepository = {
      findOne: jest.fn(),
    };

    workerCertRepository = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    attendanceSheetRepository = {
      find: jest.fn(),
    };

    attendanceSheetItemRepository = {
      find: jest.fn(),
    };

    paymentService = {
      generateOutTradeNo: jest.fn(
        (prefix, id) => `${prefix}_${id}_${Date.now()}`,
      ),
      createJsapiOrder: jest.fn().mockResolvedValue({
        prepayId: 'test_prepay_id',
      }),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
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
          provide: getRepositoryToken(EnterpriseCert),
          useValue: enterpriseCertRepository,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepository,
        },
        {
          provide: getRepositoryToken(AttendanceSheet),
          useValue: attendanceSheetRepository,
        },
        {
          provide: getRepositoryToken(AttendanceSheetItem),
          useValue: attendanceSheetItemRepository,
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

    service = module.get<SettlementService>(SettlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should return config from database', async () => {
      const mockConfig = { id: 1, key: 'commission_rate', value: '0.1' };

      sysConfigRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service['getConfig']('commission_rate');

      expect(result).toBe('0.1');
    });

    it('should return default value when config not found', async () => {
      sysConfigRepository.findOne.mockResolvedValue(null);

      const result = await service['getConfig']('commission_rate', '0.15');

      expect(result).toBe('0.15');
    });
  });

  describe('create', () => {
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
      attendanceSheetRepository.find.mockResolvedValue([]);
      workLogRepository.find.mockResolvedValue(mockWorkLogs);
      sysConfigRepository.findOne.mockResolvedValue(null);
      settlementRepository.create.mockReturnValue(mockSettlement);
      settlementRepository.save.mockResolvedValue(mockSettlement);
      settlementItemRepository.create.mockReturnValue({});
      settlementItemRepository.save.mockResolvedValue({});
      jobRepository.update.mockResolvedValue({});

      const result = await service.createSettlement(1, 1);

      expect(result).toBeDefined();
      expect(result.settlementId).toBe(1);
      expect(settlementRepository.save).toHaveBeenCalled();
    });

    it('should prefer attendance sheet items over work logs when creating settlement', async () => {
      const mockJob = {
        id: 1,
        userId: 1,
        title: 'Test Job',
        salary: 100,
        salaryType: 'hourly',
      };
      const mockApplications = [
        { id: 1, workerId: 2, status: 'confirmed', isSupervisor: 0 },
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
      attendanceSheetRepository.find.mockResolvedValue([
        { id: 10, jobId: 1, date: '2026-03-18' },
      ]);
      attendanceSheetItemRepository.find.mockResolvedValue([
        {
          sheetId: 10,
          workerId: 2,
          attendance: 'normal',
          hours: 7,
          pieces: 0,
          checkInTime: '08:00',
          checkOutTime: '17:00',
        },
      ]);
      workLogRepository.find.mockResolvedValue([
        { id: 1, hours: 8, pieces: 0, jobId: 1, workerId: 2 },
      ]);
      sysConfigRepository.findOne.mockResolvedValue(null);
      settlementRepository.create.mockReturnValue(mockSettlement);
      settlementRepository.save.mockResolvedValue(mockSettlement);
      settlementItemRepository.create.mockImplementation((payload) => payload);
      settlementItemRepository.save.mockResolvedValue({});
      jobRepository.update.mockResolvedValue({});

      await service.createSettlement(1, 1);

      expect(settlementItemRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        workerId: 2,
        hours: 7,
        factoryPay: 700,
        workerPay: 560,
      }));
      expect(workLogRepository.find).not.toHaveBeenCalled();
    });

    it('should throw error when job not found', async () => {
      jobRepository.findOneBy.mockResolvedValue(null);

      await expect(service.createSettlement(1, 999)).rejects.toThrow();
    });

    it('should return existing settlement when settlement already exists', async () => {
      const mockJob = { id: 1, userId: 1, title: 'Test Job' };
      const mockSettlement = { id: 1, jobId: 1, status: 'pending' };

      jobRepository.findOneBy.mockResolvedValue(mockJob);
      settlementRepository.findOne.mockResolvedValue(mockSettlement);

      const result = await service.createSettlement(1, 1);

      expect(result).toEqual(expect.objectContaining({
        existing: true,
        settlementId: 1,
      }));
    });
  });

  describe('detail', () => {
    it('should return settlement detail with current worker settlement info', async () => {
      const mockSettlement = {
        id: 1,
        jobId: 1,
        enterpriseId: 1,
        totalWorkers: 1,
        totalHours: 8,
        factoryTotal: 800,
        platformFee: 120,
        workerTotal: 680,
        supervisorFee: 0,
        status: 'paid',
        createdAt: new Date(2026, 2, 18, 8, 0, 0),
        job: {
          id: 1,
          userId: 1,
          title: 'Test Job',
          dateStart: '2026-03-18',
          dateEnd: '2026-03-18',
          user: { nickname: 'Test Enterprise' },
        },
      };
      const mockItems = [
        {
          workerId: 2,
          hours: 8,
          factoryPay: 800,
          workerPay: 680,
          confirmed: 0,
          confirmedAt: null,
          worker: { nickname: 'Worker A' },
        },
      ];

      settlementRepository.findOne.mockResolvedValue(mockSettlement);
      settlementItemRepository.find.mockResolvedValue(mockItems);
      attendanceSheetRepository.find.mockResolvedValue([
        { id: 11, jobId: 1, date: '2026-03-18' },
      ]);
      enterpriseCertRepository.findOne.mockResolvedValue({ companyName: 'Test Company' });

      const result = await service.detail(1, 2);

      expect(result).toBeDefined();
      expect(result.job.company).toBe('Test Company');
      expect(result.job.settlementGeneratedAt).toBe('2026-03-18 08:00');
      expect(result.job.attendanceSheetDateLabel).toBe('2026-03-18');
      expect(result.currentWorkerSettlement).toEqual(expect.objectContaining({
        workerId: 2,
        confirmed: false,
        canConfirm: true,
      }));
    });

    it('should return empty settlement state when settlement not found', async () => {
      settlementRepository.findOne.mockResolvedValue(null);
      jobRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 9,
        title: 'Test Job',
        dateStart: '2026-03-18',
        dateEnd: '2026-03-18',
        user: { nickname: 'Enterprise A' },
      });
      attendanceSheetRepository.find.mockResolvedValue([]);

      const result = await service.detail(1, 999);

      expect(result.exists).toBe(false);
      expect(result.job.jobType).toBe('Test Job');
    });
  });

  describe('pay', () => {
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

      const result = await service.pay(1, 1);

      expect(result).toBeDefined();
      expect(paymentService.createJsapiOrder).toHaveBeenCalled();
    });

    it('should allow payment when enterpriseId is returned as a string', async () => {
      const mockSettlement = {
        id: 1,
        jobId: 1,
        enterpriseId: '1',
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

      const result = await service.pay(1, 1);

      expect(result).toBeDefined();
      expect(paymentService.createJsapiOrder).toHaveBeenCalled();
    });

    it('should throw error when settlement not found', async () => {
      settlementRepository.findOne.mockResolvedValue(null);

      await expect(service.pay(1, 999)).rejects.toThrow();
    });
  });

  describe('confirmByWorker', () => {
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

      const result = await service.confirmByWorker(1, 2);

      expect(result).toBeDefined();
      expect(settlementItemRepository.save).toHaveBeenCalled();
    });

    it('should throw error when settlement not found', async () => {
      settlementRepository.findOne.mockResolvedValue(null);

      await expect(service.confirmByWorker(1, 2)).rejects.toThrow();
    });
  });
});
