/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ContactProfile } from '../../entities/contact-profile.entity';
import { VerificationSession } from '../../entities/verification-session.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<any>;
  let entCertRepo: jest.Mocked<any>;
  let workerCertRepo: jest.Mocked<any>;
  let contactProfileRepo: jest.Mocked<any>;
  let verificationSessionRepo: jest.Mocked<any>;
  let configService: jest.Mocked<any>;
  let configValues: Record<string, any>;

  beforeEach(async () => {
    configValues = {
      NODE_ENV: 'test',
      TENCENT_CERT_SMS_ENABLED: '1',
      TENCENT_SMS_MOCK: '1',
      TENCENT_OCR_MOCK: '0',
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: any) =>
        Object.prototype.hasOwnProperty.call(configValues, key) ? configValues[key] : defaultValue,
      ),
    } as jest.Mocked<any>;

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

    verificationSessionRepo = {
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
          provide: ConfigService,
          useValue: configService,
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
        {
          provide: getRepositoryToken(VerificationSession),
          useValue: verificationSessionRepo,
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
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        legalPerson: 'John Doe',
        contactName: 'John Doe',
        verificationToken: 'token-enterprise-1',
      };
      const session = {
        userId,
        scene: 'enterprise_cert',
        phone: '13800000000',
        verificationToken: 'token-enterprise-1',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const newCert = {
        id: 1,
        userId,
        companyName: 'Test Company',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        legalPerson: 'John Doe',
        contactName: 'John Doe',
        contactPhone: '13800000000',
        status: 'pending',
      };

      userRepo.update.mockResolvedValue({ affected: 1 });
      verificationSessionRepo.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepo.save.mockResolvedValue({ ...session, verificationToken: null });
      entCertRepo.findOneBy.mockResolvedValue(null);
      entCertRepo.create.mockImplementation((payload) => payload);
      entCertRepo.save.mockResolvedValue(newCert);

      const result = await service.submitEnterpriseCert(userId, dto);

      expect(verificationSessionRepo.findOneBy).toHaveBeenCalledWith({
        userId,
        scene: 'enterprise_cert',
        verificationToken: 'token-enterprise-1',
      });
      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        verifiedPhone: '13800000000',
        phone: '13800000000',
      });
      expect(entCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(entCertRepo.create).toHaveBeenCalledWith({
        userId,
        companyName: 'Test Company',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        legalPerson: 'John Doe',
        legalIdNo: undefined,
        legalIdFront: undefined,
        legalIdBack: undefined,
        contactName: 'John Doe',
        contactPhone: '13800000000',
        category: undefined,
        industry: undefined,
        address: undefined,
        status: 'pending',
      });
      expect(entCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should update existing enterprise certification', async () => {
      const userId = 1;
      const dto = {
        companyName: 'Updated Company',
        creditCode: '91310000987654321X',
        licenseImage: 'https://cdn.test/license-2.png',
        legalPerson: 'Jane Doe',
        contactName: 'Jane Doe',
        verificationToken: 'token-enterprise-2',
      };
      const session = {
        userId,
        scene: 'enterprise_cert',
        phone: '13900000000',
        verificationToken: 'token-enterprise-2',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const existingCert = {
        id: 1,
        userId,
        companyName: 'Old Company',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license-old.png',
        legalPerson: 'John Doe',
        contactPhone: '13800000000',
        status: 'rejected',
      };

      userRepo.update.mockResolvedValue({ affected: 1 });
      verificationSessionRepo.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepo.save.mockResolvedValue({ ...session, verificationToken: null });
      entCertRepo.findOneBy.mockResolvedValue(existingCert);
      entCertRepo.save.mockResolvedValue({
        ...existingCert,
        companyName: 'Updated Company',
        creditCode: '91310000987654321X',
        licenseImage: 'https://cdn.test/license-2.png',
        legalPerson: 'Jane Doe',
        contactName: 'Jane Doe',
        contactPhone: '13900000000',
        status: 'pending',
      });

      const result = await service.submitEnterpriseCert(userId, dto);

      expect(entCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        verifiedPhone: '13900000000',
        phone: '13900000000',
      });
      expect(entCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should allow enterprise certification without verification token when cert sms is disabled', async () => {
      configValues.TENCENT_CERT_SMS_ENABLED = '0';

      userRepo.update.mockResolvedValue({ affected: 1 });
      entCertRepo.findOneBy.mockResolvedValue(null);
      entCertRepo.create.mockImplementation((payload) => payload);
      entCertRepo.save.mockResolvedValue({ id: 2, userId: 1, status: 'pending' });

      const result = await service.submitEnterpriseCert(1, {
        companyName: 'Test Company',
        creditCode: '91310000123456789A',
        licenseImage: 'https://cdn.test/license.png',
        contactName: 'Alice',
        contactPhone: '13800000000',
      });

      expect(verificationSessionRepo.findOneBy).not.toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledWith(1, {
        phone: '13800000000',
      });
      expect(entCertRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        contactPhone: '13800000000',
      }));
      expect(result.status).toBe('pending');
    });

    it('should reject enterprise certification when verification token is missing', async () => {
      await expect(
        service.submitEnterpriseCert(1, {
          companyName: 'Test Company',
          creditCode: '91310000123456789A',
        }),
      ).rejects.toThrow('请先完成短信验证');
    });
  });

  describe('submitWorkerCert', () => {
    it('should create new worker certification', async () => {
      const userId = 1;
      const dto = {
        realName: 'Zhang San',
        idCard: '110101199003071234',
        idFrontImage: 'https://cdn.test/front.png',
        idBackImage: 'https://cdn.test/back.png',
        skills: ['装配工'],
        phone: '13800138000',
        verificationToken: 'token-worker-1',
      };
      const session = {
        userId,
        scene: 'worker_cert',
        phone: '13800138000',
        verificationToken: 'token-worker-1',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const newCert = {
        id: 1,
        userId,
        realName: 'Zhang San',
        idNo: '110101199003071234',
        idFrontImage: 'https://cdn.test/front.png',
        idBackImage: 'https://cdn.test/back.png',
        skills: ['装配工'],
        status: 'pending',
      };

      userRepo.update.mockResolvedValue({ affected: 1 });
      verificationSessionRepo.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepo.save.mockResolvedValue({ ...session, verificationToken: null });
      workerCertRepo.findOneBy.mockResolvedValue(null);
      workerCertRepo.create.mockImplementation((payload) => payload);
      workerCertRepo.save.mockResolvedValue(newCert);

      const result = await service.submitWorkerCert(userId, dto);

      expect(verificationSessionRepo.findOneBy).toHaveBeenCalledWith({
        userId,
        scene: 'worker_cert',
        verificationToken: 'token-worker-1',
      });
      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        verifiedPhone: '13800138000',
        phone: '13800138000',
      });
      expect(workerCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(workerCertRepo.create).toHaveBeenCalledWith({
        userId,
        realName: 'Zhang San',
        idNo: '110101199003071234',
        idFrontImage: 'https://cdn.test/front.png',
        idBackImage: 'https://cdn.test/back.png',
        skills: ['装配工'],
        status: 'pending',
      });
      expect(workerCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should update existing worker certification', async () => {
      const userId = 1;
      const dto = {
        realName: 'Li Si',
        idCard: '110101199103071234',
        idFrontImage: 'https://cdn.test/front-2.png',
        idBackImage: 'https://cdn.test/back-2.png',
        skills: ['缝纫工'],
        phone: '13900139000',
        verificationToken: 'token-worker-2',
      };
      const session = {
        userId,
        scene: 'worker_cert',
        phone: '13900139000',
        verificationToken: 'token-worker-2',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const existingCert = {
        id: 1,
        userId,
        realName: 'Zhang San',
        idNo: '110101199003071234',
        status: 'approved',
      };

      userRepo.update.mockResolvedValue({ affected: 1 });
      verificationSessionRepo.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepo.save.mockResolvedValue({ ...session, verificationToken: null });
      workerCertRepo.findOneBy.mockResolvedValue(existingCert);
      workerCertRepo.save.mockResolvedValue({
        ...existingCert,
        realName: 'Li Si',
        idNo: '110101199103071234',
        idFrontImage: 'https://cdn.test/front-2.png',
        idBackImage: 'https://cdn.test/back-2.png',
        skills: ['缝纫工'],
        status: 'pending',
      });

      const result = await service.submitWorkerCert(userId, dto);

      expect(workerCertRepo.findOneBy).toHaveBeenCalledWith({ userId });
      expect(userRepo.update).toHaveBeenCalledWith(userId, {
        verifiedPhone: '13900139000',
        phone: '13900139000',
      });
      expect(workerCertRepo.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should use the verified session phone instead of trusting dto.phone', async () => {
      const session = {
        userId: 7,
        scene: 'worker_cert',
        phone: '13800000000',
        verificationToken: 'token-1',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      verificationSessionRepo.findOneBy.mockResolvedValueOnce(session);
      verificationSessionRepo.save.mockResolvedValue({ ...session, verificationToken: null });
      userRepo.update.mockResolvedValue({ affected: 1 });
      workerCertRepo.findOneBy.mockResolvedValue(null);
      workerCertRepo.create.mockImplementation((payload) => payload);
      workerCertRepo.save.mockResolvedValue({ id: 1, userId: 7, status: 'pending' });

      await service.submitWorkerCert(7, {
        realName: '张三',
        idNo: '110101199001010011',
        phone: '15555555555',
        idFrontImage: 'front',
        idBackImage: 'back',
        verificationToken: 'token-1',
      });

      expect(userRepo.update).toHaveBeenCalledWith(7, {
        verifiedPhone: '13800000000',
        phone: '13800000000',
      });
    });

    it('should allow worker certification without verification token when cert sms is disabled', async () => {
      configValues.TENCENT_CERT_SMS_ENABLED = '0';

      userRepo.update.mockResolvedValue({ affected: 1 });
      workerCertRepo.findOneBy.mockResolvedValue(null);
      workerCertRepo.create.mockImplementation((payload) => payload);
      workerCertRepo.save.mockResolvedValue({ id: 2, userId: 1, status: 'pending' });

      const result = await service.submitWorkerCert(1, {
        realName: 'Zhang San',
        idNo: '110101199003071234',
        idFrontImage: 'https://cdn.test/front.png',
        idBackImage: 'https://cdn.test/back.png',
        skills: ['装配工'],
        phone: '13800138000',
      });

      expect(verificationSessionRepo.findOneBy).not.toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledWith(1, {
        phone: '13800138000',
      });
      expect(workerCertRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        realName: 'Zhang San',
      }));
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

  describe('cert sms verification helpers', () => {
    it('should reject sending a cert sms code when cert sms is disabled', async () => {
      configValues.TENCENT_CERT_SMS_ENABLED = '0';

      await expect(service.sendCertSmsCode(7, {
        phone: '13800000000',
        scene: 'worker_cert',
      })).rejects.toThrow('当前版本暂未开放短信验证');
    });

    it('should reject checking a cert sms code when cert sms is disabled', async () => {
      configValues.TENCENT_CERT_SMS_ENABLED = '0';

      await expect(service.checkCertSmsCode(7, {
        sessionId: 9,
        code: '246810',
      })).rejects.toThrow('当前版本暂未开放短信验证');
    });

    it('should create a verification session and mask the phone when sending a cert sms code', async () => {
      verificationSessionRepo.create.mockImplementation((payload) => ({ id: 9, ...payload }));
      verificationSessionRepo.save.mockImplementation(async (payload) => payload);

      const result = await service.sendCertSmsCode(7, {
        phone: '13800000000',
        scene: 'worker_cert',
      });

      expect(verificationSessionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 7,
        phone: '13800000000',
        scene: 'worker_cert',
      }));
      expect(result.maskedPhone).toBe('138****0000');
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.sessionId).toBe(9);
      expect(result.channel).toBe('mock');
    });

    it('should return a verification token when the sms code is correct', async () => {
      verificationSessionRepo.findOneBy.mockResolvedValue({
        id: 9,
        userId: 7,
        phone: '13800000000',
        smsCodeHash: (service as any).hashCode('246810'),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      verificationSessionRepo.save.mockImplementation(async (payload) => payload);

      const result = await service.checkCertSmsCode(7, {
        sessionId: 9,
        code: '246810',
      });

      expect(result.verified).toBe(true);
      expect(result.verificationToken).toBeTruthy();
      expect(verificationSessionRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 9,
        verificationToken: expect.any(String),
      }));
    });

    it('should call Tencent Cloud SMS when credentials and template config are provided', async () => {
      configValues.TENCENT_SMS_MOCK = '0';
      configValues.TENCENT_CLOUD_SECRET_ID = 'secret-id';
      configValues.TENCENT_CLOUD_SECRET_KEY = 'secret-key';
      configValues.TENCENT_SMS_SDK_APP_ID = 'sms-app-id';
      configValues.TENCENT_SMS_SIGN_NAME = '测试签名';
      configValues.TENCENT_SMS_CERT_TEMPLATE_ID = 'template-id';

      verificationSessionRepo.create.mockImplementation((payload) => ({ id: 10, ...payload }));
      verificationSessionRepo.save.mockImplementation(async (payload) => payload);

      const cloudSpy = jest.spyOn(service as any, 'callTencentCloudApi').mockResolvedValue({
        SendStatusSet: [{ Code: 'Ok', Message: 'send success' }],
        RequestId: 'req-1',
      });

      const result = await service.sendCertSmsCode(8, {
        phone: '13900000000',
        scene: 'enterprise_cert',
      });

      expect(cloudSpy).toHaveBeenCalledWith(expect.objectContaining({
        service: 'sms',
        action: 'SendSms',
      }), '短信发送失败');
      expect(result.channel).toBe('tencent');
    });
  });

  describe('cert ocr helpers', () => {
    it('should map Tencent business license OCR fields when cloud OCR is configured', async () => {
      configValues.TENCENT_OCR_MOCK = '0';
      configValues.TENCENT_CLOUD_SECRET_ID = 'secret-id';
      configValues.TENCENT_CLOUD_SECRET_KEY = 'secret-key';

      const cloudSpy = jest.spyOn(service as any, 'callTencentCloudApi').mockResolvedValue({
        Name: '测试公司',
        RegNum: '91310000123456789A',
        LegalRepresentative: '张三',
        Address: '上海市浦东新区',
      });

      const result = await service.ocrBusinessLicense(7, {
        imageUrl: 'https://cdn.test/license.png',
      });

      expect(cloudSpy).toHaveBeenCalledWith(expect.objectContaining({
        service: 'ocr',
        action: 'BizLicenseOCR',
      }), 'OCR 识别失败');
      expect(result.recognized).toBe(true);
      expect(result.fields).toEqual(expect.objectContaining({
        companyName: '测试公司',
        creditCode: '91310000123456789A',
        legalPerson: '张三',
      }));
      expect(result.raw.source).toBe('tencent');
    });
  });
});
