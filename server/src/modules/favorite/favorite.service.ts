import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private favRepo: Repository<Favorite>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Exposure) private exposureRepo: Repository<Exposure>,
  ) {}

  async list(userId: number) {
    const favorites = await this.favRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const postIds = favorites.filter(f => f.targetType === 'post').map(f => f.targetId);
    const jobIds = favorites.filter(f => f.targetType === 'job').map(f => f.targetId);
    const exposureIds = favorites.filter(f => f.targetType === 'exposure').map(f => f.targetId);

    const posts = postIds.length > 0 ? await this.postRepo.findByIds(postIds) : [];
    const jobs = jobIds.length > 0 ? await this.jobRepo.findByIds(jobIds) : [];
    const exposures = exposureIds.length > 0 ? await this.exposureRepo.findByIds(exposureIds) : [];

    // 创建映射表
    const postMap = new Map(posts.map(p => [p.id, p]));
    const jobMap = new Map(jobs.map(j => [j.id, j]));
    const exposureMap = new Map(exposures.map(e => [e.id, e]));

    // 按收藏顺序构建列表
    const list = favorites.map(fav => {
      if (fav.targetType === 'post') {
        const p = postMap.get(fav.targetId);
        if (!p) return null;
        return {
          id: p.id,
          type: p.type,
          title: p.title || (p.content || '').slice(0, 30),
          content: p.content,
          images: p.images,
          createdAt: fav.createdAt, // 使用收藏时间
          targetType: 'post'
        };
      } else if (fav.targetType === 'job') {
        const j = jobMap.get(fav.targetId);
        if (!j) return null;
        return {
          id: j.id,
          type: 'job',
          title: j.title,
          content: j.description,
          salary: j.salary,
          salaryUnit: j.salaryUnit,
          location: j.location,
          needCount: j.needCount,
          createdAt: fav.createdAt, // 使用收藏时间
          targetType: 'job'
        };
      } else if (fav.targetType === 'exposure') {
        const e = exposureMap.get(fav.targetId);
        if (!e) return null;
        return {
          id: e.id,
          type: 'exposure',
          title: `${e.companyName || ''}${e.personName ? '/' + e.personName : ''}`,
          content: e.description,
          category: e.category,
          amount: e.amount,
          images: e.images,
          createdAt: fav.createdAt, // 使用收藏时间
          targetType: 'exposure'
        };
      }
      return null;
    }).filter(Boolean);

    return { list };
  }

  async toggle(userId: number, targetType: string, targetId: number) {
    const existing = await this.favRepo.findOne({ where: { userId, targetType, targetId } });
    if (existing) {
      await this.favRepo.remove(existing);
      return { favorited: false };
    }
    await this.favRepo.save(this.favRepo.create({ userId, targetType, targetId }));
    return { favorited: true };
  }
}
