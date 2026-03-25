import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { Job } from '../../entities/job.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { Promotion } from '../../entities/promotion.entity';
import { WechatSecurityService } from '../wechat-security/wechat-security.service';
import { findRecentDuplicate } from '../../common/recent-create-dedupe';

const PROCESS_MODE_LABELS: Record<string, string> = {
  seeking: '找代加工',
  offering: '承接加工',
};

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
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    private wechatSecurityService: WechatSecurityService,
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
      const normalized = value.map((item) => this.normalizeText(item)).filter(Boolean);
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

  private async findRecentDuplicatePost(userId: number, payload: any) {
    return findRecentDuplicate(this.postRepo, {
      userId,
      type: payload.type,
      title: payload.title,
      industry: payload.industry,
      processMode: payload.processMode,
      content: payload.content,
      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      contactWechat: payload.contactWechat,
      contactWechatQr: payload.contactWechatQr,
      showPhone: payload.showPhone,
      showWechat: payload.showWechat,
      showWechatQr: payload.showWechatQr,
    });
  }

  private parseVisibility(value: any, defaultValue = false): boolean {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = this.normalizeText(value).toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
  }

  private normalizeProcessMode(value: any): string {
    const normalized = this.normalizeText(value).toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROCESS_MODE_LABELS, normalized)
      ? normalized
      : '';
  }

  private getProcessModeLabel(value: any): string {
    const normalized = this.normalizeProcessMode(value);
    return normalized ? PROCESS_MODE_LABELS[normalized] : '';
  }

  private buildProcessTitle(processMode: string, industry: any, rawTitle: any): string {
    const label = this.getProcessModeLabel(processMode);
    const subject = this.normalizeText(industry || rawTitle) || '代加工';
    if (!label) return this.normalizeText(rawTitle) || subject;
    return `${label} · ${subject}`;
  }

  private resolveProcessMode(post: any): string {
    const direct = this.normalizeProcessMode(post?.processMode);
    if (direct) return direct;
    const fields =
      post?.fields && typeof post.fields === 'object' && !Array.isArray(post.fields)
        ? post.fields
        : {};
    return this.normalizeProcessMode(fields.processMode);
  }

  private buildVisibleContactInfo(post: Partial<Post>, includeHidden = false) {
    const showPhone = includeHidden || this.parseVisibility(post.showPhone, !!post.contactPhone);
    const showWechat = includeHidden || this.parseVisibility(post.showWechat, !!post.contactWechat);
    const showWechatQr = includeHidden || this.parseVisibility(post.showWechatQr, !!post.contactWechatQr);
    const hasVisibleContact = showPhone || showWechat || showWechatQr;

    return {
      contactName: hasVisibleContact || includeHidden ? post.contactName || null : null,
      contactPhone: showPhone ? post.contactPhone || null : null,
      contactWechat: showWechat ? post.contactWechat || null : null,
      contactWechatQr: showWechatQr ? post.contactWechatQr || null : null,
      showPhone,
      showWechat,
      showWechatQr,
    };
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
      // BIGINT fields may come back as string in JS runtime. Normalize to number for map key.
      const certUserId = Number(cert.userId);
      if (!certUserId) continue;
      if (!certMap.has(certUserId)) certMap.set(certUserId, cert);
    }
    return certMap;
  }

  private buildCompanyInfo(post: any, certMap: Map<number, EnterpriseCert>) {
    const userId = Number(post.userId || (post.user && post.user.id) || 0);
    const cert = userId ? certMap.get(userId) : undefined;
    const certStatus = cert?.status || 'none';
    const enterpriseVerified = certStatus === 'approved';
    const processMode = this.resolveProcessMode(post);
    const processModeLabel = this.getProcessModeLabel(processMode);
    return {
      ...post,
      companyName: (cert && cert.companyName) || '',
      processMode: processMode || undefined,
      processModeLabel: processModeLabel || undefined,
      enterpriseVerified,
      verified: enterpriseVerified,
      certStatus,
    };
  }

  /** 获取当前有效置顶的 postId 集合 */
  private async getPromotedPostIds(postIds: number[]): Promise<Set<number>> {
    if (!postIds.length) return new Set();
    const now = new Date();
    const promos = await this.promoRepo.createQueryBuilder('pr')
      .select('pr.postId')
      .where('pr.postId IN (:...postIds)', { postIds })
      .andWhere('pr.boostType = :type', { type: 'top' })
      .andWhere('pr.startAt <= :now', { now })
      .andWhere('pr.endAt >= :now', { now })
      .getMany();
    return new Set(promos.map(p => Number(p.postId)));
  }

  async list(query: any, userId?: number) {
    const { type, industry, keyword, page = 1, pageSize = 20 } = query;
    const qb = this.postRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.status = :status', { status: 'active' });

    if (type) qb.andWhere('p.type = :type', { type });
    if (industry) qb.andWhere('p.industry = :industry', { industry });
    if (keyword) {
      qb.andWhere(
        '(p.title LIKE :kw OR p.content LIKE :kw)',
        { kw: `%${keyword}%` }
      );
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    const certMap = await this.getEnterpriseCertMap((list || []).map(item => Number(item.userId)));
    const promotedIds = await this.getPromotedPostIds((list || []).map(item => Number(item.id)));

    // 查询当前用户已解锁的信息
    const postIds = list.map(item => Number(item.id));
    const unlockedPostIds = new Set<number>();
    if (userId && postIds.length > 0) {
      const unlocks = await this.unlockRepo.find({
        where: { userId, postId: In(postIds) },
      });
      unlocks.forEach(unlock => unlockedPostIds.add(Number(unlock.postId)));
    }

    const normalizedList = (list || []).map(item => {
      const postId = Number(item.id);
      const itemUserId = Number(item.userId);
      const isOwner = !!(userId && userId > 0 && itemUserId === userId);
      const isUnlocked = isOwner || unlockedPostIds.has(postId);

      // 构建基础信息
      const baseInfo = {
        ...this.buildCompanyInfo(item, certMap),
        isPromoted: promotedIds.has(postId),
        contactUnlocked: isUnlocked,
      };

      // 只有已解锁或是发布者本人才返回联系方式
      if (isUnlocked) {
        return {
          ...baseInfo,
          ...this.buildVisibleContactInfo(item, isOwner),
        };
      }

      // 未解锁时不返回联系方式
      return baseInfo;
    });

    // 置顶帖排前面
    normalizedList.sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0));

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
    const promotedIds = await this.getPromotedPostIds((list || []).map(item => Number(item.id)));
    const normalizedList = (list || []).map(item => ({
      ...this.buildCompanyInfo(item, certMap),
      isPromoted: promotedIds.has(Number(item.id)),
      contactUnlocked: true, // 自己的信息始终已解锁
      ...this.buildVisibleContactInfo(item, true),
    }));
    return { list: normalizedList, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number, userId: number) {
    // 验证ID
    const postId = Number(id);
    if (!postId || isNaN(postId) || postId <= 0) {
      throw new BadRequestException('无效的信息ID');
    }

    const post = await this.postRepo.findOne({ where: { id: postId }, relations: ['user'] });
    if (!post) throw new BadRequestException('信息不存在');

    post.viewCount++;
    await this.postRepo.save(post);

    const unlocked = await this.unlockRepo.findOne({ where: { userId, postId: postId } });
    const userPostCount = await this.postRepo.count({
      where: { userId: post.userId, status: 'active' as any },
    });
    const certMap = await this.getEnterpriseCertMap([Number(post.userId)]);

    const normalizedPost = this.buildCompanyInfo(post, certMap);

    // 判断是否已解锁（修复类型比较问题）
    const postUserId = Number(post.userId);
    const isOwner = !!(userId && userId > 0 && postUserId === userId);
    const isUnlocked = !!unlocked || isOwner;

    // 如果已解锁，返回联系方式
    const contactInfo = isUnlocked ? this.buildVisibleContactInfo(post, isOwner) : {};

    return {
      ...normalizedPost,
      ...contactInfo,
      postCount: userPostCount,
      contactUnlocked: isUnlocked,
    };
  }

  async create(userId: number, dto: any) {
    const {
      type,
      title,
      category,
      processMode: rawProcessMode,
      description,
      images,
      showPhone,
      showWechat,
      showWechatQr,
      validityDays,
      contactName,
      contactPhone,
      contactWechat,
      contactWechatQr,
      ...structuredFields
    } = dto;

    const processMode =
      type === 'process' ? this.normalizeProcessMode(rawProcessMode) : '';
    if (type === 'process' && !processMode) {
      throw new BadRequestException('璇烽€夋嫨鍔犲伐绫诲瀷');
    }
    const normalizedTitle =
      type === 'process'
        ? this.buildProcessTitle(processMode, category, title)
        : this.normalizeText(title);
    const contentFields =
      type === 'process' && processMode
        ? { ...structuredFields, processMode }
        : structuredFields;
    const content = this.composePostContent(
      type,
      normalizedTitle,
      description,
      contentFields,
    );
    const normalizedContactName = this.normalizeText(contactName) || null;
    const normalizedContactPhone = this.normalizeText(contactPhone) || null;
    const normalizedContactWechat = this.normalizeText(contactWechat) || null;
    const normalizedContactWechatQr = this.normalizeText(contactWechatQr) || null;
    const hasShowPhone = Object.prototype.hasOwnProperty.call(dto, 'showPhone');
    const hasShowWechat = Object.prototype.hasOwnProperty.call(dto, 'showWechat');
    const hasShowWechatQr = Object.prototype.hasOwnProperty.call(dto, 'showWechatQr');
    const phoneVisible = hasShowPhone
      ? this.parseVisibility(showPhone, !!normalizedContactPhone)
      : !!normalizedContactPhone;
    const wechatVisible = hasShowWechat
      ? this.parseVisibility(showWechat, !!normalizedContactWechat)
      : !!normalizedContactWechat;
    const wechatQrVisible = hasShowWechatQr
      ? this.parseVisibility(showWechatQr, !!normalizedContactWechatQr)
      : !!normalizedContactWechatQr;

    await this.checkKeywords(content + (normalizedTitle || ''));
    if (!phoneVisible && !wechatVisible && !wechatQrVisible) {
      throw new BadRequestException('请至少选择一种联系方式');
    }
    if (phoneVisible && !normalizedContactPhone) {
      throw new BadRequestException('请填写联系电话');
    }
    if (wechatVisible && !normalizedContactWechat) {
      throw new BadRequestException('请填写微信号');
    }
    if (wechatQrVisible && !normalizedContactWechatQr) {
      throw new BadRequestException('请上传微信二维码');
    }

    const normalizedImages = this.normalizeStringArray(images);
    const existing = await this.findRecentDuplicatePost(userId, {
      type,
      title: normalizedTitle,
      industry: category,
      processMode: processMode || undefined,
      content,
      contactName: normalizedContactName,
      contactPhone: normalizedContactPhone,
      contactWechat: normalizedContactWechat,
      contactWechatQr: normalizedContactWechatQr,
      showPhone: phoneVisible ? 1 : 0,
      showWechat: wechatVisible ? 1 : 0,
      showWechatQr: wechatQrVisible ? 1 : 0,
    });
    if (existing) return existing;

    const submitter = await this.userRepo.findOneBy({ id: userId });
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [type, normalizedTitle, description, contentFields, normalizedContactName, normalizedContactPhone, normalizedContactWechat],
      images: [normalizedImages, normalizedContactWechatQr],
      openid: submitter?.openid,
    });

    const postData: Partial<Post> = {
      userId,
      type,
      title: normalizedTitle || undefined,
      industry: category,
      processMode: processMode || undefined,
      content,
      expireAt: validityDays ? new Date(Date.now() + Number(validityDays) * 24 * 3600 * 1000) : undefined,
      showPhone: phoneVisible ? 1 : 0,
      showWechat: wechatVisible ? 1 : 0,
      showWechatQr: wechatQrVisible ? 1 : 0,
    };
    if (Object.keys(structuredFields).length) postData.fields = structuredFields;
    if (normalizedImages?.length) postData.images = normalizedImages;
    if (normalizedContactName) postData.contactName = normalizedContactName;
    if (normalizedContactPhone) postData.contactPhone = normalizedContactPhone;
    if (normalizedContactWechat) postData.contactWechat = normalizedContactWechat;
    if (normalizedContactWechatQr) postData.contactWechatQr = normalizedContactWechatQr;

    const post = this.postRepo.create(postData);
    return this.postRepo.save(post);
  }

  async update(id: number, userId: number, dto: any) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) throw new ForbiddenException('无权操作');
    const submitter = await this.userRepo.findOneBy({ id: userId });
    await this.checkKeywords((dto.content || '') + (dto.title || ''));
    await this.wechatSecurityService.assertSafeSubmission({
      texts: [dto],
      images: [dto.images, dto.contactWechatQr],
      openid: submitter?.openid,
    });
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

  async previewUnlockCost(postId: number, userId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new BadRequestException('信息不存在');
    if (post.userId === userId) return { alreadyUnlocked: true, cost: 0, isFree: true };

    const existing = await this.unlockRepo.findOne({ where: { userId, postId } });
    if (existing) return { alreadyUnlocked: true, cost: 0, isFree: true };

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    // 读取配置
    const baseCost = parseInt(await this.getConfig('unlock_contact_cost', '10')) || 10;
    const dailyFree = parseInt(await this.getConfig('member_daily_free_views', '5')) || 5;
    const discount = parseFloat(await this.getConfig('member_view_discount', '0.5')) || 0.5;

    // 判断会员状态
    const isMember = user.isMember && user.memberExpireAt && new Date(user.memberExpireAt) > new Date();

    let actualCost = baseCost;
    let isFree = false;
    let freeRemaining = 0;

    if (isMember) {
      // 统计今日已用免费次数
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayUnlocks = await this.unlockRepo.count({
        where: { userId, createdAt: MoreThanOrEqual(todayStart) },
      });

      freeRemaining = Math.max(0, dailyFree - todayUnlocks);

      if (todayUnlocks < dailyFree) {
        // 免费额度内
        actualCost = 0;
        isFree = true;
      } else {
        // 超出免费额度，打折
        actualCost = Math.ceil(baseCost * discount);
      }
    }

    return {
      alreadyUnlocked: false,
      cost: actualCost,
      baseCost,
      isMember,
      isFree,
      freeRemaining,
      beanBalance: user.beanBalance,
      sufficient: user.beanBalance >= actualCost,
    };
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
