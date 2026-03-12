import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';
import { Category } from '../../entities/category.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(OpenCity) private cityRepo: Repository<OpenCity>,
    @InjectRepository(JobType) private jobTypeRepo: Repository<JobType>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
  ) {}

  async getActiveCities() {
    const cities = await this.cityRepo.find({
      where: { isActive: 1 },
      order: { name: 'ASC' }
    });
    return { list: cities.map(c => ({ id: c.id, name: c.name })) };
  }

  async getActiveJobTypes() {
    const jobTypes = await this.jobTypeRepo.find({
      where: { isActive: 1 },
      order: { name: 'ASC' }
    });
    return { list: jobTypes.map(jt => ({ id: jt.id, name: jt.name })) };
  }

  async getActiveCategories() {
    const categories = await this.categoryRepo.find({
      where: { isActive: 1 },
      order: { sort: 'ASC' }
    });
    return { list: categories.map(c => ({ id: c.id, name: c.name })) };
  }
}
