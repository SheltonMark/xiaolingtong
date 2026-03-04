import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OpenCity, JobType])],
  controllers: [ConfigController],
  providers: [ConfigService],
})
export class ConfigModule {}
