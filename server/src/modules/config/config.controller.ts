import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Public()
  @Get('cities')
  getCities() {
    return this.configService.getActiveCities();
  }

  @Public()
  @Get('job-types')
  getJobTypes() {
    return this.configService.getActiveJobTypes();
  }

  @Public()
  @Get('categories')
  getCategories(@Query('bizType') bizType?: string) {
    return this.configService.getActiveCategories(bizType);
  }

  @Public()
  @Get('agreements/:type')
  getAgreement(@Param('type') type: string) {
    return this.configService.getAgreement(type);
  }
}
