import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';

@Injectable()
export class ExposureService {
  constructor(
    @InjectRepository(Exposure) private expRepo: Repository<Exposure>,
    @InjectRepository(ExposureComment) private commentRepo: Repository<ExposureComment>,
  ) {}

  async list(query: any) {
    const { category, page = 1, pageSize = 20 } = query;
    const qb = this.expRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.publisher', 'u')
      .where('e.status = :status', { status: 'approved' });
    if (category) qb.andWhere('e.category = :category', { category });
    qb.orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();

    // 格式化列表数据
    const formattedList = list.map(item => ({
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
      avatarColor: this.getAvatarColor(item.category)
    }));

    return { list: formattedList, total, page: +page, pageSize: +pageSize };
  }

  private getCategoryText(category: string): string {
    const map = { 'false_info': '虚假信息', 'fraud': '欺诈行为', 'wage_theft': '欠薪欠款' };
    return map[category] || '曝光';
  }

  private getAvatarColor(category: string): string {
    const map = { 'false_info': '#F59E0B', 'fraud': '#EF4444', 'wage_theft': '#F43F5E' };
    return map[category] || '#64748B';
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  }

  async detail(id: number) {
    const exp = await this.expRepo.findOne({ where: { id }, relations: ['publisher'] });
    if (!exp) throw new BadRequestException('曝光信息不存在');
    exp.viewCount++;
    await this.expRepo.save(exp);
    const comments = await this.commentRepo.find({
      where: { exposureId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
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
      comments: comments.map(c => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        user: { nickname: c.user?.nickname || '匿名用户' }
      }))
    };
  }

  async create(publisherId: number, dto: any) {
    const exp = this.expRepo.create({
      publisherId,
      category: dto.category || 'wage_theft', // 默认欠薪欠款
      companyName: dto.company,
      personName: dto.contact,
      amount: dto.amount,
      description: dto.description,
      images: dto.images,
      status: 'pending'
    });
    return this.expRepo.save(exp);
  }

  async comment(exposureId: number, userId: number, content: string) {
    const comment = this.commentRepo.create({ exposureId, userId, content });
    return this.commentRepo.save(comment);
  }
}
