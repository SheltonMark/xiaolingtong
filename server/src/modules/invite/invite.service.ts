import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import axios from 'axios';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { User } from '../../entities/user.entity';
import { InviteRecord } from '../../entities/invite-record.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);
  private accessToken = '';
  private accessTokenExpireAt = 0;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(InviteRecord)
    private inviteRepo: Repository<InviteRecord>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    private nestConfig: NestConfigService,
  ) {}

  generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').slice(0, 8);
  }

  async ensureInviteCode(userId: number): Promise<string> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    if (user.inviteCode) return user.inviteCode;

    let code = this.generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.userRepo.findOne({
        where: { inviteCode: code },
      });
      if (!exists) break;
      code = this.generateInviteCode();
    }
    await this.userRepo.update(userId, { inviteCode: code });
    return code;
  }

  async recordInvite(inviterId: number, inviteeId: number, inviteCode: string) {
    const exists = await this.inviteRepo.findOne({ where: { inviteeId } });
    if (exists) return;
    await this.userRepo.update(inviteeId, { invitedBy: inviterId });
    await this.inviteRepo.save(
      this.inviteRepo.create({ inviterId, inviteeId, inviteCode }),
    );
  }

  async getMyInvites(userId: number, query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.inviteRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.invitee', 'u')
      .where('r.inviterId = :userId', { userId })
      .orderBy('r.createdAt', 'DESC')
      .skip((+page - 1) * +pageSize)
      .take(+pageSize);
    const [list, total] = await qb.getManyAndCount();
    return {
      list: list.map((r) => ({
        id: r.id,
        inviteeId: r.inviteeId,
        nickname:
          r.invitee?.nickname || r.invitee?.name || r.invitee?.phone || '',
        avatarUrl: r.invitee?.avatarUrl || '',
        role: r.invitee?.role || '',
        createdAt: r.createdAt
          ? new Date(r.createdAt)
              .toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })
              .replace(/\//g, '-')
          : '',
      })),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async getInviteStats(userId: number) {
    const total = await this.inviteRepo.count({ where: { inviterId: userId } });
    return { totalInvites: total };
  }

  async getCommissionRate(): Promise<number> {
    const config = await this.configRepo.findOne({
      where: { key: 'commission_rate' },
    });
    return config ? parseFloat(config.value) || 0.1 : 0.1;
  }

  /** 拉取接口调用凭据：优先 stable_token，与其它模块 cgi-bin/token 并存时更不易被顶掉导致 40001 */
  private async fetchAccessTokenFromWechat(): Promise<{
    token: string;
    expiresIn: number;
  }> {
    const appid = this.nestConfig.get('WX_APPID');
    const secret = this.nestConfig.get('WX_SECRET');
    if (!appid || !secret) {
      throw new BadRequestException('未配置微信小程序参数');
    }
    try {
      const { data } = await axios.post(
        'https://api.weixin.qq.com/cgi-bin/stable_token',
        {
          grant_type: 'client_credential',
          appid,
          secret,
        },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        },
      );
      if (data?.access_token && !data.errcode) {
        return {
          token: data.access_token,
          expiresIn: Number(data.expires_in || 7200),
        };
      }
      this.logger.warn(
        `stable_token 未返回有效 access_token: ${JSON.stringify(data)}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`stable_token 请求失败，回退 cgi-bin/token: ${msg}`);
    }
    const { data } = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
      { timeout: 10000 },
    );
    if (!data?.access_token) {
      this.logger.warn(`getAccessToken failed: ${JSON.stringify(data)}`);
      throw new BadRequestException('获取 access_token 失败');
    }
    return {
      token: data.access_token,
      expiresIn: Number(data.expires_in || 7200),
    };
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (forceRefresh) {
      this.accessToken = '';
      this.accessTokenExpireAt = 0;
    }
    if (this.accessToken && now < this.accessTokenExpireAt) {
      return this.accessToken;
    }
    const { token, expiresIn } = await this.fetchAccessTokenFromWechat();
    this.accessToken = token;
    this.accessTokenExpireAt =
      Date.now() + Math.max(expiresIn - 300, 60) * 1000;
    return this.accessToken;
  }

  /** 小程序端无法访问 localhost / 内网 IP，勿把已缓存的公网 URL 改写成这类地址 */
  private isNonPublicHost(hostOrUrl: string): boolean {
    const raw = String(hostOrUrl || '').trim();
    if (!raw) return true;
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      const h = u.hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1') return true;
      if (/^10\./.test(h)) return true;
      if (/^192\.168\./.test(h)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 缓存里存的是「当时」的完整 URL；换域名后按当前公网 API_HOST 重拼路径。
   * 若环境变量 API_HOST 为 localhost/内网（常见：Nginx 反代未改 env），则保留原 URL，避免把可访问的公网链接改坏。
   */
  private normalizeWxacodePublicUrl(stored: string): string {
    const apiHost = String(this.nestConfig.get('API_HOST') || '').replace(
      /\/+$/,
      '',
    );
    if (!stored?.trim() || !apiHost) return stored;
    if (this.isNonPublicHost(apiHost)) {
      return stored;
    }

    const m = stored.match(/(\/uploads\/wxacode\/[^?#\s]+)/i);
    if (!m) return stored;
    return `${apiHost}${m[1]}`;
  }

  /** 新生成文件写入 sys_config 时的对外基址：优先公网 API_HOST，其次 PUBLIC_ASSET_HOST，再退回 API_HOST（本机调试用） */
  private resolvePublicBaseUrlForWxa(): string {
    const apiHost = String(this.nestConfig.get('API_HOST') || '').replace(
      /\/+$/,
      '',
    );
    if (apiHost && !this.isNonPublicHost(apiHost)) {
      return apiHost;
    }
    const assetHost = String(
      this.nestConfig.get('PUBLIC_ASSET_HOST') || '',
    ).replace(/\/+$/, '');
    if (assetHost) {
      return assetHost;
    }
    if (apiHost) {
      return apiHost;
    }
    return 'https://quanqiutong888.com';
  }

  /** 从公开 URL 解析出 wxacode 文件名（仅 uploads/wxacode 下） */
  private filenameFromPublicWxaUrl(url: string): string | null {
    const m = String(url || '')
      .trim()
      .match(/\/uploads\/wxacode\/([^/?#]+)$/i);
    return m ? m[1] : null;
  }

  private wxacodeFileExistsOnDisk(filename: string): boolean {
    if (!filename || /[\\/]/.test(filename) || filename.includes('..')) {
      return false;
    }
    const uploadDir = join(
      __dirname,
      '..',
      '..',
      '..',
      'storage',
      'uploads',
      'wxacode',
    );
    return existsSync(join(uploadDir, filename));
  }

  /** 无数量限制小程序码，scene 最长 32 字符 */
  private async generateWxacodeUnlimited(
    scene: string,
    page: string,
    cacheKey: string,
    label: string,
  ): Promise<{ wxacodeUrl: string }> {
    if (scene.length > 32) {
      throw new BadRequestException('小程序码 scene 过长');
    }
    const cached = await this.configRepo.findOne({
      where: { key: cacheKey },
    });
    if (cached?.value) {
      const normalized = this.normalizeWxacodePublicUrl(cached.value);
      const fn = this.filenameFromPublicWxaUrl(normalized);
      if (fn && this.wxacodeFileExistsOnDisk(fn)) {
        return { wxacodeUrl: normalized };
      }
      this.logger.warn(
        `wxacode 缓存指向的文件不存在或路径无效，将重新生成: key=${cacheKey} url=${cached.value}`,
      );
      await this.configRepo.delete({ key: cacheKey });
    }

    let resp: { data: ArrayBuffer; headers: Record<string, unknown> } | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getAccessToken(attempt > 0);
      const r = await axios.post(
        `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`,
        {
          scene,
          page,
          width: 280,
          auto_color: false,
          line_color: { r: 59, g: 130, b: 246 },
        },
        { responseType: 'arraybuffer', timeout: 15000 },
      );

      const contentType = String(
        r.headers['content-type'] || '',
      ).toLowerCase();
      if (!contentType.includes('json') && contentType.includes('image')) {
        resp = r;
        break;
      }
      const errText = Buffer.from(r.data).toString('utf-8');
      let errcode = 0;
      try {
        errcode = Number(JSON.parse(errText).errcode || 0);
      } catch {
        /* ignore */
      }
      if (errcode === 40001 && attempt === 0) {
        this.logger.warn(
          'getwxacodeunlimit 40001 invalid credential，强制刷新 token 重试一次',
        );
        continue;
      }
      this.logger.warn(`getwxacodeunlimit error: ${errText}`);
      throw new BadRequestException(
        '生成小程序码失败: ' + errText.slice(0, 200),
      );
    }

    if (!resp?.data) {
      throw new BadRequestException('生成小程序码失败');
    }

    const filename = `wxacode_${cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.png`;
    const key = `uploads/wxacode/${filename}`;
    const uploadDir = join(__dirname, '..', '..', '..', 'storage', 'uploads', 'wxacode');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(resp.data));

    const base = this.resolvePublicBaseUrlForWxa();
    const url = base ? `${base}/${key}` : `/${key}`;

    await this.configRepo.save(
      this.configRepo.create({
        key: cacheKey,
        value: url,
        label,
        group: 'wxacode',
      }),
    );

    return { wxacodeUrl: url };
  }

  async generateWxacode(userId: number): Promise<{ wxacodeUrl: string }> {
    const inviteCode = await this.ensureInviteCode(userId);
    const cacheKey = `wxacode_user_${userId}`;
    return this.generateWxacodeUnlimited(
      `inv=${inviteCode}`,
      'pages/index/index',
      cacheKey,
      `用户${userId}邀请小程序码`,
    );
  }

  /** 帖子海报用：扫码进入对应帖子详情 */
  async generatePostWxacode(postId: number): Promise<{ wxacodeUrl: string }> {
    if (!Number.isFinite(postId) || postId <= 0) {
      throw new BadRequestException('帖子 ID 无效');
    }
    const scene = `p=${Math.floor(postId)}`;
    const cacheKey = `wxacode_post_${postId}`;
    return this.generateWxacodeUnlimited(
      scene,
      'pages/post-detail/post-detail',
      cacheKey,
      `帖子${postId}海报小程序码`,
    );
  }
}
