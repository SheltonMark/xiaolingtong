/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { BadRequestException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    userService = {
      submitEnterpriseCert: jest.fn(),
      submitWorkerCert: jest.fn(),
      getCertStatus: jest.fn(),
      updateAvatar: jest.fn(),
      updateProfile: jest.fn(),
    } as jest.Mocked<UserService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('submitEnterpriseCert', () => {
    it('should successfully submit enterprise cert', async () => {
      const userId = 1;
      const dto = {
        companyName: 'Test Company',
        businessLicense: 'license_123',
        legalPerson: 'John Doe',
      };
      const mockResult = {
        id: 1,
        userId,
        type: 'enterprise',
        status: 'pending',
        companyName: 'Test Company',
        createdAt: new Date(),
      };

      userService.submitEnterpriseCert.mockResolvedValue(mockResult);

      const result = await controller.submitEnterpriseCert(userId, dto);

      expect(userService.submitEnterpriseCert).toHaveBeenCalledWith(userId, dto);
      expect(result.type).toBe('enterprise');
      expect(result.status).toBe('pending');
    });

    it('should throw error when companyName is missing', async () => {
      const userId = 1;
      const dto = {
        businessLicense: 'license_123',
        legalPerson: 'John Doe',
      };

      userService.submitEnterpriseCert.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.submitEnterpriseCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when businessLicense is missing', async () => {
      const userId = 1;
      const dto = {
        companyName: 'Test Company',
        legalPerson: 'John Doe',
      };

      userService.submitEnterpriseCert.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.submitEnterpriseCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const dto = {
        companyName: 'Test Company',
        businessLicense: 'license_123',
        legalPerson: 'John Doe',
      };

      userService.submitEnterpriseCert.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.submitEnterpriseCert(userId as any, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const dto = {
        companyName: 'Test Company',
        businessLicense: 'license_123',
        legalPerson: 'John Doe',
      };

      userService.submitEnterpriseCert.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(
        controller.submitEnterpriseCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty dto', async () => {
      const userId = 1;
      const dto = {};

      userService.submitEnterpriseCert.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.submitEnterpriseCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitWorkerCert', () => {
    it('should successfully submit worker cert', async () => {
      const userId = 1;
      const dto = {
        workerName: 'John Doe',
        idCard: 'id_123',
        skillType: 'carpenter',
      };
      const mockResult = {
        id: 1,
        userId,
        type: 'worker',
        status: 'pending',
        workerName: 'John Doe',
        createdAt: new Date(),
      };

      userService.submitWorkerCert.mockResolvedValue(mockResult);

      const result = await controller.submitWorkerCert(userId, dto);

      expect(userService.submitWorkerCert).toHaveBeenCalledWith(userId, dto);
      expect(result.type).toBe('worker');
      expect(result.status).toBe('pending');
    });

    it('should throw error when workerName is missing', async () => {
      const userId = 1;
      const dto = {
        idCard: 'id_123',
        skillType: 'carpenter',
      };

      userService.submitWorkerCert.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.submitWorkerCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when idCard is missing', async () => {
      const userId = 1;
      const dto = {
        workerName: 'John Doe',
        skillType: 'carpenter',
      };

      userService.submitWorkerCert.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.submitWorkerCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const dto = {
        workerName: 'John Doe',
        idCard: 'id_123',
        skillType: 'carpenter',
      };

      userService.submitWorkerCert.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.submitWorkerCert(userId as any, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const dto = {
        workerName: 'John Doe',
        idCard: 'id_123',
        skillType: 'carpenter',
      };

      userService.submitWorkerCert.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(
        controller.submitWorkerCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty dto', async () => {
      const userId = 1;
      const dto = {};

      userService.submitWorkerCert.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.submitWorkerCert(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCertStatus', () => {
    it('should return cert status', async () => {
      const userId = 1;
      const role = 'buyer';
      const mockResult = {
        enterpriseCert: { status: 'approved' },
        workerCert: { status: 'pending' },
      };

      userService.getCertStatus.mockResolvedValue(mockResult);

      const result = await controller.getCertStatus(userId, role);

      expect(userService.getCertStatus).toHaveBeenCalledWith(userId, role);
      expect(result.enterpriseCert.status).toBe('approved');
      expect(result.workerCert.status).toBe('pending');
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const role = 'buyer';

      userService.getCertStatus.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.getCertStatus(userId as any, role),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const role = 'buyer';

      userService.getCertStatus.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.getCertStatus(userId, role)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle invalid role', async () => {
      const userId = 1;
      const role = 'invalid_role';

      userService.getCertStatus.mockRejectedValue(
        new BadRequestException('Invalid role'),
      );

      await expect(controller.getCertStatus(userId, role)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateAvatar', () => {
    it('should successfully update avatar', async () => {
      const userId = 1;
      const avatarUrl = 'https://example.com/avatar.jpg';
      const mockResult = {
        id: userId,
        avatar: avatarUrl,
        message: '头像更新成功',
      };

      userService.updateAvatar.mockResolvedValue(mockResult);

      const result = await controller.updateAvatar(userId, avatarUrl);

      expect(userService.updateAvatar).toHaveBeenCalledWith(userId, avatarUrl);
      expect(result.avatar).toBe(avatarUrl);
    });

    it('should throw error when avatarUrl is empty string', async () => {
      const userId = 1;
      const avatarUrl = '';

      userService.updateAvatar.mockRejectedValue(
        new BadRequestException('Avatar URL cannot be empty'),
      );

      await expect(
        controller.updateAvatar(userId, avatarUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when avatarUrl is null', async () => {
      const userId = 1;
      const avatarUrl = null;

      userService.updateAvatar.mockRejectedValue(
        new BadRequestException('Avatar URL cannot be empty'),
      );

      await expect(
        controller.updateAvatar(userId, avatarUrl as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const avatarUrl = 'https://example.com/avatar.jpg';

      userService.updateAvatar.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.updateAvatar(userId as any, avatarUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const avatarUrl = 'https://example.com/avatar.jpg';

      userService.updateAvatar.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(
        controller.updateAvatar(userId, avatarUrl),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle special characters in URL', async () => {
      const userId = 1;
      const avatarUrl = 'https://example.com/avatar_!@#$.jpg';
      const mockResult = {
        id: userId,
        avatar: avatarUrl,
        message: '头像更新成功',
      };

      userService.updateAvatar.mockResolvedValue(mockResult);

      const result = await controller.updateAvatar(userId, avatarUrl);

      expect(result.avatar).toBe(avatarUrl);
    });
  });

  describe('updateProfile', () => {
    it('should successfully update profile', async () => {
      const userId = 1;
      const dto = {
        nickname: 'New Name',
        bio: 'My bio',
      };
      const mockResult = {
        id: userId,
        nickname: 'New Name',
        bio: 'My bio',
        message: '个人资料更新成功',
      };

      userService.updateProfile.mockResolvedValue(mockResult);

      const result = await controller.updateProfile(userId, dto);

      expect(userService.updateProfile).toHaveBeenCalledWith(userId, dto);
      expect(result.nickname).toBe('New Name');
    });

    it('should throw error when nickname is missing', async () => {
      const userId = 1;
      const dto = {
        bio: 'My bio',
      };

      userService.updateProfile.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.updateProfile(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when nickname is invalid type', async () => {
      const userId = 1;
      const dto = {
        nickname: 123,
        bio: 'My bio',
      };

      userService.updateProfile.mockRejectedValue(
        new BadRequestException('Invalid field type'),
      );

      await expect(
        controller.updateProfile(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not authenticated', async () => {
      const userId = undefined;
      const dto = {
        nickname: 'New Name',
        bio: 'My bio',
      };

      userService.updateProfile.mockRejectedValue(
        new BadRequestException('User not authenticated'),
      );

      await expect(
        controller.updateProfile(userId as any, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when service fails', async () => {
      const userId = 1;
      const dto = {
        nickname: 'New Name',
        bio: 'My bio',
      };

      userService.updateProfile.mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(
        controller.updateProfile(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty dto', async () => {
      const userId = 1;
      const dto = {};

      userService.updateProfile.mockRejectedValue(
        new BadRequestException('Missing required fields'),
      );

      await expect(
        controller.updateProfile(userId, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
