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
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
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

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpireAt) {
      return this.accessToken;
    }
    const appid = this.nestConfig.get('WX_APPID');
    const secret = this.nestConfig.get('WX_SECRET');
    if (!appid || !secret) {
      throw new BadRequestException('未配置微信小程序参数');
    }
    const { data } = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
      { timeout: 10000 },
    );
    if (!data?.access_token) {
      this.logger.warn(`getAccessToken failed: ${JSON.stringify(data)}`);
      throw new BadRequestException('获取 access_token 失败');
    }
    this.accessToken = data.access_token;
    const expiresIn = Number(data.expires_in || 7200);
    this.accessTokenExpireAt =
      Date.now() + Math.max(expiresIn - 300, 60) * 1000;
    return this.accessToken;
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
    if (cached?.value) return { wxacodeUrl: cached.value };

    const token = await this.getAccessToken();

    const resp = await axios.post(
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
      resp.headers['content-type'] || '',
    ).toLowerCase();
    if (contentType.includes('json') || !contentType.includes('image')) {
      const errText = Buffer.from(resp.data).toString('utf-8');
      this.logger.warn(`getwxacodeunlimit error: ${errText}`);
      throw new BadRequestException(
        '生成小程序码失败: ' + errText.slice(0, 200),
      );
    }

    const filename = `wxacode_${cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.png`;
    const key = `uploads/wxacode/${filename}`;
    const uploadDir = join(__dirname, '..', '..', '..', 'storage', 'uploads', 'wxacode');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), Buffer.from(resp.data));

    const apiHost = String(
      this.nestConfig.get('API_HOST') || '',
    ).replace(/\/+$/, '');
    const url = apiHost ? `${apiHost}/${key}` : `/${key}`;

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
