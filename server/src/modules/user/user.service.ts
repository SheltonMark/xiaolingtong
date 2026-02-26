import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
    @InjectRepository(WorkerCert) private workerCertRepo: Repository<WorkerCert>,
  ) {}

  async submitEnterpriseCert(userId: number, dto: any) {
    const existing = await this.entCertRepo.findOneBy({ userId });
    if (existing) {
      Object.assign(existing, dto, { status: 'pending' });
      return this.entCertRepo.save(existing);
    }
    return this.entCertRepo.save(this.entCertRepo.create({ ...dto, userId }));
  }

  async submitWorkerCert(userId: number, dto: any) {
    const existing = await this.workerCertRepo.findOneBy({ userId });
    if (existing) {
      Object.assign(existing, dto, { status: 'pending' });
      return this.workerCertRepo.save(existing);
    }
    return this.workerCertRepo.save(this.workerCertRepo.create({ ...dto, userId }));
  }

  async getCertStatus(userId: number, role: string) {
    if (role === 'enterprise') {
      const cert = await this.entCertRepo.findOneBy({ userId });
      return { status: cert?.status || 'none', cert };
    }
    const cert = await this.workerCertRepo.findOneBy({ userId });
    return { status: cert?.status || 'none', cert };
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    await this.userRepo.update(userId, { avatarUrl });
    return { avatarUrl };
  }

  async updateProfile(userId: number, dto: any) {
    const allowed: any = {};
    if (dto.nickname) allowed.nickname = dto.nickname;
    if (dto.phone) allowed.phone = dto.phone;
    if (Object.keys(allowed).length === 0) return { message: '无更新' };
    await this.userRepo.update(userId, allowed);
    return { message: '已更新', ...allowed };
  }
}
