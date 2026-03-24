import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SubmissionCheckInput {
  texts?: any[];
  images?: any[];
  scene?: number;
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
    const textContent = this.collectText(input.texts || []).join('\n').trim();
    if (textContent) {
      await this.assertSafeText(textContent.slice(0, 200000), scene);
    }

    const imageUrls = this.collectImages(input.images || []);
    for (const mediaUrl of imageUrls) {
      await this.submitImageCheck(mediaUrl, scene);
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

  private async assertSafeText(content: string, scene: number) {
    const data = await this.postWechatCheck('/wxa/msg_sec_check', {
      content,
      scene,
      version: 2,
    });

    const suggest = data?.result?.suggest;
    if (Number(data?.errcode || 0) === 0 && (!suggest || suggest === 'pass')) {
      return;
    }

    if (Number(data?.errcode) === 87014 || (suggest && suggest !== 'pass')) {
      throw new BadRequestException('?????????');
    }

    this.logger.warn(`msg_sec_check failed: ${JSON.stringify(data)}`);
    throw new BadRequestException('????????????');
  }

  private async submitImageCheck(mediaUrl: string, scene: number) {
    const data = await this.postWechatCheck('/wxa/media_check_async', {
      media_url: mediaUrl,
      media_type: 2,
      scene,
      version: 2,
    });

    const suggest = data?.result?.suggest;
    if (Number(data?.errcode || 0) === 0 && (!suggest || suggest === 'pass')) {
      return;
    }

    if (Number(data?.errcode) === 87014 || (suggest && suggest !== 'pass')) {
      throw new BadRequestException('???????????');
    }

    this.logger.warn(`media_check_async failed: ${JSON.stringify(data)}`);
    throw new BadRequestException('????????????');
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
      throw new BadRequestException('????????????');
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
      throw new BadRequestException('????????');
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    try {
      const { data } = await axios.get(url, { timeout: 10000 });
      if (!data?.access_token) {
        this.logger.warn(`getAccessToken failed: ${JSON.stringify(data)}`);
        throw new BadRequestException('????????????');
      }
      this.accessToken = data.access_token;
      const expiresIn = Number(data.expires_in || 7200);
      this.accessTokenExpireAt = Date.now() + Math.max(expiresIn - 300, 60) * 1000;
      return this.accessToken;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error || 'unknown');
      this.logger.error(`getAccessToken request failed: ${message}`);
      throw new BadRequestException('????????????');
    }
  }
}
