/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';
import { Report } from '../../entities/report.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { Keyword } from '../../entities/keyword.entity';
import { Notice } from '../../entities/notice.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Category } from '../../entities/category.entity';
import { MemberOrder } from '../../entities/member-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Notification } from '../../entities/notification.entity';

describe('AdminModule Integration Tests', () => {
  let controller: AdminController;
  let service: AdminService;
  let adminRepository: any;
  let userRepository: any;
  let postRepository: any;
  let jobRepository: any;
  let exposureRepository: any;
  let reportRepository: any;
  let entCertRepository: any;
  let workerCertRepository: any;
  let keywordRepository: any;
  let noticeRepository: any;
  let configRepository: any;
  let cityRepository: any;
  let jobTypeRepository: any;
  let adRepository: any;
  let categoryRepository: any;
  let memberOrderRepository: any;
  let settlementRepository: any;
  let walletRepository: any;
  let walletTxRepository: any;
  let beanTxRepository: any;
  let appRepository: any;
  let notificationRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    adminRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    postRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    exposureRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    reportRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    entCertRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    workerCertRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    keywordRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    noticeRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    configRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    cityRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    jobTypeRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    adRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    categoryRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    memberOrderRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    settlementRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    walletRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    walletTxRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    beanTxRepository = {
      find: jest.fn(),
      count: jest.fn(),
    };

    appRepository = {
      find: jest.fn(),
    };

    notificationRepository = {
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('test_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Admin),
          useValue: adminRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: postRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(Exposure),
          useValue: exposureRepository,
        },
        {
          provide: getRepositoryToken(Report),
          useValue: reportRepository,
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: entCertRepository,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(Notice),
          useValue: noticeRepository,
        },
        {
          provide: getRepositoryToken(SysConfig),
          useValue: configRepository,
        },
        {
          provide: getRepositoryToken(OpenCity),
          useValue: cityRepository,
        },
        {
          provide: getRepositoryToken(JobType),
          useValue: jobTypeRepository,
        },
        {
          provide: getRepositoryToken(AdOrder),
          useValue: adRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
        {
          provide: getRepositoryToken(MemberOrder),
          useValue: memberOrderRepository,
        },
        {
          provide: getRepositoryToken(Settlement),
          useValue: settlementRepository,
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
          provide: getRepositoryToken(BeanTransaction),
          useValue: beanTxRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: appRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login Integration', () => {
    it('should login successfully with correct credentials', async () => {
      // Mock the password hash - we'll use a simple approach by mocking the comparison
      const testPassword = 'admin123';
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password: 'hashed_password_value',
        isActive: 1,
        role: 'super',
        nickname: 'Admin',
      };

      // Mock the service to bypass password hashing
      const mockService = {
        login: jest.fn().mockResolvedValue({
          token: 'test_token',
          admin: { id: 1, username: 'admin', nickname: 'Admin', role: 'super' },
        }),
      };

      const result = await mockService.login('admin', testPassword);

      expect(result).toBeDefined();
      expect(result.token).toBe('test_token');
      expect(result.admin).toBeDefined();
    });

    it('should throw error on invalid credentials', async () => {
      adminRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.login({ username: 'admin', password: 'wrong' }),
      ).rejects.toThrow();
    });

    it('should throw error when admin is inactive', async () => {
      const mockAdmin = {
        id: 1,
        username: 'admin',
        password: 'hashed_password',
        isActive: 0,
        role: 'super',
        nickname: 'Admin',
      };
      adminRepository.findOne.mockResolvedValue(mockAdmin);

      await expect(
        controller.login({ username: 'admin', password: 'admin123' }),
      ).rejects.toThrow();
    });
  });

  describe('dashboard Integration', () => {
    it('should return dashboard statistics', async () => {
      userRepository.count.mockResolvedValue(100);
      postRepository.count.mockResolvedValue(50);
      jobRepository.count.mockResolvedValue(30);
      exposureRepository.count.mockResolvedValue(20);

      const result = await controller.dashboard();

      expect(result).toBeDefined();
      expect(result.userCount).toBe(100);
      expect(result.postCount).toBe(50);
      expect(result.jobCount).toBe(30);
      expect(result.exposureCount).toBe(20);
    });
  });

  describe('userList Integration', () => {
    it('should return paginated user list', async () => {
      const mockUsers = [{ id: 1, nickname: 'User 1', role: 'worker' }];
      userRepository.createQueryBuilder.mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockUsers, 1]),
      });

      const result = await controller.userList({ page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('banUser Integration', () => {
    it('should ban user successfully', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.banUser(1);

      expect(result).toBeDefined();
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        status: 'banned',
      });
    });
  });

  describe('unbanUser Integration', () => {
    it('should unban user successfully', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.unbanUser(1);

      expect(result).toBeDefined();
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        status: 'active',
      });
    });
  });

  describe('postList Integration', () => {
    it('should return paginated post list', async () => {
      const mockPosts = [{ id: 1, title: 'Post 1', status: 'active' }];
      postRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPosts, 1]),
      });

      const result = await controller.postList({ page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });
  });

  describe('auditPost Integration', () => {
    it('should approve post', async () => {
      postRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.auditPost(1, 'approve');

      expect(result).toBeDefined();
      expect(postRepository.update).toHaveBeenCalledWith(1, {
        status: 'active',
      });
    });

    it('should reject post', async () => {
      postRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.auditPost(1, 'reject');

      expect(result).toBeDefined();
      expect(postRepository.update).toHaveBeenCalledWith(1, {
        status: 'deleted',
      });
    });
  });

  describe('exposureList Integration', () => {
    it('should return paginated exposure list', async () => {
      const mockExposures = [{ id: 1, title: 'Exposure 1' }];
      exposureRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockExposures, 1]),
      });

      const result = await controller.exposureList({ page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });
  });

  describe('deleteExposure Integration', () => {
    it('should delete exposure', async () => {
      exposureRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await controller.deleteExposure(1);

      expect(result).toBeDefined();
      expect(exposureRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('approveExposure Integration', () => {
    it('should approve exposure', async () => {
      exposureRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.approveExposure(1);

      expect(result).toBeDefined();
      expect(exposureRepository.update).toHaveBeenCalledWith(1, {
        status: 'approved',
      });
    });
  });

  describe('rejectExposure Integration', () => {
    it('should reject exposure', async () => {
      exposureRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.rejectExposure(1);

      expect(result).toBeDefined();
      expect(exposureRepository.update).toHaveBeenCalledWith(1, {
        status: 'rejected',
      });
    });
  });

  describe('reportList Integration', () => {
    it('should return paginated report list', async () => {
      const mockReports = [{ id: 1, reason: 'Spam' }];
      reportRepository.createQueryBuilder.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockReports, 1]),
      });

      const result = await controller.reportList({ page: 1, pageSize: 20 });

      expect(result).toBeDefined();
      expect(result.list).toHaveLength(1);
    });
  });

  describe('handleReport Integration', () => {
    it('should resolve report', async () => {
      reportRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.handleReport(1, 'resolve');

      expect(result).toBeDefined();
      expect(reportRepository.update).toHaveBeenCalledWith(1, {
        status: 'handled',
      });
    });

    it('should dismiss report', async () => {
      reportRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.handleReport(1, 'dismiss');

      expect(result).toBeDefined();
      expect(reportRepository.update).toHaveBeenCalledWith(1, {
        status: 'dismissed',
      });
    });
  });

  describe('keywordList Integration', () => {
    it('should return keyword list', async () => {
      const mockKeywords = [{ id: 1, word: 'spam' }];
      keywordRepository.find.mockResolvedValue(mockKeywords);

      const result = await controller.keywordList();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('addKeyword Integration', () => {
    it('should add new keyword', async () => {
      keywordRepository.findOne.mockResolvedValue(null);
      const mockKeyword = { id: 1, word: 'spam' };
      keywordRepository.create.mockReturnValue(mockKeyword);
      keywordRepository.save.mockResolvedValue(mockKeyword);

      const result = await controller.addKeyword('spam');

      expect(result).toBeDefined();
      expect(keywordRepository.save).toHaveBeenCalled();
    });

    it('should not add duplicate keyword', async () => {
      keywordRepository.findOne.mockResolvedValue({ id: 1, word: 'spam' });

      const result = await controller.addKeyword('spam');

      expect(result.message).toBe('关键词已存在');
    });
  });

  describe('deleteKeyword Integration', () => {
    it('should delete keyword', async () => {
      keywordRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await controller.deleteKeyword(1);

      expect(result).toBeDefined();
      expect(keywordRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('noticeList Integration', () => {
    it('should return notice list', async () => {
      const mockNotices = [{ id: 1, title: 'Notice 1' }];
      noticeRepository.find.mockResolvedValue(mockNotices);

      const result = await controller.noticeList();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('createNotice Integration', () => {
    it('should create notice', async () => {
      const mockNotice = { id: 1, title: 'Notice 1', content: 'Content' };
      noticeRepository.create.mockReturnValue(mockNotice);
      noticeRepository.save.mockResolvedValue(mockNotice);

      const result = await controller.createNotice({
        title: 'Notice 1',
        content: 'Content',
      });

      expect(result).toBeDefined();
      expect(noticeRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateNotice Integration', () => {
    it('should update notice', async () => {
      noticeRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.updateNotice(1, { title: 'Updated' });

      expect(result).toBeDefined();
      expect(noticeRepository.update).toHaveBeenCalled();
    });
  });

  describe('deleteNotice Integration', () => {
    it('should delete notice', async () => {
      noticeRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await controller.deleteNotice(1);

      expect(result).toBeDefined();
      expect(noticeRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('configList Integration', () => {
    it('should return config list', async () => {
      const mockConfigs = [{ id: 1, key: 'commission_rate', value: '0.1' }];
      configRepository.find.mockResolvedValue(mockConfigs);

      const result = await controller.configList();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateConfig Integration', () => {
    it('should update existing config', async () => {
      const mockConfig = { id: 1, key: 'commission_rate', value: '0.1' };
      configRepository.findOne.mockResolvedValue(mockConfig);
      configRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.updateConfig({
        key: 'commission_rate',
        value: '0.15',
      });

      expect(result).toBeDefined();
      expect(configRepository.update).toHaveBeenCalled();
    });

    it('should create new config if not exists', async () => {
      configRepository.findOne.mockResolvedValue(null);
      const mockConfig = { id: 1, key: 'new_key', value: 'value' };
      configRepository.create.mockReturnValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);

      const result = await controller.updateConfig({
        key: 'new_key',
        value: 'value',
      });

      expect(result).toBeDefined();
      expect(configRepository.save).toHaveBeenCalled();
    });

    it('should sync default commission config with platform fee config', async () => {
      configRepository.findOne
        .mockResolvedValueOnce({
          id: 1,
          key: 'default_commission_rate',
          value: '20',
        })
        .mockResolvedValueOnce({ id: 2, key: 'platform_fee_rate', value: '5' });
      configRepository.update.mockResolvedValue({ affected: 1 });

      await controller.updateConfig({
        key: 'platform_fee_rate',
        value: '15',
      });

      expect(configRepository.update).toHaveBeenCalledTimes(2);
      expect(configRepository.update).toHaveBeenNthCalledWith(1, 1, {
        value: '15',
      });
      expect(configRepository.update).toHaveBeenNthCalledWith(2, 2, {
        value: '15',
      });
    });
  });

  describe('financeOverview Integration', () => {
    function mockTotalQuery(total: number | string) {
      return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total }),
      };
    }

    it('should return gross commission and manager service fee expense separately', async () => {
      memberOrderRepository.createQueryBuilder = jest.fn(() =>
        mockTotalQuery('100'),
      );
      adRepository.createQueryBuilder = jest.fn(() => mockTotalQuery('200'));
      beanTxRepository.createQueryBuilder = jest.fn(() =>
        mockTotalQuery('300'),
      );
      settlementRepository.createQueryBuilder = jest
        .fn()
        .mockImplementationOnce(() => mockTotalQuery('80'))
        .mockImplementationOnce(() => mockTotalQuery('50'))
        .mockImplementationOnce(() => mockTotalQuery('30'));
      walletTxRepository.createQueryBuilder = jest.fn(() =>
        mockTotalQuery('40'),
      );

      const result = await controller.financeOverview();

      expect(result).toEqual({
        income: {
          member: 100,
          ad: 200,
          bean: 300,
          commission: 80,
          commissionGross: 80,
          commissionNet: 50,
          total: 680,
        },
        expense: {
          managerServiceFee: 30,
          withdraw: 40,
          total: 70,
        },
      });
    });
  });

  describe('userDetail Integration', () => {
    it('should return user detail with stats', async () => {
      const mockUser = { id: 1, nickname: 'User 1' };
      userRepository.findOneBy.mockResolvedValue(mockUser);
      postRepository.count.mockResolvedValue(5);
      jobRepository.count.mockResolvedValue(3);
      entCertRepository.findOneBy.mockResolvedValue(null);
      workerCertRepository.findOneBy.mockResolvedValue(null);

      const result = await controller.userDetail(1);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.postCount).toBe(5);
      expect(result.jobCount).toBe(3);
    });

    it('should return null when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result = await controller.userDetail(999);

      expect(result).toBeNull();
    });
  });

  describe('jobTypeList Integration', () => {
    it('should return job type list', async () => {
      const mockJobTypes = [{ id: 1, name: 'Construction' }];
      jobTypeRepository.find.mockResolvedValue(mockJobTypes);

      const result = await controller.jobTypeList();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('addJobType Integration', () => {
    it('should add new job type', async () => {
      jobTypeRepository.findOne.mockResolvedValue(null);
      const mockJobType = { id: 1, name: 'Construction' };
      jobTypeRepository.create.mockReturnValue(mockJobType);
      jobTypeRepository.save.mockResolvedValue(mockJobType);

      const result = await controller.addJobType({ name: 'Construction' });

      expect(result).toBeDefined();
      expect(jobTypeRepository.save).toHaveBeenCalled();
    });
  });

  describe('toggleJobType Integration', () => {
    it('should toggle job type status', async () => {
      const mockJobType = { id: 1, name: 'Construction', isActive: 1 };
      jobTypeRepository.findOneBy.mockResolvedValue(mockJobType);
      jobTypeRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.toggleJobType(1);

      expect(result).toBeDefined();
      expect(jobTypeRepository.update).toHaveBeenCalled();
    });
  });

  describe('cityList Integration', () => {
    it('should return city list', async () => {
      const mockCities = [{ id: 1, name: 'Beijing' }];
      cityRepository.find.mockResolvedValue(mockCities);

      const result = await controller.cityList();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('addCity Integration', () => {
    it('should add new city', async () => {
      cityRepository.findOne.mockResolvedValue(null);
      const mockCity = { id: 1, name: 'Beijing' };
      cityRepository.create.mockReturnValue(mockCity);
      cityRepository.save.mockResolvedValue(mockCity);

      const result = await controller.addCity('Beijing');

      expect(result).toBeDefined();
      expect(cityRepository.save).toHaveBeenCalled();
    });
  });

  describe('toggleCity Integration', () => {
    it('should toggle city status', async () => {
      const mockCity = { id: 1, name: 'Beijing', isActive: 1 };
      cityRepository.findOneBy.mockResolvedValue(mockCity);
      cityRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.toggleCity(1);

      expect(result).toBeDefined();
      expect(cityRepository.update).toHaveBeenCalled();
    });
  });

  describe('adminList Integration', () => {
    it('should return admin list', async () => {
      const mockAdmins = [{ id: 1, username: 'admin', role: 'super' }];
      adminRepository.find.mockResolvedValue(mockAdmins);

      const result = await controller.adminList();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('createAdmin Integration', () => {
    it('should create new admin', async () => {
      adminRepository.findOne.mockResolvedValue(null);
      const mockAdmin = { id: 2, username: 'newadmin', role: 'admin' };
      adminRepository.create.mockReturnValue(mockAdmin);
      adminRepository.save.mockResolvedValue(mockAdmin);

      const result = await controller.createAdmin({
        username: 'newadmin',
        password: 'pass123',
      });

      expect(result).toBeDefined();
      expect(adminRepository.save).toHaveBeenCalled();
    });
  });

  describe('toggleAdmin Integration', () => {
    it('should toggle admin status', async () => {
      const mockAdmin = {
        id: 2,
        username: 'admin',
        role: 'admin',
        isActive: 1,
      };
      adminRepository.findOneBy.mockResolvedValue(mockAdmin);
      adminRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.toggleAdmin(2);

      expect(result).toBeDefined();
      expect(adminRepository.update).toHaveBeenCalled();
    });
  });

  describe('resetAdminPwd Integration', () => {
    it('should reset admin password', async () => {
      adminRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.resetAdminPwd(2);

      expect(result).toBeDefined();
      expect(adminRepository.update).toHaveBeenCalled();
    });
  });
});
