import { Controller, Logger, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import type { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const COS = require('cos-nodejs-sdk-v5');

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);
  private cos: any;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.cos = new COS({
      SecretId: this.configService.get('COS_SECRET_ID'),
      SecretKey: this.configService.get('COS_SECRET_KEY'),
    });
    this.bucket = this.configService.get('COS_BUCKET') || '';
    this.region = this.configService.get('COS_REGION') || '';
  }

  private hasCosConfig() {
    return !!(
      this.configService.get('COS_SECRET_ID') &&
      this.configService.get('COS_SECRET_KEY') &&
      this.bucket &&
      this.region
    );
  }

  private getLocalUploadDir() {
    return join(__dirname, '..', '..', '..', 'public', 'uploads');
  }

  private buildLocalFileUrl(req: Request, key: string) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || req.get('host') || '';

    if (host) {
      const protocol = forwardedProto || req.protocol || 'https';
      return `${protocol}://${host}/${key}`;
    }

    const apiHost = String(this.configService.get('API_HOST') || '').replace(/\/+$/, '');
    return apiHost ? `${apiHost}/${key}` : `/${key}`;
  }

  private async uploadToCos(key: string, file: Express.Multer.File) {
    await new Promise<void>((resolve, reject) => {
      this.cos.putObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Body: file.buffer,
        ContentLength: file.size,
      }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }

  private async saveLocally(key: string, file: Express.Multer.File, req: Request) {
    const uploadDir = this.getLocalUploadDir();
    const targetPath = join(uploadDir, key.replace(/^uploads\//, ''));
    await mkdir(uploadDir, { recursive: true });
    await writeFile(targetPath, file.buffer);
    return this.buildLocalFileUrl(req, key);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const key = `uploads/${uniqueSuffix}${extname(file.originalname)}`;

    let url = '';
    if (this.hasCosConfig()) {
      try {
        url = await this.uploadToCos(key, file);
      } catch (error: any) {
        const message = error?.message || 'COS upload failed';
        this.logger.warn(`COS upload failed, falling back to local storage: ${message}`);
      }
    }

    if (!url) {
      url = await this.saveLocally(key, file, req);
    }

    return { url, originalName: file.originalname };
  }
}
