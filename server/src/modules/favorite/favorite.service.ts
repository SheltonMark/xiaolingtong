import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private favRepo: Repository<Favorite>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {}

  async list(userId: number) {
    const favorites = await this.favRepo.find({ where: { userId } });
    const postIds = favorites.filter(f => f.targetType === 'post').map(f => f.targetId);
    const jobIds = favorites.filter(f => f.targetType === 'job').map(f => f.targetId);

    const posts = postIds.length > 0 ? await this.postRepo.findByIds(postIds) : [];
    const jobs = jobIds.length > 0 ? await this.jobRepo.findByIds(jobIds) : [];

    const postList = posts.map(p => ({
      id: p.id,
      type: p.type,
      title: p.title || (p.content || '').slice(0, 30),
      content: p.content,
      images: p.images,
      createdAt: p.createdAt,
      targetType: 'post'
    }));

    const jobList = jobs.map(j => ({
      id: j.id,
      type: 'job',
      title: j.title,
      content: j.description,
      salary: j.salary,
      salaryUnit: j.salaryUnit,
      location: j.location,
      createdAt: j.createdAt,
      targetType: 'job'
    }));

    return { list: [...postList, ...jobList].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) };
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
