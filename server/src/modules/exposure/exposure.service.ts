import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { User } from '../../entities/user.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';

@Injectable()
export class ExposureService {
  constructor(
    @InjectRepository(Exposure) private expRepo: Repository<Exposure>,
    @InjectRepository(ExposureComment)
    private commentRepo: Repository<ExposureComment>,
    private wechatSecurityService: WechatSecurityService,
  ) {}

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

  async list(query: any) {
    const { category, page = 1, pageSize = 20 } = query;
    const qb = this.expRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.publisher', 'u')
      .where('e.status = :status', { status: 'approved' });
    if (category) qb.andWhere('e.category = :category', { category });
    qb.orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();

    // 格式化列表数据
    const formattedList = list.map((item) => ({
      id: item.id,
      company: item.companyName || '',
      contact: item.personName || '',
      type: this.getCategoryText(item.category),
      amount: item.amount ? `¥${Number(item.amount).toLocaleString()}` : '',
      reason: item.description,
      images: item.images || [],
      date: this.formatDate(item.createdAt),
      comments: 0, // 评论数需要单独查询
      avatarText: this.getCategoryText(item.category)[0],
      avatarColor: this.getAvatarColor(item.category),
    }));

    return { list: formattedList, total, page: +page, pageSize: +pageSize };
  }

  private getCategoryText(category: string): string {
    const map = {
      false_info: '虚假信息',
      fraud: '欺诈行为',
      wage_theft: '欠薪欠款',
    };
    return map[category] || '曝光';
  }

  private getAvatarColor(category: string): string {
    const map = {
      false_info: '#F59E0B',
      fraud: '#EF4444',
      wage_theft: '#F43F5E',
    };
    return map[category] || '#64748B';
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    return d
      .toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      .replace(/\//g, '-');
  }

  async detail(id: number) {
    const exp = await this.expRepo.findOne({
      where: { id },
      relations: ['publisher'],
    });
    if (!exp) throw new BadRequestException('曝光信息不存在');
    exp.viewCount++;
    await this.expRepo.save(exp);
    const comments = await this.commentRepo.find({
      where: { exposureId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    // Get publisher certification info
    let publisherName = '';
    let publisherAvatar = '';
    if (exp.publisher) {
      const role = exp.publisher.role;
      if (role === 'enterprise') {
        const cert = await this.expRepo.manager.findOne(EnterpriseCert, {
          where: { userId: exp.publisher.id, status: 'approved' },
          order: { createdAt: 'DESC' },
        });
        if (cert) publisherName = cert.companyName;
      } else if (role === 'worker') {
        const cert = await this.expRepo.manager.findOne(WorkerCert, {
          where: { userId: exp.publisher.id, status: 'approved' },
          order: { createdAt: 'DESC' },
        });
        if (cert) publisherName = cert.realName;
      }
      if (!publisherName) publisherName = exp.publisher.nickname || '';
      publisherAvatar = exp.publisher.avatarUrl || '';
    }

    return {
      id: exp.id,
      companyName: exp.companyName,
      personName: exp.personName,
      amount: exp.amount,
      description: exp.description,
      images: exp.images || [],
      viewCount: exp.viewCount,
      category: exp.category,
      createdAt: exp.createdAt,
      publisher: {
        name: publisherName,
        avatarUrl: publisherAvatar,
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
    // Check if user is verified
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
      throw new BadRequestException('需要完成企业认证或实名认证后才能发布曝光');
    }

    await this.wechatSecurityService.assertSafeSubmission({
      texts: [dto.category, dto.company, dto.contact, dto.amount, dto.description],
      images: [dto.images],
      openid: user?.openid,
    });

    const exp = this.expRepo.create({
      publisherId,
      category: dto.category || 'wage_theft', // 默认欠薪欠款
      companyName: dto.company,
      personName: dto.contact,
      amount: dto.amount,
      description: dto.description,
      images: this.normalizeStringArray(dto.images),
      status: 'pending',
    });
    return this.expRepo.save(exp);
  }

  async comment(exposureId: number, userId: number, content: string) {
    const user = await this.expRepo.manager.findOne(User, {
      where: { id: userId },
    });
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [content],
      openid: user?.openid,
    });
    const comment = this.commentRepo.create({ exposureId, userId, content });
    return this.commentRepo.save(comment);
  }
}
