import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../../entities/rating.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating) private ratingRepo: Repository<Rating>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
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

  async createRating(
    jobId: number,
    raterId: number,
    ratedId: number,
    raterRole: 'worker' | 'enterprise',
    score: number,
    comment?: string,
    tags?: string[],
    isAnonymous?: boolean,
  ): Promise<Rating> {
    // Validate score range
    if (score < 1 || score > 5) {
      throw new BadRequestException('评分必须在1-5之间');
    }

    if (Number(raterId) === Number(ratedId)) {
      throw new BadRequestException('不能评价自己');
    }

    // Verify job exists
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('工作不存在');
    }

    // Verify rater exists
    const rater = await this.userRepo.findOne({ where: { id: raterId } });
    if (!rater) {
      throw new NotFoundException('评价者不存在');
    }

    // Verify rated user exists
    const rated = await this.userRepo.findOne({ where: { id: ratedId } });
    if (!rated) {
      throw new NotFoundException('被评价者不存在');
    }

    // Check for duplicate rating
    const existing = await this.ratingRepo.findOne({
      where: { jobId, raterId, ratedId },
    });
    if (existing) {
      throw new BadRequestException('已评价过');
    }

    const rating = this.ratingRepo.create({
      jobId,
      raterId,
      ratedId,
      raterRole,
      score,
      comment,
      tags: tags || [],
      isAnonymous: !!isAnonymous,
      status: 'pending',
    });

    return this.ratingRepo.save(rating);
  }

  async getRatings(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ data: Rating[]; total: number }> {
    const [data, total] = await this.ratingRepo.findAndCount({
      where: { ratedId: userId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async approveRating(ratingId: number): Promise<Rating> {
    const rating = await this.ratingRepo.findOne({ where: { id: ratingId } });
    if (!rating) {
      throw new NotFoundException('评价不存在');
    }

    rating.status = 'approved';
    const updated = await this.ratingRepo.save(rating);

    // Update user's average rating
    await this.updateUserAverageRating(rating.ratedId);

    return updated;
  }

  async rejectRating(ratingId: number): Promise<Rating> {
    const rating = await this.ratingRepo.findOne({ where: { id: ratingId } });
    if (!rating) {
      throw new NotFoundException('评价不存在');
    }

    rating.status = 'rejected';
    return this.ratingRepo.save(rating);
  }

  private async updateUserAverageRating(userId: number): Promise<void> {
    const ratings = await this.ratingRepo.find({
      where: { ratedId: userId, status: 'approved' },
    });

    if (ratings.length === 0) {
      return;
    }

    const averageScore = Math.round(
      (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length) * 10,
    ) / 10;

    // Update user's credit score based on average rating
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.creditScore = Math.min(100, Math.max(0, Math.round(averageScore * 10)));
      await this.userRepo.save(user);
    }
  }
}

