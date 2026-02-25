import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ExposureService } from './exposure.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('exposures')
export class ExposureController {
  constructor(private exposureService: ExposureService) {}

  @Public()
  @Get()
  list(@Query() query: any) {
    return this.exposureService.list(query);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: number) {
    return this.exposureService.detail(id);
  }

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.exposureService.create(userId, dto);
  }

  @Post(':id/comment')
  comment(@Param('id') id: number, @CurrentUser('sub') userId: number, @Body('content') content: string) {
    return this.exposureService.comment(id, userId, content);
  }
}
