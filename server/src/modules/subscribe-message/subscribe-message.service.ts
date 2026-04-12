import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SysConfig } from '../../entities/sys-config.entity';
import { User } from '../../entities/user.entity';
import axios from 'axios';

export interface SubscribeMessageData {
  [key: string]: { value: string };
}

@Injectable()
export class SubscribeMessageService {
  private readonly logger = new Logger(SubscribeMessageService.name);
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private config: ConfigService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessTokenCache && Date.now() < this.accessTokenCache.expiresAt) {
      return this.accessTokenCache.token;
    }
    const appid = this.config.get('WX_APPID');
    const secret = this.config.get('WX_SECRET');
    const res = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
    );
    const token = res.data?.access_token;
    if (!token) throw new Error('Failed to get access_token');
    this.accessTokenCache = {
      token,
      expiresAt: Date.now() + (res.data.expires_in - 300) * 1000,
    };
    return token;
  }

  private async getTemplateId(key: string): Promise<string | null> {
    const config = await this.configRepo.findOneBy({ key });
    return config?.value || null;
  }

  async sendMessage(
    userId: number,
    templateKey: string,
    data: SubscribeMessageData,
    page?: string,
  ): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user?.openid) {
      this.logger.warn(`User ${userId} has no openid, skip subscribe message`);
      return false;
    }

    const templateId = await this.getTemplateId(templateKey);
    if (!templateId) {
      this.logger.warn(`Template key ${templateKey} not configured`);
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const res = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          touser: user.openid,
          template_id: templateId,
          page: page || '',
          data,
        },
      );
      if (res.data?.errcode === 0) {
        this.logger.log(`Subscribe message sent to user ${userId}`);
        return true;
      }
      this.logger.warn(
        `Subscribe message failed for user ${userId}: ${res.data?.errmsg}`,
      );
      return false;
    } catch (err) {
      this.logger.error(`Subscribe message error for user ${userId}`, err);
      return false;
    }
  }

  async sendNewMessageNotification(userId: number, senderName: string) {
    return this.sendMessage(
      userId,
      'subscribe_tpl_new_message',
      {
        thing1: { value: senderName },
        thing2: { value: '您收到一条新消息' },
        date3: { value: new Date().toLocaleString('zh-CN') },
      },
      '/pages/messages/messages',
    );
  }

  async sendApplicationStatusNotification(
    userId: number,
    jobTitle: string,
    status: string,
  ) {
    return this.sendMessage(
      userId,
      'subscribe_tpl_application_status',
      {
        thing1: { value: jobTitle.slice(0, 20) },
        phrase2: { value: status },
        date3: { value: new Date().toLocaleString('zh-CN') },
      },
      '/pages/my-applications/my-applications',
    );
  }
}
