import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { SysConfig } from '../../entities/sys-config.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { InviteService } from '../invite/invite.service';
import { NotificationService } from '../notification/notification.service';
import axios from 'axios';

const ALLOWED_ROLES = ['enterprise', 'worker'];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(BeanTransaction)
    private beanTxRepo: Repository<BeanTransaction>,
    @InjectRepository(SysConfig)
    private sysConfigRepo: Repository<SysConfig>,
    private jwt: JwtService,
    private config: ConfigService,
    private inviteService: InviteService,
    private notificationService: NotificationService,
  ) {}

  private async getSysConfigValue(key: string, defaultValue: string): Promise<string> {
    const config = await this.sysConfigRepo.findOneBy({ key });
    return config?.value || defaultValue;
  }

  private async markUserActive(userId: number) {
    const normalizedUserId = Number(userId || 0);
    if (!normalizedUserId) return;
    await this.userRepo.update(normalizedUserId, {
      lastActiveAt: new Date(),
    });
  }

  async wxLogin(code: string, inviteCode?: string) {
    const appid = this.config.get('WX_APPID');
    const secret = this.config.get('WX_SECRET');

    let openid: string;

    if (!appid || !secret) {
      openid = `dev_${code}`;
    } else {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const { data } = await axios.get(url);
      if (data.errcode) {
        throw new BadRequestException(data.errmsg || '微信登录失败');
      }
      openid = data.openid;
    }

    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = this.userRepo.create({ openid });
      user = await this.userRepo.save(user);
      await this.walletRepo.save(this.walletRepo.create({ userId: user.id }));

      const code = await this.inviteService.ensureInviteCode(user.id);
      user.inviteCode = code;

      if (inviteCode) {
        const inviter = await this.userRepo.findOne({ where: { inviteCode } });
        if (inviter && inviter.id !== user.id) {
          await this.inviteService.recordInvite(
            inviter.id,
            user.id,
            inviteCode,
          );
          user.invitedBy = inviter.id;
        }
      }
    }

    await this.markUserActive(user.id);

    const token = this.jwt.sign({ sub: user.id, role: user.role });
    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        beanBalance: user.beanBalance,
        isMember: user.isMember,
        creditScore: user.creditScore,
      },
    };
  }

  async chooseRole(userId: number, role: string) {
    if (!ALLOWED_ROLES.includes(role)) {
      throw new BadRequestException('角色不合法');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');

    const isFirstRole = !user.role;
    await this.userRepo.update(userId, { role });

    if (isFirstRole) {
      const rewardStr = await this.getSysConfigValue('new_user_bean_reward', '30');
      const beanReward = parseInt(rewardStr, 10) || 30;

      await this.userRepo.update(userId, {
        beanBalance: () => `beanBalance + ${beanReward}`,
      });
      await this.beanTxRepo.save(
        this.beanTxRepo.create({
          userId,
          type: 'invite_reward',
          amount: beanReward,
          refType: 'welcome',
          remark: '新用户注册奖励',
        }),
      );

      if (user.invitedBy) {
        const inviteRewardStr = await this.getSysConfigValue('invite_bean_reward', '5');
        const inviteBeanReward = parseInt(inviteRewardStr, 10) || 5;

        await this.userRepo.update(user.invitedBy, {
          beanBalance: () => `beanBalance + ${inviteBeanReward}`,
        });
        await this.beanTxRepo.save(
          this.beanTxRepo.create({
            userId: user.invitedBy,
            type: 'invite_reward',
            amount: inviteBeanReward,
            refType: 'invite',
            remark: `邀请用户${user.nickname || userId}注册奖励`,
          }),
        );

        await this.notificationService.create(user.invitedBy, {
          type: 'invite' as any,
          title: '邀请成功',
          content: `您邀请的用户已注册，角色：${role === 'enterprise' ? '企业' : '零工'}，奖励${inviteBeanReward}灵豆已到账`,
        });
      }
    }

    const updated = await this.userRepo.findOneBy({ id: userId });
    const token = this.jwt.sign({ sub: updated!.id, role: updated!.role });
    return { token, role: updated!.role };
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    await this.markUserActive(userId);

    let certStatus = 'none';
    let certName = '';

    if (user.role === 'enterprise') {
      const cert = await this.userRepo.manager.findOne(EnterpriseCert, {
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (cert) {
        certStatus = cert.status;
        certName = cert.companyName;
      }
    } else if (user.role === 'worker') {
      const cert = await this.userRepo.manager.findOne(WorkerCert, {
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (cert) {
        certStatus = cert.status;
        certName = cert.realName;
      }
    }

    return {
      id: user.id,
      role: user.role,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      beanBalance: user.beanBalance,
      isMember: user.isMember,
      memberExpireAt: user.memberExpireAt,
      creditScore: user.creditScore,
      certStatus,
      certName,
      isVerified: certStatus === 'approved',
      inviteCode: user.inviteCode,
    };
  }

  async bindPhone(userId: number, code: string) {
    const appid = this.config.get('WX_APPID');
    const secret = this.config.get('WX_SECRET');

    const tokenRes = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
    );
    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      throw new BadRequestException('获取 access_token 失败');
    }

    const phoneRes = await axios.post(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
      { code },
    );
    const phoneInfo = phoneRes.data?.phone_info;
    if (!phoneInfo?.phoneNumber) {
      throw new BadRequestException('获取手机号失败');
    }

    await this.userRepo.update(userId, { phone: phoneInfo.phoneNumber });
    return { phone: phoneInfo.phoneNumber };
  }
}
