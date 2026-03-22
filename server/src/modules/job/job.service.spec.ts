/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { EnterpriseCert } from '../../entities/enterprise-cert.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { User } from '../../entities/user.entity';
import { BeanTransaction } from '../../entities/bean-transaction.entity';
import { Notification } from '../../entities/notification.entity';
import { SysConfig } from '../../entities/sys-config.entity';

const createJobQueryBuilder = (rows: any[], total: number) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
});

const createCertQueryBuilder = (rows: any[]) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(rows),
});

describe('JobService', () => {
  let service: JobService;
  let jobRepository: any;
  let keywordRepository: any;
  let jobApplicationRepository: any;
  let enterpriseCertRepository: any;
  let workerCertRepository: any;
  let userRepository: any;
  let beanTransactionRepository: any;
  let notificationRepository: any;
  let sysConfigRepository: any;

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    keywordRepository = {
      find: jest.fn(),
    };

    jobApplicationRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    enterpriseCertRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    workerCertRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    userRepository = {
      findOneBy: jest.fn(),
      save: jest.fn(),
    };

    beanTransactionRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
    };

    notificationRepository = {
      create: jest.fn((payload) => payload),
      save: jest.fn(),
    };

    sysConfigRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(Keyword),
          useValue: keywordRepository,
        },
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(EnterpriseCert),
          useValue: enterpriseCertRepository,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(BeanTransaction),
          useValue: beanTransactionRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepository,
        },
        {
          provide: getRepositoryToken(SysConfig),
          useValue: sysConfigRepository,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeText', () => {
    it('handles null and undefined', () => {
      expect(service['normalizeText'](null)).toBe('');
      expect(service['normalizeText'](undefined)).toBe('');
    });

    it('trims whitespace', () => {
      expect(service['normalizeText']('  test  ')).toBe('test');
    });
  });

  describe('parseSalaryType', () => {
    it('parses known values', () => {
      expect(service['parseSalaryType']('piece')).toBe('piece');
      expect(service['parseSalaryType']('hourly')).toBe('hourly');
    });

    it('falls back to hourly', () => {
      expect(service['parseSalaryType']('unknown')).toBe('hourly');
    });
  });

  describe('normalizeBenefits', () => {
    it('normalizes JSON string benefits into label objects', () => {
      expect(service['normalizeBenefits']('["包午餐","包住宿"]')).toEqual([
        { label: '包午餐', color: 'green' },
        { label: '包住宿', color: 'green' },
      ]);
    });

    it('normalizes comma-separated benefits into label objects', () => {
      expect(service['normalizeBenefits']('包午餐, 包住宿')).toEqual([
        { label: '包午餐', color: 'green' },
        { label: '包住宿', color: 'green' },
      ]);
    });
  });

  describe('checkKeywords', () => {
    it('allows content without prohibited keywords', async () => {
      keywordRepository.find.mockResolvedValue([{ word: 'forbidden' }]);

      await expect(
        service['checkKeywords']('normal job description'),
      ).resolves.not.toThrow();
    });

    it('rejects content containing prohibited keywords', async () => {
      keywordRepository.find.mockResolvedValue([{ word: 'forbidden' }]);

      await expect(service['checkKeywords']('forbidden job')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('list', () => {
    it('returns formatted jobs', async () => {
      const rows = [
        {
          id: 1,
          userId: 9,
          title: '搬运工',
          salary: 120,
          salaryUnit: '元/天',
          needCount: 5,
          location: '广东省东莞市长安镇',
          dateStart: '2026-03-20',
          dateEnd: '2026-03-21',
          workHours: '08:00-18:00',
          description: '现场协助',
          urgent: 0,
          images: [],
          benefits: [],
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          user: {
            id: 9,
            nickname: '企业用户',
            avatarUrl: 'avatar.png',
            isMember: 1,
          },
        },
      ];

      jobRepository.createQueryBuilder.mockReturnValue(
        createJobQueryBuilder(rows, 1),
      );
      enterpriseCertRepository.createQueryBuilder.mockReturnValue(
        createCertQueryBuilder([{ userId: 9, companyName: '认证企业' }]),
      );
      jobApplicationRepository.count.mockResolvedValue(2);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.total).toBe(1);
      expect(result.list[0]).toMatchObject({
        id: 1,
        title: '搬运工',
        applied: 2,
        companyName: '认证企业',
      });
    });
  });

  describe('detail', () => {
    it('returns job detail with company info', async () => {
      jobRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 9,
        title: '测试招工',
        salary: 200,
        salaryType: 'hourly',
        needCount: 3,
        location: '广东省东莞市长安镇',
        contactName: '张三',
        contactPhone: '13800000000',
        user: {
          nickname: '企业用户',
          avatarUrl: 'avatar.png',
          creditScore: 88,
          phone: '13800000000',
        },
      });
      jobApplicationRepository.count.mockResolvedValue(4);
      enterpriseCertRepository.findOne.mockResolvedValue({
        companyName: '认证企业',
      });

      const result = await service.detail(1);

      expect(result.applied).toBe(4);
      expect(result.company.name).toBe('认证企业');
      expect(result.company.creditScore).toBe(88);
    });

    it('throws when the job does not exist', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('creates a job successfully', async () => {
      const dto = {
        title: '新岗位',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-20',
      };

      keywordRepository.find.mockResolvedValue([]);
      jobRepository.findOne.mockResolvedValue(null);
      jobRepository.create.mockImplementation((payload) => ({
        id: 1,
        ...payload,
      }));
      jobRepository.save.mockImplementation(async (payload) => payload);

      const result = await service.create(1, dto);

      expect(jobRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          title: '新岗位',
          salary: 100,
          needCount: 5,
        }),
      );
      expect(result.userId).toBe(1);
    });

    it('normalizes object-shaped benefits and images before saving', async () => {
      const dto = {
        title: '新岗位',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-20',
        benefits: { 0: '包午餐', 1: '包住宿' },
        images: { 0: 'image1.jpg', 1: 'image2.jpg' },
      };

      keywordRepository.find.mockResolvedValue([]);
      jobRepository.findOne.mockResolvedValue(null);
      jobRepository.create.mockImplementation((payload) => ({
        id: 1,
        ...payload,
      }));
      jobRepository.save.mockImplementation(async (payload) => payload);

      const result = await service.create(1, dto);

      expect(jobRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          benefits: [
            { label: '包午餐', color: 'green' },
            { label: '包住宿', color: 'green' },
          ],
          images: ['image1.jpg', 'image2.jpg'],
        }),
      );
      expect(result.benefits).toEqual([
        { label: '包午餐', color: 'green' },
        { label: '包住宿', color: 'green' },
      ]);
      expect(result.images).toEqual(['image1.jpg', 'image2.jpg']);
    });

    it('returns the recent existing job for duplicate submits', async () => {
      const dto = {
        title: 'duplicate job',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-20',
      };
      const existingJob = {
        id: 9,
        userId: 1,
        ...dto,
        createdAt: new Date(),
      };

      keywordRepository.find.mockResolvedValue([]);
      jobRepository.findOne.mockResolvedValue(existingJob);

      const result = await service.create(1, dto);

      expect(result).toBe(existingJob);
      expect(jobRepository.create).not.toHaveBeenCalled();
      expect(jobRepository.save).not.toHaveBeenCalled();
      expect(jobRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 1,
            title: 'duplicate job',
            createdAt: expect.any(Object),
          }),
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('throws on keyword violation', async () => {
      const dto = {
        title: 'forbidden job',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-20',
      };

      keywordRepository.find.mockResolvedValue([{ word: 'forbidden' }]);

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates a job owned by the user', async () => {
      const job = { id: 1, userId: 7, title: '旧标题' };

      jobRepository.findOne.mockResolvedValue(job);
      keywordRepository.find.mockResolvedValue([]);
      jobRepository.save.mockImplementation(async (payload) => payload);

      const result = await service.update(1, 7, { title: '新标题' });

      expect(result.title).toBe('新标题');
      expect(jobRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, title: '新标题' }),
      );
    });

    it('rejects updates from other users', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 8 });

      await expect(service.update(1, 7, { title: '新标题' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('removes a job without applications', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 7 });
      jobApplicationRepository.count.mockResolvedValue(0);
      jobRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1, 7);

      expect(jobRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual(expect.objectContaining({ message: expect.any(String) }));
    });

    it('rejects deleting jobs that already have applications', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 7 });
      jobApplicationRepository.count.mockResolvedValue(2);

      await expect(service.remove(1, 7)).rejects.toThrow(BadRequestException);
      expect(jobRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('myJobs', () => {
    it('returns the current user job list', async () => {
      jobRepository.find.mockResolvedValue([
        {
          id: 1,
          title: '岗位 1',
          salary: 100,
          salaryUnit: '元/天',
          needCount: 5,
          location: '广东省东莞市长安镇',
          status: 'recruiting',
          urgent: 0,
          dateStart: '2026-03-10',
          dateEnd: '2026-03-20',
          workHours: '08:00-17:00',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ]);
      jobApplicationRepository.find.mockResolvedValue([
        { status: 'pending' },
        { status: 'accepted' },
        { status: 'confirmed' },
      ]);

      const result = await service.myJobs(1);

      expect(result.list).toHaveLength(1);
      expect(result.list[0]).toMatchObject({
        id: 1,
        appliedCount: 3,
        status: 'recruiting',
      });
    });
  });

  describe('manageJobs', () => {
    it('returns recruitment management items filtered by grouped stage', async () => {
      jobRepository.find.mockResolvedValue([
        {
          id: 1,
          userId: 3,
          title: '待审核岗位',
          salary: 100,
          salaryUnit: '元/天',
          needCount: 5,
          location: '广东省东莞市长安镇',
          dateStart: '2026-03-10',
          dateEnd: '2026-03-20',
          workHours: '08:00-17:00',
          status: 'recruiting',
        },
        {
          id: 2,
          userId: 3,
          title: '进行中岗位',
          salary: 120,
          salaryUnit: '元/天',
          needCount: 3,
          location: '广东省东莞市长安镇',
          dateStart: '2026-03-10',
          dateEnd: '2026-03-20',
          workHours: '08:00-17:00',
          status: 'working',
        },
        {
          id: 3,
          userId: 3,
          title: '结算岗位',
          salary: 150,
          salaryUnit: '元/天',
          needCount: 2,
          location: '广东省东莞市长安镇',
          dateStart: '2026-03-11',
          dateEnd: '2026-03-12',
          workHours: '09:00-18:00',
          status: 'pending_settlement',
        },
      ]);
      enterpriseCertRepository.findOne.mockResolvedValue({
        companyName: '某企业',
      });
      jobApplicationRepository.find.mockImplementation(
        async ({ where: { jobId } }) => {
          if (jobId === 1) {
            return [
              { status: 'pending', isSupervisor: 0 },
              { status: 'accepted', isSupervisor: 0 },
            ];
          }

          if (jobId === 2) {
            return [
              { status: 'working', isSupervisor: 1 },
              { status: 'confirmed', isSupervisor: 0 },
            ];
          }

          return [
            { status: 'done', isSupervisor: 1 },
            { status: 'working', isSupervisor: 0 },
          ];
        },
      );

      const result = await service.manageJobs(3, { stage: 'ongoing' });

      expect(result.list).toHaveLength(2);
      expect(result.list[0]).toMatchObject({
        id: 2,
        companyName: '某企业',
        filterKey: 'ongoing',
        stageKey: 'attendance_due',
        actionTab: 'attendance',
        confirmedCount: 2,
        supervisorCount: 1,
      });
      expect(result.list[1]).toMatchObject({
        id: 3,
        companyName: '某企业',
        filterKey: 'ongoing',
        stageKey: 'settlement',
        actionTab: 'settlement',
        confirmedCount: 2,
        supervisorCount: 1,
      });
    });
  });

  it('marks overdue jobs with attendance or closed guidance', async () => {
    jobRepository.find.mockResolvedValue([
      {
        id: 11,
        userId: 3,
        title: 'Attendance Due',
        salary: 120,
        salaryUnit: '元/天',
        needCount: 3,
        location: '深圳市宝安区',
        dateStart: '2000-01-01',
        dateEnd: '2000-01-02',
        workHours: '08:00-17:00',
        status: 'working',
      },
      {
        id: 12,
        userId: 3,
        title: 'Closed Job',
        salary: 100,
        salaryUnit: '元/天',
        needCount: 2,
        location: '深圳市宝安区',
        dateStart: '2000-01-01',
        dateEnd: '2000-01-02',
        workHours: '08:00-17:00',
        status: 'recruiting',
      },
    ]);
    enterpriseCertRepository.findOne.mockResolvedValue({
      companyName: '测试企业',
    });
    jobApplicationRepository.find.mockImplementation(async ({ where: { jobId } }) => {
      if (jobId === 11) {
        return [
          { status: 'working', isSupervisor: 1 },
          { status: 'done', isSupervisor: 0 },
        ];
      }
      return [
        { status: 'pending', isSupervisor: 0 },
      ];
    });

    const result = await service.manageJobs(3, { stage: 'all' });

    expect(result.list[0]).toMatchObject({
      id: 11,
      stageKey: 'attendance_due',
      actionTab: 'attendance',
      timeState: 'end_overdue',
    });
    expect(result.list[1]).toMatchObject({
      id: 12,
      stageKey: 'closed',
      filterKey: 'closed',
      timeState: 'ended',
    });
  });

  describe('manageDetail', () => {
    it('returns applicants and summary for enterprise owner', async () => {
      jobRepository.findOne.mockResolvedValue({
        id: 8,
        userId: 3,
        title: '测试岗位',
        salary: 180,
        salaryUnit: '元/天',
        needCount: 2,
        location: '广东省东莞市长安镇',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-12',
        workHours: '08:00-18:00',
        status: 'working',
        user: {
          nickname: '企业用户',
        },
      });
      enterpriseCertRepository.findOne.mockResolvedValue({
        companyName: '认证企业',
      });
      jobApplicationRepository.find.mockResolvedValue([
        {
          id: 1,
          workerId: 101,
          status: 'pending',
          isSupervisor: 0,
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          worker: {
            nickname: '工人甲',
            avatarUrl: 'a.png',
            creditScore: 90,
          },
        },
        {
          id: 2,
          workerId: 102,
          status: 'working',
          isSupervisor: 1,
          createdAt: new Date('2026-03-02T00:00:00.000Z'),
          worker: {
            nickname: '工人乙',
            avatarUrl: 'b.png',
            creditScore: 95,
          },
        },
      ]);
      jobApplicationRepository.count.mockImplementation(
        async ({ where: { workerId } }) => (workerId === 101 ? 2 : 5),
      );

      const result = await service.manageDetail(8, 3);

      expect(result.job).toMatchObject({
        id: 8,
        companyName: '认证企业',
        status: 'working',
      });
      expect(result.summary).toMatchObject({
        pendingCount: 1,
        confirmedCount: 1,
      });
      expect(result.summary.supervisor.workerId).toBe(102);
      expect(result.applicants).toHaveLength(2);
      expect(result.applicants[0].doneCount).toBe(2);
    });

    it('falls back to worker cert real name when nickname is empty', async () => {
      jobRepository.findOne.mockResolvedValue({
        id: 9,
        userId: 3,
        title: 'Test Job',
        salary: 200,
        salaryUnit: '元/天',
        needCount: 1,
        location: '深圳市宝安区',
        dateStart: '2026-03-10',
        dateEnd: '2026-03-12',
        workHours: '09:00-18:00',
        status: 'recruiting',
        user: {
          nickname: 'Enterprise User',
        },
      });
      enterpriseCertRepository.findOne.mockResolvedValue({
        companyName: '测试企业',
      });
      workerCertRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { userId: 201, realName: '张三' },
        ]),
      });
      jobApplicationRepository.find.mockResolvedValue([
        {
          id: 1,
          workerId: 201,
          status: 'pending',
          isSupervisor: 0,
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          worker: {
            nickname: '',
            avatarUrl: 'a.png',
            creditScore: 90,
          },
        },
      ]);
      jobApplicationRepository.count.mockResolvedValue(2);

      const result = await service.manageDetail(9, 3);

      expect(result.applicants[0].name).toBe('张三');
    });

    it('rejects access from non-owner users', async () => {
      jobRepository.findOne.mockResolvedValue({
        id: 8,
        userId: 9,
        user: {},
      });

      await expect(service.manageDetail(8, 3)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('acceptApplication', () => {
    it('accepts a pending application', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 3 });
      const application = {
        jobId: 1,
        workerId: 101,
        status: 'pending',
      };
      jobApplicationRepository.findOne.mockResolvedValue(application);
      jobApplicationRepository.save.mockImplementation(async (payload) => payload);

      const result = await service.acceptApplication(1, 101, 3);

      expect(application.status).toBe('accepted');
      expect(jobApplicationRepository.save).toHaveBeenCalledWith(application);
      expect(result).toEqual(expect.objectContaining({ message: expect.any(String) }));
    });
  });

  describe('rejectApplication', () => {
    it('rejects an application and clears supervisor flag', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 3 });
      const application = {
        jobId: 1,
        workerId: 101,
        status: 'accepted',
        isSupervisor: 1,
      };
      jobApplicationRepository.findOne.mockResolvedValue(application);
      jobApplicationRepository.save.mockImplementation(async (payload) => payload);

      const result = await service.rejectApplication(1, 101, 3);

      expect(application.status).toBe('rejected');
      expect(application.isSupervisor).toBe(0);
      expect(jobApplicationRepository.save).toHaveBeenCalledWith(application);
      expect(result).toEqual(expect.objectContaining({ message: expect.any(String) }));
    });
  });

  describe('setSupervisor', () => {
    it('sets a supervisor from accepted workers', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 3 });
      const application = {
        jobId: 1,
        workerId: 101,
        status: 'working',
        isSupervisor: 0,
      };
      jobApplicationRepository.findOne.mockResolvedValue(application);
      jobApplicationRepository.save.mockImplementation(async (payload) => payload);

      const result = await service.setSupervisor(1, 3, { workerId: 101 });

      expect(jobApplicationRepository.update).toHaveBeenCalledWith(
        { jobId: 1 },
        { isSupervisor: 0 },
      );
      expect(application.isSupervisor).toBe(1);
      expect(jobApplicationRepository.save).toHaveBeenCalledWith(application);
      expect(result).toEqual(expect.objectContaining({ message: expect.any(String) }));
    });

    it('rejects empty supervisor selection', async () => {
      jobRepository.findOne.mockResolvedValue({ id: 1, userId: 3 });

      await expect(service.setSupervisor(1, 3, { workerId: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
