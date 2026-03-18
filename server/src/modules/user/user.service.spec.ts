/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ContactProfile } from '../../entities/contact-profile.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<any>;
  let entCertRepo: jest.Mocked<any>;
  let workerCertRepo: jest.Mocked<any>;
  let contactProfileRepo: jest.Mocked<any>;

  beforeEach(async () => {
    userRepo = {
      update: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    } as jest.Mocked<any>;

    entCertRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    workerCertRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    contactProfileRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<any>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: entCertRepo,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepo,
        },
        {
          provide: getRepositoryToken(ContactProfile),
          useValue: contactProfileRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('submitEnterpriseCert', () => {
    it('should create new enterprise certification', async () => {
      const userId = 1;
      const dto = {
        companyName: 'Test Company',
        businessLicense: 'license123',
        legalPerson: 'John Doe',
      };

      const newCert = {
        id: 1,
        userId,
        ...dto,
        status: 'pending',
      };

      entCertRepo.findOneBy.mockResolvedValue(null);
      entCertRepo.create.mockReturnValue(newCert);
      entCertRepo.save.mockResolvedValue(newCert);

      const result = await service.submitEnterpriseCert(userId, dto);

      expect(entCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(entCertRepo.create).toHaveBeenCalledWith({ ...dto, userId });
      expect(entCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should update existing enterprise certification', async () => {
      const userId = 1;
      const dto = {
        companyName: 'Updated Company',
        businessLicense: 'license456',
        legalPerson: 'Jane Doe',
      };

      const existingCert = {
        id: 1,
        userId,
        companyName: 'Old Company',
        businessLicense: 'license123',
        legalPerson: 'John Doe',
        status: 'rejected',
      };

      entCertRepo.findOneBy.mockResolvedValue(existingCert);
      entCertRepo.save.mockResolvedValue({
        ...existingCert,
        ...dto,
        status: 'pending',
      });

      const result = await service.submitEnterpriseCert(userId, dto);

      expect(entCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(entCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });

  describe('submitWorkerCert', () => {
    it('should create new worker certification', async () => {
      const userId = 1;
      const dto = {
        realName: 'Zhang San',
        idCard: '110101199003071234',
        phone: '13800138000',
      };

      const newCert = {
        id: 1,
        userId,
        ...dto,
        status: 'pending',
      };

      workerCertRepo.findOneBy.mockResolvedValue(null);
      workerCertRepo.create.mockReturnValue(newCert);
      workerCertRepo.save.mockResolvedValue(newCert);

      const result = await service.submitWorkerCert(userId, dto);

      expect(workerCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(workerCertRepo.create).toHaveBeenCalledWith({ ...dto, userId });
      expect(workerCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should update existing worker certification', async () => {
      const userId = 1;
      const dto = {
        realName: 'Li Si',
        idCard: '110101199103071234',
        phone: '13900139000',
      };

      const existingCert = {
        id: 1,
        userId,
        realName: 'Zhang San',
        idCard: '110101199003071234',
        phone: '13800138000',
        status: 'approved',
      };

      workerCertRepo.findOneBy.mockResolvedValue(existingCert);
      workerCertRepo.save.mockResolvedValue({
        ...existingCert,
        ...dto,
        status: 'pending',
      });

      const result = await service.submitWorkerCert(userId, dto);

      expect(workerCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(workerCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });

  describe('getCertStatus', () => {
    it('should return enterprise certification status when role is enterprise', async () => {
      const userId = 1;
      const cert = {
        id: 1,
        userId,
        companyName: 'Test Company',
        status: 'approved',
      };

      entCertRepo.findOneBy.mockResolvedValue(cert);

      const result = await service.getCertStatus(userId, 'enterprise');

      expect(entCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(result.status).toBe('approved');
      expect(result.cert).toEqual(cert);
    });

    it('should return none status when enterprise cert not found', async () => {
      const userId = 1;

      entCertRepo.findOneBy.mockResolvedValue(null);

      const result = await service.getCertStatus(userId, 'enterprise');

      expect(result.status).toBe('none');
      expect(result.cert).toBeNull();
    });

    it('should return worker certification status when role is worker', async () => {
      const userId = 1;
      const cert = {
        id: 1,
        userId,
        realName: 'Zhang San',
        status: 'pending',
      };

      workerCertRepo.findOneBy.mockResolvedValue(cert);

      const result = await service.getCertStatus(userId, 'worker');

      expect(workerCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(result.status).toBe('pending');
      expect(result.cert).toEqual(cert);
    });

    it('should return none status when worker cert not found', async () => {
      const userId = 1;

      workerCertRepo.findOneBy.mockResolvedValue(null);

      const result = await service.getCertStatus(userId, 'worker');

      expect(result.status).toBe('none');
      expect(result.cert).toBeNull();
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar successfully', async () => {
      const userId = 1;
      const avatarUrl = 'http://example.com/avatar.jpg';

      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateAvatar(userId, avatarUrl);

      expect(userRepo.update).toHaveBeenCalledWith(userId, { avatarUrl });
      expect(result).toEqual({ avatarUrl });
    });

    it('should handle avatar URL with special characters', async () => {
      const userId = 1;
      const avatarUrl = 'http://example.com/avatar-2024-01-01.jpg?size=large';

      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateAvatar(userId, avatarUrl);

      expect(result.avatarUrl).toBe(avatarUrl);
    });
  });

  describe('updateProfile', () => {
    it('should update nickname only', async () => {
      const userId = 1;
      const dto = { nickname: 'New Nickname' };

      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(userId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        nickname: 'New Nickname',
      });
      expect(result.nickname).toBe('New Nickname');
      expect(result.message).toBe('已更新');
    });

    it('should update phone only', async () => {
      const userId = 1;
      const dto = { phone: '13800138000' };

      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(userId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        phone: '13800138000',
      });
      expect(result.phone).toBe('13800138000');
      expect(result.message).toBe('已更新');
    });

    it('should update both nickname and phone', async () => {
      const userId = 1;
      const dto = { nickname: 'New Nickname', phone: '13800138000' };

      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(userId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        nickname: 'New Nickname',
        phone: '13800138000',
      });
      expect(result.nickname).toBe('New Nickname');
      expect(result.phone).toBe('13800138000');
    });

    it('should return no update message when no valid fields provided', async () => {
      const userId = 1;
      const dto = { invalidField: 'value' };

      const result = await service.updateProfile(userId, dto);

      expect(userRepo.update).not.toHaveBeenCalled();
      expect(result.message).toBe('无更新');
    });

    it('should ignore invalid fields and only update valid ones', async () => {
      const userId = 1;
      const dto = { nickname: 'New Nickname', invalidField: 'value' };

      userRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile(userId, dto);

      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        nickname: 'New Nickname',
      });
      expect(result.nickname).toBe('New Nickname');
    });
  });

  describe('getDefaultContactProfile', () => {
    it('should fallback to verifiedPhone when contact profile phone is empty', async () => {
      userRepo.findOneBy.mockResolvedValue({
        id: 7,
        nickname: '张三',
        verifiedPhone: '13800000000',
        phone: '15500000000',
      });
      contactProfileRepo.findOneBy.mockResolvedValue({
        userId: 7,
        contactName: '张三',
        phone: null,
        phoneVerified: 1,
        wechatId: 'zhangsan',
        wechatQrImage: 'https://cdn.test/qr.png',
      });

      const result = await service.getDefaultContactProfile(7);

      expect(contactProfileRepo.findOneBy).toHaveBeenCalledWith({ userId: 7, isDefault: 1 });
      expect(result.phone).toBe('13800000000');
      expect(result.phoneVerified).toBe(true);
      expect(result.wechatId).toBe('zhangsan');
      expect(result.wechatQrImage).toBe('https://cdn.test/qr.png');
    });

    it('should return empty defaults when user and profile are both missing', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      contactProfileRepo.findOneBy.mockResolvedValue(null);

      const result = await service.getDefaultContactProfile(7);

      expect(result).toEqual({
        contactName: '',
        phone: '',
        phoneVerified: false,
        wechatId: '',
        wechatQrImage: '',
      });
    });
  });

  describe('updateDefaultContactProfile', () => {
    it('should create a default contact profile when none exists', async () => {
      const payload = {
        contactName: '李四',
        phone: '13800138000',
        wechatId: 'lisi',
        wechatQrImage: 'https://cdn.test/lisi-qr.png',
      };
      const created = { userId: 9, isDefault: 1, status: 'active', phoneVerified: 0, ...payload };

      contactProfileRepo.findOneBy.mockResolvedValue(null);
      contactProfileRepo.create.mockReturnValue(created);
      contactProfileRepo.save.mockResolvedValue(created);

      const result = await service.updateDefaultContactProfile(9, payload);

      expect(contactProfileRepo.create).toHaveBeenCalledWith({
        userId: 9,
        isDefault: 1,
        status: 'active',
        phoneVerified: 0,
        ...payload,
      });
      expect(result.wechatId).toBe('lisi');
    });
  });
});
