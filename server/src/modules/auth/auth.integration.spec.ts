/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

describe('AuthModule Integration Tests', () => {
  let controller: AuthController;
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let walletRepository: jest.Mocked<Repository<Wallet>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findOneBy: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
    } as any;

    walletRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn(),
    } as any;

    configService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('wxLogin Integration', () => {
    it('should login successfully with valid code in dev mode', async () => {
      const code = 'test_code_123';
      const mockUser = {
        id: 1,
        openid: `dev_${code}`,
        role: 'buyer',
        nickname: 'Test User',
        avatarUrl: 'http://example.com/avatar.jpg',
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      configService.get.mockReturnValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('test_token_123');

      const result = await controller.wxLogin(code);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(1);
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        role: 'buyer',
      });
    });

    it('should create new user if not exists', async () => {
      const code = 'new_code_456';
      const newUser = {
        id: 2,
        openid: `dev_${code}`,
        role: 'buyer',
        nickname: null,
        avatarUrl: null,
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      configService.get.mockReturnValue(null);
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(newUser as any);
      userRepository.save.mockResolvedValue(newUser as any);
      walletRepository.create.mockReturnValue({ userId: 2 } as any);
      walletRepository.save.mockResolvedValue({ userId: 2 } as any);
      jwtService.sign.mockReturnValue('new_token_456');

      const result = await controller.wxLogin(code);

      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result.user.id).toBe(2);
    });

    it('should throw BadRequestException when code is empty', () => {
      expect(() => controller.wxLogin('')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when code is null', () => {
      expect(() => controller.wxLogin(null as any)).toThrow(BadRequestException);
    });

    it('should handle database error during login', async () => {
      const code = 'error_code';
      configService.get.mockReturnValue(null);
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(controller.wxLogin(code)).rejects.toThrow('Database error');
    });
  });

  describe('chooseRole Integration', () => {
    it('should choose role successfully', async () => {
      const userId = 1;
      const role = 'enterprise';
      const updatedUser = {
        id: userId,
        role,
        openid: 'dev_test',
        nickname: 'Test User',
        avatarUrl: null,
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      userRepository.findOneBy.mockResolvedValue(updatedUser as any);
      jwtService.sign.mockReturnValue('new_token_with_role');

      const result = await controller.chooseRole(userId, role);

      expect(userRepository.update).toHaveBeenCalledWith(userId, { role });
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
      expect(result).toHaveProperty('token');
      expect(result.role).toBe('enterprise');
    });

    it('should throw BadRequestException when role is empty', () => {
      expect(() => controller.chooseRole(1, '')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when role is null', () => {
      expect(() => controller.chooseRole(1, null as any)).toThrow(BadRequestException);
    });

    it('should handle database error during role update', async () => {
      userRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(controller.chooseRole(1, 'worker')).rejects.toThrow('Update failed');
    });

    it('should update role to worker', async () => {
      const userId = 2;
      const role = 'worker';
      const updatedUser = {
        id: userId,
        role,
        openid: 'dev_worker',
        nickname: 'Worker User',
        avatarUrl: null,
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      userRepository.findOneBy.mockResolvedValue(updatedUser as any);
      jwtService.sign.mockReturnValue('worker_token');

      const result = await controller.chooseRole(userId, role);

      expect(result.role).toBe('worker');
    });
  });

  describe('getProfile Integration', () => {
    it('should get profile successfully for buyer', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        role: 'buyer',
        openid: 'dev_buyer',
        nickname: 'Buyer User',
        avatarUrl: 'http://example.com/avatar.jpg',
        phone: '13800138000',
        beanBalance: 100,
        isMember: true,
        creditScore: 95,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.getProfile(userId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('nickname');
      expect(result.id).toBe(userId);
      expect(result.role).toBe('buyer');
    });

    it('should return null when user not found', async () => {
      const userId = 999;
      userRepository.findOne.mockResolvedValue(null);

      const result = await controller.getProfile(userId);

      expect(result).toBeNull();
    });

    it('should get profile with enterprise certification', async () => {
      const userId = 2;
      const mockUser = {
        id: userId,
        role: 'enterprise',
        openid: 'dev_enterprise',
        nickname: 'Enterprise User',
        avatarUrl: null,
        phone: '13900139000',
        beanBalance: 500,
        isMember: false,
        creditScore: 100,
      };

      const mockCert = {
        id: 1,
        userId,
        companyName: 'Test Company',
        status: 'approved',
        createdAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.manager.findOne.mockResolvedValue(mockCert as any);

      const result = await controller.getProfile(userId);

      expect(result.certStatus).toBe('approved');
      expect(result.certName).toBe('Test Company');
      expect(result.isVerified).toBe(true);
    });

    it('should get profile with worker certification pending', async () => {
      const userId = 3;
      const mockUser = {
        id: userId,
        role: 'worker',
        openid: 'dev_worker',
        nickname: 'Worker User',
        avatarUrl: null,
        phone: '13700137000',
        beanBalance: 200,
        isMember: false,
        creditScore: 80,
      };

      const mockCert = {
        id: 2,
        userId,
        realName: 'John Doe',
        status: 'pending',
        createdAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);
      userRepository.manager.findOne.mockResolvedValue(mockCert as any);

      const result = await controller.getProfile(userId);

      expect(result.certStatus).toBe('pending');
      expect(result.certName).toBe('John Doe');
      expect(result.isVerified).toBe(false);
    });

    it('should handle database error during profile retrieval', async () => {
      const userId = 1;
      userRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(controller.getProfile(userId)).rejects.toThrow('Database error');
    });
  });

  describe('logout Integration', () => {
    it('should logout successfully', async () => {
      const result = await controller.logout();

      expect(result).toHaveProperty('message');
      expect(result.message).toBe('已退出');
    });

    it('should return consistent logout message', async () => {
      const result1 = await controller.logout();
      const result2 = await controller.logout();

      expect(result1.message).toBe(result2.message);
    });
  });

  describe('Controller-Service Integration', () => {
    it('should integrate wxLogin controller with service', async () => {
      const code = 'integration_test_code';
      const mockUser = {
        id: 5,
        openid: `dev_${code}`,
        role: 'buyer',
        nickname: 'Integration Test User',
        avatarUrl: null,
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      configService.get.mockReturnValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('integration_token');

      const result = await service.wxLogin(code);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.token).toBe('integration_token');
    });

    it('should integrate chooseRole controller with service', async () => {
      const userId = 1;
      const role = 'enterprise';
      const updatedUser = {
        id: userId,
        role,
        openid: 'dev_test',
        nickname: 'Test',
        avatarUrl: null,
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      userRepository.findOneBy.mockResolvedValue(updatedUser as any);
      jwtService.sign.mockReturnValue('role_token');

      const result = await service.chooseRole(userId, role);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('role');
    });

    it('should integrate getProfile controller with service', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        role: 'buyer',
        openid: 'dev_buyer',
        nickname: 'Buyer',
        avatarUrl: null,
        phone: '13800138000',
        beanBalance: 100,
        isMember: true,
        creditScore: 95,
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.getProfile(userId);

      expect(result).toHaveProperty('id');
      expect(result.id).toBe(userId);
    });
  });
});
