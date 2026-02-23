import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private favRepo: Repository<Favorite>,
  ) {}

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
