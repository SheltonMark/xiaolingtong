import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';

const UNLOCK_COST = 10;

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(ContactUnlock) private unlockRepo: Repository<ContactUnlock>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
  ) {}

  private async checkKeywords(text: string) {
    const keywords = await this.keywordRepo.find();
    for (const kw of keywords) {
      if (text.includes(kw.word)) {
        throw new BadRequestException(`内容包含违禁词: ${kw.word}`);
      }
    }
  }

  async list(query: any) {
    const { type, industry, keyword, page = 1, pageSize = 20 } = query;
    const qb = this.postRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.status = :status', { status: 'active' });

    if (type) qb.andWhere('p.type = :type', { type });
    if (industry) qb.andWhere('p.industry = :industry', { industry });
    if (keyword) qb.andWhere('p.content LIKE :kw', { kw: `%${keyword}%` });

    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async myPosts(userId: number, query: any) {
    const { type, page = 1, pageSize = 20 } = query;
    const qb = this.postRepo.createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .andWhere('p.status != :del', { del: 'deleted' });

    if (type) qb.andWhere('p.type = :type', { type });

    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number, userId: number) {
    const post = await this.postRepo.findOne({ where: { id }, relations: ['user'] });
    if (!post) throw new BadRequestException('信息不存在');

    post.viewCount++;
    await this.postRepo.save(post);

    const unlocked = await this.unlockRepo.findOne({ where: { userId, postId: id } });
    return { ...post, contactUnlocked: !!unlocked || post.userId === userId };
  }

  async create(userId: number, dto: any) {
    const { type, title, category, description, images, showPhone, showWechat, validityDays, ...structuredFields } = dto;

    const content = description || '';
    await this.checkKeywords(content + (title || ''));

    const post = this.postRepo.create({
      userId,
      type,
      title,
      industry: category,
      content,
      fields: Object.keys(structuredFields).length ? structuredFields : null,
      images: images || null,
      expireAt: validityDays ? new Date(Date.now() + Number(validityDays) * 24 * 3600 * 1000) : null,
    });
    return this.postRepo.save(post);
  }

  async update(id: number, userId: number, dto: any) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) throw new ForbiddenException('无权操作');
    await this.checkKeywords((dto.content || '') + (dto.title || ''));
    Object.assign(post, dto);
    return this.postRepo.save(post);
  }

  async remove(id: number, userId: number) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) throw new ForbiddenException('无权操作');
    post.status = 'deleted';
    await this.postRepo.save(post);
    return { message: '已删除' };
  }

  async unlockContact(postId: number, userId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new BadRequestException('信息不存在');
    if (post.userId === userId) return { unlocked: true };

    const existing = await this.unlockRepo.findOne({ where: { userId, postId } });
    if (existing) return { unlocked: true };

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || user.beanBalance < UNLOCK_COST) throw new BadRequestException('灵豆不足');

    user.beanBalance -= UNLOCK_COST;
    await this.userRepo.save(user);

    await this.unlockRepo.save(this.unlockRepo.create({ userId, postId, beanCost: UNLOCK_COST }));
    await this.beanTxRepo.save(this.beanTxRepo.create({
      userId, type: 'unlock_contact', amount: -UNLOCK_COST,
      refType: 'post', refId: postId, remark: '解锁联系方式',
    }));

    post.contactUnlockCount++;
    await this.postRepo.save(post);

    return { unlocked: true, beanBalance: user.beanBalance };
  }
}
