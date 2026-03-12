import { NotificationTriggerService } from '../notification/notification-trigger.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobScheduler } from './job.scheduler';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

describe('JobScheduler', () => {
  let scheduler: JobScheduler;
  let jobApplicationRepository: any;
  let jobRepository: any;

  beforeEach(async () => {
    jobApplicationRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    jobRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobScheduler,
        {
          provide: getRepositoryToken(JobApplication),
          useValue: jobApplicationRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: NotificationTriggerService,
          useValue: {
            notifyApplicationSubmitted: jest.fn(),
            notifyNewApplication: jest.fn(),
            notifyApplicationAccepted: jest.fn(),
            notifyApplicationRejected: jest.fn(),
            notifyApplicationCancelled: jest.fn(),
            notifyApplicationCancelledEnterprise: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<JobScheduler>(JobScheduler);
  });

  it('should release unconfirmed applications', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 10); // 10 小时后

    jobApplicationRepository.find.mockResolvedValue([
      {
        id: 1,
        status: 'accepted',
        confirmedAt: null,
        job: { dateStart: futureDate.toISOString() },
      },
    ]);

    await scheduler.releaseUnconfirmedApplications();

    expect(jobApplicationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'released' }),
    );
  });

  it('should start work for confirmed applications', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    jobApplicationRepository.find.mockResolvedValue([
      {
        id: 1,
        status: 'confirmed',
        job: { dateStart: today.toISOString() },
      },
    ]);

    await scheduler.startWorkForConfirmedApplications();

    expect(jobApplicationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'working' }),
    );
  });
});
