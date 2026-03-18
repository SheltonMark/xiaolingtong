import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Checkin } from '../../entities/checkin.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';

type AttendanceRecordDto = {
  workerId: number;
  attendance?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  hours?: number;
  pieces?: number;
  note?: string;
};

@Injectable()
export class WorkService {
  private readonly checkinAdvanceMinutes = 30;
  private readonly checkinDeadlineMinutes = 120;

  constructor(
    @InjectRepository(Checkin) private checkinRepo: Repository<Checkin>,
    @InjectRepository(WorkLog) private workLogRepo: Repository<WorkLog>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(EnterpriseCert) private entCertRepo: Repository<EnterpriseCert>,
  ) {}

  private async getCompanyName(userId: number, fallbackNickname?: string): Promise<string> {
    const cert = await this.entCertRepo.findOne({
      where: { userId, status: 'approved' },
      order: { id: 'DESC' },
    });
    return cert?.companyName || fallbackNickname || '企业';
  }

  private normalizeJobId(jobId: number | string): number {
    const normalized = Number(jobId);
    if (!normalized) {
      throw new BadRequestException('缺少招工ID');
    }
    return normalized;
  }

  private normalizeWorkerId(workerId: number | string | undefined | null): number | null {
    if (workerId === undefined || workerId === null || workerId === '') {
      return null;
    }
    const normalized = Number(workerId);
    if (!normalized) {
      throw new BadRequestException('工人ID无效');
    }
    return normalized;
  }

  private normalizeDate(date?: string): string {
    if (!date) {
      return this.formatLocalDate();
    }
    return date.slice(0, 10);
  }

  private formatLocalDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private formatDateTime(date?: Date | null): string {
    if (!date) {
      return '';
    }
    return `${this.formatLocalDate(date)} ${this.formatTime(date)}`;
  }

  private isSameDate(date: Date | string, dateText: string): boolean {
    const target = typeof date === 'string' ? date : this.formatLocalDate(date);
    return target.slice(0, 10) === dateText;
  }

  private parseClock(value?: string | null): { hours: number; minutes: number } | null {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (
      !Number.isInteger(hours)
      || !Number.isInteger(minutes)
      || hours < 0
      || hours > 23
      || minutes < 0
      || minutes > 59
    ) {
      return null;
    }

    return { hours, minutes };
  }

  private getJobStartTime(job: Partial<Job>): string {
    const startText = String(job.workHours || '').split('-')[0]?.trim();
    const parsed = this.parseClock(startText);
    if (!parsed) {
      return '08:00';
    }
    return `${`${parsed.hours}`.padStart(2, '0')}:${`${parsed.minutes}`.padStart(2, '0')}`;
  }

  private buildDateTime(dateText?: string | null, timeText?: string | null): Date | null {
    const normalizedDate = String(dateText || '').trim();
    const parsedClock = this.parseClock(timeText);
    if (!normalizedDate || !parsedClock) {
      return null;
    }

    const [yearText, monthText, dayText] = normalizedDate.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day, parsedClock.hours, parsedClock.minutes, 0, 0);
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private isActiveSupervisor(app?: Partial<JobApplication> | null): boolean {
    return !!app
      && Number(app.isSupervisor) === 1
      && ['accepted', 'confirmed', 'working', 'done'].includes(String(app.status || ''));
  }

  private getAssignedSupervisor(apps: JobApplication[]): JobApplication | null {
    return apps.find((app) => this.isActiveSupervisor(app)) || null;
  }

  private getCheckinRule(job: Partial<Job>, apps: JobApplication[], workerApp?: JobApplication | null, now = new Date()) {
    const todayText = this.formatLocalDate(now);
    const startDateText = String(job.dateStart || '').slice(0, 10);
    const endDateText = String(job.dateEnd || '').slice(0, 10);
    const startTime = this.getJobStartTime(job);
    const workStartAt = this.buildDateTime(todayText, startTime);
    const checkinWindowStart = workStartAt
      ? this.addMinutes(workStartAt, -this.checkinAdvanceMinutes)
      : null;
    const checkinWindowEnd = workStartAt
      ? this.addMinutes(workStartAt, this.checkinDeadlineMinutes)
      : null;
    const supervisorApp = this.getAssignedSupervisor(apps);

    let blockedCode = '';
    let blockedReason = '';

    if (!workerApp) {
      blockedCode = 'not_applied';
      blockedReason = '未找到当前报名记录';
    } else if (!['confirmed', 'working'].includes(workerApp.status)) {
      blockedCode = 'status_invalid';
      blockedReason = '当前状态暂不可打卡';
    } else if (startDateText && todayText < startDateText) {
      blockedCode = 'before_start_date';
      blockedReason = `未到上岗日期，请于${startDateText}再签到`;
    } else if (endDateText && todayText > endDateText) {
      blockedCode = 'after_end_date';
      blockedReason = '已超过用工日期，无法签到';
    } else if (!supervisorApp) {
      blockedCode = 'no_supervisor';
      blockedReason = '企业尚未设置临工管理员，暂不可打卡';
    } else if (checkinWindowStart && now < checkinWindowStart) {
      blockedCode = 'too_early';
      blockedReason = `未到签到时间，请于${this.formatTime(checkinWindowStart)}后签到`;
    } else if (checkinWindowEnd && now > checkinWindowEnd) {
      blockedCode = 'window_closed';
      blockedReason = '已超过签到时间，请联系临工管理员处理';
    }

    return {
      canCheckin: !blockedCode,
      blockedCode,
      blockedReason,
      hasSupervisor: !!supervisorApp,
      supervisorApp,
      startTime,
      workStartAt: this.formatDateTime(workStartAt),
      checkinWindowStart: this.formatDateTime(checkinWindowStart),
      checkinWindowEnd: this.formatDateTime(checkinWindowEnd),
    };
  }

  private uniqueStrings(values?: Array<string | null | undefined>): string[] {
    return Array.from(new Set((values || []).filter((value): value is string => !!value)));
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
  }

  private cleanPatch<T extends Record<string, unknown>>(patch: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }

  private async ensureJob(jobId: number): Promise<Job> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['user'],
    });
    if (!job) {
      throw new NotFoundException('招工不存在');
    }
    return job;
  }

  private async ensureSupervisor(jobId: number, userId: number): Promise<JobApplication> {
    const supervisorApp = await this.appRepo.findOne({
      where: { jobId, workerId: userId, isSupervisor: 1 },
    });
    if (!supervisorApp) {
      throw new ForbiddenException('无管理员权限');
    }
    return supervisorApp;
  }

  private async ensureEnterprise(jobId: number, userId: number): Promise<Job> {
    const job = await this.ensureJob(jobId);
    if (+job.userId !== +userId) {
      throw new ForbiddenException('无权操作');
    }
    return job;
  }

  private async ensureWorkerBelongsToJob(jobId: number, workerId: number): Promise<JobApplication> {
    const app = await this.appRepo.findOne({
      where: { jobId, workerId },
    });
    if (!app) {
      throw new BadRequestException('工人不在当前招工中');
    }
    if (!['confirmed', 'working', 'done'].includes(app.status)) {
      throw new BadRequestException('当前工人未进入考勤阶段');
    }
    return app;
  }

  private async resolveTargetWorker(jobId: number, actorId: number, workerId?: number | string | null) {
    const requestedWorkerId = this.normalizeWorkerId(workerId);
    if (!requestedWorkerId || requestedWorkerId === actorId) {
      await this.ensureWorkerBelongsToJob(jobId, actorId);
      return actorId;
    }
    await this.ensureSupervisor(jobId, actorId);
    await this.ensureWorkerBelongsToJob(jobId, requestedWorkerId);
    return requestedWorkerId;
  }

  private async upsertDailyLog(
    jobId: number,
    workerId: number,
    date: string,
    patch: Partial<WorkLog>,
  ): Promise<WorkLog> {
    const existing = await this.workLogRepo.findOne({
      where: { jobId, workerId, date },
    });

    if (existing) {
      Object.assign(existing, this.cleanPatch({
        ...patch,
        photoUrls: patch.photoUrls === undefined
          ? undefined
          : this.uniqueStrings([...(existing.photoUrls || []), ...((patch.photoUrls || []) as string[])]),
      }));
      return this.workLogRepo.save(existing);
    }

    const log = this.workLogRepo.create({
      jobId,
      workerId,
      date,
      hours: 0,
      pieces: 0,
      anomalyType: 'normal',
      ...this.cleanPatch(patch),
      photoUrls: patch.photoUrls === undefined ? [] : this.uniqueStrings((patch.photoUrls || []) as string[]),
    });
    return this.workLogRepo.save(log);
  }

  private mergeDailyLogs(logs: WorkLog[]) {
    const logMap = new Map<number, {
      workerId: number;
      attendance: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      hours: number;
      pieces: number;
      note: string;
      photos: string[];
      submittedAt: Date | null;
    }>();

    for (const log of logs) {
      const current = logMap.get(log.workerId) || {
        workerId: log.workerId,
        attendance: 'normal',
        checkInTime: null,
        checkOutTime: null,
        hours: 0,
        pieces: 0,
        note: '',
        photos: [],
        submittedAt: null,
      };

      current.hours = Math.max(current.hours, this.toNumber(log.hours));
      current.pieces = Math.max(current.pieces, this.toNumber(log.pieces));
      current.checkInTime = log.checkInTime || current.checkInTime;
      current.checkOutTime = log.checkOutTime || current.checkOutTime;
      current.note = log.anomalyNote || current.note;
      current.photos = this.uniqueStrings([...(current.photos || []), ...((log.photoUrls || []) as string[])]);
      if (log.anomalyType && log.anomalyType !== 'normal') {
        current.attendance = log.anomalyType;
      }
      if (!current.submittedAt || log.updatedAt > current.submittedAt) {
        current.submittedAt = log.updatedAt || log.createdAt;
      }

      logMap.set(log.workerId, current);
    }

    return logMap;
  }

  async getOrders(userId: number) {
    const apps = await this.appRepo.find({
      where: { workerId: userId, isSupervisor: 1 },
      relations: ['job', 'job.user'],
      order: { createdAt: 'DESC' },
    });

    const orders: any[] = [];
    for (const app of apps) {
      const job = app.job;
      if (!job) {
        continue;
      }

      let stage = 'checkin';
      if (job.status === 'working') {
        stage = 'working';
      } else if (job.status === 'pending_settlement') {
        stage = 'settlement';
      } else if (['settled', 'closed'].includes(job.status)) {
        stage = 'done';
      }

      const companyName = await this.getCompanyName(job.userId, job.user?.nickname);
      orders.push({ ...job, stage, companyName });
    }
    return orders;
  }

  async getSession(jobId: number, userId?: number) {
    const normalizedJobId = this.normalizeJobId(jobId);
    const job = await this.jobRepo.findOne({
      where: { id: normalizedJobId },
      relations: ['user'],
    });
    if (!job) {
      return { job: null };
    }

    const today = this.normalizeDate();
    const companyName = await this.getCompanyName(job.userId, job.user?.nickname);

    const checkins = await this.checkinRepo.find({
      where: { jobId: normalizedJobId },
      relations: ['worker'],
      order: { checkInAt: 'ASC' },
    });

    const logs = await this.workLogRepo.find({
      where: { jobId: normalizedJobId, date: today },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });

    const workers = await this.appRepo.find({
      where: { jobId: normalizedJobId },
      relations: ['worker'],
    });
    const confirmedWorkers = workers.filter((worker) => ['confirmed', 'working', 'done'].includes(worker.status));
    const currentApp = userId
      ? workers.find((worker) => Number(worker.workerId) === Number(userId)) || null
      : null;
    const checkinRule = this.getCheckinRule(job, workers, currentApp);
    const supervisorApp = checkinRule.supervisorApp;

    return {
      job: { ...job, companyName },
      checkins: checkins.filter((checkin) => this.isSameDate(checkin.checkInAt, today)),
      logs,
      workers: confirmedWorkers,
      supervisor: supervisorApp ? {
        id: supervisorApp.workerId,
        name: supervisorApp.worker?.nickname || '管理员',
      } : null,
      hasSupervisor: checkinRule.hasSupervisor,
      canCheckin: checkinRule.canCheckin,
      checkinBlockedCode: checkinRule.blockedCode,
      checkinBlockedReason: checkinRule.blockedReason,
      currentApplicationStatus: currentApp?.status || '',
      isSupervisor: currentApp ? Number(currentApp.isSupervisor) === 1 : false,
      checkinWindowStart: checkinRule.checkinWindowStart,
      checkinWindowEnd: checkinRule.checkinWindowEnd,
      workStartAt: checkinRule.workStartAt,
      startTime: checkinRule.startTime,
    };
  }

  async checkin(userId: number, dto: any) {
    const jobId = this.normalizeJobId(dto.jobId);
    const targetWorkerId = await this.resolveTargetWorker(jobId, userId, dto.workerId);
    const today = this.normalizeDate();
    const now = new Date();
    const job = await this.ensureJob(jobId);
    const apps = await this.appRepo.find({
      where: { jobId },
      relations: ['worker'],
    });
    const targetWorkerApp = apps.find((app) => Number(app.workerId) === Number(targetWorkerId)) || null;
    const checkinRule = this.getCheckinRule(job, apps, targetWorkerApp, now);

    if (!checkinRule.canCheckin) {
      throw new BadRequestException(checkinRule.blockedReason || '当前不可打卡');
    }

    const latestCheckin = await this.checkinRepo.findOne({
      where: { jobId, workerId: targetWorkerId },
      order: { id: 'DESC' },
    });
    if (latestCheckin && this.isSameDate(latestCheckin.checkInAt, today)) {
      return latestCheckin;
    }

    const checkin = this.checkinRepo.create({
      jobId,
      workerId: targetWorkerId,
      checkInAt: now,
      checkInType: dto.type || 'location',
      lat: dto.lat,
      lng: dto.lng,
      photoUrl: dto.photoUrl,
    });
    await this.checkinRepo.save(checkin);

    if (!['working', 'pending_settlement', 'settled', 'closed'].includes(job.status)) {
      await this.jobRepo.update(jobId, { status: 'working' });
    }

    await this.appRepo.update(
      { jobId, workerId: targetWorkerId, status: 'confirmed' },
      { status: 'working' },
    );

    await this.upsertDailyLog(jobId, targetWorkerId, today, {
      checkInTime: this.formatTime(now),
      anomalyType: 'normal',
      photoUrls: dto.photoUrl ? [dto.photoUrl] : undefined,
    });

    return checkin;
  }

  async submitLog(userId: number, dto: any) {
    const jobId = this.normalizeJobId(dto.jobId);
    const targetWorkerId = await this.resolveTargetWorker(jobId, userId, dto.workerId);
    const date = this.normalizeDate(dto.date);

    const log = await this.upsertDailyLog(jobId, targetWorkerId, date, {
      hours: dto.hours === undefined ? undefined : this.toNumber(dto.hours),
      pieces: dto.pieces === undefined ? undefined : this.toNumber(dto.pieces),
      checkInTime: dto.checkInTime,
      checkOutTime: dto.checkOutTime,
      anomalyNote: dto.note,
      anomalyType: dto.attendance,
      photoUrls: dto.photoUrls,
    });

    await this.appRepo.update(
      { jobId, workerId: targetWorkerId, status: 'confirmed' },
      { status: 'working' },
    );

    return log;
  }

  async recordAnomaly(userId: number, dto: any) {
    const jobId = this.normalizeJobId(dto.jobId);
    const targetWorkerId = await this.resolveTargetWorker(jobId, userId, dto.targetWorkerId);
    const date = this.normalizeDate(dto.date);
    const anomalyTypeMap: Record<string, string> = {
      early: 'early_leave',
      early_leave: 'early_leave',
      late: 'late',
      absent: 'absent',
      injury: 'injury',
      fraud: 'fraud',
    };
    const anomalyType = anomalyTypeMap[dto.anomalyType] || dto.anomalyType;
    if (!['late', 'early_leave', 'absent', 'injury', 'fraud'].includes(anomalyType)) {
      throw new BadRequestException('异常类型无效');
    }

    const patch: Partial<WorkLog> = {
      anomalyType,
      anomalyNote: dto.anomalyNote,
      photoUrls: dto.photoUrls,
    };

    if (dto.hours !== undefined) {
      patch.hours = this.toNumber(dto.hours);
    }
    if (dto.pieces !== undefined) {
      patch.pieces = this.toNumber(dto.pieces);
    }
    if (anomalyType === 'late') {
      patch.checkInTime = dto.time || dto.checkInTime || undefined;
    }
    if (anomalyType === 'early_leave' || anomalyType === 'injury') {
      patch.checkOutTime = dto.time || dto.checkOutTime || undefined;
    }
    if (anomalyType === 'absent') {
      patch.hours = 0;
      patch.pieces = 0;
      patch.checkInTime = null;
      patch.checkOutTime = null;
    }

    const log = await this.upsertDailyLog(jobId, targetWorkerId, date, patch);

    const penaltyMap: Record<string, number> = {
      absent: 5,
      early_leave: 5,
      late: 2,
      injury: 0,
      fraud: 20,
    };
    const penalty = penaltyMap[anomalyType] || 0;
    if (penalty > 0) {
      await this.userRepo.decrement({ id: targetWorkerId }, 'creditScore', penalty);
    }

    return log;
  }

  async submitAttendance(supervisorId: number, dto: any) {
    const jobId = this.normalizeJobId(dto.jobId);
    await this.ensureSupervisor(jobId, supervisorId);

    const date = this.normalizeDate(dto.date);
    const records = Array.isArray(dto.records) ? (dto.records as AttendanceRecordDto[]) : [];
    if (records.length === 0) {
      throw new BadRequestException('缺少考勤记录');
    }

    const apps = await this.appRepo.find({
      where: { jobId },
    });
    const validWorkerIds = new Set(
      apps
        .filter((app) => ['confirmed', 'working', 'done'].includes(app.status))
        .map((app) => Number(app.workerId)),
    );

    const photos = this.uniqueStrings(dto.photos);
    const savedLogs: WorkLog[] = [];

    for (const record of records) {
      const workerId = this.normalizeWorkerId(record.workerId);
      if (!workerId || !validWorkerIds.has(workerId)) {
        throw new BadRequestException('存在无效的考勤工人');
      }

      const attendance = record.attendance
        || ((record.checkInTime || this.toNumber(record.hours) > 0 || this.toNumber(record.pieces) > 0) ? 'normal' : 'absent');

      const log = await this.upsertDailyLog(jobId, workerId, date, {
        anomalyType: attendance,
        checkInTime: record.checkInTime ?? null,
        checkOutTime: record.checkOutTime ?? null,
        hours: this.toNumber(record.hours),
        pieces: this.toNumber(record.pieces),
        anomalyNote: record.note || null,
        photoUrls: photos,
      });
      savedLogs.push(log);

      if (attendance !== 'absent') {
        await this.appRepo.update(
          { jobId, workerId, status: 'confirmed' },
          { status: 'working' },
        );
      }
    }

    return {
      message: '考勤报告已提交',
      count: savedLogs.length,
      date,
      photos,
    };
  }

  async getAttendance(jobId: number, date?: string) {
    const normalizedJobId = this.normalizeJobId(jobId);
    const job = await this.ensureJob(normalizedJobId);
    const targetDate = this.normalizeDate(date);
    const companyName = await this.getCompanyName(job.userId, job.user?.nickname);

    const apps = await this.appRepo.find({
      where: { jobId: normalizedJobId },
      relations: ['worker'],
    });
    const confirmedApps = apps.filter((app) => ['confirmed', 'working', 'done'].includes(app.status));
    const supervisor = apps.find((app) => app.isSupervisor === 1);

    const logs = await this.workLogRepo.find({
      where: { jobId: normalizedJobId, date: targetDate },
      relations: ['worker'],
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });
    const logMap = this.mergeDailyLogs(logs);

    const checkins = await this.checkinRepo.find({
      where: { jobId: normalizedJobId },
      relations: ['worker'],
      order: { checkInAt: 'DESC' },
    });
    const checkinMap = new Map<number, Checkin>();
    for (const checkin of checkins) {
      if (!this.isSameDate(checkin.checkInAt, targetDate) || checkinMap.has(checkin.workerId)) {
        continue;
      }
      checkinMap.set(checkin.workerId, checkin);
    }

    const records = confirmedApps.map((app) => {
      const worker = app.worker || ({} as User);
      const log = logMap.get(Number(worker.id));
      const checkin = checkinMap.get(Number(worker.id));
      const inferredAttendance = log?.attendance
        || (checkin ? 'normal' : 'absent');
      const attendance = inferredAttendance || 'normal';

      return {
        workerId: worker.id,
        name: worker.nickname || '临工',
        attendance,
        checkInTime: log?.checkInTime || (checkin ? this.formatTime(new Date(checkin.checkInAt)) : null),
        checkOutTime: log?.checkOutTime || null,
        hours: log?.hours || 0,
        pieces: log?.pieces || 0,
        note: log?.note || '',
        photos: log?.photos || [],
      };
    });

    const totalExpected = records.length;
    const totalPresent = records.filter((record) => record.attendance !== 'absent').length;
    const totalAbsent = records.filter((record) => record.attendance === 'absent').length;
    const allPhotos = this.uniqueStrings(records.flatMap((record) => record.photos || []));
    const submittedAt = logs.reduce<Date | null>((latest, log) => {
      const current = log.updatedAt || log.createdAt;
      if (!latest || current > latest) {
        return current;
      }
      return latest;
    }, null);

    return {
      job: {
        id: job.id,
        title: job.title,
        company: companyName,
        date: targetDate,
      },
      summary: { totalExpected, totalPresent, totalAbsent },
      records,
      supervisor: supervisor ? {
        id: supervisor.workerId,
        name: supervisor.worker?.nickname || '管理员',
      } : null,
      photos: allPhotos,
      submittedAt: submittedAt
        ? new Date(submittedAt).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '',
    };
  }

  async confirmAttendance(enterpriseId: number, jobId: number) {
    const normalizedJobId = this.normalizeJobId(jobId);
    const job = await this.ensureEnterprise(normalizedJobId, enterpriseId);
    const date = this.normalizeDate();
    const attendanceCount = await this.workLogRepo.count({
      where: { jobId: normalizedJobId, date },
    });
    if (attendanceCount === 0) {
      throw new BadRequestException('暂无考勤数据可确认');
    }

    if (!['pending_settlement', 'settled', 'closed'].includes(job.status)) {
      await this.jobRepo.update(normalizedJobId, { status: 'pending_settlement' });
    }

    await this.appRepo.update(
      { jobId: normalizedJobId, status: 'working' },
      { status: 'done' },
    );

    return { message: '考勤已确认，进入结算流程' };
  }
}
