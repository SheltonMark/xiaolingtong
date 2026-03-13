/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';

describe('UserModule Integration Tests', () => {
  let controller: UserController;
  let service: UserService;
  let userRepository: any;
  let enterpriseCertRepository: any;
  let workerCertRepository: any;

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
      const dto = { companyName: 'Test Co', licenseNumber: '123456' };
      const mockResult = { id: 1, userId: 1, ...dto, status: 'pending' };

      enterpriseCertRepository.findOneBy.mockResolvedValue(null);
      enterpriseCertRepository.create.mockReturnValue(mockResult);
      enterpriseCertRepository.save.mockResolvedValue(mockResult);

      const result = await controller.submitEnterpriseCert(1, dto);

      expect(result).toBeDefined();
      expect(enterpriseCertRepository.save).toHaveBeenCalled();
    });

    it('should handle duplicate submission', async () => {
      const dto = { companyName: 'Test Co', licenseNumber: '123456' };
      const existing = {
        id: 1,
        userId: 1,
        companyName: 'Old Co',
        status: 'approved',
      };
      const mockResult = { ...existing, ...dto, status: 'pending' };

      enterpriseCertRepository.findOneBy.mockResolvedValue(existing);
      enterpriseCertRepository.save.mockResolvedValue(mockResult);

      const result = await controller.submitEnterpriseCert(1, dto);

      expect(result).toBeDefined();
      expect(enterpriseCertRepository.save).toHaveBeenCalled();
    });
  });

  describe('submitWorkerCert Integration', () => {
    it('should submit worker certification successfully', async () => {
      const dto = { name: 'John', idNumber: '123456789' };
      const mockResult = { id: 1, userId: 1, ...dto, status: 'pending' };

      workerCertRepository.findOneBy.mockResolvedValue(null);
      workerCertRepository.create.mockReturnValue(mockResult);
      workerCertRepository.save.mockResolvedValue(mockResult);

      const result = await controller.submitWorkerCert(1, dto);

      expect(result).toBeDefined();
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
