import { Controller, Post, Get, Put, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Post('cert/enterprise')
  submitEnterpriseCert(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.submitEnterpriseCert(userId, dto);
  }

  @Post('cert/worker')
  submitWorkerCert(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.submitWorkerCert(userId, dto);
  }

  @Get('cert/status')
  getCertStatus(@CurrentUser('sub') userId: number, @CurrentUser('role') role: string) {
    return this.userService.getCertStatus(userId, role);
  }

  @Put('settings/avatar')
  updateAvatar(@CurrentUser('sub') userId: number, @Body('avatarUrl') avatarUrl: string) {
    return this.userService.updateAvatar(userId, avatarUrl);
  }

  @Put('settings/profile')
  updateProfile(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.updateProfile(userId, dto);
  }
}
