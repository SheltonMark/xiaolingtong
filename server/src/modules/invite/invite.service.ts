import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { InviteRecord } from '../../entities/invite-record.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(InviteRecord)
    private inviteRepo: Repository<InviteRecord>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
  ) {}

  generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').slice(0, 8);
  }

  async ensureInviteCode(userId: number): Promise<string> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException('用户不存在');
    if (user.inviteCode) return user.inviteCode;

    let code = this.generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await this.userRepo.findOne({
        where: { inviteCode: code },
      });
      if (!exists) break;
      code = this.generateInviteCode();
    }
    await this.userRepo.update(userId, { inviteCode: code });
    return code;
  }

  async recordInvite(inviterId: number, inviteeId: number, inviteCode: string) {
    const exists = await this.inviteRepo.findOne({ where: { inviteeId } });
    if (exists) return;
    await this.userRepo.update(inviteeId, { invitedBy: inviterId });
    await this.inviteRepo.save(
      this.inviteRepo.create({ inviterId, inviteeId, inviteCode }),
    );
  }

  async getMyInvites(userId: number, query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.inviteRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.invitee', 'u')
      .where('r.inviterId = :userId', { userId })
      .orderBy('r.createdAt', 'DESC')
      .skip((+page - 1) * +pageSize)
      .take(+pageSize);
    const [list, total] = await qb.getManyAndCount();
    return {
      list: list.map((r) => ({
        id: r.id,
        inviteeId: r.inviteeId,
        nickname:
          r.invitee?.nickname || r.invitee?.name || r.invitee?.phone || '',
        avatarUrl: r.invitee?.avatarUrl || '',
        role: r.invitee?.role || '',
        createdAt: r.createdAt
          ? new Date(r.createdAt)
              .toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })
              .replace(/\//g, '-')
          : '',
      })),
      total,
      page: +page,
      pageSize: +pageSize,
    };
  }

  async getInviteStats(userId: number) {
    const total = await this.inviteRepo.count({ where: { inviterId: userId } });
    return { totalInvites: total };
  }

  async getCommissionRate(): Promise<number> {
    const config = await this.configRepo.findOne({
      where: { key: 'commission_rate' },
    });
    return config ? parseFloat(config.value) || 0.1 : 0.1;
  }
}
