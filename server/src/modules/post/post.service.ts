import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { Job } from '../../entities/job.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(ContactUnlock) private unlockRepo: Repository<ContactUnlock>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(SysConfig) private sysConfigRepo: Repository<SysConfig>,
  ) {}

  private async getConfig(key: string, defaultValue: string): Promise<string> {
    const row = await this.sysConfigRepo.findOne({ where: { key } });
    return row ? row.value : defaultValue;
  }

  private async checkKeywords(text: string) {
    const keywords = await this.keywordRepo.find();
    for (const kw of keywords) {
      if (text.includes(kw.word)) {
        throw new BadRequestException(`内容包含违禁词: ${kw.word}`);
      }
    }
  }

  private normalizeText(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private composePostContent(type: string, title: string, description: string, fields: Record<string, any>) {
    const safeFields = fields || {};
    const joinSegments = (segments: string[]) => segments.filter(Boolean).join('，');

    const productName = this.normalizeText(title || safeFields.productName);
    const processType = this.normalizeText(safeFields.processType || title);
    const quantity = this.normalizeText(safeFields.quantity);
    const spec = this.normalizeText(safeFields.spec);
    const deliveryDays = this.normalizeText(safeFields.deliveryDays);
    const quality = this.normalizeText(safeFields.quality);
    const price = this.normalizeText(safeFields.price);
    const priceMin = this.normalizeText(safeFields.priceMin);
    const priceMax = this.normalizeText(safeFields.priceMax);
    const minOrder = this.normalizeText(safeFields.minOrder);
    const capacity = this.normalizeText(safeFields.capacity);
    const processDesc = this.normalizeText(safeFields.processDesc);
    const extraDesc = this.normalizeText(description);

    const budgetText = priceMin && priceMax
      ? `预算${priceMin}-${priceMax}元`
      : priceMin
        ? `预算${priceMin}元起`
        : priceMax
          ? `预算${priceMax}元以内`
          : '';

    let autoContent = '';
    if (type === 'purchase') {
      autoContent = joinSegments([
        productName ? `采购${productName}${quantity ? `${quantity}个` : ''}` : '',
        spec ? `规格：${spec}` : '',
        deliveryDays ? `交期：${deliveryDays}` : '',
        budgetText,
        quality ? `质量要求：${quality}` : '',
      ]);
    } else if (type === 'stock') {
      autoContent = joinSegments([
        productName ? `${productName}现货供应` : '',
        quantity ? `库存${quantity}个` : '',
        price ? `单价${price}元` : '',
        minOrder ? `${minOrder}个起订` : '',
        spec ? `规格：${spec}` : '',
      ]);
    } else if (type === 'process') {
      autoContent = joinSegments([
        processType ? `承接${processType}` : '',
        processDesc ? `工艺：${processDesc}` : '',
        capacity ? `产能${capacity}件/天` : '',
        price ? `加工单价${price}元/件` : '',
        minOrder ? `${minOrder}个起订` : '',
        deliveryDays ? `交期：${deliveryDays}` : '',
      ]);
    }

    if (autoContent && extraDesc) return `${autoContent}，${extraDesc}`;
    return autoContent || extraDesc || this.normalizeText(title);
  }

  private async getEnterpriseCertMap(userIds: number[]) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    const certMap = new Map<number, EnterpriseCert>();
    if (!uniqueIds.length) return certMap;

    const certs = await this.entCertRepo.createQueryBuilder('c')
      .where('c.userId IN (:...userIds)', { userIds: uniqueIds })
      .orderBy('c.userId', 'ASC')
      .addOrderBy('c.id', 'DESC')
      .getMany();

    for (const cert of certs) {
      if (!certMap.has(cert.userId)) certMap.set(cert.userId, cert);
    }
    return certMap;
  }

  private buildCompanyInfo(post: any, certMap: Map<number, EnterpriseCert>) {
    const userId = Number(post.userId || (post.user && post.user.id) || 0);
    const cert = certMap.get(userId);
    const enterpriseVerified = !!(cert && cert.status === 'approved');
    return {
      ...post,
      companyName: (cert && cert.companyName) || '',
      enterpriseVerified,
    };
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
    const certMap = await this.getEnterpriseCertMap((list || []).map(item => Number(item.userId)));
    const normalizedList = (list || []).map(item => this.buildCompanyInfo(item, certMap));
    return { list: normalizedList, total, page: +page, pageSize: +pageSize };
  }

  async myPosts(userId: number, query: any) {
    const { type, page = 1, pageSize = 20 } = query;

    // 如果指定了 type=job，只返回招工信息
    if (type === 'job') {
      const qb = this.jobRepo.createQueryBuilder('j')
        .where('j.userId = :userId', { userId })
        .orderBy('j.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize);
      const [list, total] = await qb.getManyAndCount();
      const jobList = list.map(job => ({
        id: job.id,
        type: 'job',
        title: job.title,
        content: job.description,
        status: job.status === 'recruiting' ? 'active' : 'expired',
        viewCount: 0,
        createdAt: job.createdAt,
        expireAt: job.dateEnd
      }));
      return { list: jobList, total, page: +page, pageSize: +pageSize };
    }

    // 否则返回 posts
    const qb = this.postRepo.createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .andWhere('p.status != :del', { del: 'deleted' });

    if (type && type !== 'all') qb.andWhere('p.type = :type', { type });

    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    const certMap = await this.getEnterpriseCertMap((list || []).map(item => Number(item.userId)));
    const normalizedList = (list || []).map(item => this.buildCompanyInfo(item, certMap));
    return { list: normalizedList, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number, userId: number) {
    const post = await this.postRepo.findOne({ where: { id }, relations: ['user'] });
    if (!post) throw new BadRequestException('信息不存在');

    post.viewCount++;
    await this.postRepo.save(post);

    const unlocked = await this.unlockRepo.findOne({ where: { userId, postId: id } });
    const userPostCount = await this.postRepo.count({
      where: { userId: post.userId, status: 'active' as any },
    });
    const certMap = await this.getEnterpriseCertMap([Number(post.userId)]);
    const normalizedPost = this.buildCompanyInfo(post, certMap);
    return {
      ...normalizedPost,
      postCount: userPostCount,
      contactUnlocked: !!unlocked || post.userId === userId,
    };
  }

  async create(userId: number, dto: any) {
    const {
      type,
      title,
      category,
      description,
      images,
      showPhone,
      showWechat,
      validityDays,
      contactName,
      contactPhone,
      contactWechat,
      ...structuredFields
    } = dto;

    const content = this.composePostContent(type, title, description, structuredFields);
    const phoneVisible = showPhone !== false;
    const wechatVisible = showWechat !== false;
    const normalizedContactName = this.normalizeText(contactName) || null;
    const normalizedContactPhone = this.normalizeText(contactPhone) || null;
    const normalizedContactWechat = this.normalizeText(contactWechat) || null;

    await this.checkKeywords(content + (title || ''));

    const postData: Partial<Post> = {
      userId,
      type,
      title,
      industry: category,
      content,
      expireAt: validityDays ? new Date(Date.now() + Number(validityDays) * 24 * 3600 * 1000) : undefined,
    };
    if (Object.keys(structuredFields).length) postData.fields = structuredFields;
    if (images && images.length) postData.images = images;
    if (normalizedContactName) postData.contactName = normalizedContactName;
    if (phoneVisible && normalizedContactPhone) postData.contactPhone = normalizedContactPhone;
    if (wechatVisible && normalizedContactWechat) postData.contactWechat = normalizedContactWechat;

    const post = this.postRepo.create(postData);
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
    if (post.userId === userId) return { unlocked: true, cost: 0 };

    const existing = await this.unlockRepo.findOne({ where: { userId, postId } });
    if (existing) return { unlocked: true, cost: 0 };

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    // 读取配置
    const baseCost = parseInt(await this.getConfig('unlock_contact_cost', '10')) || 10;
    const dailyFree = parseInt(await this.getConfig('member_daily_free_views', '5')) || 5;
    const discount = parseFloat(await this.getConfig('member_view_discount', '0.5')) || 0.5;

    // 判断会员状态
    const isMember = user.isMember && user.memberExpireAt && new Date(user.memberExpireAt) > new Date();

    let actualCost = baseCost;
    let freeUsed = false;

    if (isMember) {
      // 统计今日已用免费次数
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayUnlocks = await this.unlockRepo.count({
        where: { userId, createdAt: MoreThanOrEqual(todayStart) },
      });

      if (todayUnlocks < dailyFree) {
        // 免费额度内
        actualCost = 0;
        freeUsed = true;
      } else {
        // 超出免费额度，打折
        actualCost = Math.ceil(baseCost * discount);
      }
    }

    // 检查灵豆余额
    if (actualCost > 0 && user.beanBalance < actualCost) {
      throw new BadRequestException(`灵豆不足，需要${actualCost}灵豆`);
    }

    // 扣豆
    if (actualCost > 0) {
      user.beanBalance -= actualCost;
      await this.userRepo.save(user);

      await this.beanTxRepo.save(this.beanTxRepo.create({
        userId, type: 'unlock_contact', amount: -actualCost,
        refType: 'post', refId: postId,
        remark: isMember ? '解锁联系方式(会员折扣)' : '解锁联系方式',
      }));
    }

    await this.unlockRepo.save(this.unlockRepo.create({ userId, postId, beanCost: actualCost }));

    post.contactUnlockCount++;
    await this.postRepo.save(post);

    return { unlocked: true, cost: actualCost, beanBalance: user.beanBalance, freeUsed };
  }
}
