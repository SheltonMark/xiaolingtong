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
import { PaymentService } from '../payment/payment.service';

type TopPricingItem = {
  durationDays: number;
  beanCost: number;
  originalBeanCost: number;
  isDiscounted: boolean;
};

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
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

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

    // 会员广告投放9折
    let actualPrice = dto.price;
    if (this.isMemberActive(user)) {
      actualPrice = Math.round(dto.price * 0.9 * 100) / 100;
    }

    const ad = this.adRepo.create({
      userId,
      slot: dto.slot,
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
      description: `小灵通广告投放-${dto.durationDays}天`,
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
