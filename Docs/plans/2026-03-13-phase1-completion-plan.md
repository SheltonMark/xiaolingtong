# Phase 1 完成计划 - 状态同步与集成测试

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 Phase 1 剩余任务，实现状态同步、异常状态分类显示、集成测试和文档，确保招工流程核心功能完整。

**Architecture:** 采用 TDD 方式，先编写失败测试，再实现最小化代码。每个任务独立提交，保持提交历史清晰。状态映射通过常量集中管理，分组查询通过服务方法实现。

**Tech Stack:** NestJS + TypeORM + Jest + Supertest

---

## 当前进度

✅ **已完成**:
- Task 1-2: 时间冲突检查 (checkTimeConflict)
- Task 3-4: 取消报名机制 (cancel + penalty)
- 41 个测试全部通过

❌ **待完成**:
- Task 5: 状态同步 - 前端状态映射
- Task 6: 状态同步 - 异常状态分类显示
- Task 7: Phase 1 集成测试
- Task 8: Phase 1 验证和文档

---

## Task 5: 状态同步 - 前端状态映射

**Files:**
- Create: `server/src/modules/application/status-mapping.ts`
- Modify: `server/src/modules/application/application.service.ts:1-50`
- Create: `server/src/modules/application/status-mapping.spec.ts`

**Step 1: 创建状态映射常量文件**

```typescript
// server/src/modules/application/status-mapping.ts
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

export function getStatusColor(status: string): string {
  return STATUS_DISPLAY_MAP[status]?.color || 'gray';
}
```

**Step 2: 编写状态映射测试**

```typescript
// server/src/modules/application/status-mapping.spec.ts
import { getWorkerStatusDisplay, getEnterpriseStatusDisplay, getStatusColor } from './status-mapping';

describe('StatusMapping', () => {
  describe('Worker Status Display', () => {
    it('should map pending to 待确认 for worker', () => {
      expect(getWorkerStatusDisplay('pending')).toBe('待确认');
    });

    it('should map accepted to 待确认 for worker', () => {
      expect(getWorkerStatusDisplay('accepted')).toBe('待确认');
    });

    it('should map confirmed to 已入选 for worker', () => {
      expect(getWorkerStatusDisplay('confirmed')).toBe('已入选');
    });

    it('should map working to 进行中 for worker', () => {
      expect(getWorkerStatusDisplay('working')).toBe('进行中');
    });

    it('should map done to 已完成 for worker', () => {
      expect(getWorkerStatusDisplay('done')).toBe('已完成');
    });

    it('should map rejected to 已拒绝 for worker', () => {
      expect(getWorkerStatusDisplay('rejected')).toBe('已拒绝');
    });

    it('should map released to 已释放 for worker', () => {
      expect(getWorkerStatusDisplay('released')).toBe('已释放');
    });

    it('should map cancelled to 已取消 for worker', () => {
      expect(getWorkerStatusDisplay('cancelled')).toBe('已取消');
    });
  });

  describe('Enterprise Status Display', () => {
    it('should map pending to 待审核 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('pending')).toBe('待审核');
    });

    it('should map accepted to 已接受 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('accepted')).toBe('已接受');
    });

    it('should map confirmed to 已确认 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('confirmed')).toBe('已确认');
    });

    it('should map working to 进行中 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('working')).toBe('进行中');
    });

    it('should map done to 已完成 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('done')).toBe('已完成');
    });

    it('should map rejected to 已拒绝 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('rejected')).toBe('已拒绝');
    });

    it('should map released to 已释放 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('released')).toBe('已释放');
    });

    it('should map cancelled to 已取消 for enterprise', () => {
      expect(getEnterpriseStatusDisplay('cancelled')).toBe('已取消');
    });
  });

  describe('Status Color', () => {
    it('should return correct color for each status', () => {
      expect(getStatusColor('pending')).toBe('amber');
      expect(getStatusColor('accepted')).toBe('green');
      expect(getStatusColor('confirmed')).toBe('green');
      expect(getStatusColor('working')).toBe('blue');
      expect(getStatusColor('done')).toBe('gray');
      expect(getStatusColor('rejected')).toBe('red');
      expect(getStatusColor('released')).toBe('orange');
      expect(getStatusColor('cancelled')).toBe('gray');
    });

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('gray');
    });
  });
});
```

**Step 3: 运行测试验证通过**

```bash
cd server
npm test -- status-mapping.spec.ts
# Expected: PASS (18/18)
```

**Step 4: 提交**

```bash
git add server/src/modules/application/status-mapping.ts server/src/modules/application/status-mapping.spec.ts
git commit -m "feat: 实现状态映射常量和显示函数"
```

---

## Task 6: 状态同步 - 异常状态分类显示

**Files:**
- Modify: `server/src/modules/application/application.service.ts:110-160`
- Modify: `server/src/modules/application/application.integration.spec.ts:430-500`

**Step 1: 编写分组查询测试**

```typescript
// 在 application.integration.spec.ts 中添加
describe('getMyApplicationsGrouped', () => {
  it('should group applications by status category for worker', async () => {
    // 创建不同状态的应用
    const pendingApp = { id: 1, workerId: 1, status: 'pending', job: { id: 1, title: 'Job 1' } };
    const confirmedApp = { id: 2, workerId: 1, status: 'confirmed', job: { id: 2, title: 'Job 2' } };
    const rejectedApp = { id: 3, workerId: 1, status: 'rejected', job: { id: 3, title: 'Job 3' } };

    appRepository.find.mockResolvedValue([pendingApp, confirmedApp, rejectedApp]);

    const result = await service.getMyApplicationsGrouped(1);

    expect(result).toHaveProperty('normal');
    expect(result).toHaveProperty('exception');
    expect(result.normal.pending).toHaveLength(1);
    expect(result.normal.confirmed).toHaveLength(1);
    expect(result.exception.rejected).toHaveLength(1);
  });

  it('should include display status in grouped results', async () => {
    const pendingApp = { id: 1, workerId: 1, status: 'pending', job: { id: 1, title: 'Job 1' } };
    appRepository.find.mockResolvedValue([pendingApp]);

    const result = await service.getMyApplicationsGrouped(1);

    expect(result.normal.pending[0]).toHaveProperty('displayStatus');
    expect(result.normal.pending[0].displayStatus).toBe('待确认');
  });

  it('should return empty groups when no applications', async () => {
    appRepository.find.mockResolvedValue([]);

    const result = await service.getMyApplicationsGrouped(1);

    expect(result.normal.pending).toEqual([]);
    expect(result.normal.confirmed).toEqual([]);
    expect(result.exception.rejected).toEqual([]);
  });
});
```

**Step 2: 实现分组查询方法**

```typescript
// 在 application.service.ts 中添加
import { getWorkerStatusDisplay, getStatusColor } from './status-mapping';

async getMyApplicationsGrouped(workerId: number) {
  const applications = await this.appRepo.find({
    where: { workerId },
    relations: ['job', 'job.user'],
    order: { createdAt: 'DESC' }
  });

  const grouped = {
    normal: {
      pending: [],
      accepted: [],
      confirmed: [],
      working: [],
      done: []
    },
    exception: {
      rejected: [],
      released: [],
      cancelled: []
    }
  };

  applications.forEach(app => {
    const displayStatus = getWorkerStatusDisplay(app.status);
    const statusColor = getStatusColor(app.status);
    const formatted = {
      ...app,
      displayStatus,
      statusColor
    };

    if (['pending', 'accepted', 'confirmed', 'working', 'done'].includes(app.status)) {
      grouped.normal[app.status].push(formatted);
    } else if (['rejected', 'released', 'cancelled'].includes(app.status)) {
      grouped.exception[app.status].push(formatted);
    }
  });

  return grouped;
}

async getApplicationsForEnterpriseGrouped(jobId: number, userId: number) {
  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('No permission');
  }

  const applications = await this.appRepo.find({
    where: { jobId },
    relations: ['worker'],
    order: { createdAt: 'DESC' }
  });

  const grouped = {
    normal: {
      pending: [],
      accepted: [],
      confirmed: [],
      working: [],
      done: []
    },
    exception: {
      rejected: [],
      released: [],
      cancelled: []
    }
  };

  applications.forEach(app => {
    const displayStatus = getEnterpriseStatusDisplay(app.status);
    const statusColor = getStatusColor(app.status);
    const formatted = {
      ...app,
      displayStatus,
      statusColor
    };

    if (['pending', 'accepted', 'confirmed', 'working', 'done'].includes(app.status)) {
      grouped.normal[app.status].push(formatted);
    } else if (['rejected', 'released', 'cancelled'].includes(app.status)) {
      grouped.exception[app.status].push(formatted);
    }
  });

  return grouped;
}
```

**Step 3: 运行测试验证通过**

```bash
npm test -- application.integration.spec.ts
# Expected: PASS (所有测试通过)
```

**Step 4: 提交**

```bash
git add server/src/modules/application/application.service.ts server/src/modules/application/application.integration.spec.ts
git commit -m "feat: 实现应用分组显示（正常+异常状态）"
```

---

## Task 7: Phase 1 集成测试

**Files:**
- Create: `server/src/modules/application/application.phase1.integration.spec.ts`

**Step 1: 编写完整工作流集成测试**

```typescript
// server/src/modules/application/application.phase1.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApplicationService } from './application.service';
import { JobApplication } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { SysConfig } from '../../entities/sys-config.entity';

describe('Phase 1 Integration Tests - Complete Workflow', () => {
  let service: ApplicationService;
  let appRepository: any;
  let jobRepository: any;
  let userRepository: any;
  let configRepository: any;

  beforeEach(async () => {
    appRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    jobRepository = {
      findOne: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    configRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: getRepositoryToken(JobApplication),
          useValue: appRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(SysConfig),
          useValue: configRepository,
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
  });

  describe('Complete Workflow: Apply -> Conflict Check -> Cancel with Penalty', () => {
    it('should complete full workflow successfully', async () => {
      const workerId = 1;
      const jobId = 1;
      const job = {
        id: jobId,
        status: 'recruiting',
        needCount: 5,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '08:00-17:00',
        title: '搬家工'
      };

      // Step 1: 工人报名
      jobRepository.findOne.mockResolvedValue(job);
      appRepository.findOne.mockResolvedValue(null);
      appRepository.find.mockResolvedValue([]);
      configRepository.findOne.mockResolvedValue({ value: '0.5' });
      appRepository.count.mockResolvedValue(2);
      const mockApp = { id: 1, jobId, workerId, status: 'pending' };
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const app1 = await service.apply(jobId, workerId);
      expect(app1.status).toBe('pending');

      // Step 2: 企业接受
      appRepository.findOne.mockResolvedValue({ ...mockApp, status: 'accepted' });
      appRepository.save.mockResolvedValue({ ...mockApp, status: 'accepted' });
      const accepted = await service.confirm(jobId, workerId);
      expect(accepted.status).toBe('confirmed');

      // Step 3: 工人尝试报名冲突工作
      const conflictJob = {
        id: 2,
        status: 'recruiting',
        needCount: 5,
        dateStart: '2026-03-20',
        dateEnd: '2026-03-20',
        workHours: '16:00-18:00'
      };
      jobRepository.findOne.mockResolvedValue(conflictJob);
      const existingApp = {
        id: 1,
        jobId: 1,
        workerId,
        status: 'confirmed',
        job: { dateStart: '2026-03-20', dateEnd: '2026-03-20', workHours: '08:00-17:00' }
      };
      appRepository.find.mockResolvedValue([existingApp]);

      try {
        await service.apply(2, workerId);
        fail('Should throw conflict error');
      } catch (error: any) {
        expect(error.message).toContain('报名时间与已报名工作冲突');
      }

      // Step 4: 工人取消报名
      appRepository.findOne.mockResolvedValue({ id: 1, workerId, status: 'confirmed' });
      appRepository.save.mockResolvedValue({ id: 1, status: 'cancelled' });

      const cancelled = await service.cancel(1, workerId);
      expect(cancelled.message).toBe('已取消');
    });

    it('should handle multiple applications with different statuses', async () => {
      const workerId = 1;
      const apps = [
        { id: 1, workerId, status: 'pending', job: { id: 1, title: 'Job 1' } },
        { id: 2, workerId, status: 'confirmed', job: { id: 2, title: 'Job 2' } },
        { id: 3, workerId, status: 'rejected', job: { id: 3, title: 'Job 3' } },
        { id: 4, workerId, status: 'cancelled', job: { id: 4, title: 'Job 4' } }
      ];

      appRepository.find.mockResolvedValue(apps);

      const result = await service.getMyApplicationsGrouped(workerId);

      expect(result.normal.pending).toHaveLength(1);
      expect(result.normal.confirmed).toHaveLength(1);
      expect(result.exception.rejected).toHaveLength(1);
      expect(result.exception.cancelled).toHaveLength(1);
    });

    it('should prevent cancelling working applications', async () => {
      const mockApp = { id: 1, workerId: 1, status: 'working' };
      appRepository.findOne.mockResolvedValue(mockApp);

      try {
        await service.cancel(1, 1);
        fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('当前状态不可取消');
      }
    });

    it('should prevent cancelling done applications', async () => {
      const mockApp = { id: 1, workerId: 1, status: 'done' };
      appRepository.findOne.mockResolvedValue(mockApp);

      try {
        await service.cancel(1, 1);
        fail('Should throw error');
      } catch (error: any) {
        expect(error.message).toContain('当前状态不可取消');
      }
    });
  });

  describe('Status Grouping Workflow', () => {
    it('should correctly group applications by status', async () => {
      const workerId = 1;
      const apps = [
        { id: 1, workerId, status: 'pending', job: { id: 1, title: 'Job 1' } },
        { id: 2, workerId, status: 'accepted', job: { id: 2, title: 'Job 2' } },
        { id: 3, workerId, status: 'confirmed', job: { id: 3, title: 'Job 3' } },
        { id: 4, workerId, status: 'working', job: { id: 4, title: 'Job 4' } },
        { id: 5, workerId, status: 'done', job: { id: 5, title: 'Job 5' } },
        { id: 6, workerId, status: 'rejected', job: { id: 6, title: 'Job 6' } },
        { id: 7, workerId, status: 'released', job: { id: 7, title: 'Job 7' } },
        { id: 8, workerId, status: 'cancelled', job: { id: 8, title: 'Job 8' } }
      ];

      appRepository.find.mockResolvedValue(apps);

      const result = await service.getMyApplicationsGrouped(workerId);

      expect(result.normal.pending).toHaveLength(1);
      expect(result.normal.accepted).toHaveLength(1);
      expect(result.normal.confirmed).toHaveLength(1);
      expect(result.normal.working).toHaveLength(1);
      expect(result.normal.done).toHaveLength(1);
      expect(result.exception.rejected).toHaveLength(1);
      expect(result.exception.released).toHaveLength(1);
      expect(result.exception.cancelled).toHaveLength(1);
    });
  });
});
```

**Step 2: 运行集成测试**

```bash
npm test -- application.phase1.integration.spec.ts
# Expected: PASS (所有测试通过)
```

**Step 3: 提交**

```bash
git add server/src/modules/application/application.phase1.integration.spec.ts
git commit -m "test: 添加 Phase 1 完整工作流集成测试"
```

---

## Task 8: Phase 1 验证和文档

**Files:**
- Create: `server/docs/PHASE1_COMPLETION_SUMMARY.md`

**Step 1: 运行所有 Phase 1 测试**

```bash
cd server
npm test -- application
# Expected: All tests PASS
```

**Step 2: 生成覆盖率报告**

```bash
npm test -- --coverage application
# Expected: > 90% coverage
```

**Step 3: 创建完成文档**

```markdown
# Phase 1 完成总结

## 实现功能

✅ **Task 1-2: 时间冲突检查**
- 检查临工报名时是否与已有工作时间冲突
- 支持多个冲突工作的返回
- 完整的错误提示

✅ **Task 3-4: 取消报名机制**
- 支持 pending/accepted/confirmed 状态的取消
- 防止 working/done/rejected/released/cancelled 状态的取消
- 返回取消成功消息

✅ **Task 5: 状态同步 - 前端状态映射**
- 创建状态映射常量 (STATUS_DISPLAY_MAP)
- 实现 getWorkerStatusDisplay() 函数
- 实现 getEnterpriseStatusDisplay() 函数
- 实现 getStatusColor() 函数

✅ **Task 6: 状态同步 - 异常状态分类显示**
- 实现 getMyApplicationsGrouped() 方法
- 实现 getApplicationsForEnterpriseGrouped() 方法
- 支持正常状态和异常状态的分类显示

✅ **Task 7: Phase 1 集成测试**
- 完整工作流测试 (报名 -> 冲突检查 -> 取消)
- 多应用状态分组测试
- 状态转换验证测试

## 测试覆盖

| 类别 | 数量 | 状态 |
|------|------|------|
| 单元测试 | 18 | ✅ PASS |
| 集成测试 | 35 | ✅ PASS |
| 工作流测试 | 8 | ✅ PASS |
| **总计** | **61** | **✅ 100%** |

## 关键改进

1. **防止时间冲突报名** - 临工无法报名时间冲突的工作
2. **支持取消报名** - 临工可以在特定状态下取消报名
3. **统一状态显示** - 临工端和企业端看到一致的状态
4. **异常状态分类** - 正常状态和异常状态分开显示
5. **完整的工作流** - 从报名到取消的完整流程

## 代码质量

- 代码覆盖率: > 90%
- 测试通过率: 100% (61/61)
- 提交规范: 遵循 conventional commits
- 代码风格: 遵循 NestJS 最佳实践

## 下一步

Phase 2 将实现：
- UI 布局调整 (工资结算页面)
- 主管管理功能
- 通知提醒系统
```

**Step 4: 提交**

```bash
git add server/docs/PHASE1_COMPLETION_SUMMARY.md
git commit -m "docs: Phase 1 完成总结"
```

**Step 5: 验证所有提交**

```bash
git log --oneline -8
# 应该看到 8 个新提交
```

---

## 提交规范

所有提交遵循 conventional commits:

```
feat: 新功能
test: 测试用例
docs: 文档更新
fix: 问题修复
refactor: 代码重构
```

---

## 执行检查清单

- [ ] Task 5: 状态映射常量和函数
- [ ] Task 6: 应用分组显示
- [ ] Task 7: 完整工作流集成测试
- [ ] Task 8: 完成文档和验证
- [ ] 所有测试通过 (61/61)
- [ ] 代码覆盖率 > 90%
- [ ] 8 个新提交已推送

---

**实现日期**: 2026-03-13
**预计工期**: 2-3 小时
**状态**: 待执行
