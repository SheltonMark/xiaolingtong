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
      order: { name: 'ASC' },
    });
    return { list: cities.map((c) => ({ id: c.id, name: c.name })) };
  }

  async getActiveJobTypes() {
    const jobTypes = await this.jobTypeRepo.find({
      where: { isActive: 1 },
      order: { name: 'ASC' },
    });
    return { list: jobTypes.map((jt) => ({ id: jt.id, name: jt.name })) };
  }

  async getActiveCategories() {
    const categories = await this.categoryRepo.find({
      where: { isActive: 1 },
      order: { level: 'ASC', sort: 'ASC', id: 'ASC' },
    });
    const topLevel = categories.filter((item) => Number(item.parentId || 0) === 0);
    const childrenMap = new Map<number, Category[]>();

    categories.forEach((item) => {
      const parentId = Number(item.parentId || 0);
      if (!parentId) return;
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)?.push(item);
    });

    const tree = topLevel.map((item) => ({
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      level: item.level,
      sort: item.sort,
      children: (childrenMap.get(item.id) || []).map((child) => ({
        id: child.id,
        name: child.name,
        parentId: child.parentId,
        level: child.level,
        sort: child.sort,
      })),
    }));

    const listSource = tree.flatMap((item) => (item.children.length ? item.children : [item]));
    const list = listSource.map((item) => ({
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      level: item.level,
    }));

    return { list, tree };
  }
}
