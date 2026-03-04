import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenCity } from '../../entities/open-city.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(OpenCity) private cityRepo: Repository<OpenCity>,
  ) {}

  async getActiveCities() {
    const cities = await this.cityRepo.find({
      where: { isActive: 1 },
      order: { name: 'ASC' }
    });
    return { list: cities.map(c => ({ id: c.id, name: c.name })) };
  }
}
