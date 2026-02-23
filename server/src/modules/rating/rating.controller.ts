import { Controller, Post, Body } from '@nestjs/common';
import { RatingService } from './rating.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('ratings')
export class RatingController {
  constructor(private ratingService: RatingService) {}

  @Post()
  @Roles('worker')
  create(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.ratingService.create(userId, dto);
  }
}
