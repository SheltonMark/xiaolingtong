import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExposureController } from './exposure.controller';
import { ExposureService } from './exposure.service';
import { Exposure } from '../../entities/exposure.entity';
import { ExposureComment } from '../../entities/exposure-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Exposure, ExposureComment])],
  controllers: [ExposureController],
  providers: [ExposureService],
})
export class ExposureModule {}
