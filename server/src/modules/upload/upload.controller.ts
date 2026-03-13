import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const COS = require('cos-nodejs-sdk-v5');

@Controller('upload')
export class UploadController {
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

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const key = `uploads/${uniqueSuffix}${extname(file.originalname)}`;

    await new Promise<void>((resolve, reject) => {
      this.cos.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: file.buffer,
          ContentLength: file.size,
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    const url = `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
    return { url, originalName: file.originalname };
  }
}
