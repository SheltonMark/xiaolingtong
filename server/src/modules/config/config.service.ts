import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenCity } from '../../entities/open-city.entity';
import { JobType } from '../../entities/job-type.entity';
import { Category } from '../../entities/category.entity';
import { SysConfig } from '../../entities/sys-config.entity';

const AGREEMENT_KEY_MAP: Record<string, string> = {
  user_agreement: 'user_agreement_content',
  privacy_policy: 'privacy_policy_content',
  rights_agreement: 'rights_agreement_content',
};

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(OpenCity) private cityRepo: Repository<OpenCity>,
    @InjectRepository(JobType) private jobTypeRepo: Repository<JobType>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(SysConfig) private configRepo: Repository<SysConfig>,
  ) {}

  async getAgreement(type: string) {
    const key = AGREEMENT_KEY_MAP[type];
    if (!key) throw new NotFoundException('协议类型不存在');
    const config = await this.configRepo.findOne({ where: { key } });
    return { content: config?.value || '' };
  }

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

  async getActiveCategories(bizType?: string) {
    const where: any = { isActive: 1 };
    if (bizType) where.bizType = bizType;
    const categories = await this.categoryRepo.find({
      where,
      order: { level: 'ASC', sort: 'ASC', id: 'ASC' },
    });
    const topLevel = categories.filter(
      (item) => Number(item.parentId || 0) === 0,
    );
    const topLevelIds = new Set(topLevel.map((item) => item.id));
    const childrenMap = new Map<number, Category[]>();
    const orphans: Category[] = [];

    categories.forEach((item) => {
      const parentId = Number(item.parentId || 0);
      if (!parentId) return;
      if (topLevelIds.has(parentId)) {
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId)?.push(item);
      } else {
        orphans.push(item);
      }
    });

    const mapNode = (c: Category) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
      level: c.level,
      sort: c.sort,
      iconUrl: c.iconUrl || null,
    });

    const tree = topLevel.map((item) => ({
      ...mapNode(item),
      children: (childrenMap.get(item.id) || []).map(mapNode),
    }));

    const listSource = [
      ...tree.flatMap((item) =>
        item.children.length ? item.children : [item],
      ),
      ...orphans.map(mapNode),
    ];
    const list = listSource.map((item) => ({
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      level: item.level,
      iconUrl: item.iconUrl || null,
    }));

    return { list, tree };
  }
}
