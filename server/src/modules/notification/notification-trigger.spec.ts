import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService } from './notification-trigger.service';
import { NotificationService } from './notification.service';

describe('NotificationTriggerService', () => {
  let service: NotificationTriggerService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTriggerService,
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationTriggerService>(NotificationTriggerService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  describe('Worker Notifications', () => {
    it('should notify application submitted', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyApplicationSubmitted(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'application_submitted',
        '报名成功',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify application accepted', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyApplicationAccepted(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'application_accepted',
        '报名已接受',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify application rejected', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyApplicationRejected(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'application_rejected',
        '报名已拒绝',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify work starting', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyWorkStarting(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'work_starting',
        '工作即将开始',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify work started', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyWorkStarted(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'work_started',
        '工作已开始',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify settlement completed', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifySettlementCompleted(1, 500);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'settlement_completed',
        '工资已到账',
        expect.stringContaining('500'),
      );
    });

    it('should notify rating reminder', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyRatingReminder(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'rating_reminder',
        '请评价本次工作',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify application cancelled', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyApplicationCancelled(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'application_cancelled',
        '报名已取消',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });
  });

  describe('Enterprise Notifications', () => {
    it('should notify new application', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyNewApplication(1, 10, 'Test Job', 'John Doe');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'new_application',
        '新的报名申请',
        expect.stringContaining('John Doe'),
        10,
        'job',
      );
    });

    it('should notify worker confirmed', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyWorkerConfirmed(1, 10, 'Test Job', 'John Doe');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'worker_confirmed',
        '临工已确认出勤',
        expect.stringContaining('John Doe'),
        10,
        'job',
      );
    });

    it('should notify application cancelled enterprise', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyApplicationCancelledEnterprise(1, 10, 'Test Job', 'John Doe');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'application_cancelled_enterprise',
        '临工已取消报名',
        expect.stringContaining('John Doe'),
        10,
        'job',
      );
    });

    it('should notify work started enterprise', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyWorkStartedEnterprise(1, 10, 'Test Job');

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'work_started_enterprise',
        '工作已开始',
        expect.stringContaining('Test Job'),
        10,
        'job',
      );
    });

    it('should notify settlement reminder', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifySettlementReminder(1, 10, 'Test Job', 1000);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'settlement_reminder',
        '结算提醒',
        expect.stringContaining('1000'),
        10,
        'job',
      );
    });

    it('should notify worker rated', async () => {
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined);

      await service.notifyWorkerRated(1, 10, 'Test Job', 'John Doe', 5);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        1,
        'worker_rated',
        '临工已评价',
        expect.stringContaining('John Doe'),
        10,
        'job',
      );
    });
  });
});
