# 临工招工流程实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标**: 实现临工端"我的报名"与企业端招工流程的完整匹配，通过统一的业务状态机确保两端数据一致。

**架构**: 后端维护唯一的 JobApplication 业务状态机（pending → accepted → confirmed → working → done），前端根据业务状态映射到各自的展示状态。临工端展示 4 个标签（待确认、已入选、进行中、已完成），企业端展示完整的招工流程（报名管理 → 选择管理员 → 工作执行 → 结算支付）。

**技术栈**: NestJS + TypeORM（后端），微信小程序（前端），定时任务（出勤确认、工作开始）

---

## Task 1: 完善 JobApplication 状态机

**文件**:
- 修改: `server/src/entities/job-application.entity.ts`
- 修改: `server/src/modules/job/job.service.ts`
- 创建: `server/src/modules/job/job-state-machine.ts`
- 测试: `server/src/modules/job/job-state-machine.spec.ts`

**Step 1: 查看当前 JobApplication 实体**

运行: `cat server/src/entities/job-application.entity.ts`

**Step 2: 创建状态机类**

创建文件 `server/src/modules/job/job-state-machine.ts`，定义合法的状态转移规则：

```typescript
export class JobStateMachine {
  // 定义合法的状态转移
  private static readonly TRANSITIONS = {
    pending: ['accepted', 'rejected', 'cancelled'],
    accepted: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['working', 'released', 'cancelled'],
    working: ['done', 'cancelled'],
    done: [],
    rejected: [],
    released: [],
    cancelled: [],
  };

  static canTransition(from: string, to: string): boolean {
    return this.TRANSITIONS[from]?.includes(to) ?? false;
  }

  static getNextState(current: string): string[] {
    return this.TRANSITIONS[current] ?? [];
  }
}
```

**Step 3: 编写状态机测试**

创建文件 `server/src/modules/job/job-state-machine.spec.ts`：

```typescript
import { JobStateMachine } from './job-state-machine';

describe('JobStateMachine', () => {
  it('should allow pending -> accepted', () => {
    expect(JobStateMachine.canTransition('pending', 'accepted')).toBe(true);
  });

  it('should allow pending -> rejected', () => {
    expect(JobStateMachine.canTransition('pending', 'rejected')).toBe(true);
  });

  it('should not allow pending -> working', () => {
    expect(JobStateMachine.canTransition('pending', 'working')).toBe(false);
  });

  it('should allow accepted -> confirmed', () => {
    expect(JobStateMachine.canTransition('accepted', 'confirmed')).toBe(true);
  });

  it('should not allow done -> any state', () => {
    expect(JobStateMachine.canTransition('done', 'pending')).toBe(false);
    expect(JobStateMachine.canTransition('done', 'working')).toBe(false);
  });

  it('should return next possible states', () => {
    expect(JobStateMachine.getNextState('pending')).toEqual(['accepted', 'rejected', 'cancelled']);
    expect(JobStateMachine.getNextState('confirmed')).toEqual(['working', 'released', 'cancelled']);
  });
});
```

**Step 4: 运行测试验证失败**

运行: `npm run test -- server/src/modules/job/job-state-machine.spec.ts`

预期: PASS（因为实现已完成）

**Step 5: 在 JobService 中添加状态转移方法**

修改 `server/src/modules/job/job.service.ts`，添加方法：

```typescript
async updateApplicationStatus(
  applicationId: number,
  newStatus: string,
  userId: number,
): Promise<JobApplication> {
  const application = await this.jobApplicationRepository.findOne({
    where: { id: applicationId },
    relations: ['job'],
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  if (!JobStateMachine.canTransition(application.status, newStatus)) {
    throw new BadRequestException(
      `Cannot transition from ${application.status} to ${newStatus}`,
    );
  }

  application.status = newStatus;
  if (newStatus === 'confirmed') {
    application.confirmedAt = new Date();
  }

  return this.jobApplicationRepository.save(application);
}
```

**Step 6: 提交**

```bash
git add server/src/modules/job/job-state-machine.ts \
         server/src/modules/job/job-state-machine.spec.ts \
         server/src/modules/job/job.service.ts
git commit -m "feat: implement JobApplication state machine with validation"
```

---

## Task 2: 实现企业端报名管理接口

**文件**:
- 修改: `server/src/modules/job/job.controller.ts`
- 修改: `server/src/modules/job/job.service.ts`
- 创建: `server/src/modules/job/dto/accept-application.dto.ts`
- 测试: `server/src/modules/job/job.controller.spec.ts`

**Step 1: 创建 DTO**

创建文件 `server/src/modules/job/dto/accept-application.dto.ts`：

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';

export class AcceptApplicationDto {
  @IsEnum(['accepted', 'rejected'])
  @IsNotEmpty()
  action: 'accepted' | 'rejected';
}
```

**Step 2: 在 JobService 中添加接受/拒绝报名方法**

修改 `server/src/modules/job/job.service.ts`：

```typescript
async acceptApplication(
  applicationId: number,
  action: 'accepted' | 'rejected',
  userId: number,
): Promise<JobApplication> {
  const application = await this.jobApplicationRepository.findOne({
    where: { id: applicationId },
    relations: ['job'],
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  // 验证权限：只有工作发布者可以接受/拒绝
  if (application.job.userId !== userId) {
    throw new ForbiddenException('You do not have permission to accept this application');
  }

  // 验证状态：只有 pending 状态可以接受/拒绝
  if (application.status !== 'pending') {
    throw new BadRequestException('Application is not in pending status');
  }

  return this.updateApplicationStatus(applicationId, action, userId);
}
```

**Step 3: 在 JobController 中添加接口**

修改 `server/src/modules/job/job.controller.ts`：

```typescript
@Post(':jobId/applications/:applicationId/accept')
@UseGuards(AuthGuard)
async acceptApplication(
  @Param('jobId') jobId: number,
  @Param('applicationId') applicationId: number,
  @Body() dto: AcceptApplicationDto,
  @Request() req,
) {
  return this.jobService.acceptApplication(applicationId, dto.action, req.user.id);
}
```

**Step 4: 编写测试**

在 `server/src/modules/job/job.controller.spec.ts` 中添加：

```typescript
it('should accept application', async () => {
  const result = await controller.acceptApplication(1, 1, { action: 'accepted' }, { user: { id: 1 } });
  expect(result.status).toBe('accepted');
});

it('should reject application', async () => {
  const result = await controller.acceptApplication(1, 1, { action: 'rejected' }, { user: { id: 1 } });
  expect(result.status).toBe('rejected');
});
```

**Step 5: 运行测试**

运行: `npm run test -- server/src/modules/job/job.controller.spec.ts`

预期: PASS

**Step 6: 提交**

```bash
git add server/src/modules/job/dto/accept-application.dto.ts \
         server/src/modules/job/job.service.ts \
         server/src/modules/job/job.controller.ts \
         server/src/modules/job/job.controller.spec.ts
git commit -m "feat: implement enterprise application acceptance/rejection"
```

---

## Task 3: 实现企业端选择临工管理员接口

**文件**:
- 修改: `server/src/modules/job/job.service.ts`
- 修改: `server/src/modules/job/job.controller.ts`
- 创建: `server/src/modules/job/dto/select-supervisor.dto.ts`
- 测试: `server/src/modules/job/job.controller.spec.ts`

**Step 1: 创建 DTO**

创建文件 `server/src/modules/job/dto/select-supervisor.dto.ts`：

```typescript
import { IsNumber, IsNotEmpty } from 'class-validator';

export class SelectSupervisorDto {
  @IsNumber()
  @IsNotEmpty()
  workerId: number;
}
```

**Step 2: 在 JobService 中添加选择管理员方法**

修改 `server/src/modules/job/job.service.ts`：

```typescript
async selectSupervisor(
  jobId: number,
  workerId: number,
  userId: number,
): Promise<JobApplication> {
  const job = await this.jobRepository.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('You do not have permission to manage this job');
  }

  const application = await this.jobApplicationRepository.findOne({
    where: { jobId, workerId, status: 'accepted' },
  });

  if (!application) {
    throw new NotFoundException('Application not found or not in accepted status');
  }

  // 验证临工资格
  const worker = await this.userRepository.findOne({ where: { id: workerId } });
  if (!worker || worker.creditScore < 95 || worker.totalOrders < 10) {
    throw new BadRequestException('Worker does not meet supervisor requirements');
  }

  // 更新为 confirmed 并标记为管理员
  application.status = 'confirmed';
  application.isSupervisor = 1;
  application.confirmedAt = new Date();

  return this.jobApplicationRepository.save(application);
}
```

**Step 3: 在 JobController 中添加接口**

修改 `server/src/modules/job/job.controller.ts`：

```typescript
@Post(':jobId/select-supervisor')
@UseGuards(AuthGuard)
async selectSupervisor(
  @Param('jobId') jobId: number,
  @Body() dto: SelectSupervisorDto,
  @Request() req,
) {
  return this.jobService.selectSupervisor(jobId, dto.workerId, req.user.id);
}
```

**Step 4: 编写测试**

在 `server/src/modules/job/job.controller.spec.ts` 中添加：

```typescript
it('should select supervisor', async () => {
  const result = await controller.selectSupervisor(1, { workerId: 2 }, { user: { id: 1 } });
  expect(result.isSupervisor).toBe(1);
  expect(result.status).toBe('confirmed');
});

it('should reject if worker does not meet requirements', async () => {
  await expect(
    controller.selectSupervisor(1, { workerId: 3 }, { user: { id: 1 } }),
  ).rejects.toThrow('Worker does not meet supervisor requirements');
});
```

**Step 5: 运行测试**

运行: `npm run test -- server/src/modules/job/job.controller.spec.ts`

预期: PASS

**Step 6: 提交**

```bash
git add server/src/modules/job/dto/select-supervisor.dto.ts \
         server/src/modules/job/job.service.ts \
         server/src/modules/job/job.controller.ts
git commit -m "feat: implement supervisor selection with qualification validation"
```

---

## Task 4: 实现临工端出勤确认接口

**文件**:
- 修改: `server/src/modules/job/job.service.ts`
- 修改: `server/src/modules/job/job.controller.ts`
- 测试: `server/src/modules/job/job.controller.spec.ts`

**Step 1: 在 JobService 中添加出勤确认方法**

修改 `server/src/modules/job/job.service.ts`：

```typescript
async confirmAttendance(
  applicationId: number,
  workerId: number,
): Promise<JobApplication> {
  const application = await this.jobApplicationRepository.findOne({
    where: { id: applicationId, workerId, status: 'accepted' },
  });

  if (!application) {
    throw new NotFoundException('Application not found or not in accepted status');
  }

  application.status = 'confirmed';
  application.confirmedAt = new Date();

  return this.jobApplicationRepository.save(application);
}
```

**Step 2: 在 JobController 中添加接口**

修改 `server/src/modules/job/job.controller.ts`：

```typescript
@Post('applications/:applicationId/confirm-attendance')
@UseGuards(AuthGuard)
async confirmAttendance(
  @Param('applicationId') applicationId: number,
  @Request() req,
) {
  return this.jobService.confirmAttendance(applicationId, req.user.id);
}
```

**Step 3: 编写测试**

在 `server/src/modules/job/job.controller.spec.ts` 中添加：

```typescript
it('should confirm attendance', async () => {
  const result = await controller.confirmAttendance(1, { user: { id: 1 } });
  expect(result.status).toBe('confirmed');
  expect(result.confirmedAt).toBeDefined();
});
```

**Step 4: 运行测试**

运行: `npm run test -- server/src/modules/job/job.controller.spec.ts`

预期: PASS

**Step 5: 提交**

```bash
git add server/src/modules/job/job.service.ts \
         server/src/modules/job/job.controller.ts
git commit -m "feat: implement worker attendance confirmation"
```

---

## Task 5: 实现临工端"我的报名"分类接口

**文件**:
- 修改: `server/src/modules/job/job.service.ts`
- 修改: `server/src/modules/job/job.controller.ts`
- 测试: `server/src/modules/job/job.controller.spec.ts`

**Step 1: 在 JobService 中添加分类查询方法**

修改 `server/src/modules/job/job.service.ts`：

```typescript
async getMyApplications(workerId: number) {
  const applications = await this.jobApplicationRepository.find({
    where: { workerId },
    relations: ['job', 'job.user'],
    order: { createdAt: 'DESC' },
  });

  // 按状态分类
  const grouped = {
    pending: [],
    accepted: [],
    confirmed: [],
    working: [],
    done: [],
  };

  applications.forEach((app) => {
    // 将 pending 和 accepted 都归到 pending 分类
    if (app.status === 'pending' || app.status === 'accepted') {
      grouped.pending.push(app);
    } else if (app.status === 'confirmed') {
      grouped.confirmed.push(app);
    } else if (app.status === 'working') {
      grouped.working.push(app);
    } else if (app.status === 'done') {
      grouped.done.push(app);
    }
  });

  return grouped;
}
```

**Step 2: 在 JobController 中添加接口**

修改 `server/src/modules/job/job.controller.ts`：

```typescript
@Get('my-applications')
@UseGuards(AuthGuard)
async getMyApplications(@Request() req) {
  return this.jobService.getMyApplications(req.user.id);
}
```

**Step 3: 编写测试**

在 `server/src/modules/job/job.controller.spec.ts` 中添加：

```typescript
it('should return applications grouped by status', async () => {
  const result = await controller.getMyApplications({ user: { id: 1 } });
  expect(result).toHaveProperty('pending');
  expect(result).toHaveProperty('confirmed');
  expect(result).toHaveProperty('working');
  expect(result).toHaveProperty('done');
});
```

**Step 4: 运行测试**

运行: `npm run test -- server/src/modules/job/job.controller.spec.ts`

预期: PASS

**Step 5: 提交**

```bash
git add server/src/modules/job/job.service.ts \
         server/src/modules/job/job.controller.ts
git commit -m "feat: implement worker applications grouping by status"
```

---

## Task 6: 实现企业端报名列表查询接口

**文件**:
- 修改: `server/src/modules/job/job.service.ts`
- 修改: `server/src/modules/job/job.controller.ts`
- 测试: `server/src/modules/job/job.controller.spec.ts`

**Step 1: 在 JobService 中添加企业端查询方法**

修改 `server/src/modules/job/job.service.ts`：

```typescript
async getApplicationsForEnterprise(jobId: number, userId: number) {
  const job = await this.jobRepository.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('You do not have permission to view this job');
  }

  const applications = await this.jobApplicationRepository.find({
    where: { jobId },
    relations: ['worker'],
    order: { createdAt: 'DESC' },
  });

  // 按状态分类
  const grouped = {
    pending: [],
    accepted: [],
    confirmed: [],
  };

  applications.forEach((app) => {
    if (app.status === 'pending') {
      grouped.pending.push({
        ...app,
        worker: {
          id: app.worker.id,
          name: app.worker.name,
          creditScore: app.worker.creditScore,
          totalOrders: app.worker.totalOrders,
          distance: app.worker.distance,
        },
      });
    } else if (app.status === 'accepted') {
      grouped.accepted.push(app);
    } else if (app.status === 'confirmed') {
      grouped.confirmed.push({
        ...app,
        isSupervisor: app.isSupervisor,
      });
    }
  });

  return grouped;
}
```

**Step 2: 在 JobController 中添加接口**

修改 `server/src/modules/job/job.controller.ts`：

```typescript
@Get(':jobId/applications')
@UseGuards(AuthGuard)
async getApplicationsForEnterprise(
  @Param('jobId') jobId: number,
  @Request() req,
) {
  return this.jobService.getApplicationsForEnterprise(jobId, req.user.id);
}
```

**Step 3: 编写测试**

在 `server/src/modules/job/job.controller.spec.ts` 中添加：

```typescript
it('should return applications for enterprise', async () => {
  const result = await controller.getApplicationsForEnterprise(1, { user: { id: 1 } });
  expect(result).toHaveProperty('pending');
  expect(result).toHaveProperty('accepted');
  expect(result).toHaveProperty('confirmed');
});
```

**Step 4: 运行测试**

运行: `npm run test -- server/src/modules/job/job.controller.spec.ts`

预期: PASS

**Step 5: 提交**

```bash
git add server/src/modules/job/job.service.ts \
         server/src/modules/job/job.controller.ts
git commit -m "feat: implement enterprise applications query with grouping"
```

---

## Task 7: 实现定时任务 - 自动释放未确认的报名

**文件**:
- 创建: `server/src/modules/job/job.scheduler.ts`
- 修改: `server/src/modules/job/job.module.ts`
- 测试: `server/src/modules/job/job.scheduler.spec.ts`

**Step 1: 创建定时任务类**

创建文件 `server/src/modules/job/job.scheduler.ts`：

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class JobScheduler {
  constructor(
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  @Cron('0 * * * *') // 每小时执行一次
  async releaseUnconfirmedApplications() {
    // 获取所有 accepted 状态的报名
    const applications = await this.jobApplicationRepository.find({
      where: { status: 'accepted' },
      relations: ['job'],
    });

    const now = new Date();
    const releaseThreshold = 12 * 60 * 60 * 1000; // 12 小时

    for (const app of applications) {
      const jobStartTime = new Date(app.job.dateStart).getTime();
      const timeUntilStart = jobStartTime - now.getTime();

      // 如果距离工作开始时间少于 12 小时，且未确认，则释放
      if (timeUntilStart < releaseThreshold && !app.confirmedAt) {
        app.status = 'released';
        await this.jobApplicationRepository.save(app);
      }
    }
  }
}
```

**Step 2: 在 JobModule 中注册定时任务**

修改 `server/src/modules/job/job.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { JobScheduler } from './job.scheduler';
import { Job } from '../../entities/job.entity';
import { JobApplication } from '../../entities/job-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobApplication]),
    ScheduleModule.forRoot(),
  ],
  providers: [JobService, JobScheduler],
  controllers: [JobController],
})
export class JobModule {}
```

**Step 3: 编写测试**

创建文件 `server/src/modules/job/job.scheduler.spec.ts`：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobScheduler } from './job.scheduler';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';

describe('JobScheduler', () => {
  let scheduler: JobScheduler;
  let jobApplicationRepository;
  let jobRepository;

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
});
```

**Step 4: 运行测试**

运行: `npm run test -- server/src/modules/job/job.scheduler.spec.ts`

预期: PASS

**Step 5: 提交**

```bash
git add server/src/modules/job/job.scheduler.ts \
         server/src/modules/job/job.scheduler.spec.ts \
         server/src/modules/job/job.module.ts
git commit -m "feat: implement scheduled task for releasing unconfirmed applications"
```

---

## Task 8: 实现定时任务 - 自动更新工作状态为进行中

**文件**:
- 修改: `server/src/modules/job/job.scheduler.ts`
- 测试: `server/src/modules/job/job.scheduler.spec.ts`

**Step 1: 在 JobScheduler 中添加工作开始定时任务**

修改 `server/src/modules/job/job.scheduler.ts`，添加方法：

```typescript
@Cron('0 * * * *') // 每小时执行一次
async startWorkForConfirmedApplications() {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // 当天开始时间

  // 获取所有 confirmed 状态的报名，且工作开始日期为今天
  const applications = await this.jobApplicationRepository.find({
    where: { status: 'confirmed' },
    relations: ['job'],
  });

  for (const app of applications) {
    const jobStartDate = new Date(app.job.dateStart);
    jobStartDate.setHours(0, 0, 0, 0);

    if (jobStartDate.getTime() === now.getTime()) {
      app.status = 'working';
      await this.jobApplicationRepository.save(app);
    }
  }
}
```

**Step 2: 编写测试**

修改 `server/src/modules/job/job.scheduler.spec.ts`，添加测试：

```typescript
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
```

**Step 3: 运行测试**

运行: `npm run test -- server/src/modules/job/job.scheduler.spec.ts`

预期: PASS

**Step 4: 提交**

```bash
git add server/src/modules/job/job.scheduler.ts \
         server/src/modules/job/job.scheduler.spec.ts
git commit -m "feat: implement scheduled task for starting work"
```

---

## Task 9: 运行完整的后端测试套件

**Step 1: 运行所有 Job 模块测试**

运行: `npm run test -- server/src/modules/job/`

预期: 所有测试通过

**Step 2: 运行集成测试**

运行: `npm run test:e2e -- job`

预期: 所有 E2E 测试通过

**Step 3: 检查代码覆盖率**

运行: `npm run test:cov -- server/src/modules/job/`

预期: 覆盖率 > 80%

**Step 4: 提交**

```bash
git add .
git commit -m "test: verify all job module tests pass with coverage"
```

---

## 总结

这个实现计划包含 9 个任务，涵盖：

1. **状态机** - 定义合法的状态转移规则
2. **企业端报名管理** - 接受/拒绝报名
3. **企业端选择管理员** - 从报名者中选择管理员
4. **临工端出勤确认** - 临工确认出勤
5. **临工端分类查询** - "我的报名"按状态分类
6. **企业端报名列表** - 企业查看报名者信息
7. **定时任务1** - 自动释放未确认的报名
8. **定时任务2** - 自动更新工作状态为进行中
9. **测试验证** - 运行完整的测试套件

所有任务都遵循 TDD 原则，每个任务都包含失败测试 → 实现 → 通过测试 → 提交的完整流程。

