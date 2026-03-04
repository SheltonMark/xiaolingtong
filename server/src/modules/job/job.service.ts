import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(Keyword) private keywordRepo: Repository<Keyword>,
  ) {}

  private async checkKeywords(text: string) {
    const keywords = await this.keywordRepo.find();
    for (const kw of keywords) {
      if (text.includes(kw.word)) {
        throw new BadRequestException(`内容包含违禁词: ${kw.word}`);
      }
    }
  }

  private normalizeText(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  }

  private parseSalaryType(value: any): 'hourly' | 'piece' {
    const text = this.normalizeText(value);
    if (!text) return 'hourly';
    if (text === 'piece' || text.includes('按件')) return 'piece';
    return 'hourly';
  }

  private normalizeBenefits(value: any) {
    if (!Array.isArray(value)) return undefined;
    const normalized = value
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === 'string') return { label: item, color: 'green' };
        if (item.label) return item;
        return null;
      })
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  private normalizeImages(value: any) {
    if (!Array.isArray(value)) return undefined;
    const normalized = value.filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  private normalizeCreateDto(dto: any) {
    const salary = Number(dto.salary || dto.price || 0);
    const needCount = Number(dto.needCount || dto.headcount || dto.need || 0);
    const salaryType = this.parseSalaryType(dto.salaryType || dto.salaryMode);
    const salaryUnit = this.normalizeText(dto.salaryUnit) || (salaryType === 'hourly' ? '元/时' : '元/件');
    const location = this.normalizeText(dto.location || dto.address);
    const dateStart = this.normalizeText(dto.dateStart || dto.startDate);
    const dateEnd = this.normalizeText(dto.dateEnd || dto.endDate);
    const startTime = this.normalizeText(dto.startTime);
    const endTime = this.normalizeText(dto.endTime);
    const workHours = this.normalizeText(dto.workHours) || (startTime && endTime ? `${startTime}-${endTime}` : '');

    return {
      title: this.normalizeText(dto.title || dto.jobType),
      salary,
      salaryType,
      salaryUnit,
      needCount,
      location,
      dateStart,
      dateEnd,
      workHours,
      description: this.normalizeText(dto.description || dto.content),
      benefits: this.normalizeBenefits(dto.benefits),
      images: this.normalizeImages(dto.images),
      urgent: dto.urgent ? 1 : 0,
    };
  }

  async list(query: any) {
    const { keyword, salaryType, minSalary, maxSalary, page = 1, pageSize = 20 } = query;
    const qb = this.jobRepo.createQueryBuilder('j')
      .leftJoinAndSelect('j.user', 'u')
      .where('j.status IN (:...statuses)', { statuses: ['recruiting', 'full'] });

    if (keyword) qb.andWhere('j.title LIKE :kw', { kw: `%${keyword}%` });
    if (salaryType) qb.andWhere('j.salaryType = :salaryType', { salaryType });
    if (minSalary) qb.andWhere('j.salary >= :minSalary', { minSalary });
    if (maxSalary) qb.andWhere('j.salary <= :maxSalary', { maxSalary });

    qb.orderBy('j.urgent', 'DESC')
      .addOrderBy('j.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page: +page, pageSize: +pageSize };
  }

  async detail(id: number) {
    const job = await this.jobRepo.findOne({ where: { id }, relations: ['user'] });
    if (!job) throw new BadRequestException('招工信息不存在');

    // 查询报名人数
    const appliedCount = await this.appRepo.count({ where: { jobId: id } });

    // 格式化返回数据
    const salaryTypeMap = { hourly: '计时', piece: '计件' };
    const dateRange = job.dateStart && job.dateEnd
      ? `${job.dateStart} 至 ${job.dateEnd}`
      : '待定';

    return {
      ...job,
      need: job.needCount,
      total: job.needCount,
      applied: appliedCount,
      salaryType: salaryTypeMap[job.salaryType] || job.salaryType,
      dateRange,
      hours: job.workHours || '待定',
      company: {
        name: job.user?.companyName || '企业用户',
        verified: !!job.user?.enterpriseCert,
        creditScore: job.user?.creditScore || 100,
        contact: job.user?.contactName || '联系人',
        phone: job.user?.contactPhone || job.user?.phone || ''
      }
    };
  }

  async create(userId: number, dto: any) {
    const payload = this.normalizeCreateDto(dto);
    if (!payload.title) throw new BadRequestException('请输入招工标题');
    if (!(payload.salary > 0)) throw new BadRequestException('请输入正确工价');
    if (!(payload.needCount > 0)) throw new BadRequestException('请输入招工人数');
    if (!payload.location) throw new BadRequestException('请选择工作地点');
    if (!payload.dateStart || !payload.dateEnd) throw new BadRequestException('请选择工作日期');

    await this.checkKeywords(payload.title + (payload.description || ''));
    const job = this.jobRepo.create({ ...payload, userId });
    return this.jobRepo.save(job);
  }

  async update(id: number, userId: number, dto: any) {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job || job.userId !== userId) throw new ForbiddenException('无权操作');
    await this.checkKeywords((dto.title || '') + (dto.description || ''));
    Object.assign(job, dto);
    return this.jobRepo.save(job);
  }
}
