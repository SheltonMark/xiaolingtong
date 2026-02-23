import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';

@Injectable()
export class WorkService {
  constructor(
    @InjectRepository(Checkin) private checkinRepo: Repository<Checkin>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
  ) {}

  async checkin(workerId: number, dto: any) {
    const checkin = this.checkinRepo.create({
      jobId: dto.jobId,
      workerId,
      checkInAt: new Date(),
      checkInType: dto.type || 'location',
      lat: dto.lat,
      lng: dto.lng,
      photoUrl: dto.photoUrl,
    });
    return this.checkinRepo.save(checkin);
  }

  async submitLog(workerId: number, dto: any) {
    const log = this.workLogRepo.create({
      jobId: dto.jobId,
      workerId,
      date: dto.date || new Date().toISOString().slice(0, 10),
      hours: dto.hours,
      pieces: dto.pieces,
      photoUrls: dto.photoUrls,
    });
    return this.workLogRepo.save(log);
  }

  async recordAnomaly(workerId: number, dto: any) {
    const log = this.workLogRepo.create({
      jobId: dto.jobId,
      workerId,
      date: dto.date || new Date().toISOString().slice(0, 10),
      anomalyType: dto.anomalyType,
      anomalyNote: dto.anomalyNote,
      photoUrls: dto.photoUrls,
    });
    return this.workLogRepo.save(log);
  }
}
