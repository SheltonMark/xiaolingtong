import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let walletRepo: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOneBy: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
    };

    walletRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepo,
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

    service = module.get<AuthService>(AuthService);
  });

  describe('wxLogin', () => {
    it('should login successfully with valid code in dev mode', async () => {
      const code = 'test_code';
      const userId = 1;

      configService.get.mockReturnValue(null);
      userRepo.findOne.mockResolvedValue({
        id: userId,
        openid: `dev_${code}`,
        role: 'buyer',
        nickname: 'Test User',
        avatarUrl: 'http://example.com/avatar.jpg',
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      });
      jwtService.sign.mockReturnValue('test_token');

      const result = await service.wxLogin(code);

      expect(result).toEqual({
        token: 'test_token',
        user: {
          id: userId,
          role: 'buyer',
          nickname: 'Test User',
          avatarUrl: 'http://example.com/avatar.jpg',
          beanBalance: 0,
          isMember: false,
          creditScore: 0,
        },
      });
    });

    it('should create new user if not exists', async () => {
      const code = 'test_code';
      const userId = 1;
      const newUser = {
        id: userId,
        openid: `dev_${code}`,
        role: 'buyer',
        nickname: null,
        avatarUrl: null,
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      };

      configService.get.mockReturnValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);
      walletRepo.create.mockReturnValue({ userId });
      walletRepo.save.mockResolvedValue({ userId });
      jwtService.sign.mockReturnValue('test_token');

      const result = await service.wxLogin(code);

      expect(userRepo.create).toHaveBeenCalledWith({ openid: `dev_${code}` });
      expect(userRepo.save).toHaveBeenCalled();
      expect(walletRepo.save).toHaveBeenCalled();
    });

    it('should throw error when WeChat API fails', async () => {
      const code = 'invalid_code';

      configService.get.mockImplementation((key) => {
        if (key === 'WX_APPID') return 'test_appid';
        if (key === 'WX_SECRET') return 'test_secret';
      });

      (axios.get as jest.Mock).mockResolvedValue({
        data: { errcode: 40001, errmsg: '微信登录失败' },
      });

      await expect(service.wxLogin(code)).rejects.toThrow(BadRequestException);
    });

    it('should handle WeChat API success', async () => {
      const code = 'valid_code';
      const openid = 'test_openid';
      const userId = 1;

      configService.get.mockImplementation((key) => {
        if (key === 'WX_APPID') return 'test_appid';
        if (key === 'WX_SECRET') return 'test_secret';
      });

      (axios.get as jest.Mock).mockResolvedValue({
        data: { openid },
      });

      userRepo.findOne.mockResolvedValue({
        id: userId,
        openid,
        role: 'buyer',
        nickname: 'Test User',
        avatarUrl: 'http://example.com/avatar.jpg',
        beanBalance: 0,
        isMember: false,
        creditScore: 0,
      });

      jwtService.sign.mockReturnValue('test_token');

      const result = await service.wxLogin(code);

      expect(result.token).toBe('test_token');
      expect(result.user.id).toBe(userId);
    });
  });

  describe('chooseRole', () => {
    it('should update user role and return new token', async () => {
      const userId = 1;
      const newRole = 'enterprise';
      const user = {
        id: userId,
        role: newRole,
      };

      userRepo.update.mockResolvedValue({ affected: 1 });
      userRepo.findOneBy.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('new_token');

      const result = await service.chooseRole(userId, newRole);

      expect(userRepo.update).toHaveBeenCalledWith(userId, { role: newRole });
      expect(result).toEqual({
        token: 'new_token',
        role: newRole,
      });
    });

    it('should handle worker role', async () => {
      const userId = 1;
      const newRole = 'worker';
      const user = {
        id: userId,
        role: newRole,
      };

      userRepo.update.mockResolvedValue({ affected: 1 });
      userRepo.findOneBy.mockResolvedValue(user);
      jwtService.sign.mockReturnValue('new_token');

      const result = await service.chooseRole(userId, newRole);

      expect(result.role).toBe('worker');
    });
  });

  describe('getProfile', () => {
    it('should return user profile with no certification', async () => {
      const userId = 1;
      const user = {
        id: userId,
        role: 'buyer',
        nickname: 'Test User',
        avatarUrl: 'http://example.com/avatar.jpg',
        phone: '13800138000',
        beanBalance: 100,
        isMember: false,
        creditScore: 80,
      };

      userRepo.findOne.mockResolvedValue(user);
      userRepo.manager.findOne.mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        id: userId,
        role: 'buyer',
        nickname: 'Test User',
        avatarUrl: 'http://example.com/avatar.jpg',
        phone: '13800138000',
        beanBalance: 100,
        isMember: false,
        creditScore: 80,
        certStatus: 'none',
        certName: '',
        isVerified: false,
      });
    });

    it('should return enterprise certification status', async () => {
      const userId = 1;
      const user = {
        id: userId,
        role: 'enterprise',
        nickname: 'Test Enterprise',
        avatarUrl: 'http://example.com/avatar.jpg',
        phone: '13800138000',
        beanBalance: 100,
        isMember: true,
        creditScore: 90,
      };

      const cert = {
        status: 'approved',
        companyName: 'Test Company',
      };

      userRepo.findOne.mockResolvedValue(user);
      userRepo.manager.findOne.mockResolvedValue(cert);

      const result = await service.getProfile(userId);

      expect(result.certStatus).toBe('approved');
      expect(result.certName).toBe('Test Company');
      expect(result.isVerified).toBe(true);
    });

    it('should return worker certification status', async () => {
      const userId = 1;
      const user = {
        id: userId,
        role: 'worker',
        nickname: 'Test Worker',
        avatarUrl: 'http://example.com/avatar.jpg',
        phone: '13800138000',
        beanBalance: 50,
        isMember: false,
        creditScore: 70,
      };

      const cert = {
        status: 'pending',
        realName: 'Zhang San',
      };

      userRepo.findOne.mockResolvedValue(user);
      userRepo.manager.findOne.mockResolvedValue(cert);

      const result = await service.getProfile(userId);

      expect(result.certStatus).toBe('pending');
      expect(result.certName).toBe('Zhang San');
      expect(result.isVerified).toBe(false);
    });

    it('should return null when user not found', async () => {
      const userId = 999;

      userRepo.findOne.mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toBeNull();
    });
  });
});
