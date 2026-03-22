import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRatingDto } from './rating.dto';

@Controller('ratings')
export class RatingController {
  constructor(private ratingService: RatingService) {}

  private resolveRatedId(dto: CreateRatingDto): number {
    const ratedId = Number(dto.ratedId || dto.enterpriseId || 0);
    if (!ratedId) {
      throw new BadRequestException('缺少被评价用户');
    }
    return ratedId;
  }

  private resolveComment(dto: CreateRatingDto): string | undefined {
    const comment = String(dto.comment || dto.content || '').trim();
    return comment || undefined;
  }

  @Post()
  @Roles('worker', 'enterprise')
  async create(
    @CurrentUser('sub') userId: number,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingService.createRating(
      dto.jobId,
      userId,
      this.resolveRatedId(dto),
      userRole as 'worker' | 'enterprise',
      dto.score,
      this.resolveComment(dto),
      dto.tags,
      dto.isAnonymous,
    );
  }

  @Get('users/:userId')
  async getUserRatings(
    @Param('userId') userId: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.ratingService.getRatings(userId, page, pageSize);
  }

  @Post(':id/approve')
  @Roles('admin')
  async approveRating(@Param('id') id: number) {
    return this.ratingService.approveRating(id);
  }

  @Post(':id/reject')
  @Roles('admin')
  async rejectRating(@Param('id') id: number) {
    return this.ratingService.rejectRating(id);
  }
}
