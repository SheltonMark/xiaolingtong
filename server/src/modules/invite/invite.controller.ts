import { Controller, Get, Query } from '@nestjs/common';
import { InviteService } from './invite.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('invite')
export class InviteController {
  constructor(private inviteService: InviteService) {}

  @Get('code')
  getCode(@CurrentUser('sub') userId: number) {
    return this.inviteService.ensureInviteCode(userId).then(code => ({ inviteCode: code }));
  }

  @Get('records')
  getRecords(@CurrentUser('sub') userId: number, @Query() query: any) {
    return this.inviteService.getMyInvites(userId, query);
  }

  @Get('stats')
  getStats(@CurrentUser('sub') userId: number) {
    return this.inviteService.getInviteStats(userId);
  }
}
