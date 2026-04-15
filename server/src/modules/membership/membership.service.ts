import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { PaymentService } from '../payment/payment.service';

type PlanKey = 'monthly' | 'quarterly' | 'yearly';

interface MembershipPlan {
  key: PlanKey;
  name: string;
  unit: string;
  durationDays: number;
  price: number;
}

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MemberOrder) private orderRepo: Repository<MemberOrder>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  private async getConfigNumber(
    key: string,
    defaultValue: number,
  ): Promise<number> {
    const row = await this.configRepo.findOne({ where: { key } });
    const parsed = Number(row ? row.value : defaultValue);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
  }

  private async getConfigInt(
    key: string,
    defaultValue: number,
  ): Promise<number> {
    const n = await this.getConfigNumber(key, defaultValue);
    return Math.max(0, Math.round(n));
  }

  private async getMembershipPlansInternal(): Promise<MembershipPlan[]> {
    const [monthlyPrice, quarterlyPrice, yearlyPrice] = await Promise.all([
      this.getConfigNumber('member_monthly_price', 99),
      this.getConfigNumber('member_quarterly_price', 238),
      this.getConfigNumber('member_yearly_price', 799),
    ]);

    return [
      {
        key: 'monthly',
        name: '月度会员',
        unit: '月',
        durationDays: 30,
        price: monthlyPrice,
      },
      {
        key: 'quarterly',
        name: '季度会员',
        unit: '季',
        durationDays: 90,
        price: quarterlyPrice,
      },
      {
        key: 'yearly',
        name: '年度会员',
        unit: '年',
        durationDays: 365,
        price: yearlyPrice,
      },
    ];
  }

  private resolvePlan(
    dto: any,
    plans: MembershipPlan[],
  ): MembershipPlan | undefined {
    const planKey = String(dto?.planKey || '').trim();
    if (planKey) {
      return plans.find((p) => p.key === planKey);
    }

    const durationDays = Number(dto?.durationDays || 0);
    if (durationDays > 0) {
      return plans.find((p) => p.durationDays === durationDays);
    }

    const planName = String(dto?.planName || '').trim();
    if (planName) {
      return plans.find((p) => p.name === planName);
    }

    return undefined;
  }

  async getPlans() {
    const [list, dailyFreeViews] = await Promise.all([
      this.getMembershipPlansInternal(),
      this.getConfigInt('member_daily_free_views', 5),
    ]);

    return { list, dailyFreeViews };
  }

  async subscribe(userId: number, dto: any) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new Error('用户不存在');

    const plans = await this.getMembershipPlansInternal();
    const plan = this.resolvePlan(dto, plans);
    if (!plan) throw new BadRequestException('会员套餐不存在');

    const order = this.orderRepo.create({
      userId,
      planName: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      payStatus: 'pending',
    });
    await this.orderRepo.save(order);

    const outTradeNo = this.paymentService.generateOutTradeNo('MBR', order.id);
    const host = this.config.get('API_HOST', 'https://quanqiutong888.com');
    const result = await this.paymentService.createJsapiOrder({
      outTradeNo,
      description: `聚采通会员-${plan.name}`,
      totalFee: Math.round(plan.price * 100),
      openid: user.openid,
      notifyUrl: `${host}/api/payment/notify`,
    });

    return {
      orderId: order.id,
      planKey: plan.key,
      planName: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      ...result,
    };
  }
}
