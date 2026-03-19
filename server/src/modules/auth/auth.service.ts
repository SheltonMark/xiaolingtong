import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
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
    private jwt: JwtService,
    private config: ConfigService,
    private inviteService: InviteService,
    private notificationService: NotificationService,
  ) {}

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
      await this.userRepo.update(userId, {
        beanBalance: () => 'beanBalance + 3',
      });
      await this.beanTxRepo.save(
        this.beanTxRepo.create({
          userId,
          type: 'invite_reward',
          amount: 3,
          refType: 'welcome',
          remark: '新用户注册奖励',
        }),
      );

      if (user.invitedBy) {
        await this.notificationService.create(user.invitedBy, {
          type: 'invite' as any,
          title: '邀请成功',
          content: `您邀请的用户已注册，角色：${role === 'enterprise' ? '企业' : '零工'}`,
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
}
