import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';
import { User } from '../../entities/user.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';
import { findRecentDuplicate } from '../../common/recent-create-dedupe';

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
    const targetType = dto.targetType || 'post';
    const targetId = dto.targetId;
    const reason = dto.reason || dto.type || '';
    const description = dto.description || '';
    const normalizedImages = this.normalizeImages(dto.images);
    const existing = await findRecentDuplicate(this.reportRepo, {
      reporterId,
      targetType,
      targetId,
      reason,
      description,
    });
    if (existing) return existing;

    const reporter = await this.reportRepo.manager.findOne(User, {
      where: { id: reporterId },
    });
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [targetType, reason, dto.type, description],
      images: [normalizedImages],
      openid: reporter?.openid,
    });

    const report = this.reportRepo.create({
      reporterId,
      targetType,
      targetId,
      reason,
      description,
      images: normalizedImages,
    });
    return this.reportRepo.save(report);
  }
}
