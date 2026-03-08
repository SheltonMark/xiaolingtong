/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RoleGuard } from '../../common/guards/role.guard';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';

describe('Phase 2: Authentication & Authorization - JWT & Role Guards', () => {
  let authGuard: AuthGuard;
  let roleGuard: RoleGuard;
  let authService: AuthService;
  let jwtService: any;
  let configService: any;
  let reflector: any;
  let userRepo: any;
  let walletRepo: any;

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret-key',
          JWT_EXPIRATION: '24h',
        };
        return config[key];
      }),
    };

    reflector = {
      getAllAndOverride: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    walletRepo = {
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        RoleGuard,
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: walletRepo,
        },
      ],
    }).compile();

    authGuard = module.get<AuthGuard>(AuthGuard);
    roleGuard = module.get<RoleGuard>(RoleGuard);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Token Validation', () => {
    it('should reject request without token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request with invalid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer invalid-token',
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request with expired token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer expired-token',
            },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      await expect(authGuard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should allow access with valid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue({ sub: 1, role: 'user' });

      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await authGuard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({ sub: 1, role: 'user' });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should reject non-admin user accessing admin route', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { sub: 1, role: 'user' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => roleGuard.canActivate(mockContext)).toThrow();
    });

    it('should allow admin user accessing admin route', async () => {
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { sub: 1, role: 'admin' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await roleGuard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when no roles required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { sub: 1, role: 'user' },
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await roleGuard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('Public Routes', () => {
    it('should allow public route without token', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {},
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      const result = await authGuard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('Token Payload Extraction', () => {
    it('should extract user info from valid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const payload = { sub: 123, role: 'user', nickname: 'TestUser' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      await authGuard.canActivate(mockContext);

      expect(mockRequest.user).toEqual(payload);
      expect(mockRequest.user.sub).toBe(123);
      expect(mockRequest.user.role).toBe('user');
    });
  });
});
