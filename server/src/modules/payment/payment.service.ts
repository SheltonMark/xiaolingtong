import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { MemberOrder } from '../../entities/member-order.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { AdOrder } from '../../entities/ad-order.entity';
import { Settlement } from '../../entities/settlement.entity';
import { SettlementItem } from '../../entities/settlement-item.entity';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { Job } from '../../entities/job.entity';

const WxPay = require('wechatpay-node-v3');

@Injectable()
export class PaymentService {
  private pay: any;
  private readonly logger = new Logger(PaymentService.name);
  private readonly appid: string;
  private readonly mchid: string;
  private readonly apiv3Key: string;

  constructor(
    private config: ConfigService,
    @InjectRepository(MemberOrder) private memberOrderRepo: Repository<MemberOrder>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BeanTransaction) private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(AdOrder) private adOrderRepo: Repository<AdOrder>,
    @InjectRepository(Settlement) private settlementRepo: Repository<Settlement>,
    @InjectRepository(SettlementItem) private settlementItemRepo: Repository<SettlementItem>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private walletTxRepo: Repository<WalletTransaction>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {
    this.appid = config.get('WX_APPID', '');
    this.mchid = config.get('WX_MCH_ID', '');
    this.apiv3Key = config.get('WX_APIV3_KEY', '');

    const keyPath = config.get('WX_MCH_KEY_PATH');
    const serialNo = config.get('WX_MCH_SERIAL');
    const pubKeyPath = config.get('WX_PAY_PUBLIC_KEY_PATH');
    const pubKeyId = config.get('WX_PAY_PUBLIC_KEY_ID');

    if (keyPath && serialNo) {
      try {
        const opts: any = {
          appid: this.appid,
          mchid: this.mchid,
          privateKey: fs.readFileSync(keyPath),
          serial_no: serialNo,
          key: this.apiv3Key,
        };
        // 使用微信支付公钥验签（新方案）
        if (pubKeyPath && pubKeyId) {
          opts.publicKey = fs.readFileSync(pubKeyPath);
          opts.publicKeyId = pubKeyId;
        }
        this.pay = new WxPay(opts);
        this.logger.log('微信支付初始化成功');
      } catch (e) {
        this.logger.error('微信支付初始化失败', e.message);
      }
    } else {
      this.logger.warn('微信支付配置不完整，跳过初始化');
    }
  }

  /** 生成商户订单号: PREFIX_ORDERID_TIMESTAMP_RAND */
  generateOutTradeNo(prefix: string, orderId?: number) {
    const ts = Date.now().toString();
    const rand = crypto.randomBytes(4).toString('hex');
    return orderId ? `${prefix}_${orderId}_${ts}_${rand}` : `${prefix}_0_${ts}_${rand}`;
  }

  /** JSAPI 下单（小程序支付） */
  async createJsapiOrder(params: {
    outTradeNo: string;
    description: string;
    totalFee: number; // 单位：分
    openid: string;
    notifyUrl: string;
  }) {
    const result = await this.pay.transactions_jsapi({
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: params.notifyUrl,
      amount: { total: params.totalFee, currency: 'CNY' },
      payer: { openid: params.openid },
    });
    this.logger.log(`JSAPI下单: ${params.outTradeNo}, prepay_id: ${result?.prepay_id}`);
    return result;
  }

  /** 解密回调通知 */
  decryptNotify(body: any) {
    const { resource } = body;
    const { ciphertext, nonce, associated_data } = resource;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.apiv3Key),
      Buffer.from(nonce),
    );
    const authTag = Buffer.from(ciphertext, 'base64').slice(-16);
    const data = Buffer.from(ciphertext, 'base64').slice(0, -16);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associated_data));
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  /** 商家转账到零钱（提现用） */
  async transferToWallet(params: {
    outBatchNo: string;
    outDetailNo: string;
    openid: string;
    amount: number; // 单位：分
    remark: string;
  }) {
    // 商家转账到零钱 V3 接口
    const result = await this.pay.batches_transfer({
      appid: this.appid,
      out_batch_no: params.outBatchNo,
      batch_name: '临工提现',
      batch_remark: params.remark,
      total_amount: params.amount,
      total_num: 1,
      transfer_detail_list: [{
        out_detail_no: params.outDetailNo,
        transfer_amount: params.amount,
        transfer_remark: params.remark,
        openid: params.openid,
      }],
    });
    this.logger.log(`转账: ${params.outDetailNo}, amount: ${params.amount}`);
    return result;
  }

  /** 查询订单状态 */
  async queryOrder(outTradeNo: string) {
    return this.pay.query({ out_trade_no: outTradeNo });
  }

  /** 支付成功回调处理 */
  async handlePaySuccess(outTradeNo: string, result: any) {
    this.logger.log(`支付成功: ${outTradeNo}`);
    const prefix = outTradeNo.split('_')[0];

    switch (prefix) {
      case 'MBR': return this.handleMemberPay(outTradeNo, result);
      case 'BEAN': return this.handleBeanPay(outTradeNo, result);
      case 'AD': return this.handleAdPay(outTradeNo, result);
      case 'STL': return this.handleSettlementPay(outTradeNo, result);
      default:
        this.logger.warn(`未知订单前缀: ${prefix}, outTradeNo: ${outTradeNo}`);
    }
  }

  /** 会员支付回调 */
  private async handleMemberPay(outTradeNo: string, result: any) {
    const order = await this.memberOrderRepo.findOne({ where: { id: this.extractId(outTradeNo) } });
    if (!order || order.payStatus === 'paid') return;
    order.payStatus = 'paid';
    order.paidAt = new Date();
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + order.durationDays);
    order.expireAt = expireAt;
    await this.memberOrderRepo.save(order);
    await this.userRepo.update(order.userId, { isMember: 1, memberExpireAt: expireAt });
  }

  /** 灵豆充值回调 */
  private async handleBeanPay(outTradeNo: string, result: any) {
    // 从 amount 反推灵豆数量，或从订单记录中获取
    const totalFen = result.amount?.total || 0;
    const beanAmount = totalFen; // 1分=1灵豆，可按配置调整
    const openid = result.payer?.openid;
    if (!openid) return;
    const user = await this.userRepo.findOne({ where: { openid } });
    if (!user) return;
    // 防重复：检查是否已处理
    const exists = await this.beanTxRepo.findOne({ where: { refType: 'recharge', remark: outTradeNo } });
    if (exists) return;
    await this.userRepo.update(user.id, { beanBalance: () => `beanBalance + ${beanAmount}` });
    await this.beanTxRepo.save(this.beanTxRepo.create({
      userId: user.id, type: 'recharge', amount: beanAmount,
      refType: 'recharge', remark: outTradeNo,
    }));
  }

  /** 广告支付回调 */
  private async handleAdPay(outTradeNo: string, result: any) {
    const orderId = this.extractId(outTradeNo);
    const order = await this.adOrderRepo.findOne({ where: { id: orderId } });
    if (!order || order.status !== 'pending') return;
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + order.durationDays);
    await this.adOrderRepo.update(orderId, { status: 'active', startAt, endAt });
  }

  /** 用工结算支付回调 */
  private async handleSettlementPay(outTradeNo: string, result: any) {
    const stlId = this.extractId(outTradeNo);
    const stl = await this.settlementRepo.findOne({ where: { id: stlId } });
    if (!stl || stl.status !== 'pending') return;
    stl.status = 'paid';
    stl.paidAt = new Date();
    await this.settlementRepo.save(stl);

    // 分发工资到各临工钱包
    const items = await this.settlementItemRepo.find({ where: { settlementId: stl.id } });
    for (const item of items) {
      let wallet = await this.walletRepo.findOne({ where: { userId: item.workerId } });
      if (!wallet) {
        wallet = this.walletRepo.create({ userId: item.workerId });
        wallet = await this.walletRepo.save(wallet);
      }
      wallet.balance = +wallet.balance + +item.workerPay;
      wallet.totalIncome = +wallet.totalIncome + +item.workerPay;
      await this.walletRepo.save(wallet);

      await this.walletTxRepo.save(this.walletTxRepo.create({
        userId: item.workerId, type: 'income', amount: item.workerPay,
        refType: 'settlement', refId: stl.id, status: 'success',
        remark: '工资结算',
      }));

      // 完工信用分 +2
      await this.userRepo.increment({ id: item.workerId }, 'creditScore', 2);
    }

    // 分发管理员服务费
    if (stl.supervisorId && +stl.supervisorFee > 0) {
      let supWallet = await this.walletRepo.findOne({ where: { userId: stl.supervisorId } });
      if (!supWallet) {
        supWallet = this.walletRepo.create({ userId: stl.supervisorId });
        supWallet = await this.walletRepo.save(supWallet);
      }
      supWallet.balance = +supWallet.balance + +stl.supervisorFee;
      supWallet.totalIncome = +supWallet.totalIncome + +stl.supervisorFee;
      await this.walletRepo.save(supWallet);

      await this.walletTxRepo.save(this.walletTxRepo.create({
        userId: stl.supervisorId, type: 'income', amount: stl.supervisorFee,
        refType: 'settlement', refId: stl.id, status: 'success',
        remark: '管理员服务费',
      }));
    }

    stl.status = 'distributed';
    await this.settlementRepo.save(stl);

    // Job 状态改为 settled
    await this.jobRepo.update(stl.jobId, { status: 'settled' });
  }

  private extractId(outTradeNo: string): number {
    // 格式: PREFIX_TIMESTAMP_RAND，但创建时我们会把 orderId 放进去
    // 改为: PREFIX_ORDERID_TIMESTAMP_RAND
    const parts = outTradeNo.split('_');
    return parseInt(parts[1]) || 0;
  }
}
