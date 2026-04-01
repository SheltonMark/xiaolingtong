import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';
import { findRecentDuplicate } from '../../common/recent-create-dedupe';

const EXPOSURE_CATEGORY_SETTINGS = [
  {
    key: 'false_info',
    configKey: 'exposure_category_false_info_label',
    defaultLabel: '维权经历',
  },
  {
    key: 'fraud',
    configKey: 'exposure_category_fraud_label',
    defaultLabel: '协商过程',
  },
  {
    key: 'wage_theft',
    configKey: 'exposure_category_wage_theft_label',
    defaultLabel: '结果反馈',
  },
];

@Injectable()
export class ExposureService {
  constructor(
    @InjectRepository(Exposure) private expRepo: Repository<Exposure>,
    @InjectRepository(ExposureComment)
    private commentRepo: Repository<ExposureComment>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    private wechatSecurityService: WechatSecurityService,
  ) {}

  private async getCategorySettings() {
    const rows = await this.configRepo.find();
    const configMap = new Map<string, string>();

    rows.forEach((row) => {
      const key = String(row?.key || '').trim();
      if (!key) return;
      configMap.set(key, String(row?.value || '').trim());
    });

    return EXPOSURE_CATEGORY_SETTINGS.map((item) => {
      const label = configMap.get(item.configKey) || item.defaultLabel;
      return {
        key: item.key,
        label,
        avatarText: label[0] || item.defaultLabel[0] || '风',
      };
    });
  }

  private async getCategoryLabelMap() {
    const settings = await this.getCategorySettings();
    return new Map(settings.map((item) => [item.key, item.label]));
  }

  private async resolvePublisherProfile(publisher?: User | null) {
    if (!publisher) {
      return {
        name: '已认证用户',
        avatarUrl: '',
      };
    }

    let name = '';
    if (publisher.role === 'enterprise') {
      const cert = await this.expRepo.manager.findOne(EnterpriseCert, {
        where: { userId: publisher.id, status: 'approved' },
        order: { createdAt: 'DESC' },
      });
      if (cert?.companyName) {
        name = cert.companyName;
      }
    } else if (publisher.role === 'worker') {
      const cert = await this.expRepo.manager.findOne(WorkerCert, {
        where: { userId: publisher.id, status: 'approved' },
        order: { createdAt: 'DESC' },
      });
      if (cert?.realName) {
        name = cert.realName;
      }
    }

    if (!name) {
      name = String(publisher.nickname || '').trim() || '已认证用户';
    }

    return {
      name,
      avatarUrl: publisher.avatarUrl || '',
    };
  }

  private normalizeCategory(category: any) {
    const normalized = String(category || '').trim();
    if (!normalized) return 'wage_theft';

    const exists = EXPOSURE_CATEGORY_SETTINGS.some(
      (item) => item.key === normalized,
    );
    if (!exists) {
      throw new BadRequestException('风险类型不存在');
    }
    return normalized;
  }

  private normalizeStringArray(value: any): string[] | undefined {
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return undefined;
      try {
        return this.normalizeStringArray(JSON.parse(text));
      } catch {
        return [text];
      }
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
      return normalized.length ? normalized : undefined;
    }

    if (value && typeof value === 'object') {
      const keys = Object.keys(value)
        .filter((key) => /^\d+$/.test(key))
        .sort((a, b) => Number(a) - Number(b));
      if (!keys.length) return undefined;
      return this.normalizeStringArray(keys.map((key) => value[key]));
    }

    return undefined;
  }

  private async findRecentDuplicateExposure(publisherId: number, dto: any) {
    return findRecentDuplicate(this.expRepo, {
      publisherId,
      category: dto.category,
      companyName: dto.company,
      personName: dto.contact,
      amount: dto.amount,
      description: dto.description,
    });
  }

  private getAvatarColor(category: string) {
    const map = {
      false_info: '#F59E0B',
      fraud: '#EF4444',
      wage_theft: '#F43F5E',
    };
    return map[category] || '#64748B';
  }

  private formatDate(date: Date) {
    const d = new Date(date);
    return d
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\//g, '-');
  }

  async settings() {
    return {
      categories: await this.getCategorySettings(),
    };
  }

  async list(query: any) {
    const currentPage = Math.max(1, Number(query?.page) || 1);
    const currentPageSize = Math.max(1, Number(query?.pageSize) || 20);
    const category = String(query?.category || '').trim();
    const categoryLabelMap = await this.getCategoryLabelMap();

    const qb = this.expRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.publisher', 'u')
      .where('e.status = :status', { status: 'approved' });

    if (category) {
      qb.andWhere('e.category = :category', { category });
    }

    qb.orderBy('e.createdAt', 'DESC')
      .skip((currentPage - 1) * currentPageSize)
      .take(currentPageSize);

    const [list, total] = await qb.getManyAndCount();
    const formattedList = await Promise.all(list.map(async (item) => {
      const categoryText = categoryLabelMap.get(item.category) || '风险';
      return {
        id: item.id,
        category: item.category,
        company: item.companyName || '',
        contact: item.personName || '',
        publisherName: (await this.resolvePublisherProfile(item.publisher)).name,
        type: categoryText,
        amount: item.amount ? `¥${Number(item.amount).toLocaleString()}` : '',
        reason: item.description,
        images: item.images || [],
        date: this.formatDate(item.createdAt),
        comments: 0,
        avatarText: categoryText[0] || '风',
        avatarColor: this.getAvatarColor(item.category),
      };
    }));

    return {
      list: formattedList,
      total,
      page: currentPage,
      pageSize: currentPageSize,
    };
  }

  async detail(id: number) {
    const categoryLabelMap = await this.getCategoryLabelMap();
    const exp = await this.expRepo.findOne({
      where: { id },
      relations: ['publisher'],
    });
    if (!exp) throw new BadRequestException('风险信息不存在');

    exp.viewCount++;
    await this.expRepo.save(exp);

    const comments = await this.commentRepo.find({
      where: { exposureId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const publisherProfile = await this.resolvePublisherProfile(exp.publisher);

    return {
      id: exp.id,
      companyName: exp.companyName,
      personName: exp.personName,
      amount: exp.amount,
      description: exp.description,
      images: exp.images || [],
      viewCount: exp.viewCount,
      category: exp.category,
      categoryText: categoryLabelMap.get(exp.category) || '风险',
      createdAt: exp.createdAt,
      publisher: {
        name: publisherProfile.name,
        avatarUrl: publisherProfile.avatarUrl,
      },
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        user: {
          nickname: c.user?.nickname || '',
          avatarUrl: c.user?.avatarUrl || '',
        },
      })),
    };
  }

  async create(publisherId: number, dto: any) {
    const user = await this.expRepo.manager.findOne(User, {
      where: { id: publisherId },
    });
    if (!user) throw new BadRequestException('用户不存在');

    let isVerified = false;
    if (user.role === 'enterprise') {
      const cert = await this.expRepo.manager.findOne(EnterpriseCert, {
        where: { userId: publisherId, status: 'approved' },
      });
      isVerified = !!cert;
    } else if (user.role === 'worker') {
      const cert = await this.expRepo.manager.findOne(WorkerCert, {
        where: { userId: publisherId, status: 'approved' },
      });
      isVerified = !!cert;
    }

    if (!isVerified) {
      throw new BadRequestException('需要完成企业认证或实名认证后才能提交风险线索');
    }

    const category = this.normalizeCategory(dto.category);
    const company = String(dto.company || '').trim();
    const contact = String(dto.contact || '').trim();

    if (company || contact) {
      throw new BadRequestException('仅支持分享本人维权经历，禁止填写第三方名称');
    }

    const normalizedDto = {
      ...dto,
      category,
    };

    const existing = await this.findRecentDuplicateExposure(
      publisherId,
      normalizedDto,
    );
    if (existing) return existing;

    await this.wechatSecurityService.assertSafeSubmission({
      texts: [category, dto.company, dto.contact, dto.amount, dto.description],
      images: [dto.images],
      openid: user?.openid,
    });

    const exp = this.expRepo.create({
      publisherId,
      category,
      companyName: null,
      personName: null,
      amount: dto.amount,
      description: dto.description,
      images: this.normalizeStringArray(dto.images),
      status: 'pending',
    });
    return this.expRepo.save(exp);
  }

  async comment(exposureId: number, userId: number, content: string) {
    const normalizedContent = String(content || '').trim();
    if (!normalizedContent) {
      throw new BadRequestException('评论内容不能为空');
    }

    const exposure = await this.expRepo.findOne({
      where: { id: exposureId },
    });
    if (!exposure) {
      throw new BadRequestException('风险信息不存在');
    }

    const user = await this.expRepo.manager.findOne(User, {
      where: { id: userId },
    });
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [normalizedContent],
      openid: user?.openid,
    });

    const comment = this.commentRepo.create({
      exposureId,
      userId,
      content: normalizedContent,
    });
    return this.commentRepo.save(comment);
  }
}
