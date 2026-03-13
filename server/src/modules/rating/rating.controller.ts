import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRatingDto } from './rating.dto';

@Controller('ratings')
export class RatingController {
  constructor(private ratingService: RatingService) {}

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
      dto.ratedId,
      userRole as 'worker' | 'enterprise',
      dto,
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
