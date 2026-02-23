import { Controller, Post, Body } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('membership')
export class MembershipController {
  constructor(private memberService: MembershipService) {}

  @Post('subscribe')
  subscribe(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.memberService.subscribe(userId, dto);
  }
}
