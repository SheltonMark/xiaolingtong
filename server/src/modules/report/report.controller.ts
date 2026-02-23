import { Controller, Post, Body } from '@nestjs/common';
import { ReportService } from './report.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.reportService.create(userId, dto);
  }
}
