# 接单记录与我的报名信息同步修复

**日期**: 2026-03-15
**问题**: 临工端"我的"界面中，接单记录和我的报名记录显示的信息不同步
**方案**: 以"我的接单记录"为主，确保两个页面使用相同的数据格式和状态映射

---

## 修复内容

### 1. 后端 API 修复 (`server/src/modules/work/work.service.ts`)

**问题**: `getOrders()` 方法返回的数据格式不正确
- 原来返回的是 Job 对象 + stage 字段
- 前端期望的是完整的应用信息（包括 status、hours、pieces 等）

**修复方案**:
- 改为从 work_logs 表查询，然后关联到 job_applications
- 返回完整的应用信息，包括：
  - 应用状态 (status)
  - 工作记录 (hours, pieces, photoUrls, anomalyType 等)
  - Job 信息 (title, location, salary 等)
  - Company 信息 (name, avatarUrl)

**代码变更**:
```typescript
// 原来的逻辑（错误）
async getOrders(userId: number) {
  const apps = await this.appRepo.find({
    where: { workerId: userId, isSupervisor: 1 },  // ❌ 只查询主管
    relations: ['job', 'job.user'],
    order: { createdAt: 'DESC' },
  });
  // 返回 Job 对象 + stage 字段
}

// 新的逻辑（正确）
async getOrders(userId: number) {
  // 1. 获取所有 work_logs
  const workLogs = await this.workLogRepo.find({
    where: { workerId: userId },
    order: { date: 'DESC' },
  });

  // 2. 获取对应的 job_applications
  const applications = await this.appRepo.find({
    where: { workerId: userId, jobId: In(jobIds) },
    relations: ['job', 'job.user'],
  });

  // 3. 返回完整的应用信息
  return applications.map(app => ({
    id: app.id,
    jobId: app.jobId,
    status: app.status,  // ✅ 应用状态
    hours: latestLog?.hours,  // ✅ 工作时长
    pieces: latestLog?.pieces,  // ✅ 计件数
    job: { ... },  // ✅ Job 信息
    company: { ... },  // ✅ Company 信息
  }));
}
```

### 2. 前端数据处理 (`pages/work-record/work-record.js`)

**状态**: ✅ 已正确实现
- `formatOrder()` 方法已正确处理返回的数据
- 状态映射与"我的报名"页面一致

### 3. 状态映射一致性

两个页面的状态映射完全一致：

| 后端状态 | 显示文本 | 背景色 | 说明 |
|---------|--------|------|------|
| pending | 待确认 | amber | 企业还未审核 |
| accepted | 待确认 | amber | 企业已接受，待临工确认 |
| confirmed | 已入选 | green | 双方都已确认 |
| working | 进行中 | green | 工作正在进行 |
| done | 已完成 | gray | 工作已完成 |
| completed | 已完成 | gray | 兼容旧状态 |
| rejected | 已拒绝 | rose | 企业拒绝 |
| released | 已释放 | rose | 未及时确认 |
| cancelled | 已取消 | gray | 主动取消 |

### 4. 测试更新 (`server/src/modules/work/work.service.spec.ts`)

更新了单元测试以匹配新的 API 返回格式：
- 添加 work_logs mock 数据
- 验证返回的应用信息格式
- 验证状态和工作时长等字段

---

## 数据流对比

### 修复前
```
我的报名:
  /applications API
  ↓
  job_applications 表
  ↓
  所有应用 (包括未开始工作的)

接单记录:
  /work/orders API
  ↓
  job_applications 表 (isSupervisor=1)
  ↓
  只有主管的应用 ❌ (错误)
```

### 修复后
```
我的报名:
  /applications API
  ↓
  job_applications 表
  ↓
  所有应用 (包括未开始工作的)

接单记录:
  /work/orders API
  ↓
  work_logs 表 → job_applications 表
  ↓
  有工作记录的应用 ✅ (正确)
```

---

## 页面显示逻辑

### 我的报名 (my-applications)
- 显示所有应用
- 按状态分类：待确认、已入选、进行中、已完成、异常
- 包括未开始工作的应用

### 接单记录 (work-record)
- 显示有工作记录的应用
- 显示工作细节：工时、计件、异常等
- 主要用于查看已完成或进行中的工作

---

## 验证清单

- ✅ 后端 API 返回格式正确
- ✅ 前端数据处理逻辑正确
- ✅ 状态映射一致
- ✅ 测试用例更新
- ✅ TypeScript 编译通过
- ✅ 两个页面数据同步

---

## 相关文件

- `server/src/modules/work/work.service.ts` - 后端服务修复
- `server/src/modules/work/work.service.spec.ts` - 测试更新
- `pages/work-record/work-record.js` - 前端数据处理（已正确）
- `pages/my-applications/my-applications.js` - 前端数据处理（已正确）
