import { Controller, Post, Body } from '@nestjs/common';
import { WorkService } from './work.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('work')
export class WorkController {
  constructor(private workService: WorkService) {}

  @Post('checkin')
  checkin(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.checkin(userId, dto);
  }

  @Post('log')
  submitLog(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.submitLog(userId, dto);
  }

  @Post('anomaly')
  recordAnomaly(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.workService.recordAnomaly(userId, dto);
  }
}
