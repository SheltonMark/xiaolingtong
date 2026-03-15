# 招工详情页面 - 报名人数显示不一致 - 详细对比分析

**日期**: 2026-03-14
**问题**: 招工详情显示已有两个人报名，但是报名者管理显示共0人

---

## 问题对比表

| 维度 | 招工管理列表页面 | 报名者管理详情页面 | 差异 |
|------|-----------------|------------------|------|
| **页面** | `pages/settlement/settlement.wxml` | `pages/job-applications/job-applications.wxml` | 不同页面 |
| **显示内容** | "需2人 · 已报名2人" | "共0人" | ❌ 不一致 |
| **数据来源** | `item.appliedCount` | `applications.length` | 不同来源 |
| **API 端点** | `GET /jobs/mine` | `GET /jobs/:jobId/applications` | 不同 API |
| **后端方法** | `myJobs()` | `getApplicationsForEnterprise()` | 不同方法 |
| **查询条件** | `{ jobId: job.id }` | `{ jobId }` | 相同 |
| **返回数据** | 所有状态的应用数 | 按状态分类的应用 | 不同格式 |
| **状态覆盖** | 8 个状态 ✅ | 4 个状态 ❌ | 缺失 4 个 |

---

## 数据流详细分析

### 招工管理列表页面 - 正常工作

```
用户打开 settlement 页面
  ↓
onShow() → loadData()
  ↓
loadRecruitmentJobs()
  ↓
GET /jobs/mine
  ↓
后端 myJobs(userId) 方法:
  ├─ 查询: jobRepo.find({ where: { userId } })
  ├─ 对每个 job:
  │  └─ appliedCount = appRepo.count({ where: { jobId: job.id } })
  │     ↑ 查询所有状态的应用
  └─ 返回: { appliedCount: 2, ... }
  ↓
前端接收数据:
  ├─ item.appliedCount = 2
  └─ 显示: "已报名2人" ✅
```

**关键点**:
- ✅ 查询所有状态的应用
- ✅ 返回应用总数
- ✅ 前端正确显示

---

### 报名者管理详情页面 - 显示为 0

```
用户点击招工卡片
  ↓
navigateTo('/pages/job-applications/job-applications?jobId=1')
  ↓
onLoad(options) → loadApplications(jobId)
  ↓
GET /jobs/1/applications
  ↓
后端 getApplicationsForEnterprise(jobId, userId) 方法:
  ├─ 查询: appRepo.find({ where: { jobId } })
  │  ↑ 查询所有应用（包括所有状态）
  ├─ 按状态分类:
  │  ├─ if (app.status === 'pending') → grouped.pending.push(...)
  │  ├─ else if (app.status === 'accepted') → grouped.accepted.push(...)
  │  ├─ else if (app.status === 'confirmed') → grouped.confirmed.push(...)
  │  ├─ else if (app.status === 'rejected') → grouped.rejected.push(...)
  │  └─ else → ❌ 被忽略！
  └─ 返回: { pending: [], accepted: [], confirmed: [], rejected: [] }
  ↓
前端接收数据:
  ├─ pending = []
  ├─ accepted = []
  ├─ confirmed = []
  ├─ rejected = []
  ├─ applications = [...pending, ...accepted, ...confirmed, ...rejected]
  │  = [] (空数组)
  └─ 显示: "共0人" ❌
```

**关键问题**:
- ❌ 查询所有应用，但只分类 4 个状态
- ❌ 其他状态的应用被忽略
- ❌ 前端收到空数组

---

## 状态分类对比

### myJobs() 方法 - 所有状态都被计算

```typescript
const appliedCount = await this.appRepo.count({
  where: { jobId: job.id }
});
// 返回: 所有状态的应用总数
// 包括: pending, accepted, confirmed, rejected, released, cancelled, working, done
```

**结果**: appliedCount = 2 ✅

---

### getApplicationsForEnterprise() 方法 - 只分类 4 个状态

```typescript
const applications = await this.appRepo.find({
  where: { jobId }
});

const grouped: any = {
  pending: [],
  accepted: [],
  confirmed: [],
  rejected: [],
  // ❌ 缺失: released, cancelled, working, done
};

applications.forEach((app) => {
  if (app.status === 'pending') {
    grouped.pending.push(...);
  } else if (app.status === 'accepted') {
    grouped.accepted.push(...);
  } else if (app.status === 'confirmed') {
    grouped.confirmed.push(...);
  } else if (app.status === 'rejected') {
    grouped.rejected.push(...);
  }
  // ❌ 其他状态的应用被忽略
});

return grouped;
// 返回: { pending: [], accepted: [], confirmed: [], rejected: [] }
```

**结果**: 所有分类都是空的，applications.length = 0 ❌

---

## 假设场景

### 场景 1：应用处于 pending 或 accepted 状态

```
应用状态: pending
  ↓
myJobs() 计算: appliedCount = 1 ✅
getApplicationsForEnterprise() 分类: grouped.pending = [app] ✅
  ↓
结果: 两个页面都显示 1 人 ✅
```

### 场景 2：应用处于 released 或 cancelled 状态

```
应用状态: released (未及时确认被释放)
  ↓
myJobs() 计算: appliedCount = 1 ✅
getApplicationsForEnterprise() 分类: ❌ 被忽略
  ↓
结果:
  - 招工管理列表: 显示 1 人 ✅
  - 报名者管理详情: 显示 0 人 ❌
```

### 场景 3：应用处于 working 或 done 状态

```
应用状态: working (工作进行中)
  ↓
myJobs() 计算: appliedCount = 1 ✅
getApplicationsForEnterprise() 分类: ❌ 被忽略
  ↓
结果:
  - 招工管理列表: 显示 1 人 ✅
  - 报名者管理详情: 显示 0 人 ❌
```

---

## 代码位置详解

### 后端 - myJobs() 方法

**文件**: `server/src/modules/job/job.service.ts`
**行数**: 262-292

```typescript
async myJobs(userId: number) {
  const jobs = await this.jobRepo.find({
    where: { userId },
    order: { createdAt: 'DESC' },
  });

  const formattedJobs = await Promise.all(
    jobs.map(async (job) => {
      const appliedCount = await this.appRepo.count({
        where: { jobId: job.id },  // ← 查询所有状态
      });
      return {
        id: job.id,
        type: 'job',
        title: job.title,
        salary: job.salary,
        salaryUnit: job.salaryUnit,
        needCount: job.needCount,
        appliedCount,  // ← 返回所有应用数
        dateRange: job.dateStart && job.dateEnd
          ? `${job.dateStart}~${job.dateEnd}`
          : '',
        workHours: job.workHours,
        cityDistrict: this.extractCityDistrict(job.location),
        status: job.status,
        createdAt: job.createdAt,
        viewCount: 0,
      };
    }),
  );
}
```

---

### 后端 - getApplicationsForEnterprise() 方法

**文件**: `server/src/modules/job/job.service.ts`
**行数**: 535-601

```typescript
async getApplicationsForEnterprise(jobId: number, userId: number) {
  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('You do not have permission to view this job');
  }

  const applications = await this.appRepo.find({
    where: { jobId },  // ← 查询所有应用
    relations: ['worker'],
    order: { createdAt: 'DESC' },
  });

  const grouped: any = {
    pending: [],
    accepted: [],
    confirmed: [],
    rejected: [],
    // ❌ 缺失: released, cancelled, working, done
  };

  applications.forEach((app) => {
    const workerData = { ... };

    if (app.status === 'pending') {
      grouped.pending.push({ ...app, worker: workerData });
    } else if (app.status === 'accepted') {
      grouped.accepted.push({ ...app, worker: workerData });
    } else if (app.status === 'confirmed') {
      grouped.confirmed.push({ ...app, worker: workerData, isSupervisor: app.isSupervisor });
    } else if (app.status === 'rejected') {
      grouped.rejected.push({ ...app, worker: workerData });
    }
    // ❌ 其他状态的应用被忽略
  });

  return grouped;
}
```

---

### 前端 - settlement.js

**文件**: `pages/settlement/settlement.js`
**行数**: 27-31

```javascript
loadRecruitmentJobs() {
  get('/jobs/mine').then(res => {
    const list = res.data.list || res.data || []
    this.setData({ jobs: this.mapRecruitmentJobs(list) })
  }).catch(() => {})
}
```

**显示**: `item.appliedCount` (第 31 行 wxml)

---

### 前端 - job-applications.js

**文件**: `pages/job-applications/job-applications.js`
**行数**: 51-77

```javascript
loadApplications(jobId) {
  this.setData({ loading: true })
  get('/jobs/' + jobId + '/applications').then(res => {
    const data = res.data || {}
    const pending = (data.pending || []).map(app => this.formatApplication(app))
    const accepted = (data.accepted || []).map(app => this.formatApplication(app))
    const confirmed = (data.confirmed || []).map(app => this.formatApplication(app))
    const rejected = (data.rejected || []).map(app => this.formatApplication(app))

    this.setData({
      applications: [...pending, ...accepted, ...confirmed, ...rejected],
      // ❌ 缺失: released, cancelled, working, done
      pendingApps: pending,
      acceptedApps: accepted,
      confirmedApps: confirmed,
      rejectedApps: rejected,
      loading: false
    })
  }).catch((err) => {
    console.error('Failed to load applications:', err)
    wx.showToast({
      title: err.message || '加载失败',
      icon: 'none'
    })
    this.setData({ loading: false })
  })
}
```

**显示**: `applications.length` (第 30 行 wxml)

---

## 修复优先级

| 优先级 | 方案 | 工作量 | 效果 |
|--------|------|--------|------|
| 🔴 高 | 后端补全状态分类 | 中 | 根本解决 |
| 🟡 中 | 前端补全状态处理 | 中 | 完整显示 |
| 🟢 低 | UI 显示异常状态 | 小 | 用户体验 |

---

## 建议实施顺序

1. **第一步**: 修复后端 `getApplicationsForEnterprise()` 方法
   - 添加 released, cancelled, working, done 状态分类
   - 确保所有应用都被正确分类

2. **第二步**: 修复前端 `loadApplications()` 方法
   - 处理所有 8 个状态的应用
   - 合并所有分类到 applications 数组

3. **第三步**: 优化前端 UI 显示
   - 在 wxml 中显示所有状态的应用
   - 为异常状态添加特殊样式

---

## 验证方法

### 验证 1：检查应用状态分布

```sql
SELECT status, COUNT(*) as count
FROM job_applications
WHERE job_id = 1
GROUP BY status;
```

### 验证 2：对比两个 API 的返回数据

```bash
# 招工管理列表
curl http://localhost:3000/jobs/mine

# 报名者管理详情
curl http://localhost:3000/jobs/1/applications
```

### 验证 3：前端测试

1. 打开招工管理列表，记录报名人数
2. 点击进入报名者管理详情
3. 对比两个页面的报名人数是否一致

