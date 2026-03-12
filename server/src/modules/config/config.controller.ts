import { Controller, Get } from '@nestjs/common';
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
  getCategories() {
    return this.configService.getActiveCategories();
  }
}
