/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    authService = {
      wxLogin: jest.fn(),
      chooseRole: jest.fn(),
      getProfile: jest.fn(),
    } as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('wxLogin', () => {
    it('should successfully login with valid code', async () => {
      const code = 'valid_code_123';
      const mockResult = {
        token: 'jwt_token_xxx',
        userId: 1,
        openid: 'wx_openid_xxx',
      };

      authService.wxLogin.mockResolvedValue(mockResult);

      const result = await controller.wxLogin(code);

      expect(authService.wxLogin).toHaveBeenCalledWith(code);
      expect(result.token).toBeDefined();
      expect(result.userId).toBe(1);
    });

    it('should throw error when code is empty string', async () => {
      const code = '';

      expect(() => controller.wxLogin(code)).toThrow(BadRequestException);
    });

    it('should throw error when code is null', async () => {
      const code = null;

      expect(() => controller.wxLogin(code as any)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const code = 'valid_code_123';

      authService.wxLogin.mockRejectedValue(
        new BadRequestException('Invalid code'),
      );

      await expect(controller.wxLogin(code)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle special characters in code', async () => {
      const code = 'code_with_!@#$%^&*()';
      const mockResult = {
        token: 'jwt_token_xxx',
        userId: 1,
        openid: 'wx_openid_xxx',
      };

      authService.wxLogin.mockResolvedValue(mockResult);

      const result = await controller.wxLogin(code);

      expect(authService.wxLogin).toHaveBeenCalledWith(code);
      expect(result).toBeDefined();
    });
  });

  describe('chooseRole', () => {
    it('should successfully choose role', async () => {
      const userId = 1;
      const role = 'buyer';
      const mockResult = {
        userId,
        role,
        message: '角色选择成功',
      };

      authService.chooseRole.mockResolvedValue(mockResult);

      const result = await controller.chooseRole(userId, role);

      expect(authService.chooseRole).toHaveBeenCalledWith(userId, role);
      expect(result.role).toBe('buyer');
    });

    it('should throw error when role is empty string', async () => {
      const userId = 1;
      const role = '';

      expect(() => controller.chooseRole(userId, role)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error when role is null', async () => {
      const userId = 1;
      const role = null;

      expect(() => controller.chooseRole(userId, role as any)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const role = 'buyer';

      authService.chooseRole.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.chooseRole(userId as any, role)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const role = 'buyer';

      authService.chooseRole.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.chooseRole(userId, role)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle invalid role value', async () => {
      const userId = 1;
      const role = 'invalid_role';

      authService.chooseRole.mockRejectedValue(
        new BadRequestException('Invalid role'),
      );

      await expect(controller.chooseRole(userId, role)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const userId = 1;
      const mockProfile = {
        id: userId,
        openid: 'wx_openid_xxx',
        nickname: 'User Name',
        avatar: 'avatar_url',
        role: 'buyer',
      };

      authService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(userId);

      expect(authService.getProfile).toHaveBeenCalledWith(userId);
      expect(result.id).toBe(userId);
      expect(result.nickname).toBe('User Name');
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;

      authService.getProfile.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(controller.getProfile(userId as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when service fails', async () => {
      const userId = 1;

      authService.getProfile.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.getProfile(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle userId as 0', async () => {
      const userId = 0;

      authService.getProfile.mockRejectedValue(
        new BadRequestException('Invalid user id'),
      );

      await expect(controller.getProfile(userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should return logout message', async () => {
      const result = await controller.logout();

      expect(result.message).toBe('已退出');
    });
  });
});
