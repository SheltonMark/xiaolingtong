import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { createHash, createHmac, randomInt, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { ContactProfile } from '../../entities/contact-profile.entity';
import { VerificationSession } from '../../entities/verification-session.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';

type CertScene = 'enterprise_cert' | 'worker_cert';

type TencentCloudRequest = {
  service: 'ocr' | 'sms';
  action: string;
  version: string;
  region?: string;
  payload: Record<string, any>;
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly certSmsExpireMinutes = 5;

  constructor(
    private config: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert) private workerCertRepo: Repository<WorkerCert>,
    @InjectRepository(ContactProfile) private contactProfileRepo: Repository<ContactProfile>,
    @InjectRepository(VerificationSession) private verificationSessionRepo: Repository<VerificationSession>,
    private wechatSecurityService: WechatSecurityService,
  ) {}

  private normalizeText(value: any) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private isTruthy(value: any) {
    const normalized = this.normalizeText(value).toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  private isProduction() {
    return this.normalizeText(this.config.get('NODE_ENV')) === 'production';
  }

  private isCertSmsVerificationEnabled() {
    return this.isTruthy(this.getConfigValue('TENCENT_CERT_SMS_ENABLED', '0'));
  }

  private getConfigValue(key: string, defaultValue = '') {
    return this.normalizeText(this.config.get(key, defaultValue));
  }

  hashCode(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hmacSha256(key: Buffer | string, value: string) {
    return createHmac('sha256', key).update(value).digest();
  }

  private generateSmsCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private maskPhone(phone: string) {
    if (phone.length < 7) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }

  private ensureCertPhone(phone: string) {
    const normalizedPhone = this.normalizeText(phone);
    if (!/^1\d{10}$/.test(normalizedPhone)) {
      throw new BadRequestException('请输入正确的手机号');
    }
    return normalizedPhone;
  }

  private normalizeOcrFieldMap(source: Record<string, any>, fieldMap: Record<string, string[]>) {
    const fields: Record<string, string> = {};
    Object.keys(fieldMap).forEach((targetKey) => {
      const matchedKey = fieldMap[targetKey].find((key) => this.normalizeText(source[key]));
      if (matchedKey) fields[targetKey] = this.normalizeText(source[matchedKey]);
    });
    return fields;
  }

  private buildOcrResultFromSource(
    imageUrl: string,
    source: Record<string, any>,
    fieldMap: Record<string, string[]>,
    sourceLabel: string,
  ) {
    const fields = this.normalizeOcrFieldMap(source, fieldMap);
    return {
      recognized: Object.keys(fields).length > 0,
      fields,
      raw: {
        imageUrl,
        source: sourceLabel,
        response: source,
      },
    };
  }

  private buildMockOcrResult(dto: any, fieldMap: Record<string, string[]>) {
    const imageUrl = this.normalizeText(dto?.imageUrl);
    const source = dto?.mockFields || dto?.fields || {};
    const sourceLabel = Object.keys(source).length > 0 ? 'mock' : 'unconfigured';
    return this.buildOcrResultFromSource(imageUrl, source, fieldMap, sourceLabel);
  }

  private getTencentCloudCredentials() {
    return {
      secretId: this.getConfigValue('TENCENT_CLOUD_SECRET_ID'),
      secretKey: this.getConfigValue('TENCENT_CLOUD_SECRET_KEY'),
    };
  }

  private hasTencentCloudCredentials() {
    const credentials = this.getTencentCloudCredentials();
    return !!(credentials.secretId && credentials.secretKey);
  }

  private resolveSmsTemplateId(scene: CertScene) {
    if (scene === 'enterprise_cert') {
      return (
        this.getConfigValue('TENCENT_SMS_ENTERPRISE_CERT_TEMPLATE_ID') ||
        this.getConfigValue('TENCENT_SMS_CERT_TEMPLATE_ID')
      );
    }
    return (
      this.getConfigValue('TENCENT_SMS_WORKER_CERT_TEMPLATE_ID') ||
      this.getConfigValue('TENCENT_SMS_CERT_TEMPLATE_ID')
    );
  }

  private buildTencentCloudAuthorization(
    service: string,
    host: string,
    action: string,
    payloadText: string,
    timestamp: number,
  ) {
    const { secretId, secretKey } = this.getTencentCloudCredentials();
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const hashedPayload = this.hashCode(payloadText);
    const canonicalHeaders = [
      'content-type:application/json; charset=utf-8',
      `host:${host}`,
      `x-tc-action:${action.toLowerCase()}`,
      '',
    ].join('\n');
    const signedHeaders = 'content-type;host;x-tc-action';
    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      signedHeaders,
      hashedPayload,
    ].join('\n');
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = [
      'TC3-HMAC-SHA256',
      String(timestamp),
      credentialScope,
      this.hashCode(canonicalRequest),
    ].join('\n');
    const secretDate = this.hmacSha256(`TC3${secretKey}`, date);
    const secretService = this.hmacSha256(secretDate, service);
    const secretSigning = this.hmacSha256(secretService, 'tc3_request');
    const signature = createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    return `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  private async callTencentCloudApi(request: TencentCloudRequest, fallbackMessage: string) {
    const { secretId, secretKey } = this.getTencentCloudCredentials();
    if (!secretId || !secretKey) {
      throw new BadRequestException('腾讯云 SecretId / SecretKey 未配置');
    }

    const host = `${request.service}.tencentcloudapi.com`;
    const payloadText = JSON.stringify(request.payload || {});
    const timestamp = Math.floor(Date.now() / 1000);
    const headers: Record<string, string> = {
      Authorization: this.buildTencentCloudAuthorization(
        request.service,
        host,
        request.action,
        payloadText,
        timestamp,
      ),
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-TC-Action': request.action,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': request.version,
      'X-TC-Language': 'zh-CN',
    };

    if (request.region) headers['X-TC-Region'] = request.region;

    try {
      const response = await axios.post(`https://${host}`, payloadText, {
        headers,
        timeout: 15_000,
      });
      const result = response.data?.Response || {};
      if (result.Error?.Message) {
        throw new BadRequestException(this.normalizeText(result.Error.Message) || fallbackMessage);
      }
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;

      const apiMessage = this.normalizeText(error?.response?.data?.Response?.Error?.Message);
      const message = apiMessage || this.normalizeText(error?.message) || fallbackMessage;
      this.logger.error(`Tencent Cloud ${request.service}.${request.action} failed: ${message}`);
      throw new BadRequestException(message);
    }
  }

  private async sendTencentSms(scene: CertScene, phone: string, code: string) {
    const appId = this.getConfigValue('TENCENT_SMS_SDK_APP_ID');
    const signName = this.getConfigValue('TENCENT_SMS_SIGN_NAME');
    const templateId = this.resolveSmsTemplateId(scene);
    const forceMock = this.isTruthy(this.getConfigValue('TENCENT_SMS_MOCK'));
    const smsConfigured =
      this.hasTencentCloudCredentials() &&
      !!(appId && signName && templateId);

    if (forceMock || !smsConfigured) {
      if (this.isProduction()) {
        throw new BadRequestException(
          '腾讯云短信未配置，请补充 SecretId、SecretKey、SmsSdkAppId、SignName 和 TemplateId',
        );
      }

      this.logger.warn(
        'Tencent SMS is not fully configured; certification SMS is using local debug mode.',
      );
      return { channel: 'mock' };
    }

    const response = await this.callTencentCloudApi(
      {
        service: 'sms',
        action: 'SendSms',
        version: '2021-01-11',
        region: this.getConfigValue('TENCENT_SMS_REGION', 'ap-guangzhou') || 'ap-guangzhou',
        payload: {
          PhoneNumberSet: [`+86${phone}`],
          SmsSdkAppId: appId,
          SignName: signName,
          TemplateId: templateId,
          TemplateParamSet: [code, String(this.certSmsExpireMinutes)],
          SessionContext: scene,
        },
      },
      '短信发送失败',
    );

    const sendStatus = Array.isArray(response.SendStatusSet) ? response.SendStatusSet[0] : null;
    if (!sendStatus) {
      throw new BadRequestException('腾讯云短信返回异常，请检查短信模板配置');
    }
    if (this.normalizeText(sendStatus.Code) !== 'Ok') {
      throw new BadRequestException(this.normalizeText(sendStatus.Message) || '短信发送失败');
    }

    return {
      channel: 'tencent',
      requestId: this.normalizeText(response.RequestId),
    };
  }

  private async runOcr(
    dto: any,
    action: string,
    fieldMap: Record<string, string[]>,
    emptyImageMessage: string,
    payloadBuilder: (imageUrl: string) => Record<string, any>,
  ) {
    if (dto?.mockFields || dto?.fields) {
      return this.buildMockOcrResult(dto, fieldMap);
    }

    const imageUrl = this.normalizeText(dto?.imageUrl);
    if (!imageUrl) throw new BadRequestException(emptyImageMessage);

    const forceMock = this.isTruthy(this.getConfigValue('TENCENT_OCR_MOCK'));
    if (forceMock || !this.hasTencentCloudCredentials()) {
      if (this.isProduction()) {
        throw new BadRequestException('腾讯云 OCR 未配置，请补充 SecretId / SecretKey');
      }
      return this.buildMockOcrResult({ imageUrl }, fieldMap);
    }

    const response = await this.callTencentCloudApi(
      {
        service: 'ocr',
        action,
        version: '2018-11-19',
        region: this.getConfigValue('TENCENT_OCR_REGION', 'ap-beijing') || 'ap-beijing',
        payload: payloadBuilder(imageUrl),
      },
      'OCR 识别失败',
    );

    return this.buildOcrResultFromSource(imageUrl, response, fieldMap, 'tencent');
  }

  private async consumeVerifiedSession(
    userId: number,
    scene: CertScene,
    verificationToken: string,
  ) {
    const token = this.normalizeText(verificationToken);
    if (!token) throw new BadRequestException('请先完成短信验证');

    const session = await this.verificationSessionRepo.findOneBy({
      userId,
      scene,
      verificationToken: token,
    });

    if (!session || !session.verifiedAt || session.expiresAt < new Date()) {
      throw new BadRequestException('请先完成短信验证');
    }

    session.verificationToken = null;
    await this.verificationSessionRepo.save(session);
    return session;
  }

  private async resolveCertificationPhone(
    userId: number,
    scene: CertScene,
    verificationToken: string,
    fallbackPhone: string,
  ) {
    if (this.isCertSmsVerificationEnabled()) {
      const session = await this.consumeVerifiedSession(userId, scene, verificationToken);
      return {
        phone: session.phone,
        verified: true,
      };
    }

    return {
      phone: this.ensureCertPhone(fallbackPhone),
      verified: false,
    };
  }

  private buildEnterpriseCertPayload(userId: number, dto: any, phone: string) {
    return {
      userId,
      companyName: this.normalizeText(dto.companyName),
      creditCode: this.normalizeText(dto.creditCode),
      licenseImage: this.normalizeText(dto.licenseImage || dto.businessLicense),
      legalPerson: this.normalizeText(dto.legalPerson) || undefined,
      legalIdNo: this.normalizeText(dto.legalIdNo) || undefined,
      legalIdFront: this.normalizeText(dto.legalIdFront) || undefined,
      legalIdBack: this.normalizeText(dto.legalIdBack) || undefined,
      contactName: this.normalizeText(dto.contactName) || undefined,
      contactPhone: phone,
      category: this.normalizeText(dto.category) || undefined,
      industry: this.normalizeText(dto.industry || dto.companyType) || undefined,
      address: this.normalizeText(dto.address) || undefined,
      status: 'pending' as const,
    };
  }

  private buildWorkerCertPayload(userId: number, dto: any) {
    return {
      userId,
      realName: this.normalizeText(dto.realName || dto.name),
      idNo: this.normalizeText(dto.idNo || dto.idCard || dto.idNumber),
      idValidity: this.normalizeText(dto.idValidity || dto.validDate || dto.idCardValidity) || undefined,
      idFrontImage: this.normalizeText(dto.idFrontImage || dto.frontImage),
      idBackImage: this.normalizeText(dto.idBackImage || dto.backImage),
      skills: Array.isArray(dto.skills) ? dto.skills : [],
      status: 'pending' as const,
    };
  }

  async submitEnterpriseCert(userId: number, dto: any) {
    const { phone, verified } = await this.resolveCertificationPhone(
      userId,
      'enterprise_cert',
      dto.verificationToken,
      dto.contactPhone || dto.phone,
    );
    const payload = this.buildEnterpriseCertPayload(userId, dto, phone);

    const userUpdatePayload: Record<string, string> = { phone };
    if (verified) userUpdatePayload.verifiedPhone = phone;
    await this.userRepo.update(userId, userUpdatePayload);

    const existing = await this.entCertRepo.findOneBy({ userId });
    if (existing) {
      Object.assign(existing, payload);
      return this.entCertRepo.save(existing);
    }
    return this.entCertRepo.save(this.entCertRepo.create(payload));
  }

  async submitWorkerCert(userId: number, dto: any) {
    const { phone, verified } = await this.resolveCertificationPhone(
      userId,
      'worker_cert',
      dto.verificationToken,
      dto.phone,
    );
    const payload = this.buildWorkerCertPayload(userId, dto);

    const userUpdatePayload: Record<string, string> = { phone };
    if (verified) userUpdatePayload.verifiedPhone = phone;
    await this.userRepo.update(userId, userUpdatePayload);

    const existing = await this.workerCertRepo.findOneBy({ userId });
    if (existing) {
      Object.assign(existing, payload);
      return this.workerCertRepo.save(existing);
    }
    return this.workerCertRepo.save(this.workerCertRepo.create(payload));
  }

  async sendCertSmsCode(userId: number, dto: any) {
    if (!this.isCertSmsVerificationEnabled()) {
      throw new BadRequestException('当前版本暂未开放短信验证');
    }

    const phone = this.normalizeText(dto.phone);
    const scene = this.normalizeText(dto.scene) as CertScene;

    if (!/^1\d{10}$/.test(phone)) throw new BadRequestException('请输入正确的手机号');
    if (!['enterprise_cert', 'worker_cert'].includes(scene)) {
      throw new BadRequestException('不支持的验证场景');
    }

    const code = this.generateSmsCode();
    const sendResult = await this.sendTencentSms(scene, phone, code);
    const session = this.verificationSessionRepo.create({
      userId,
      scene,
      phone,
      smsCodeHash: this.hashCode(code),
      verificationToken: null,
      verifiedAt: null,
      ocrPayload: null,
      expiresAt: new Date(Date.now() + this.certSmsExpireMinutes * 60 * 1000),
    });
    const saved = await this.verificationSessionRepo.save(session);

    return {
      sessionId: saved.id,
      maskedPhone: this.maskPhone(phone),
      expiresIn: this.certSmsExpireMinutes * 60,
      channel: sendResult.channel,
      // Only expose the debug code outside production so front-end flow can continue
      // before Tencent Cloud SMS credentials and template approvals are ready.
      ...(this.isProduction() ? {} : { debugCode: code }),
    };
  }

  async checkCertSmsCode(userId: number, dto: any) {
    if (!this.isCertSmsVerificationEnabled()) {
      throw new BadRequestException('当前版本暂未开放短信验证');
    }

    const sessionId = Number(dto.sessionId) || 0;
    const code = this.normalizeText(dto.code);
    const session = await this.verificationSessionRepo.findOneBy({ id: sessionId, userId });

    if (!session) throw new BadRequestException('验证码会话不存在');
    if (session.expiresAt < new Date()) throw new BadRequestException('验证码已过期');
    if (!code || session.smsCodeHash !== this.hashCode(code)) {
      throw new BadRequestException('验证码错误');
    }

    session.verifiedAt = new Date();
    session.verificationToken = randomUUID();
    await this.verificationSessionRepo.save(session);

    return {
      verified: true,
      verificationToken: session.verificationToken,
    };
  }

  async ocrBusinessLicense(_userId: number, dto: any) {
    return this.runOcr(
      dto,
      'BizLicenseOCR',
      {
        companyName: ['Name', 'companyName', 'fullName'],
        fullName: ['Name', 'fullName', 'companyName'],
        creditCode: ['RegNum', 'creditCode', 'taxpayerId', 'UnifiedSocialCreditCode'],
        legalPerson: ['LegalRepresentative', 'Person', 'legalPerson'],
        address: ['Address', 'registeredAddress', 'address'],
        business: ['Business', 'businessScope'],
        registeredCapital: ['Capital', 'registeredCapital'],
        establishDate: ['SetDate', 'RegistrationDate', 'registeredDate'],
        businessPeriod: ['Period', 'businessPeriod'],
        companyType: ['Type', 'EnterpriseType', 'companyType'],
      },
      '请先上传营业执照图片',
      (imageUrl) => ({ ImageUrl: imageUrl }),
    );
  }

  async ocrIdCardFront(_userId: number, dto: any) {
    return this.runOcr(
      dto,
      'IDCardOCR',
      {
        name: ['Name', 'name', 'realName'],
        idCard: ['IdNum', 'idCard', 'idNo', 'idNumber'],
        address: ['Address', 'address'],
        birth: ['Birth', 'birth'],
        sex: ['Sex', 'sex'],
        nation: ['Nation', 'nation'],
      },
      '请先上传身份证人像面图片',
      (imageUrl) => ({ ImageUrl: imageUrl, CardSide: 'FRONT' }),
    );
  }

  async ocrIdCardBack(_userId: number, dto: any) {
    return this.runOcr(
      dto,
      'IDCardOCR',
      {
        validDate: ['ValidDate', 'validDate', 'validityPeriod'],
        issuedBy: ['Authority', 'issuedBy'],
      },
      '请先上传身份证国徽面图片',
      (imageUrl) => ({ ImageUrl: imageUrl, CardSide: 'BACK' }),
    );
  }

  async getCertStatus(userId: number, role: string) {
    if (role === 'enterprise') {
      const cert = await this.entCertRepo.findOneBy({ userId });
      return { status: cert?.status || 'none', cert };
    }
    const cert = await this.workerCertRepo.findOneBy({ userId });
    return { status: cert?.status || 'none', cert };
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    await this.wechatSecurityService.assertSafeSubmission({
      images: [avatarUrl],
    });
    await this.userRepo.update(userId, { avatarUrl });
    return { avatarUrl };
  }

  async updateProfile(userId: number, dto: any) {
    const allowed: any = {};
    if (dto.nickname) allowed.nickname = dto.nickname;
    if (dto.phone) allowed.phone = dto.phone;
    if (Object.keys(allowed).length === 0) return { message: '无更新' };
    await this.userRepo.update(userId, allowed);
    return { message: '已更新', ...allowed };
  }

  async getDefaultContactProfile(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    const profile = await this.contactProfileRepo.findOneBy({ userId, isDefault: 1 });

    return {
      contactName: profile?.contactName || user?.nickname || '',
      phone: profile?.phone || user?.verifiedPhone || user?.phone || '',
      phoneVerified: !!(profile?.phoneVerified || user?.verifiedPhone),
      wechatId: profile?.wechatId || '',
      wechatQrImage: profile?.wechatQrImage || '',
    };
  }

  async updateDefaultContactProfile(userId: number, dto: any) {
    const user = await this.userRepo.findOneBy({ id: userId });
    const normalizedPhone = this.normalizeText(dto.phone) || null;
    const trustedPhone = this.normalizeText(user?.verifiedPhone);
    const payload = {
      contactName: this.normalizeText(dto.contactName) || null,
      phone: normalizedPhone,
      phoneVerified: normalizedPhone && trustedPhone && normalizedPhone === trustedPhone ? 1 : 0,
      wechatId: this.normalizeText(dto.wechatId) || null,
      wechatQrImage: this.normalizeText(dto.wechatQrImage) || null,
    };

    const existing = await this.contactProfileRepo.findOneBy({ userId, isDefault: 1 });
    if (existing) {
      Object.assign(existing, payload);
      return this.contactProfileRepo.save(existing);
    }

    return this.contactProfileRepo.save(
      this.contactProfileRepo.create({
        userId,
        isDefault: 1,
        status: 'active',
        ...payload,
      }),
    );
  }
}
