import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Promotion } from '../../entities/promotion.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { Notification } from '../../entities/notification.entity';
import { Notice } from '../../entities/notice.entity';
import { PaymentService } from '../payment/payment.service';

type TopPricingItem = {
  durationDays: number;
  beanCost: number;
  originalBeanCost: number;
  isDiscounted: boolean;
};

type HomeBannerItem = {
  id: string;
  kind: 'ad' | 'notice' | 'notice-img' | 'default';
  /** 商业广告：后台/运营为 admin，用户付费为 user */
  source?: 'admin' | 'user';
  title?: string;
  sub?: string;
  bg?: string;
  imageUrl?: string;
  link?: string;
  linkType?: string;
  time?: string;
};

/** 首页 Tab 与 ad_orders.slot 对应（旧 banner 位不参与新首页接口） */
export const HOME_MODULE_TO_SLOT: Record<string, string> = {
  purchase: 'home_purchase',
  stock: 'home_stock',
  process: 'home_process',
  job: 'home_job',
};

/** 用户付费投放允许的 slot */
export const PURCHASABLE_AD_SLOTS = [
  'feed',
  'banner',
  'home_purchase',
  'home_stock',
  'home_process',
  'home_job',
] as const;

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(AdOrder) private adRepo: Repository<AdOrder>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction)
    private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(SysConfig) private sysConfigRepo: Repository<SysConfig>,
    @InjectRepository(Notification) private notiRepo: Repository<Notification>,
    @InjectRepository(Notice) private noticeRepo: Repository<Notice>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  private buildDefaultEnterpriseBanners(): HomeBannerItem[] {
    return [
      {
        id: 'default-1',
        kind: 'default',
        title: '新用户专享',
        sub: '注册送 30 灵豆',
        bg: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
      },
      {
        id: 'default-2',
        kind: 'default',
        title: '会员特权',
        sub: '每日免费查看联系方式',
        bg: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
      },
      {
        id: 'default-3',
        kind: 'default',
        title: '发布招工',
        sub: '快速找到靠谱临工',
        bg: 'linear-gradient(135deg, #10B981 0%, #0EA5E9 100%)',
      },
    ];
  }

  private formatBannerDate(value?: Date | string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() === now.getFullYear()
      ? `${mm}-${dd}`
      : `${date.getFullYear()}-${mm}-${dd}`;
  }

  /** 两组轮播项交错：先取 first 一条再取 second 一条，直至耗尽 */
  private interleaveBannerGroups(
    first: HomeBannerItem[],
    second: HomeBannerItem[],
  ): HomeBannerItem[] {
    const list: HomeBannerItem[] = [];
    let i = 0;
    let j = 0;
    while (i < first.length || j < second.length) {
      if (i < first.length) {
        list.push(first[i]);
        i += 1;
      }
      if (j < second.length) {
        list.push(second[j]);
        j += 1;
      }
    }
    return list;
  }

  private async getConfig(key: string, defaultValue: string): Promise<string> {
    const row = await this.sysConfigRepo.findOne({ where: { key } });
    return row ? row.value : defaultValue;
  }

  private isMemberActive(user: User): boolean {
    return !!(
      user.isMember &&
      user.memberExpireAt &&
      new Date(user.memberExpireAt) > new Date()
    );
  }

  private async getTopBasePricing() {
    const [day1, day3, day7, day30] = await Promise.all([
      this.getConfig('top_price_per_day', '100'),
      this.getConfig('top_price_3d', '250'),
      this.getConfig('top_price_7d', '500'),
      this.getConfig('top_price_30d', '1500'),
    ]);

    return [
      { durationDays: 1, beanCost: parseInt(day1, 10) || 100 },
      { durationDays: 3, beanCost: parseInt(day3, 10) || 250 },
      { durationDays: 7, beanCost: parseInt(day7, 10) || 500 },
      { durationDays: 30, beanCost: parseInt(day30, 10) || 1500 },
    ];
  }

  private async buildTopPricingForUser(user: User): Promise<TopPricingItem[]> {
    const baseList = await this.getTopBasePricing();
    const memberDiscount =
      parseFloat(await this.getConfig('member_promote_discount', '0.8')) || 0.8;
    const isMember = this.isMemberActive(user);

    return baseList.map((item) => {
      const originalBeanCost = item.beanCost;
      const beanCost = isMember
        ? Math.ceil(originalBeanCost * memberDiscount)
        : originalBeanCost;
      return {
        durationDays: item.durationDays,
        beanCost,
        originalBeanCost,
        isDiscounted: isMember && beanCost < originalBeanCost,
      };
    });
  }

  async getTopPricing(userId: number) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    const list = await this.buildTopPricingForUser(user);
    return { list };
  }

  async promote(userId: number, dto: any) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const durationDays = Number(dto.durationDays || 0);
    if (!durationDays) throw new BadRequestException('置顶时长不能为空');

    const postId = Number(dto.postId || 0);
    if (!postId) throw new BadRequestException('帖子ID不能为空');

    const pricingList = await this.buildTopPricingForUser(user);
    const pricing = pricingList.find(
      (item) => item.durationDays === durationDays,
    );
    if (!pricing) throw new BadRequestException('不支持的置顶时长');
    const actualCost = pricing.beanCost;

    if (user.beanBalance < actualCost)
      throw new BadRequestException('灵豆不足');

    user.beanBalance -= actualCost;
    await this.userRepo.save(user);

    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + durationDays);

    const promo = this.promoRepo.create({
      userId,
      postId,
      beanCost: actualCost,
      durationDays,
      boostType: dto.boostType || 'top',
      startAt,
      endAt,
    });
    await this.promoRepo.save(promo);

    await this.beanTxRepo.save(
      this.beanTxRepo.create({
        userId,
        type: 'promote',
        amount: -actualCost,
        refType: 'promotion',
        refId: promo.id,
        remark: this.isMemberActive(user) ? '信息推广(会员折扣)' : '信息推广',
      }),
    );

    // 通知
    await this.notiRepo.save(
      this.notiRepo.create({
        userId,
        type: 'promotion' as any,
        title: '置顶推广成功',
        content: `您的信息已置顶${durationDays}天，消耗${actualCost}灵豆`,
      }),
    );

    return {
      message: '推广成功',
      beanBalance: user.beanBalance,
      actualCost,
      durationDays,
    };
  }

  async purchaseAd(userId: number, dto: any) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const slot = String(dto.slot || '').trim();
    if (!slot || !PURCHASABLE_AD_SLOTS.includes(slot as any)) {
      throw new BadRequestException('无效的投放位置');
    }

    // 会员广告投放9折
    let actualPrice = dto.price;
    if (this.isMemberActive(user)) {
      actualPrice = Math.round(dto.price * 0.9 * 100) / 100;
    }

    const ad = this.adRepo.create({
      userId,
      slot,
      title: dto.title,
      imageUrl: dto.imageUrl,
      link: dto.link,
      linkType: dto.linkType || 'internal',
      durationDays: dto.durationDays,
      price: actualPrice,
      status: 'pending',
    });
    await this.adRepo.save(ad);

    const outTradeNo = this.paymentService.generateOutTradeNo('AD', ad.id);
    const host = this.config.get('API_HOST', 'https://quanqiutong888.com');
    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `聚采通广告投放-${dto.durationDays}天`,
      totalFee: Math.round(actualPrice * 100),
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return { orderId: ad.id, actualPrice, ...result };
  }

  async getActiveAds(slot: string) {
    const now = new Date();
    const ads = await this.adRepo.find({
      where: {
        slot: slot as any,
        status: 'active' as any,
        startAt: LessThanOrEqual(now),
        endAt: MoreThanOrEqual(now),
      },
      order: { createdAt: 'ASC' },
      take: 10,
    });
    return { list: ads };
  }

  /**
   * 企业首页 Banner（按 Tab 模块独立）
   * @param module purchase | stock | process | job，缺省为 purchase（兼容旧客户端）
   */
  async getEnterpriseHomeBanners(module?: string) {
    const key = (module || 'purchase').trim().toLowerCase();
    const slot = HOME_MODULE_TO_SLOT[key];
    if (!slot) {
      throw new BadRequestException(
        'module 须为 purchase、stock、process、job 之一',
      );
    }

    const now = new Date();
    const adRes = await this.getActiveAds(slot);
    const rawNotices = await this.noticeRepo.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const adBanners: HomeBannerItem[] = (adRes.list || []).map((ad) => ({
      id: `ad-${ad.id}`,
      kind: 'ad' as const,
      source: ad.userId ? ('user' as const) : ('admin' as const),
      imageUrl: ad.imageUrl,
      link: ad.link,
      linkType: ad.linkType || 'internal',
    }));

    const noticeBanners: HomeBannerItem[] = rawNotices
      .filter(
        (notice) =>
          Number(notice.isActive) === 1 &&
          (!notice.expireAt || new Date(notice.expireAt) > now),
      )
      .map((notice) => ({
        id: `notice-${notice.id}`,
        kind: (notice.imageUrl ? 'notice-img' : 'notice') as
          | 'notice-img'
          | 'notice',
        title: notice.title,
        sub: notice.content,
        imageUrl: notice.imageUrl || '',
        time: this.formatBannerDate(notice.createdAt),
      }));

    const defaults = this.buildDefaultEnterpriseBanners();

    if (adBanners.length > 0) {
      return {
        list: this.interleaveBannerGroups(adBanners, noticeBanners),
      };
    }

    if (noticeBanners.length === 0) {
      return { list: defaults };
    }

    return {
      list: this.interleaveBannerGroups(noticeBanners, defaults),
    };
  }

  async getAdPricing() {
    const bannerPrice = parseFloat(
      await this.getConfig('banner_ad_price', '100'),
    );
    const feedPrice = parseFloat(await this.getConfig('feed_ad_price', '50'));
    const dailyFreeViews = parseInt(
      await this.getConfig('member_daily_free_views', '5'),
      10,
    );
    return { bannerPrice, feedPrice, dailyFreeViews };
  }
}
