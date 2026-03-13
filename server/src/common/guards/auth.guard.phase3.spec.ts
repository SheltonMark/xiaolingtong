/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

describe('Phase 3: AuthGuard - JWT Token Validation', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret-key',
        };
        return config[key];
      }),
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new AuthGuard(jwtService, configService, reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should bypass auth when IS_PUBLIC_KEY is true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should parse token on public route when Authorization exists', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const payload = { sub: 123, role: 'enterprise' };
      jwtService.verifyAsync.mockResolvedValue(payload as any);

      const request: any = {
        headers: { authorization: 'Bearer valid.public.token' },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid.public.token',
        {
          secret: 'test-secret-key',
        },
      );
      expect(request.user).toEqual(payload);
    });

    it('should throw UnauthorizedException when Authorization header is absent', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when no Bearer prefix', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Basic xyz' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is empty string after Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer ' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is malformed', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer malformed.token.here' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with "登录已过期" when verifyAsync rejects', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer valid.token.here' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      try {
        await guard.canActivate(context);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('登录已过期');
      }
    });

    it('should attach payload to request.user on valid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const payload = { sub: 1, role: 'worker' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const request = { headers: { authorization: 'Bearer valid.token' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual(payload);
    });

    it('should call verifyAsync with JWT_SECRET from configService', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jwtService.verifyAsync.mockResolvedValue({ sub: 1 });

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer token123' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token123', {
        secret: 'test-secret-key',
      });
    });

    it('should handle Authorization header with non-Bearer type', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return true after successfully setting request.user', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const payload = { sub: 2, role: 'enterprise' };
      jwtService.verifyAsync.mockResolvedValue(payload);

      const request = { headers: { authorization: 'Bearer token456' } };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toBeDefined();
    });
  });
});
