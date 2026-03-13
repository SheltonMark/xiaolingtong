import { Controller, Get, Post, Body } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('favorites')
export class FavoriteController {
  constructor(private favService: FavoriteService) {}

  @Get()
  list(@CurrentUser('sub') userId: number) {
    return this.favService.list(userId);
  }

  @Post('toggle')
  toggle(
    @CurrentUser('sub') userId: number,
    @Body() dto: { targetType: string; targetId: number },
  ) {
    return this.favService.toggle(userId, dto.targetType, dto.targetId);
  }
}
