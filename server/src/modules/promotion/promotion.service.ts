import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from '../../entities/promotion.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(AdOrder) private adRepo: Repository<AdOrder>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
  ) {}

  async promote(userId: number, dto: any) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || user.beanBalance < dto.beanCost) throw new BadRequestException('灵豆不足');

    user.beanBalance -= dto.beanCost;
    await this.userRepo.save(user);

    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + dto.durationDays);

    const promo = this.promoRepo.create({
      userId, postId: dto.postId, beanCost: dto.beanCost,
      durationDays: dto.durationDays, boostType: dto.boostType || 'top',
      startAt, endAt,
    });
    await this.promoRepo.save(promo);

    await this.beanTxRepo.save(this.beanTxRepo.create({
      userId, type: 'promote', amount: -dto.beanCost,
      refType: 'promotion', refId: promo.id, remark: '信息推广',
    }));

    return { message: '推广成功', beanBalance: user.beanBalance };
  }

  async purchaseAd(userId: number, dto: any) {
    // TODO: 接入微信支付
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + dto.durationDays);

    const ad = this.adRepo.create({
      userId, slot: dto.slot, title: dto.title,
      imageUrl: dto.imageUrl, link: dto.link,
      durationDays: dto.durationDays, price: dto.price,
      status: 'active', startAt, endAt,
    });
    return this.adRepo.save(ad);
  }
}
