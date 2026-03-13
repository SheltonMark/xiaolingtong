import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../../entities/rating.entity';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating) private ratingRepo: Repository<Rating>,
  ) {}

  async create(workerId: number, dto: any) {
    const existing = await this.ratingRepo.findOne({
      where: { workerId, jobId: dto.jobId },
    });
    if (existing) throw new BadRequestException('已评价过');
    const rating = this.ratingRepo.create({
      workerId,
      enterpriseId: dto.enterpriseId,
      jobId: dto.jobId,
      score: dto.score,
      tags: dto.tags,
      content: dto.content,
    });
    return this.ratingRepo.save(rating);
  }
}
