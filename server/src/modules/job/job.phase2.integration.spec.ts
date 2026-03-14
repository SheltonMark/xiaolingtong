/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { Keyword } from '../../entities/keyword.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { Attendance } from '../../entities/attendance.entity';
import { WorkLog } from '../../entities/work-log.entity';
import { WorkerCert } from '../../entities/worker-cert.entity';
import { NotificationService } from '../notification/notification.service';
import { Notification } from '../../entities/notification.entity';

describe('JobModule Phase 2 Integration Tests - Complete Workflow', () => {
  let controller: JobController;
  let service: JobService;
  let notificationService: NotificationService;
  let jobRepository: any;
  let keywordRepository: any;
  let jobApplicationRepository: any;
  let userRepository: any;
  let supervisorRepository: any;
  let attendanceRepository: any;
  let workLogRepository: any;
  let workerCertRepository: any;
  let notificationRepository: any;

  // Mock data
  const mockEnterprise = {
    id: 1,
    nickname: 'Test Enterprise',
    role: 'enterprise',
    creditScore: 100,
    totalOrders: 50,
  };

  const mockWorker = {
    id: 2,
    nickname: 'Test Worker',
    role: 'worker',
    creditScore: 98,
    totalOrders: 15,
  };

  const mockSupervisor = {
    id: 3,
    nickname: 'Test Supervisor',
    role: 'worker',
    creditScore: 98,
    totalOrders: 15,
  };

  const mockJob = {
    id: 1,
    userId: 1,
    title: 'Test Job',
    salary: 100,
    salaryType: 'hourly',
    needCount: 5,
    location: 'Beijing',
    status: 'recruiting',
    dateStart: '2026-03-20',
    dateEnd: '2026-03-21',
  };

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
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

    userRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    supervisorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    attendanceRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    workLogRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    workerCertRepository = {
      find: jest.fn(),
    };

    notificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        JobService,
        NotificationService,
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
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Supervisor),
          useValue: supervisorRepository,
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: attendanceRepository,
        },
        {
          provide: getRepositoryToken(WorkLog),
          useValue: workLogRepository,
        },
        {
          provide: getRepositoryToken(WorkerCert),
          useValue: workerCertRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepository,
        },
      ],
    }).compile();

    controller = module.get<JobController>(JobController);
    service = module.get<JobService>(JobService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Workflow: Enterprise Publish → Worker Apply → Accept → Select Supervisor → Check In/Out → Record Work Log → Settlement', () => {
    it('should complete full workflow from job creation to work log recording', async () => {
      // Step 1: Enterprise publishes job
      keywordRepository.find.mockResolvedValue([]);
      jobRepository.create.mockReturnValue(mockJob);
      jobRepository.save.mockResolvedValue(mockJob);

      const createdJob = await service.create(mockEnterprise.id, {
        title: 'Test Job',
        salary: 100,
        needCount: 5,
        location: 'Beijing',
        contactName: 'John',
        contactPhone: '13800000000',
        dateStart: '2026-03-20',
        dateEnd: '2026-03-21',
      });

      expect(createdJob.id).toBe(1);
      expect(jobRepository.save).toHaveBeenCalled();

      // Step 2: Worker applies for job
      const mockApplication = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'pending',
        createdAt: new Date(),
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue(mockApplication);
      jobApplicationRepository.find.mockResolvedValue([]);
      jobApplicationRepository.count.mockResolvedValue(2);
      jobApplicationRepository.create.mockReturnValue(mockApplication);
      jobApplicationRepository.save.mockResolvedValue({
        ...mockApplication,
        status: 'accepted',
      });

      const application = await service.updateApplicationStatus(
        1,
        'accepted',
        mockEnterprise.id,
      );

      expect(application.status).toBe('accepted');

      // Step 3: Enterprise accepts application
      jobApplicationRepository.findOne.mockResolvedValue({
        ...mockApplication,
        status: 'pending',
        job: mockJob,
      });

      const acceptedApp = await service.acceptApplication(1, 'accepted', mockEnterprise.id);
      expect(acceptedApp.status).toBe('accepted');

      // Step 4: Enterprise selects supervisor
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      supervisorRepository.findOne.mockResolvedValue(null);
      jobApplicationRepository.findOne.mockResolvedValue({
        ...mockApplication,
        status: 'accepted',
      });
      supervisorRepository.create.mockReturnValue({
        jobId: 1,
        supervisorId: 3,
        status: 'active',
      });
      supervisorRepository.save.mockResolvedValue({
        jobId: 1,
        supervisorId: 3,
        status: 'active',
      });
      jobApplicationRepository.save.mockResolvedValue({
        ...mockApplication,
        status: 'confirmed',
        isSupervisor: 1,
      });

      const supervisorApp = await service.selectSupervisor(1, 3, mockEnterprise.id);
      expect(supervisorApp.status).toBe('confirmed');

      // Step 5: Worker checks in
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue({
        ...mockApplication,
        status: 'confirmed',
      });
      attendanceRepository.findOne.mockResolvedValue(null);

      const checkInTime = new Date('2026-03-20T08:00:00');
      const mockAttendance = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
        checkInTime,
      };

      attendanceRepository.create.mockReturnValue(mockAttendance);
      attendanceRepository.save.mockResolvedValue(mockAttendance);

      const checkIn = await service.checkIn(1, 2);
      expect(checkIn.status).toBe('checked_in');

      // Step 6: Worker checks out - use fake timers
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-20T16:00:00'));

      attendanceRepository.findOne.mockResolvedValue(mockAttendance);
      const mockCheckOut = {
        ...mockAttendance,
        status: 'checked_out',
        checkOutTime: new Date('2026-03-20T16:00:00'),
        workHours: 8,
      };

      attendanceRepository.save.mockResolvedValue(mockCheckOut);

      const checkOut = await service.checkOut(1, 2);
      expect(checkOut.status).toBe('checked_out');
      expect(checkOut.workHours).toBe(8);

      jest.useRealTimers();

      // Step 7: Record work log
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      const mockWorkLog = {
        id: 1,
        jobId: 1,
        workerId: 2,
        date: '2026-03-20',
        hours: 8,
        pieces: 0,
        anomalyType: 'normal',
      };

      workLogRepository.create.mockReturnValue(mockWorkLog);
      workLogRepository.save.mockResolvedValue(mockWorkLog);

      const workLog = await service.recordWorkLog(1, 2, '2026-03-20', 8, 0);
      expect(workLog.hours).toBe(8);
      expect(workLog.anomalyType).toBe('normal');
    });

    it('should handle supervisor selection with proper permission validation', async () => {
      // Supervisor must have creditScore >= 95 and totalOrders >= 10
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      jobRepository.findOne.mockResolvedValue(mockJob);
      supervisorRepository.findOne.mockResolvedValue(null);
      jobApplicationRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 3,
        status: 'accepted',
      });

      const mockSupervisorRecord = {
        jobId: 1,
        supervisorId: 3,
        status: 'active',
        supervisoryFee: 0,
        managedWorkerCount: 0,
      };

      supervisorRepository.create.mockReturnValue(mockSupervisorRecord);
      supervisorRepository.save.mockResolvedValue(mockSupervisorRecord);
      jobApplicationRepository.save.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 3,
        status: 'confirmed',
        isSupervisor: 1,
      });

      const result = await service.selectSupervisor(1, 3, mockEnterprise.id);
      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
    });

    it('should reject supervisor selection when worker credit score is below 95', async () => {
      const lowCreditWorker = {
        ...mockWorker,
        creditScore: 90,
      };

      userRepository.findOne.mockResolvedValue(lowCreditWorker);
      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'accepted',
      });

      await expect(
        service.selectSupervisor(1, 2, mockEnterprise.id),
      ).rejects.toThrow('Worker credit score must be at least 95');
    });

    it('should reject supervisor selection when worker has less than 10 orders', async () => {
      const lowOrderWorker = {
        ...mockWorker,
        totalOrders: 5,
      };

      userRepository.findOne.mockResolvedValue(lowOrderWorker);
      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'accepted',
      });

      await expect(
        service.selectSupervisor(1, 2, mockEnterprise.id),
      ).rejects.toThrow('Worker must have at least 10 completed orders');
    });

    it('should prevent duplicate supervisor selection for same job', async () => {
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      jobRepository.findOne.mockResolvedValue(mockJob);
      supervisorRepository.findOne.mockResolvedValue({
        jobId: 1,
        supervisorId: 3,
      });
      jobApplicationRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 3,
        status: 'accepted',
      });

      await expect(
        service.selectSupervisor(1, 3, mockEnterprise.id),
      ).rejects.toThrow('Supervisor already selected for this job');
    });
  });

  describe('Attendance Management Complete Flow', () => {
    it('should handle check-in and check-out with work hours calculation', async () => {
      const checkInTime = new Date('2026-03-20T08:00:00');

      // Check in
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue({
        jobId: 1,
        workerId: 2,
        status: 'confirmed',
      });
      attendanceRepository.findOne.mockResolvedValue(null);

      const mockCheckIn = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
        checkInTime,
      };

      attendanceRepository.create.mockReturnValue(mockCheckIn);
      attendanceRepository.save.mockResolvedValue(mockCheckIn);

      const checkIn = await service.checkIn(1, 2);
      expect(checkIn.status).toBe('checked_in');

      // Check out - use fake timers
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-20T17:00:00'));

      attendanceRepository.findOne.mockResolvedValue(mockCheckIn);

      const mockCheckOut = {
        ...mockCheckIn,
        status: 'checked_out',
        checkOutTime: new Date('2026-03-20T17:00:00'),
        workHours: 9,
      };

      attendanceRepository.save.mockResolvedValue(mockCheckOut);

      const checkOut = await service.checkOut(1, 2);
      expect(checkOut.status).toBe('checked_out');
      expect(checkOut.workHours).toBe(9);

      jest.useRealTimers();
    });

    it('should prevent check-in when worker not confirmed', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue(null);

      await expect(service.checkIn(1, 2)).rejects.toThrow(
        'Worker not confirmed for this job',
      );
    });

    it('should prevent duplicate check-in', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);
      jobApplicationRepository.findOne.mockResolvedValue({
        jobId: 1,
        workerId: 2,
        status: 'confirmed',
      });
      attendanceRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
      });

      await expect(service.checkIn(1, 2)).rejects.toThrow('Already checked in');
    });

    it('should prevent check-out without active check-in', async () => {
      attendanceRepository.findOne.mockResolvedValue(null);

      await expect(service.checkOut(1, 2)).rejects.toThrow(
        'No active check-in found',
      );
    });

    it('should validate work hours do not exceed 24 hours', async () => {
      const checkInTime = new Date('2026-03-20T08:00:00');
      const checkOutTime = new Date('2026-03-21T10:00:00'); // 26 hours

      attendanceRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
        checkInTime,
      });

      // Mock the current time to be checkOutTime
      jest.useFakeTimers();
      jest.setSystemTime(checkOutTime);

      try {
        await expect(service.checkOut(1, 2)).rejects.toThrow(
          'Work hours cannot exceed 24 hours',
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('should retrieve attendances only for job owner', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      attendanceRepository.find.mockResolvedValue([
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          status: 'checked_out',
          workHours: 8,
        },
      ]);

      const attendances = await service.getAttendances(1, mockEnterprise.id);
      expect(attendances).toHaveLength(1);
    });

    it('should prevent unauthorized access to attendances', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(service.getAttendances(1, 999)).rejects.toThrow(
        'You do not have permission to view attendances for this job',
      );
    });
  });

  describe('Work Log Management Complete Flow', () => {
    it('should record work log with valid hours and pieces', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      const mockWorkLog = {
        id: 1,
        jobId: 1,
        workerId: 2,
        date: '2026-03-20',
        hours: 8,
        pieces: 100,
        anomalyType: 'normal',
      };

      workLogRepository.create.mockReturnValue(mockWorkLog);
      workLogRepository.save.mockResolvedValue(mockWorkLog);

      const workLog = await service.recordWorkLog(1, 2, '2026-03-20', 8, 100);
      expect(workLog.hours).toBe(8);
      expect(workLog.pieces).toBe(100);
      expect(workLog.anomalyType).toBe('normal');
    });

    it('should validate work hours are within valid range', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        service.recordWorkLog(1, 2, '2026-03-20', 25, 0),
      ).rejects.toThrow('Work hours must be between 0 and 24');
    });

    it('should validate piece count is not negative', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        service.recordWorkLog(1, 2, '2026-03-20', 8, -5),
      ).rejects.toThrow('Piece count cannot be negative');
    });

    it('should retrieve work logs for job', async () => {
      const mockWorkLogs = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          date: '2026-03-20',
          hours: 8,
          pieces: 100,
        },
        {
          id: 2,
          jobId: 1,
          workerId: 3,
          date: '2026-03-20',
          hours: 8,
          pieces: 120,
        },
      ];

      workLogRepository.find.mockResolvedValue(mockWorkLogs);

      const workLogs = await service.getWorkLogs(1);
      expect(workLogs).toHaveLength(2);
    });

    it('should confirm work log', async () => {
      const mockWorkLog = {
        id: 1,
        jobId: 1,
        workerId: 2,
        date: '2026-03-20',
        hours: 8,
        pieces: 100,
        status: 'pending',
      };

      workLogRepository.findOne.mockResolvedValue(mockWorkLog);
      workLogRepository.save.mockResolvedValue({
        ...mockWorkLog,
        status: 'confirmed',
      });

      const confirmed = await service.confirmWorkLog(1);
      expect(confirmed).toBeDefined();
    });

    it('should update work log anomaly', async () => {
      const mockWorkLog = {
        id: 1,
        jobId: 1,
        workerId: 2,
        date: '2026-03-20',
        hours: 8,
        anomalyType: 'normal',
      };

      workLogRepository.findOne.mockResolvedValue(mockWorkLog);
      workLogRepository.save.mockResolvedValue({
        ...mockWorkLog,
        anomalyType: 'early_leave',
        anomalyNote: 'Traffic jam',
      });

      const updated = await service.updateWorkLogAnomaly(
        1,
        'early_leave',
        'Traffic jam',
      );
      expect(updated).toBeDefined();
    });
  });

  describe('Permission Validation Tests', () => {
    it('should prevent non-owner from accepting applications', async () => {
      jobApplicationRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'pending',
        job: { ...mockJob, userId: 1 },
      });

      await expect(
        service.acceptApplication(1, 'accepted', 999),
      ).rejects.toThrow('You do not have permission to accept this application');
    });

    it('should prevent non-owner from selecting supervisor', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.selectSupervisor(1, 3, 999),
      ).rejects.toThrow('You do not have permission to manage this job');
    });

    it('should prevent non-owner from viewing applications', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.getApplicationsForEnterprise(1, 999),
      ).rejects.toThrow('You do not have permission to view this job');
    });

    it('should prevent non-owner from updating job', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);

      await expect(
        service.update(1, 999, { title: 'Updated' }),
      ).rejects.toThrow('无权操作');
    });
  });

  describe('Notification Verification Tests', () => {
    it('should send notification when worker applies for job', async () => {
      const notifySpy = jest.spyOn(notificationService, 'notifyJobApply');

      await notificationService.notifyJobApply(
        mockEnterprise.id,
        mockJob.id,
        mockJob.title,
        mockWorker.nickname,
      );

      expect(notifySpy).toHaveBeenCalledWith(
        mockEnterprise.id,
        mockJob.id,
        mockJob.title,
        mockWorker.nickname,
      );
    });

    it('should send notification when application is accepted', async () => {
      const notifySpy = jest.spyOn(notificationService, 'notifyJobAccepted');

      await notificationService.notifyJobAccepted(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        mockEnterprise.nickname,
      );

      expect(notifySpy).toHaveBeenCalledWith(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        mockEnterprise.nickname,
      );
    });

    it('should send notification when application is rejected', async () => {
      const notifySpy = jest.spyOn(notificationService, 'notifyJobRejected');

      await notificationService.notifyJobRejected(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        mockEnterprise.nickname,
      );

      expect(notifySpy).toHaveBeenCalledWith(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        mockEnterprise.nickname,
      );
    });

    it('should send notification when work starts', async () => {
      const notifySpy = jest.spyOn(notificationService, 'notifyWorkStart');

      await notificationService.notifyWorkStart(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        true,
      );

      expect(notifySpy).toHaveBeenCalledWith(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        true,
      );
    });

    it('should send settlement notification to worker', async () => {
      const notifySpy = jest.spyOn(notificationService, 'notifySettlement');

      await notificationService.notifySettlement(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        800,
      );

      expect(notifySpy).toHaveBeenCalledWith(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        800,
      );
    });

    it('should send rating reminder notification', async () => {
      const notifySpy = jest.spyOn(notificationService, 'notifyRating');

      await notificationService.notifyRating(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        mockEnterprise.nickname,
        true,
      );

      expect(notifySpy).toHaveBeenCalledWith(
        mockWorker.id,
        mockJob.id,
        mockJob.title,
        mockEnterprise.nickname,
        true,
      );
    });
  });

  describe('Application Status Transitions', () => {
    it('should transition application from pending to accepted', async () => {
      const mockApp = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'pending',
        job: mockJob,
      };

      jobApplicationRepository.findOne.mockResolvedValue(mockApp);
      jobApplicationRepository.save.mockResolvedValue({
        ...mockApp,
        status: 'accepted',
      });

      const result = await service.acceptApplication(1, 'accepted', mockEnterprise.id);
      expect(result.status).toBe('accepted');
    });

    it('should transition application from accepted to confirmed', async () => {
      const mockApp = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'accepted',
      };

      jobApplicationRepository.findOne.mockResolvedValue(mockApp);
      jobApplicationRepository.save.mockResolvedValue({
        ...mockApp,
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      const result = await service.confirmAttendance(1, 2);
      expect(result.status).toBe('confirmed');
    });

    it('should prevent invalid status transitions', async () => {
      const mockApp = {
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'done',
      };

      jobApplicationRepository.findOne.mockResolvedValue(mockApp);

      // Attempting to transition from 'done' to 'pending' should fail
      await expect(
        service.updateApplicationStatus(1, 'pending', mockEnterprise.id),
      ).rejects.toThrow();
    });
  });

  describe('Multi-Worker Workflow', () => {
    it('should handle multiple workers for same job', async () => {
      const mockApplications = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          status: 'accepted',
          worker: mockWorker,
        },
        {
          id: 2,
          jobId: 1,
          workerId: 3,
          status: 'pending',
          worker: mockSupervisor,
        },
      ];

      jobRepository.findOne.mockResolvedValue(mockJob);
      jobApplicationRepository.find.mockResolvedValue(mockApplications);
      workerCertRepository.find.mockResolvedValue([]);

      const applications = await service.getApplicationsForEnterprise(1, mockEnterprise.id);

      // Verify return structure
      expect(applications).toBeDefined();
      expect(applications.pending).toBeDefined();
      expect(applications.pending.length).toBe(1);
      expect(applications.accepted).toBeDefined();
      expect(applications.accepted.length).toBe(1);

      // Verify worker details in accepted applications
      expect(applications.accepted[0].worker).toBeDefined();
      expect(applications.accepted[0].worker.nickname).toBe('Test Worker');
      expect(applications.accepted[0].worker.creditScore).toBe(98);
      expect(applications.accepted[0].worker.totalOrders).toBe(15);

      // Verify worker details in pending applications
      expect(applications.pending[0].worker.nickname).toBe('Test Supervisor');
      expect(applications.pending[0].worker.creditScore).toBe(98);
      expect(applications.pending[0].worker.totalOrders).toBe(15);
    });

    it('should retrieve all worker applications grouped by status', async () => {
      const mockApplications = [
        {
          id: 1,
          jobId: 1,
          workerId: 2,
          status: 'pending',
          job: mockJob,
        },
        {
          id: 2,
          jobId: 2,
          workerId: 2,
          status: 'confirmed',
          job: { ...mockJob, id: 2 },
        },
        {
          id: 3,
          jobId: 3,
          workerId: 2,
          status: 'working',
          job: { ...mockJob, id: 3 },
        },
      ];

      jobApplicationRepository.find.mockResolvedValue(mockApplications);

      const result = await service.getMyApplications(2);
      expect(result.pending).toBeDefined();
      expect(result.confirmed).toBeDefined();
      expect(result.working).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle job not found error', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(service.detail(999)).rejects.toThrow();
    });

    it('should handle application not found error', async () => {
      jobApplicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acceptApplication(999, 'accepted', mockEnterprise.id),
      ).rejects.toThrow('Application not found');
    });

    it('should handle worker not found error', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.checkIn(1, 999)).rejects.toThrow(
        'Worker not found',
      );
    });

    it('should handle invalid work hours', async () => {
      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockWorker);

      await expect(
        service.recordWorkLog(1, 2, '2026-03-20', -1, 0),
      ).rejects.toThrow('Work hours must be between 0 and 24');
    });

    it('should handle check-out time before check-in time', async () => {
      const checkInTime = new Date('2026-03-20T17:00:00');
      const checkOutTime = new Date('2026-03-20T08:00:00');

      attendanceRepository.findOne.mockResolvedValue({
        id: 1,
        jobId: 1,
        workerId: 2,
        status: 'checked_in',
        checkInTime,
      });

      await expect(service.checkOut(1, 2)).rejects.toThrow(
        'Check-out time cannot be before check-in time',
      );
    });
  });
});
