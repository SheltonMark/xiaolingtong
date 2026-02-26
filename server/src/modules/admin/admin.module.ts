import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Admin } from '../../entities/admin.entity';
import { User } from '../../entities/user.entity';
import { Post } from '../../entities/post.entity';
import { Job } from '../../entities/job.entity';
import { Exposure } from '../../entities/exposure.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, User, Post, Job, Exposure])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule implements OnModuleInit {
  constructor(private adminService: AdminService) {}

  async onModuleInit() {
    await this.adminService.initSuperAdmin();
  }
}
