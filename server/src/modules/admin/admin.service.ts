import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';
import * as crypto from 'crypto';

function hashPwd(pwd: string): string {
  return crypto.createHash('sha256').update(pwd + '_xlt2026').digest('hex');
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Exposure) private exposureRepo: Repository<Exposure>,
    private jwt: JwtService,
  ) {}

  async initSuperAdmin() {
    const exists = await this.adminRepo.findOne({ where: { username: 'admin' } });
    if (!exists) {
      await this.adminRepo.save(this.adminRepo.create({
        username: 'admin', password: hashPwd('admin123'), nickname: '超级管理员', role: 'super',
      }));
    }
  }

  async login(username: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { username } });
    if (!admin || admin.password !== hashPwd(password)) throw new UnauthorizedException('账号或密码错误');
    if (!admin.isActive) throw new UnauthorizedException('账号已禁用');
    const token = this.jwt.sign({ sub: admin.id, role: admin.role, isAdmin: true });
    return { token, admin: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role } };
  }

  // 数据统计
  async dashboard() {
    const [userCount, postCount, jobCount, exposureCount] = await Promise.all([
      this.userRepo.count(),
      this.postRepo.count({ where: { status: 'active' as any } }),
      this.jobRepo.count(),
      this.exposureRepo.count(),
    ]);
    const enterpriseCount = await this.userRepo.count({ where: { role: 'enterprise' } });
    const workerCount = await this.userRepo.count({ where: { role: 'worker' } });
    return { userCount, enterpriseCount, workerCount, postCount, jobCount, exposureCount };
  }

  // 用户管理
  async userList(query: any) {
    const { role, keyword, page = 1, pageSize = 20 } = query;
    const qb = this.userRepo.createQueryBuilder('u');
    if (role) qb.andWhere('u.role = :role', { role });
    if (keyword) qb.andWhere('(u.nickname LIKE :kw OR u.phone LIKE :kw)', { kw: `%${keyword}%` });
    qb.orderBy('u.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async banUser(id: number) {
    await this.userRepo.update(id, { status: 'banned' });
    return { message: '已封禁' };
  }

  async unbanUser(id: number) {
    await this.userRepo.update(id, { status: 'active' });
    return { message: '已解封' };
  }

  // 信息审核
  async postList(query: any) {
    const { type, status, page = 1, pageSize = 20 } = query;
    const qb = this.postRepo.createQueryBuilder('p').leftJoinAndSelect('p.user', 'u');
    if (type) qb.andWhere('p.type = :type', { type });
    if (status) qb.andWhere('p.status = :status', { status });
    qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async auditPost(id: number, action: string) {
    if (action === 'approve') {
      await this.postRepo.update(id, { status: 'active' });
    } else if (action === 'reject') {
      await this.postRepo.update(id, { status: 'deleted' });
    }
    return { message: action === 'approve' ? '已通过' : '已驳回' };
  }

  // 招工审核
  async jobList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.jobRepo.createQueryBuilder('j').leftJoinAndSelect('j.user', 'u');
    qb.orderBy('j.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  // 曝光管理
  async exposureList(query: any) {
    const { page = 1, pageSize = 20 } = query;
    const qb = this.exposureRepo.createQueryBuilder('e');
    qb.orderBy('e.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async deleteExposure(id: number) {
    await this.exposureRepo.delete(id);
    return { message: '已删除' };
  }
}
