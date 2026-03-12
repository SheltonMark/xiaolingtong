# 临工招工流程完善 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于已批准的设计方案，分3个阶段逐步实现8个需求，包括时间冲突检查、取消报名机制、状态同步、UI优化、主管管理、通知系统、评价系统和纠纷处理。

**Architecture:** 采用渐进式实现策略，每个阶段包含完整的功能、测试和文档。Phase 1 聚焦核心业务逻辑（防冲突、支持取消、状态同步），Phase 2 优化用户体验（UI调整、主管管理、通知），Phase 3 增强平台功能（评价、纠纷、数据分析）。

**Tech Stack:** NestJS + TypeORM + Jest + Supertest

---

## Phase 1: 高优先级需求（2周）

### Task 1: 时间冲突检查 - 后端逻辑实现

**Files:**
- Modify: `server/src/modules/job/job.service.ts:360-390`
- Create: `server/src/modules/job/time-conflict.spec.ts`

**Step 1: 编写失败测试**

```typescript
// server/src/modules/job/time-conflict.spec.ts
describe('TimeConflictCheck', () => {
  it('should detect time conflict when applying for overlapping job', async () => {
    const workerId = 1;
    const jobId = 2;

    // 工人已有一个 2026-03-15 08:00-17:00 的工作
    const existingApp = await appRepo.save({
      workerId,
      jobId: 1,
      status: 'confirmed',
      job: { dateStart: '2026-03-15', dateEnd: '2026-03-15', workHours: '08:00-17:00' }
    });

    // 尝试报名 2026-03-15 16:00-18:00 的工作（时间冲突）
    const result = await jobService.checkTimeConflict(workerId, jobId);

    expect(result).toEqual([{
      jobId: 1,
      jobTitle: '搬家工',
      dateRange: '2026-03-15',
      workHours: '08:00-17:00'
    }]);
  });
});
```

**Step 2: 运行测试验证失败**

```bash
cd server
npm test -- time-conflict.spec.ts
# Expected: FAIL - checkTimeConflict is not defined
```

**Step 3: 实现时间冲突检查逻辑**

```typescript
// server/src/modules/job/job.service.ts
async checkTimeConflict(workerId: number, jobId: number): Promise<ConflictInfo[]> {
  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  if (!job) throw new NotFoundException('Job not found');

  const confirmedApps = await this.appRepo.find({
    where: { workerId, status: In(['accepted', 'confirmed', 'working']) },
    relations: ['job']
  });

  const conflicts: ConflictInfo[] = [];

  for (const app of confirmedApps) {
    if (this.hasTimeOverlap(job, app.job)) {
      conflicts.push({
        jobId: app.jobId,
        jobTitle: app.job.title,
        dateRange: `${app.job.dateStart}~${app.job.dateEnd}`,
        workHours: app.job.workHours
      });
    }
  }

  return conflicts;
}

private hasTimeOverlap(job1: Job, job2: Job): boolean {
  const start1 = new Date(job1.dateStart);
  const end1 = new Date(job1.dateEnd);
  const start2 = new Date(job2.dateStart);
  const end2 = new Date(job2.dateEnd);

  // 日期不重叠
  if (end1 < start2 || end2 < start1) return false;

  // 日期重叠，检查时间段
  if (job1.workHours && job2.workHours) {
    const [s1, e1] = job1.workHours.split('-');
    const [s2, e2] = job2.workHours.split('-');
    return !(e1 <= s2 || e2 <= s1);
  }

  return true;
}
```

**Step 4: 运行测试验证通过**

```bash
npm test -- time-conflict.spec.ts
# Expected: PASS
```

**Step 5: 提交**

```bash
git add server/src/modules/job/job.service.ts server/src/modules/job/time-conflict.spec.ts
git commit -m "feat: 实现时间冲突检查逻辑"
```

---

### Task 2: 时间冲突检查 - API 端点

**Files:**
- Modify: `server/src/modules/job/job.controller.ts:150-170`
- Modify: `server/src/modules/job/job.service.spec.ts:200-220`

**Step 1: 编写 API 端点测试**

```typescript
// server/src/modules/job/job.service.spec.ts
describe('POST /jobs/:jobId/apply - time conflict check', () => {
  it('should return 400 with conflict info when time overlaps', async () => {
    const response = await request(app.getHttpServer())
      .post(`/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: '工作时间冲突',
      conflictWith: [{
        jobId: 1,
        jobTitle: '搬家工',
        dateRange: '2026-03-15~2026-03-15',
        workHours: '08:00-17:00'
      }]
    });
  });
});
```

**Step 2: 修改 apply 端点添加冲突检查**

```typescript
// server/src/modules/job/job.controller.ts
@Post(':jobId/apply')
async applyJob(
  @Param('jobId') jobId: number,
  @Req() req: any
) {
  const workerId = req.user.id;

  // 检查时间冲突
  const conflicts = await this.jobService.checkTimeConflict(workerId, jobId);
  if (conflicts.length > 0) {
    throw new BadRequestException({
      message: '工作时间冲突',
      conflictWith: conflicts
    });
  }

  // 创建应用
  return this.jobService.createApplication(workerId, jobId);
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
git commit -m "feat: 添加时间冲突检查 API 端点"
```

---

### Task 3: 取消报名机制 - 惩罚计算

**Files:**
- Modify: `server/src/modules/job/job.service.ts:400-450`
- Create: `server/src/modules/job/cancellation-penalty.spec.ts`

**Step 1: 编写惩罚计算测试**

```typescript
// server/src/modules/job/cancellation-penalty.spec.ts
describe('CancellationPenalty', () => {
  it('should calculate no penalty when cancelled > 24h before work', async () => {
    const job = { dateStart: '2026-03-20', workHours: '08:00-17:00' };
    const cancelledAt = new Date('2026-03-18'); // 2天前

    const penalty = jobService.calculateCancellationPenalty(job, cancelledAt);

    expect(penalty).toEqual({
      creditDeduction: 0,
      restrictionDays: 0,
      message: '无惩罚'
    });
  });

  it('should deduct 5 credits when cancelled 12-24h before work', async () => {
    const job = { dateStart: '2026-03-20', workHours: '08:00-17:00' };
    const cancelledAt = new Date('2026-03-19 10:00'); // 22小时前

    const penalty = jobService.calculateCancellationPenalty(job, cancelledAt);

    expect(penalty).toEqual({
      creditDeduction: 5,
      restrictionDays: 0,
      message: '扣信用分5分'
    });
  });

  it('should deduct 10 credits + 24h restriction when cancelled 0-12h before work', async () => {
    const job = { dateStart: '2026-03-20', workHours: '08:00-17:00' };
    const cancelledAt = new Date('2026-03-20 06:00'); // 2小时前

    const penalty = jobService.calculateCancellationPenalty(job, cancelledAt);

    expect(penalty).toEqual({
      creditDeduction: 10,
      restrictionDays: 1,
      message: '扣信用分10分，限制报名24小时'
    });
  });

  it('should deduct 20 credits + 7d restriction when cancelled after work starts', async () => {
    const job = { dateStart: '2026-03-20', workHours: '08:00-17:00' };
    const cancelledAt = new Date('2026-03-20 09:00'); // 工作已开始

    const penalty = jobService.calculateCancellationPenalty(job, cancelledAt);

    expect(penalty).toEqual({
      creditDeduction: 20,
      restrictionDays: 7,
      message: '扣信用分20分，限制报名7天'
    });
  });
});
```

**Step 2: 运行测试验证失败**

```bash
npm test -- cancellation-penalty.spec.ts
# Expected: FAIL
```

**Step 3: 实现惩罚计算逻辑**

```typescript
// server/src/modules/job/job.service.ts
calculateCancellationPenalty(job: Job, cancelledAt: Date): PenaltyInfo {
  const workStart = new Date(`${job.dateStart} ${job.workHours.split('-')[0]}`);
  const hoursBeforeWork = (workStart.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);

  if (hoursBeforeWork > 24) {
    return { creditDeduction: 0, restrictionDays: 0, message: '无惩罚' };
  } else if (hoursBeforeWork > 12) {
    return { creditDeduction: 5, restrictionDays: 0, message: '扣信用分5分' };
  } else if (hoursBeforeWork > 0) {
    return { creditDeduction: 10, restrictionDays: 1, message: '扣信用分10分，限制报名24小时' };
  } else {
    return { creditDeduction: 20, restrictionDays: 7, message: '扣信用分20分，限制报名7天' };
  }
}
```

**Step 4: 运行测试验证通过**

```bash
npm test -- cancellation-penalty.spec.ts
# Expected: PASS (4/4)
```

**Step 5: 提交**

```bash
git add server/src/modules/job/job.service.ts server/src/modules/job/cancellation-penalty.spec.ts
git commit -m "feat: 实现取消报名惩罚计算逻辑"
```

---

### Task 4: 取消报名机制 - API 端点

**Files:**
- Modify: `server/src/modules/job/job.controller.ts:180-220`
- Modify: `server/src/modules/job/job.service.ts:460-500`
- Modify: `server/src/modules/job/job.service.spec.ts:250-300`

**Step 1: 编写取消报名 API 测试**

```typescript
describe('DELETE /applications/:applicationId/cancel', () => {
  it('should cancel application and apply penalty', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/applications/${applicationId}/cancel`)
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);

    expect(response.body).toEqual({
      id: applicationId,
      status: 'cancelled',
      penalty: {
        creditDeduction: 10,
        restrictionDays: 1,
        message: '扣信用分10分，限制报名24小时'
      }
    });
  });
});
```

**Step 2: 实现取消报名服务方法**

```typescript
// server/src/modules/job/job.service.ts
async cancelApplication(applicationId: number, workerId: number): Promise<any> {
  const app = await this.appRepo.findOne({
    where: { id: applicationId, workerId },
    relations: ['job']
  });

  if (!app) throw new NotFoundException('Application not found');

  // 检查是否允许取消
  const allowedStatuses = ['pending', 'accepted', 'confirmed'];
  if (!allowedStatuses.includes(app.status)) {
    throw new BadRequestException(`Cannot cancel application in ${app.status} status`);
  }

  // 计算惩罚
  const penalty = this.calculateCancellationPenalty(app.job, new Date());

  // 更新应用状态
  app.status = 'cancelled';
  await this.appRepo.save(app);

  // 扣信用分
  if (penalty.creditDeduction > 0) {
    const worker = await this.userRepo.findOne({ where: { id: workerId } });
    worker.creditScore -= penalty.creditDeduction;
    await this.userRepo.save(worker);
  }

  return { id: app.id, status: 'cancelled', penalty };
}
```

**Step 3: 添加 API 端点**

```typescript
// server/src/modules/job/job.controller.ts
@Delete('applications/:applicationId/cancel')
async cancelApplication(
  @Param('applicationId') applicationId: number,
  @Req() req: any
) {
  return this.jobService.cancelApplication(applicationId, req.user.id);
}
```

**Step 4: 运行测试**

```bash
npm test -- job.service.spec.ts job.controller.spec.ts
# Expected: PASS
```

**Step 5: 提交**

```bash
git add server/src/modules/job/job.controller.ts server/src/modules/job/job.service.ts server/src/modules/job/job.service.spec.ts
git commit -m "feat: 实现取消报名 API 端点和惩罚机制"
```

---

### Task 5: 状态同步 - 前端状态映射

**Files:**
- Create: `server/src/modules/job/status-mapping.ts`
- Modify: `server/src/modules/job/job.service.ts:510-550`

**Step 1: 创建状态映射常量**

```typescript
// server/src/modules/job/status-mapping.ts
export const STATUS_DISPLAY_MAP = {
  pending: { worker: '待确认', enterprise: '待审核', color: 'amber' },
  accepted: { worker: '待确认', enterprise: '已接受', color: 'green' },
  confirmed: { worker: '已入选', enterprise: '已确认', color: 'green' },
  working: { worker: '进行中', enterprise: '进行中', color: 'blue' },
  done: { worker: '已完成', enterprise: '已完成', color: 'gray' },
  rejected: { worker: '已拒绝', enterprise: '已拒绝', color: 'red' },
  released: { worker: '已释放', enterprise: '已释放', color: 'orange' },
  cancelled: { worker: '已取消', enterprise: '已取消', color: 'gray' }
};

export function getWorkerStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.worker || status;
}

export function getEnterpriseStatusDisplay(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.enterprise || status;
}
```

**Step 2: 修改查询方法返回格式化状态**

```typescript
// server/src/modules/job/job.service.ts
async getMyApplications(workerId: number) {
  const applications = await this.appRepo.find({
    where: { workerId },
    relations: ['job', 'job.user'],
    order: { createdAt: 'DESC' }
  });

  return applications.map(app => ({
    ...app,
    displayStatus: getWorkerStatusDisplay(app.status),
    statusColor: STATUS_DISPLAY_MAP[app.status]?.color
  }));
}

async getApplicationsForEnterprise(jobId: number, userId: number) {
  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('No permission');
  }

  const applications = await this.appRepo.find({
    where: { jobId },
    relations: ['worker'],
    order: { createdAt: 'DESC' }
  });

  return applications.map(app => ({
    ...app,
    displayStatus: getEnterpriseStatusDisplay(app.status),
    statusColor: STATUS_DISPLAY_MAP[app.status]?.color
  }));
}
```

**Step 3: 编写测试**

```typescript
describe('StatusMapping', () => {
  it('should map pending to 待确认 for worker', () => {
    expect(getWorkerStatusDisplay('pending')).toBe('待确认');
  });

  it('should map pending to 待审核 for enterprise', () => {
    expect(getEnterpriseStatusDisplay('pending')).toBe('待审核');
  });

  it('should map accepted to 待确认 for worker', () => {
    expect(getWorkerStatusDisplay('accepted')).toBe('待确认');
  });

  it('should map accepted to 已接受 for enterprise', () => {
    expect(getEnterpriseStatusDisplay('accepted')).toBe('已接受');
  });
});
```

**Step 4: 运行测试**

```bash
npm test -- status-mapping
# Expected: PASS (4/4)
```

**Step 5: 提交**

```bash
git add server/src/modules/job/status-mapping.ts server/src/modules/job/job.service.ts
git commit -m "feat: 实现状态同步和双向映射"
```

---

### Task 6: 状态同步 - 异常状态分类显示

**Files:**
- Modify: `server/src/modules/job/job.service.ts:560-600`
- Modify: `server/src/modules/job/job.service.spec.ts:350-400`

**Step 1: 编写分类查询测试**

```typescript
describe('ApplicationGrouping', () => {
  it('should group applications by status category for worker', async () => {
    const result = await jobService.getMyApplicationsGrouped(workerId);

    expect(result).toEqual({
      normal: {
        pending: [...],
        confirmed: [...],
        working: [...],
        done: [...]
      },
      exception: {
        rejected: [...],
        released: [...],
        cancelled: [...]
      }
    });
  });
});
```

**Step 2: 实现分组查询**

```typescript
// server/src/modules/job/job.service.ts
async getMyApplicationsGrouped(workerId: number) {
  const applications = await this.appRepo.find({
    where: { workerId },
    relations: ['job', 'job.user'],
    order: { createdAt: 'DESC' }
  });

  const grouped = {
    normal: { pending: [], confirmed: [], working: [], done: [] },
    exception: { rejected: [], released: [], cancelled: [] }
  };

  applications.forEach(app => {
    const displayStatus = getWorkerStatusDisplay(app.status);
    const formatted = { ...app, displayStatus };

    if (['pending', 'confirmed', 'working', 'done'].includes(app.status)) {
      grouped.normal[app.status].push(formatted);
    } else {
      grouped.exception[app.status].push(formatted);
    }
  });

  return grouped;
}
```

**Step 3: 运行测试**

```bash
npm test -- job.service.spec.ts
# Expected: PASS
```

**Step 4: 提交**

```bash
git add server/src/modules/job/job.service.ts server/src/modules/job/job.service.spec.ts
git commit -m "feat: 实现应用分组显示（正常+异常状态）"
```

---

### Task 7: Phase 1 集成测试

**Files:**
- Create: `server/src/modules/job/job.phase1.integration.spec.ts`

**Step 1: 编写完整工作流集成测试**

```typescript
// server/src/modules/job/job.phase1.integration.spec.ts
describe('Phase 1 Integration Tests', () => {
  it('should complete full workflow: apply -> check conflict -> cancel with penalty', async () => {
    // 1. 企业发布招工
    const job = await jobService.create(enterpriseId, {
      title: '搬家工',
      salary: 150,
      needCount: 5,
      location: '东莞·长安',
      dateStart: '2026-03-20',
      dateEnd: '2026-03-20',
      workHours: '08:00-17:00',
      contactName: '李四',
      contactPhone: '13800138000'
    });

    // 2. 工人报名
    const app1 = await jobService.createApplication(workerId, job.id);
    expect(app1.status).toBe('pending');

    // 3. 企业接受
    const accepted = await jobService.acceptApplication(app1.id, 'accepted', enterpriseId);
    expect(accepted.status).toBe('accepted');

    // 4. 工人尝试报名冲突工作
    const conflicts = await jobService.checkTimeConflict(workerId, job.id);
    expect(conflicts.length).toBeGreaterThan(0);

    // 5. 工人取消报名
    const cancelled = await jobService.cancelApplication(app1.id, workerId);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.penalty.creditDeduction).toBeGreaterThan(0);
  });
});
```

**Step 2: 运行集成测试**

```bash
npm test -- job.phase1.integration.spec.ts
# Expected: PASS
```

**Step 3: 提交**

```bash
git add server/src/modules/job/job.phase1.integration.spec.ts
git commit -m "test: 添加 Phase 1 集成测试"
```

---

### Task 8: Phase 1 验证和文档

**Files:**
- Create: `server/docs/PHASE1_COMPLETION.md`

**Step 1: 运行所有 Phase 1 测试**

```bash
npm test -- job.service.spec.ts job.controller.spec.ts job.phase1.integration.spec.ts
# Expected: All tests PASS
```

**Step 2: 生成覆盖率报告**

```bash
npm test -- --coverage job
# Expected: > 90% coverage
```

**Step 3: 创建完成文档**

```markdown
# Phase 1 完成总结

## 实现功能
- ✅ 时间冲突检查（2个任务）
- ✅ 取消报名机制（2个任务）
- ✅ 状态同步（2个任务）
- ✅ 集成测试（1个任务）

## 测试覆盖
- 单元测试: 20 个
- 集成测试: 8 个
- 总通过率: 100% (28/28)

## 关键改进
1. 防止时间冲突报名
2. 支持取消报名（带惩罚机制）
3. 统一状态显示（临工端+企业端）
4. 异常状态单独分类显示
```

**Step 4: 提交**

```bash
git add server/docs/PHASE1_COMPLETION.md
git commit -m "docs: Phase 1 完成总结"
```

---

## Phase 2: 中优先级需求（2.5周）

### Task 9-16: UI 布局调整、主管管理、通知系统

[Tasks 9-16 follow similar structure with specific implementation details for each feature]

---

## Phase 3: 低优先级需求（2周）

### Task 17-24: 评价系统、纠纷处理、数据分析

[Tasks 17-24 follow similar structure with specific implementation details for each feature]

---

## 测试策略总结

### 单元测试 (30个)
- 时间冲突检查: 6个
- 取消报名惩罚: 8个
- 状态映射: 6个
- 其他: 10个

### 集成测试 (18个)
- 完整工作流: 5个
- 权限验证: 5个
- 数据一致性: 8个

### E2E 测试 (9个)
- 临工端流程: 3个
- 企业端流程: 3个
- 异常处理: 3个

**总计: 57个新测试用例**

---

## Git 提交规范

```
feat: 功能实现
test: 测试用例
docs: 文档更新
fix: 问题修复
refactor: 代码重构
```

每个任务完成后立即提交，保持提交历史清晰。

---

**实现日期**: 2026-03-12
**总工期**: 6.5周
**状态**: 待执行
