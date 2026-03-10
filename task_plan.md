# 临工招工流程实现计划

**目标**: 实现临工端"我的报名"与企业端招工流程的完整匹配，通过统一的业务状态机确保两端数据一致。

**架构**: 后端维护唯一的 JobApplication 业务状态机（pending → accepted → confirmed → working → done），前端根据业务状态映射到各自的展示状态。

**关键文件**: `Docs/plans/2026-03-10-worker-recruitment-flow-implementation.md`

---

## 阶段 1: 后端状态机实现 (Task 1-3)

**目标**: 实现 JobApplication 状态机和企业端核心接口

### Task 1: 完善 JobApplication 状态机 ⏳
- **状态**: pending
- **文件**:
  - 创建: `server/src/modules/job/job-state-machine.ts`
  - 修改: `server/src/modules/job/job.service.ts`
- **预期**: 状态转移验证通过所有测试

### Task 2: 实现企业端报名管理接口 ⏳
- **状态**: pending
- **文件**:
  - 创建: `server/src/modules/job/dto/accept-application.dto.ts`
  - 修改: `server/src/modules/job/job.controller.ts`
- **预期**: 接受/拒绝报名接口可用

### Task 3: 实现企业端选择管理员接口 ⏳
- **状态**: pending
- **文件**:
  - 创建: `server/src/modules/job/dto/select-supervisor.dto.ts`
  - 修改: `server/src/modules/job/job.service.ts`
- **预期**: 管理员选择接口可用，资格验证通过

---

## 阶段 2: 临工端接口实现 (Task 4-6)

**目标**: 实现临工端出勤确认和"我的报名"分类查询

### Task 4: 实现临工端出勤确认接口 ⏳
- **状态**: pending
- **文件**:
  - 修改: `server/src/modules/job/job.service.ts`
  - 修改: `server/src/modules/job/job.controller.ts`
- **预期**: 出勤确认接口可用

### Task 5: 实现临工端"我的报名"分类接口 ⏳
- **状态**: pending
- **文件**:
  - 修改: `server/src/modules/job/job.service.ts`
  - 修改: `server/src/modules/job/job.controller.ts`
- **预期**: 按状态分类查询接口可用

### Task 6: 实现企业端报名列表查询接口 ⏳
- **状态**: pending
- **文件**:
  - 修改: `server/src/modules/job/job.service.ts`
  - 修改: `server/src/modules/job/job.controller.ts`
- **预期**: 企业端报名列表查询接口可用

---

## 阶段 3: 定时任务实现 (Task 7-8)

**目标**: 实现自动释放和工作开始的定时任务

### Task 7: 实现定时任务 - 自动释放未确认的报名 ⏳
- **状态**: pending
- **文件**:
  - 创建: `server/src/modules/job/job.scheduler.ts`
  - 修改: `server/src/modules/job/job.module.ts`
- **预期**: 定时任务正确释放未确认的报名

### Task 8: 实现定时任务 - 自动更新工作状态为进行中 ⏳
- **状态**: pending
- **文件**:
  - 修改: `server/src/modules/job/job.scheduler.ts`
- **预期**: 定时任务正确更新工作状态

---

## 阶段 4: 测试验证 (Task 9)

**目标**: 运行完整的测试套件，确保所有功能正常

### Task 9: 运行完整的后端测试套件 ⏳
- **状态**: pending
- **命令**:
  - `npm run test -- server/src/modules/job/`
  - `npm run test:e2e -- job`
  - `npm run test:cov -- server/src/modules/job/`
- **预期**: 所有测试通过，覆盖率 > 80%

---

## 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 状态机设计 | 统一的业务状态 + 端侧展示层 | 数据一致，易于维护 |
| 临工展示状态 | 4 个标签（待确认、已入选、进行中、已完成） | 简化用户体验 |
| 企业端操作 | 报名管理 → 选择管理员 → 工作执行 → 结算支付 | 完整的招工流程 |
| 定时任务 | 每小时执行一次 | 平衡实时性和性能 |

---

## 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 状态转移复杂 | 容易出现逻辑错误 | 详细的单元测试 |
| 定时任务冲突 | 可能重复处理 | 添加幂等性检查 |
| 前后端不同步 | 用户体验差 | 实时通知机制 |

---

## 进度跟踪

- **总任务数**: 9
- **已完成**: 0
- **进行中**: 0
- **待开始**: 9
- **完成率**: 0%

