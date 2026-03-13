import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { Rating } from '../../entities/rating.entity';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rating, User, Job])],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}

