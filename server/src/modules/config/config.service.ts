import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(OpenCity) private cityRepo: Repository<OpenCity>,
    @InjectRepository(JobType) private jobTypeRepo: Repository<JobType>,
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
}
