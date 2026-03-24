import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    private wechatSecurityService: WechatSecurityService,
  ) {}

  private normalizeImages(value: any): string[] | undefined {
    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      return normalized.length ? normalized : undefined;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }
      try {
        return this.normalizeImages(JSON.parse(text));
      } catch {
        return [text];
      }
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));
      if (!keys.length) {
        return undefined;
      }
      return this.normalizeImages(keys.map((key) => value[key]));
    }

    return undefined;
  }

  async create(reporterId: number, dto: any) {
    const normalizedImages = this.normalizeImages(dto.images);
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [dto.targetType, dto.reason, dto.type, dto.description],
      images: [normalizedImages],
    });

    const report = this.reportRepo.create({
      reporterId,
      targetType: dto.targetType || 'post',
      targetId: dto.targetId,
      reason: dto.reason || dto.type || '',
      description: dto.description || '',
      images: normalizedImages,
    });
    return this.reportRepo.save(report);
  }
}
