import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SubmissionCheckInput {
  texts?: any[];
  images?: any[];
  scene?: number;
  openid?: string;
}

@Injectable()
export class WechatSecurityService {
  private readonly logger = new Logger(WechatSecurityService.name);
  private accessToken = '';
  private accessTokenExpireAt = 0;

  constructor(private readonly configService: ConfigService) {}

  async assertSafeSubmission(input: SubmissionCheckInput) {
    if (!this.isEnabled()) return;

    const scene = Number(input.scene) || 3;
    const openid = this.normalizeOpenid(input.openid);
    const textContent = this.collectText(input.texts || []).join('\n').trim();
    if (textContent) {
      await this.assertSafeText(
        textContent.slice(0, 200000),
        scene,
        openid,
      );
    }

    const imageUrls = this.collectImages(input.images || []);
    for (const mediaUrl of imageUrls) {
      await this.submitImageCheck(mediaUrl, scene, openid);
    }
  }

  private isEnabled(): boolean {
    return !!(
      this.configService.get('WX_APPID') &&
      this.configService.get('WX_SECRET')
    );
  }

  private collectText(values: any[], bucket: string[] = []): string[] {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        this.collectText(value, bucket);
        continue;
      }
      if (typeof value === 'object') {
        this.collectText(Object.values(value), bucket);
        continue;
      }
      const text = String(value).trim();
      if (!text || /^https?:\/\//i.test(text)) continue;
      bucket.push(text);
    }
    return bucket;
  }

  private collectImages(values: any[], bucket: string[] = []): string[] {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        this.collectImages(value, bucket);
        continue;
      }
      if (typeof value === 'object') {
        this.collectImages(Object.values(value), bucket);
        continue;
      }
      const text = String(value).trim();
      if (/^https?:\/\//i.test(text)) {
        bucket.push(text);
      }
    }
    return [...new Set(bucket)];
  }

  private normalizeOpenid(value: any) {
    const openid = String(value || '').trim();
    return openid || '';
  }

  private isTextCheckPassed(data: any) {
    const suggest = data?.result?.suggest;
    return Number(data?.errcode || 0) === 0 && (!suggest || suggest === 'pass');
  }

  private shouldFallbackToLegacyOpenidCheck(data: any) {
    const errcode = Number(data?.errcode || 0);
    const errmsg = String(data?.errmsg || '');
    return errcode === 40003 || /invalid openid/i.test(errmsg);
  }

  private async assertSafeText(content: string, scene: number, openid?: string) {
    let data: any;

    if (openid) {
      data = await this.postWechatCheck('/wxa/msg_sec_check', {
        content,
        scene,
        version: 2,
        openid,
      });

      if (this.shouldFallbackToLegacyOpenidCheck(data)) {
        this.logger.warn(
          `msg_sec_check invalid openid, falling back to legacy content check: ${JSON.stringify(data)}`,
        );
        data = await this.postWechatCheck('/wxa/msg_sec_check', { content });
      }
    } else {
      data = await this.postWechatCheck('/wxa/msg_sec_check', { content });
    }

    const suggest = data?.result?.suggest;
    if (this.isTextCheckPassed(data)) {
      return;
    }

    if (Number(data?.errcode) === 87014 || (suggest && suggest !== 'pass')) {
      throw new BadRequestException('\u63d0\u4ea4\u5185\u5bb9\u5305\u542b\u8fdd\u89c4\u4fe1\u606f\uff0c\u8bf7\u4fee\u6539\u540e\u91cd\u8bd5');
    }

    this.logger.warn(`msg_sec_check failed: ${JSON.stringify(data)}`);
    throw new BadRequestException('\u5185\u5bb9\u5b89\u5168\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
  }

  private async submitImageCheck(mediaUrl: string, scene: number, openid?: string) {
    let data: any;

    if (openid) {
      data = await this.postWechatCheck('/wxa/media_check_async', {
        media_url: mediaUrl,
        media_type: 2,
        scene,
        version: 2,
        openid,
      });

      if (this.shouldFallbackToLegacyOpenidCheck(data)) {
        this.logger.warn(
          `media_check_async invalid openid, falling back to legacy media check: ${JSON.stringify(data)}`,
        );
        data = await this.postWechatCheck('/wxa/media_check_async', {
          media_url: mediaUrl,
          media_type: 2,
        });
      }
    } else {
      data = await this.postWechatCheck('/wxa/media_check_async', {
        media_url: mediaUrl,
        media_type: 2,
      });
    }

    const suggest = data?.result?.suggest;
    if (Number(data?.errcode || 0) === 0 && (!suggest || suggest === 'pass')) {
      return;
    }

    if (Number(data?.errcode) === 87014 || (suggest && suggest !== 'pass')) {
      throw new BadRequestException('\u63d0\u4ea4\u56fe\u7247\u5305\u542b\u8fdd\u89c4\u4fe1\u606f\uff0c\u8bf7\u66f4\u6362\u540e\u91cd\u8bd5');
    }

    this.logger.warn(`media_check_async failed: ${JSON.stringify(data)}`);
    throw new BadRequestException('\u5185\u5bb9\u5b89\u5168\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
  }

  private async postWechatCheck(
    apiPath: string,
    payload: Record<string, any>,
    retry = true,
  ): Promise<any> {
    const token = await this.getAccessToken();
    const url = `https://api.weixin.qq.com${apiPath}?access_token=${token}`;

    try {
      const { data } = await axios.post(url, payload, { timeout: 10000 });
      const errcode = Number(data?.errcode || 0);
      if (retry && (errcode === 40001 || errcode === 42001)) {
        this.accessToken = '';
        this.accessTokenExpireAt = 0;
        return this.postWechatCheck(apiPath, payload, false);
      }
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'unknown');
      this.logger.error(`wechat security request failed: ${message}`);
      throw new BadRequestException('\u5185\u5bb9\u5b89\u5168\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpireAt) {
      return this.accessToken;
    }

    const appid = this.configService.get('WX_APPID');
    const secret = this.configService.get('WX_SECRET');
    if (!appid || !secret) {
      throw new BadRequestException('\u672a\u914d\u7f6e\u5185\u5bb9\u5b89\u5168\u6821\u9a8c\u53c2\u6570');
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      if (!data?.access_token) {
        this.logger.warn(`getAccessToken failed: ${JSON.stringify(data)}`);
        throw new BadRequestException('\u5185\u5bb9\u5b89\u5168\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
      }
      this.accessToken = data.access_token;
      const expiresIn = Number(data.expires_in || 7200);
      this.accessTokenExpireAt = Date.now() + Math.max(expiresIn - 300, 60) * 1000;
      return this.accessToken;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error || 'unknown');
      this.logger.error(`getAccessToken request failed: ${message}`);
      throw new BadRequestException('\u5185\u5bb9\u5b89\u5168\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5');
    }
  }
}
