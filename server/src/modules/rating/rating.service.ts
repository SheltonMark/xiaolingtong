import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../../entities/rating.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';
import { CreateRatingDto } from './rating.dto';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectRepository(Rating) private ratingRepo: Repository<Rating>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {}

  async createRating(
    jobId: number,
    raterId: number,
    ratedId: number,
    raterRole: 'worker' | 'enterprise',
    dto: CreateRatingDto,
  ): Promise<Rating> {
    // Validate score range
    if (dto.score < 1 || dto.score > 5) {
      throw new BadRequestException('评分必须在1-5之间');
    }

    // Validate rater and rated are different
    if (raterId === ratedId) {
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
      score: dto.score,
      comment: dto.comment,
      tags: dto.tags || [],
      isAnonymous: dto.isAnonymous || false,
      status: 'pending',
    });

    try {
      return await this.ratingRepo.save(rating);
    } catch (error) {
      this.logger.error(`Failed to create rating: ${error.message}`, error.stack);
      throw new BadRequestException('创建评价失败');
    }
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

    // Use QueryBuilder to calculate average rating in one query (fix N+1)
    const result = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.score)', 'avgScore')
      .addSelect('COUNT(*)', 'count')
      .where('r.ratedId = :ratedId', { ratedId: rating.ratedId })
      .andWhere('r.status = :status', { status: 'approved' })
      .getRawOne();

    // Update user's credit score based on average rating
    const user = await this.userRepo.findOne({ where: { id: rating.ratedId } });
    if (user) {
      const avgScore = parseFloat(result.avgScore) || 0;
      user.creditScore = Math.min(100, Math.max(0, Math.round(avgScore * 10)));
      try {
        await this.userRepo.save(user);
      } catch (error) {
        this.logger.warn(
          `Failed to update user credit score for user ${rating.ratedId}: ${error.message}`,
        );
      }
    } else {
      this.logger.warn(`User ${rating.ratedId} not found when updating credit score`);
    }

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
}

