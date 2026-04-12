import {
  BadRequestException,
  Controller,
  Get,
  Post as HttpPost,
  Put,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { PostService } from './post.service';
import { InviteService } from '../invite/invite.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('posts')
export class PostController {
  constructor(
    private postService: PostService,
    private inviteService: InviteService,
  ) {}

  @Public()
  @Get()
  list(@Query() query: any, @CurrentUser('sub') userId: number) {
    return this.postService.list(query, userId || 0);
  }

  @Get('mine')
  myPosts(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.postService.myPosts(userId, query);
  }

  /** 帖子海报右下角：扫码直达本帖详情（scene: p=帖子ID） */
  @Public()
  @Get(':id/wxacode')
  postPosterWxacode(@Param('id') id: string) {
    const pid = parseInt(id, 10);
    if (!Number.isFinite(pid) || pid <= 0) {
      throw new BadRequestException('无效的帖子 ID');
    }
    return this.inviteService.generatePostWxacode(pid);
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.postService.detail(id, userId || 0);
  }

  @HttpPost()
  create(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.postService.create(userId, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @CurrentUser('sub') userId: number,
    @Body() dto: any,
  ) {
    return this.postService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.postService.remove(id, userId);
  }

  @Get(':id/unlock-preview')
  previewUnlockCost(
    @Param('id') id: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.postService.previewUnlockCost(id, userId || 0);
  }

  @HttpPost(':id/unlock')
  unlockContact(@Param('id') id: number, @CurrentUser('sub') userId: number) {
    return this.postService.unlockContact(id, userId);
  }
}
