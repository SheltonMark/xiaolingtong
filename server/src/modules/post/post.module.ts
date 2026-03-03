import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { Post } from '../../entities/post.entity';
import { ContactUnlock } from '../../entities/contact-unlock.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Keyword } from '../../entities/keyword.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, ContactUnlock, User, BeanTransaction, Keyword, EnterpriseCert])],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
