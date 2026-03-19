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

  @Post('cert/sms/send')
  sendCertSmsCode(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.sendCertSmsCode(userId, dto);
  }

  @Post('cert/sms/check')
  checkCertSmsCode(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.checkCertSmsCode(userId, dto);
  }

  @Post('cert/ocr/business-license')
  ocrBusinessLicense(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.ocrBusinessLicense(userId, dto);
  }

  @Post('cert/ocr/id-card/front')
  ocrIdCardFront(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.ocrIdCardFront(userId, dto);
  }

  @Post('cert/ocr/id-card/back')
  ocrIdCardBack(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.ocrIdCardBack(userId, dto);
  }

  @Get('cert/status')
  getCertStatus(
    @CurrentUser('sub') userId: number,
    @CurrentUser('role') role: string,
  ) {
    return this.userService.getCertStatus(userId, role);
  }

  @Put('settings/avatar')
  updateAvatar(
    @CurrentUser('sub') userId: number,
    @Body('avatarUrl') avatarUrl: string,
  ) {
    return this.userService.updateAvatar(userId, avatarUrl);
  }

  @Put('settings/profile')
  updateProfile(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.updateProfile(userId, dto);
  }

  @Get('contact-profile/default')
  getDefaultContactProfile(@CurrentUser('sub') userId: number) {
    return this.userService.getDefaultContactProfile(userId);
  }

  @Put('contact-profile/default')
  updateDefaultContactProfile(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.userService.updateDefaultContactProfile(userId, dto);
  }
}
