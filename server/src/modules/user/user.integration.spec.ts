/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ContactProfile } from '../../entities/contact-profile.entity';
import { VerificationSession } from '../../entities/verification-session.entity';

describe('UserModule Integration Tests', () => {
  let controller: UserController;
  let service: UserService;
  let userRepository: any;
  let enterpriseCertRepository: any;
  let workerCertRepository: any;
  let contactProfileRepository: any;
  let verificationSessionRepository: any;
  let configService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    enterpriseCertRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    workerCertRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    contactProfileRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    verificationSessionRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'TENCENT_CERT_SMS_ENABLED') return '1';
        if (key === 'TENCENT_SMS_MOCK') return '1';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
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
          provide: getRepositoryToken(ContactProfile),
          useValue: contactProfileRepository,
        },
        {
          provide: getRepositoryToken(VerificationSession),
          useValue: verificationSessionRepository,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitEnterpriseCert Integration', () => {
    it('should submit enterprise certification successfully', async () => {
      const dto = {
        companyName: 'Test Co',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        contactName: 'Alice',
        verificationToken: 'token-enterprise-1',
      };
      const session = {
        userId: 1,
        scene: 'enterprise_cert',
        phone: '13800000000',
        verificationToken: 'token-enterprise-1',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
      const mockResult = {
        id: 1,
        userId: 1,
        companyName: 'Test Co',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        contactName: 'Alice',
        contactPhone: '13800000000',
        status: 'pending',
      };

      verificationSessionRepository.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepository.save.mockResolvedValue({ ...session, verificationToken: null });
      userRepository.update.mockResolvedValue({ affected: 1 });
      enterpriseCertRepository.findOneBy.mockResolvedValue(null);
      enterpriseCertRepository.create.mockImplementation((payload: any) => payload);
      enterpriseCertRepository.save.mockResolvedValue(mockResult);

      const result = await controller.submitEnterpriseCert(1, dto);

      expect(result).toBeDefined();
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        verifiedPhone: '13800000000',
        phone: '13800000000',
      });
      expect(enterpriseCertRepository.save).toHaveBeenCalled();
    });

    it('should handle duplicate submission', async () => {
      const dto = {
        companyName: 'Test Co',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        contactName: 'Alice',
        verificationToken: 'token-enterprise-2',
      };
      const session = {
        userId: 1,
        scene: 'enterprise_cert',
        phone: '13900000000',
        verificationToken: 'token-enterprise-2',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
      const existing = { id: 1, userId: 1, companyName: 'Old Co', status: 'approved' };
      const mockResult = { ...existing, companyName: 'Test Co', contactPhone: '13900000000', status: 'pending' };

      verificationSessionRepository.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepository.save.mockResolvedValue({ ...session, verificationToken: null });
      userRepository.update.mockResolvedValue({ affected: 1 });
      enterpriseCertRepository.findOneBy.mockResolvedValue(existing);
      enterpriseCertRepository.save.mockResolvedValue(mockResult);

      const result = await controller.submitEnterpriseCert(1, dto);

      expect(result).toBeDefined();
      expect(enterpriseCertRepository.save).toHaveBeenCalled();
    });
  });

  describe('submitWorkerCert Integration', () => {
    it('should submit worker certification successfully', async () => {
      const dto = {
        name: 'John',
        idNumber: '123456789',
        phone: '13800138000',
        frontImage: 'front.png',
        backImage: 'back.png',
        verificationToken: 'token-worker-1',
      };
      const session = {
        userId: 1,
        scene: 'worker_cert',
        phone: '13800138000',
        verificationToken: 'token-worker-1',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };
      const mockResult = {
        id: 1,
        userId: 1,
        realName: 'John',
        idNo: '123456789',
        idFrontImage: 'front.png',
        idBackImage: 'back.png',
        status: 'pending',
      };

      verificationSessionRepository.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepository.save.mockResolvedValue({ ...session, verificationToken: null });
      userRepository.update.mockResolvedValue({ affected: 1 });
      workerCertRepository.findOneBy.mockResolvedValue(null);
      workerCertRepository.create.mockImplementation((payload: any) => payload);
      workerCertRepository.save.mockResolvedValue(mockResult);

      const result = await controller.submitWorkerCert(1, dto);

      expect(result).toBeDefined();
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        verifiedPhone: '13800138000',
        phone: '13800138000',
      });
      expect(workerCertRepository.save).toHaveBeenCalled();
    });
  });

  describe('getCertStatus Integration', () => {
    it('should return certification status', async () => {
      const mockCert = { id: 1, userId: 1, status: 'pending' };

      enterpriseCertRepository.findOneBy.mockResolvedValue(mockCert);

      const result = await controller.getCertStatus(1, 'enterprise');

      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(enterpriseCertRepository.findOneBy).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      enterpriseCertRepository.findOneBy.mockResolvedValue(null);

      const result = await controller.getCertStatus(999, 'enterprise');

      expect(result.status).toBe('none');
      expect(result.cert).toBeNull();
    });
  });

  describe('updateAvatar Integration', () => {
    it('should update avatar successfully', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.updateAvatar(1, 'new_avatar.jpg');

      expect(result).toBeDefined();
      expect(result.avatarUrl).toBe('new_avatar.jpg');
      expect(userRepository.update).toHaveBeenCalled();
    });
  });

  describe('updateProfile Integration', () => {
    it('should update profile successfully', async () => {
      const dto = { nickname: 'New Name' };

      userRepository.update.mockResolvedValue({ affected: 1 });

      const result = await controller.updateProfile(1, dto);

      expect(result).toBeDefined();
      expect(result.message).toBe('已更新');
      expect(userRepository.update).toHaveBeenCalled();
    });
  });
});
