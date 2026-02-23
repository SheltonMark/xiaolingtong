import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from '../../entities/report.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report) private reportRepo: Repository<Report>,
  ) {}

  async create(reporterId: number, dto: any) {
    const report = this.reportRepo.create({ ...dto, reporterId });
    return this.reportRepo.save(report);
  }
}
