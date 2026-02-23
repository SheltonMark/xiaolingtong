import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeanController } from './bean.controller';
import { BeanService } from './bean.service';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, BeanTransaction])],
  controllers: [BeanController],
  providers: [BeanService],
})
export class BeanModule {}
