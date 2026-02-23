import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async wxLogin(code: string) {
    const appid = this.config.get('WX_APPID');
    const secret = this.config.get('WX_SECRET');

    let openid: string;

    if (!appid || !secret) {
      // 开发模式：用 code 当 openid
      openid = `dev_${code}`;
    } else {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
      const { data } = await axios.get(url);
      if (data.errcode) throw new Error(data.errmsg);
      openid = data.openid;
    }

    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      user = this.userRepo.create({ openid });
      user = await this.userRepo.save(user);
      // 创建钱包
      await this.walletRepo.save(this.walletRepo.create({ userId: user.id }));
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
    await this.userRepo.update(userId, { role });
    const user = await this.userRepo.findOneBy({ id: userId });
    const token = this.jwt.sign({ sub: user!.id, role: user!.role });
    return { token, role: user!.role };
  }

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      role: user.role,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      beanBalance: user.beanBalance,
      isMember: user.isMember,
      creditScore: user.creditScore,
    };
  }
}
