import { Controller, Post, Body, Get } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('membership')
export class MembershipController {
  constructor(private memberService: MembershipService) {}

  @Get('plans')
  plans(): Promise<any> {
    return this.memberService.getPlans();
  }

  @Post('subscribe')
  subscribe(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.memberService.subscribe(userId, dto);
  }
}
