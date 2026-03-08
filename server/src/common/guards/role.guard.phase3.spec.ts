/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard } from './role.guard';

describe('Phase 3: RoleGuard - Role-Based Access Control', () => {
  let guard: RoleGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RoleGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no ROLES_KEY metadata is set (undefined)', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'worker' } }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when ROLES_KEY is null', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'worker' } }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user role matches required role', () => {
      reflector.getAllAndOverride.mockReturnValue(['worker']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'worker' } }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user role is in multi-role array', () => {
      reflector.getAllAndOverride.mockReturnValue(['worker', 'enterprise']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'enterprise' } }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user role not in required roles', () => {
      reflector.getAllAndOverride.mockReturnValue(['enterprise']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'worker' } }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when request.user is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(['worker']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: undefined }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when request.user is null', () => {
      reflector.getAllAndOverride.mockReturnValue(['worker']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with message "无权限访问"', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: 'worker' } }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      try {
        guard.canActivate(context);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('无权限访问');
      }
    });
  });
});
