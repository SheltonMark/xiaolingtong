# Phase 2 实现计划 - 企业端功能完善

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现企业端工资结算页面重构、主管管理功能和通知提醒系统，完善招工流程的用户体验。

**Architecture:** 采用分层架构，后端实现业务逻辑（主管选择、考勤管理、通知发送），前端实现UI布局（工资结算页面、主管管理界面）。使用 NestJS + TypeORM 处理数据，WebSocket 实现实时通知。

**Tech Stack:** NestJS + TypeORM + Jest + Supertest + WebSocket

---

## Phase 2 概述

**时间**: 2.5 周
**任务数**: 11 个
**测试数**: 45+ 个
**预期覆盖率**: > 90%

### 任务分解

| Task | 名称 | 优先级 | 工期 |
|------|------|--------|------|
| 9 | 主管选择 - 后端逻辑 | 高 | 3 天 |
| 10 | 主管选择 - API 端点 | 高 | 2 天 |
| 11 | 考勤管理 - 后端逻辑 | 高 | 3 天 |
| 12 | 考勤管理 - API 端点 | 高 | 2 天 |
| 13 | 工时记录 - 后端逻辑 | 中 | 3 天 |
| 14 | 工时记录 - API 端点 | 中 | 2 天 |
| 15 | 通知系统 - 数据模型 | 中 | 2 天 |
| 16 | 通知系统 - 发送逻辑 | 中 | 3 天 |
| 17 | 通知系统 - API 端点 | 中 | 2 天 |
| 18 | 集成测试 | 中 | 2 天 |
| 19 | 验证和文档 | 低 | 1 天 |

---

## Task 9: 主管选择 - 后端逻辑

**Files:**
- Create: `server/src/modules/job/supervisor-selection.spec.ts`
- Modify: `server/src/modules/job/job.service.ts:200-250`
- Create: `server/src/entities/supervisor.entity.ts`

**Step 1: 创建 Supervisor 实体**

```typescript
// server/src/entities/supervisor.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('supervisors')
export class Supervisor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @Column()
  supervisorId: number; // 主管的 workerId

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'inactive'; // 主管状态

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  supervisoryFee: number; // 监管服务费

  @Column({ type: 'int', default: 0 })
  managedWorkerCount: number; // 管理的临工数

  @ManyToOne(() => Job, job => job.supervisors)
  job: Job;

  @ManyToOne(() => User)
  supervisor: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Step 2: 编写主管选择测试**

```typescript
// server/src/modules/job/supervisor-selection.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { Supervisor } from '../../entities/supervisor.entity';
import { BadRequestException } from '@nestjs/common';

describe('SupervisorSelection', () => {
  let service: JobService;
  let jobRepository: any;
  let userRepository: any;
  let supervisorRepository: any;

  beforeEach(async () => {
    jobRepository = {
      findOne: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    supervisorRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Supervisor),
          useValue: supervisorRepository,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  describe('selectSupervisor', () => {
    it('should select supervisor with valid credentials', async () => {
      const jobId = 1;
      const supervisorId = 2;
      const userId = 1; // 企业用户

      const mockJob = { id: jobId, userId, status: 'recruiting' };
      const mockSupervisor = {
        id: supervisorId,
        creditScore: 95,
        orderCount: 10,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      supervisorRepository.findOne.mockResolvedValue(null);
      supervisorRepository.create.mockReturnValue({
        jobId,
        supervisorId,
        status: 'active',
      });
      supervisorRepository.save.mockResolvedValue({
        id: 1,
        jobId,
        supervisorId,
        status: 'active',
      });

      const result = await service.selectSupervisor(jobId, supervisorId, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe('active');
      expect(supervisorRepository.save).toHaveBeenCalled();
    });

    it('should reject supervisor with low credit score', async () => {
      const jobId = 1;
      const supervisorId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockSupervisor = {
        id: supervisorId,
        creditScore: 90, // < 95
        orderCount: 10,
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockSupervisor);

      await expect(
        service.selectSupervisor(jobId, supervisorId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject supervisor with insufficient order count', async () => {
      const jobId = 1;
      const supervisorId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockSupervisor = {
        id: supervisorId,
        creditScore: 95,
        orderCount: 5, // < 10
      };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockSupervisor);

      await expect(
        service.selectSupervisor(jobId, supervisorId, userId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if supervisor already selected', async () => {
      const jobId = 1;
      const supervisorId = 2;
      const userId = 1;

      const mockJob = { id: jobId, userId };
      const mockSupervisor = {
        id: supervisorId,
        creditScore: 95,
        orderCount: 10,
      };
      const existingSupervisor = { id: 1, jobId, supervisorId: 3 };

      jobRepository.findOne.mockResolvedValue(mockJob);
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      supervisorRepository.findOne.mockResolvedValue(existingSupervisor);

      await expect(
        service.selectSupervisor(jobId, supervisorId, userId)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

**Step 3: 实现主管选择逻辑**

```typescript
// 在 job.service.ts 中添加
async selectSupervisor(jobId: number, supervisorId: number, userId: number) {
  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('No permission');
  }

  const supervisor = await this.userRepo.findOne({ where: { id: supervisorId } });
  if (!supervisor) {
    throw new NotFoundException('Supervisor not found');
  }

  // 验证主管资格
  if (supervisor.creditScore < 95) {
    throw new BadRequestException('Credit score must be >= 95');
  }

  if (supervisor.orderCount < 10) {
    throw new BadRequestException('Order count must be >= 10');
  }

  // 检查是否已选择主管
  const existing = await this.supervisorRepo.findOne({
    where: { jobId },
  });

  if (existing) {
    throw new BadRequestException('Supervisor already selected for this job');
  }

  const supervisorRecord = this.supervisorRepo.create({
    jobId,
    supervisorId,
    status: 'active',
  });

  return this.supervisorRepo.save(supervisorRecord);
}
```

**Step 4: 运行测试**

```bash
cd server
npm test -- supervisor-selection.spec.ts
# Expected: PASS (4/4)
```

**Step 5: 提交**

```bash
git add server/src/entities/supervisor.entity.ts server/src/modules/job/supervisor-selection.spec.ts server/src/modules/job/job.service.ts
git commit -m "feat: 实现主管选择后端逻辑"
```

---

## Task 10: 主管选择 - API 端点

**Files:**
- Modify: `server/src/modules/job/job.controller.ts:100-150`
- Modify: `server/src/modules/job/job.service.spec.ts:500-550`

**Step 1: 编写 API 端点测试**

```typescript
// 在 job.service.spec.ts 中添加
describe('POST /jobs/:jobId/select-supervisor', () => {
  it('should select supervisor successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/jobs/1/select-supervisor')
      .set('Authorization', `Bearer ${enterpriseToken}`)
      .send({ supervisorId: 2 })
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('active');
  });

  it('should return 400 when supervisor not qualified', async () => {
    await request(app.getHttpServer())
      .post('/jobs/1/select-supervisor')
      .set('Authorization', `Bearer ${enterpriseToken}`)
      .send({ supervisorId: 3 }) // 资格不符
      .expect(400);
  });

  it('should return 403 when not job owner', async () => {
    await request(app.getHttpServer())
      .post('/jobs/1/select-supervisor')
      .set('Authorization', `Bearer ${otherEnterpriseToken}`)
      .send({ supervisorId: 2 })
      .expect(403);
  });
});
```

**Step 2: 实现 API 端点**

```typescript
// 在 job.controller.ts 中添加
@Post(':jobId/select-supervisor')
@Roles('enterprise')
async selectSupervisor(
  @Param('jobId') jobId: number,
  @Body() dto: { supervisorId: number },
  @CurrentUser() user: any
) {
  return this.jobService.selectSupervisor(jobId, dto.supervisorId, user.id);
}
```

**Step 3: 运行测试**

```bash
npm test -- job.controller.spec.ts
# Expected: PASS
```

**Step 4: 提交**

```bash
git add server/src/modules/job/job.controller.ts server/src/modules/job/job.service.spec.ts
git commit -m "feat: 添加主管选择 API 端点"
```

---

## Task 11-14: 考勤管理和工时记录

（类似结构，包含后端逻辑和 API 端点）

**考勤管理**:
- 创建 Attendance 实体
- 实现签到/签退逻辑
- 实现考勤查询接口

**工时记录**:
- 创建 WorkLog 实体
- 实现工时记录逻辑
- 实现工时查询接口

---

## Task 15: 通知系统 - 数据模型

**Files:**
- Create: `server/src/entities/notification.entity.ts`
- Modify: `server/src/modules/notification/notification.service.ts`

**Step 1: 创建 Notification 实体**

```typescript
// server/src/entities/notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number; // 接收者

  @Column({ type: 'varchar', length: 50 })
  type: string; // 通知类型: apply_accepted, confirm_reminder, work_start 等

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  data: any; // 额外数据

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'sent' | 'failed'; // 发送状态

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Step 2: 实现通知服务**

```typescript
// server/src/modules/notification/notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
  ) {}

  async sendNotification(userId: number, type: string, title: string, content: string, data?: any) {
    const notification = this.notificationRepo.create({
      userId,
      type,
      title,
      content,
      data,
      status: 'pending',
    });

    const saved = await this.notificationRepo.save(notification);

    // 异步发送推送通知
    this.sendPushNotification(userId, title, content).catch(err => {
      this.logger.error('Failed to send push notification', err);
    });

    return saved;
  }

  private async sendPushNotification(userId: number, title: string, content: string) {
    // 实现推送逻辑（微信小程序、邮件等）
    // 这里是占位符
  }

  async getNotifications(userId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { list, total, page, pageSize };
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    return this.notificationRepo.save(notification);
  }
}
```

**Step 3: 编写测试**

```typescript
describe('NotificationService', () => {
  it('should send notification successfully', async () => {
    const result = await service.sendNotification(
      1,
      'apply_accepted',
      '报名已接受',
      '企业已接受您的报名'
    );

    expect(result).toBeDefined();
    expect(result.status).toBe('pending');
  });

  it('should get notifications for user', async () => {
    const result = await service.getNotifications(1);

    expect(result).toHaveProperty('list');
    expect(result).toHaveProperty('total');
  });

  it('should mark notification as read', async () => {
    const result = await service.markAsRead(1, 1);

    expect(result.read).toBe(true);
  });
});
```

**Step 4: 提交**

```bash
git add server/src/entities/notification.entity.ts server/src/modules/notification/notification.service.ts
git commit -m "feat: 实现通知系统数据模型和服务"
```

---

## Task 16-17: 通知系统 - 发送逻辑和 API 端点

**关键通知事件**:

1. **临工端通知**:
   - 报名成功: "您已报名，请等待企业审核"
   - 企业接受: "企业已接受您的报名，请确认出勤"
   - 企业拒绝: "企业拒绝了您的报名"
   - 出勤提醒: "工作即将开始，请准时出勤"（工作前1小时）
   - 工作开始: "工作已开始，请签到"
   - 结算完成: "工资已到账，请查看"
   - 评价提醒: "请评价本次工作体验"

2. **企业端通知**:
   - 新报名: "有新的报名申请，请审核"
   - 临工确认: "临工已确认出勤"
   - 临工取消: "临工已取消报名"
   - 工作开始: "工作已开始"
   - 结算提醒: "请确认结算单并支付"
   - 临工评价: "临工已评价您的企业"

**API 端点**:
- `GET /notifications` - 获取通知列表
- `POST /notifications/:id/read` - 标记已读
- `DELETE /notifications/:id` - 删除通知

---

## Task 18: 集成测试

**Files:**
- Create: `server/src/modules/job/job.phase2.integration.spec.ts`

**测试覆盖**:
- 主管选择完整流程
- 考勤管理完整流程
- 工时记录完整流程
- 通知发送验证
- 权限验证

---

## Task 19: 验证和文档

**Files:**
- Create: `server/docs/PHASE2_COMPLETION_SUMMARY.md`

**验证步骤**:
1. 运行所有 Phase 2 测试
2. 生成覆盖率报告
3. 创建完成文档
4. 验证所有提交

---

## 测试策略

| 类别 | 数量 | 说明 |
|------|------|------|
| 单元测试 | 15 | 主管选择、考勤、工时、通知 |
| 集成测试 | 20 | 完整工作流 |
| API 测试 | 10 | 端点验证 |
| **总计** | **45** | **预期 100% 通过** |

---

## 提交规范

```
feat: 新功能
test: 测试用例
docs: 文档更新
fix: 问题修复
refactor: 代码重构
```

每个任务完成后立即提交，保持提交历史清晰。

---

**实现日期**: 2026-03-13
**总工期**: 2.5 周
**状态**: 待执行
