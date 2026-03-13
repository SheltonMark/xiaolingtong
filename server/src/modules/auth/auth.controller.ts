import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('wx-login')
  wxLogin(@Body('code') code: string, @Body('inviteCode') inviteCode?: string) {
    if (!code) throw new BadRequestException('code 不能为空');
    return this.authService.wxLogin(code, inviteCode);
  }

  @Post('choose-role')
  chooseRole(@CurrentUser('sub') userId: number, @Body('role') role: string) {
    if (!role) throw new BadRequestException('role 不能为空');
    return this.authService.chooseRole(userId, role);
  }

  @Get('profile')
  getProfile(@CurrentUser('sub') userId: number) {
    return this.authService.getProfile(userId);
  }

  @Post('logout')
  logout() {
    return { message: '已退出' };
  }
}
