import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';
import { Category } from '../../entities/category.entity';
import { SysConfig } from '../../entities/sys-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OpenCity, JobType, Category, SysConfig])],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigModule {}
