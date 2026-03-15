# 招工详情页面 - 报名人数显示不一致诊断报告

**日期**: 2026-03-14
**问题**: 招工详情显示已有两个人报名，但是报名者管理页面显示共0人

---

## 问题现象

### 现象 1：招工管理列表页面
- **页面**: `pages/settlement/settlement.wxml` (第 31 行)
- **显示**: "需2人 · 已报名2人"
- **数据来源**: `item.appliedCount` = 2

### 现象 2：报名者管理详情页面
- **页面**: `pages/job-applications/job-applications.wxml` (第 30 行)
- **显示**: "共0人"
- **数据来源**: `applications.length` = 0

---

## 根本原因分析

### 原因 1：数据查询范围不同 ✅ 已识别

#### 招工管理列表页面 - `myJobs()` 方法
**文件**: `server/src/modules/job/job.service.ts` (第 262-292 行)

```typescript
async myJobs(userId: number) {
  const jobs = await this.jobRepo.find({
    where: { userId },
    order: { createdAt: 'DESC' },
  });

  const formattedJobs = await Promise.all(
    jobs.map(async (job) => {
      const appliedCount = await this.appRepo.count({
        where: { jobId: job.id },  // ← 查询所有状态的应用
      });
      return {
        appliedCount,  // ← 返回所有应用数
        ...
      };
    }),
  );
}
```

**查询逻辑**:
- 查询条件: `{ jobId: job.id }`
- 返回: **所有状态的应用数** (pending, accepted, confirmed, rejected, released, cancelled, working, done)

#### 报名者管理详情页面 - `getApplicationsForEnterprise()` 方法
**文件**: `server/src/modules/job/job.service.ts` (第 535-601 行)

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

  // 按状态分类
  const grouped: any = {
    pending: [],
    accepted: [],
    confirmed: [],
    rejected: [],  // ← 只分类这 4 个状态
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
    // ❌ 其他状态的应用被忽略了！
  });

  return grouped;
}
```

**查询逻辑**:
- 查询条件: `{ jobId }`
- 返回: **只分类 4 个状态的应用** (pending, accepted, confirmed, rejected)
- **问题**: 其他状态的应用 (released, cancelled, working, done) 被忽略了

---

## 问题分析

### 问题 1：状态分类不完整

**缺失的状态**:
- `released` - 已释放（未及时确认）
- `cancelled` - 已取消（工人主动取消）
- `working` - 进行中（工作已开始）
- `done` - 已完成（工作已完成）

**影响**:
- 如果有应用处于这些状态，它们会被查询出来但不会被分类
- 前端收到的 `applications.length` 会是 0（因为所有分类都是空的）
- 但后端的 `appliedCount` 仍然包含这些应用

### 问题 2：前端显示逻辑

**文件**: `pages/job-applications/job-applications.js` (第 62 行)

```javascript
this.setData({
  applications: [...pending, ...accepted, ...confirmed, ...rejected],
  // ↑ 只合并这 4 个分类
  pendingApps: pending,
  acceptedApps: accepted,
  confirmedApps: confirmed,
  rejectedApps: rejected,
  loading: false
})
```

**问题**:
- 前端只显示这 4 个分类的应用
- 如果所有应用都处于其他状态，`applications.length` 就是 0

---

## 数据流对比

### 招工管理列表页面
```
GET /jobs/mine
  ↓
myJobs() 查询所有应用
  ↓
appliedCount = 2 (所有状态)
  ↓
前端显示: "已报名2人"
```

### 报名者管理详情页面
```
GET /jobs/:jobId/applications
  ↓
getApplicationsForEnterprise() 查询所有应用
  ↓
按状态分类 (只分类 4 个状态)
  ↓
其他状态的应用被忽略
  ↓
grouped = { pending: [], accepted: [], confirmed: [], rejected: [] }
  ↓
前端显示: "共0人"
```

---

## 解决方案

### 方案 1：后端补全状态分类（推荐）

**文件**: `server/src/modules/job/job.service.ts`
**方法**: `getApplicationsForEnterprise()` (第 556-598 行)

**修改内容**:
```typescript
// 按状态分类
const grouped: any = {
  pending: [],
  accepted: [],
  confirmed: [],
  rejected: [],
  released: [],      // ✅ 添加
  cancelled: [],     // ✅ 添加
  working: [],       // ✅ 添加
  done: [],          // ✅ 添加
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
  } else if (app.status === 'released') {  // ✅ 添加
    grouped.released.push({ ...app, worker: workerData });
  } else if (app.status === 'cancelled') {  // ✅ 添加
    grouped.cancelled.push({ ...app, worker: workerData });
  } else if (app.status === 'working') {  // ✅ 添加
    grouped.working.push({ ...app, worker: workerData });
  } else if (app.status === 'done') {  // ✅ 添加
    grouped.done.push({ ...app, worker: workerData });
  }
});

return grouped;
```

### 方案 2：前端补全状态显示

**文件**: `pages/job-applications/job-applications.js`
**方法**: `loadApplications()` (第 51-77 行)

**修改内容**:
```javascript
loadApplications(jobId) {
  this.setData({ loading: true })
  get('/jobs/' + jobId + '/applications').then(res => {
    const data = res.data || {}
    const pending = (data.pending || []).map(app => this.formatApplication(app))
    const accepted = (data.accepted || []).map(app => this.formatApplication(app))
    const confirmed = (data.confirmed || []).map(app => this.formatApplication(app))
    const rejected = (data.rejected || []).map(app => this.formatApplication(app))
    const released = (data.released || []).map(app => this.formatApplication(app))  // ✅ 添加
    const cancelled = (data.cancelled || []).map(app => this.formatApplication(app))  // ✅ 添加
    const working = (data.working || []).map(app => this.formatApplication(app))  // ✅ 添加
    const done = (data.done || []).map(app => this.formatApplication(app))  // ✅ 添加

    this.setData({
      applications: [...pending, ...accepted, ...confirmed, ...rejected, ...released, ...cancelled, ...working, ...done],  // ✅ 添加
      pendingApps: pending,
      acceptedApps: accepted,
      confirmedApps: confirmed,
      rejectedApps: rejected,
      releasedApps: released,  // ✅ 添加
      cancelledApps: cancelled,  // ✅ 添加
      workingApps: working,  // ✅ 添加
      doneApps: done,  // ✅ 添加
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

### 方案 3：前端 UI 显示异常状态

**文件**: `pages/job-applications/job-applications.wxml`

**添加异常状态分类**:
```wxml
<!-- 已释放 -->
<view class="status-group" wx:if="{{releasedApps.length > 0}}">
  <view class="status-group-header">
    <text class="status-group-title">已释放</text>
    <text class="status-group-count">{{releasedApps.length}}</text>
  </view>
  <view class="application-item" wx:for="{{releasedApps}}" wx:key="id">
    <!-- 显示报名者信息 -->
  </view>
</view>

<!-- 已取消 -->
<view class="status-group" wx:if="{{cancelledApps.length > 0}}">
  <view class="status-group-header">
    <text class="status-group-title">已取消</text>
    <text class="status-group-count">{{cancelledApps.length}}</text>
  </view>
  <view class="application-item" wx:for="{{cancelledApps}}" wx:key="id">
    <!-- 显示报名者信息 -->
  </view>
</view>

<!-- 进行中 -->
<view class="status-group" wx:if="{{workingApps.length > 0}}">
  <view class="status-group-header">
    <text class="status-group-title">进行中</text>
    <text class="status-group-count">{{workingApps.length}}</text>
  </view>
  <view class="application-item" wx:for="{{workingApps}}" wx:key="id">
    <!-- 显示报名者信息 -->
  </view>
</view>

<!-- 已完成 -->
<view class="status-group" wx:if="{{doneApps.length > 0}}">
  <view class="status-group-header">
    <text class="status-group-title">已完成</text>
    <text class="status-group-count">{{doneApps.length}}</text>
  </view>
  <view class="application-item" wx:for="{{doneApps}}" wx:key="id">
    <!-- 显示报名者信息 -->
  </view>
</view>
```

---

## 检查清单

- [ ] 确认应用的实际状态分布
- [ ] 检查是否有应用处于 released, cancelled, working, done 状态
- [ ] 应用方案 1 的后端修复
- [ ] 应用方案 2 的前端修复
- [ ] 应用方案 3 的 UI 显示
- [ ] 运行测试验证
- [ ] 在开发环境测试

---

## 相关文件

### 后端
- `server/src/modules/job/job.service.ts`
  - `myJobs()` 方法 (第 262-292 行)
  - `getApplicationsForEnterprise()` 方法 (第 535-601 行)

### 前端
- `pages/settlement/settlement.js` (第 27-31 行)
- `pages/settlement/settlement.wxml` (第 31 行)
- `pages/job-applications/job-applications.js` (第 51-77 行)
- `pages/job-applications/job-applications.wxml` (第 30 行)

### 设计文档
- `Docs/plans/2026-03-12-worker-recruitment-enhancement-design.md`

---

## 状态机参考

根据设计文档，应用的完整状态转换流程：

```
pending (待审核)
  ↓
accepted (已接受) 或 rejected (已拒绝)
  ↓
confirmed (已确认) 或 released (已释放)
  ↓
working (进行中)
  ↓
done (已完成)

其他状态:
- cancelled (已取消) - 工人主动取消
```

---

## 建议

1. **立即修复**: 应用方案 1（后端补全状态分类）
2. **同步修复**: 应用方案 2（前端补全状态处理）
3. **UI 优化**: 应用方案 3（显示所有状态的应用）

这样可以确保招工详情页面和报名者管理页面显示的报名人数一致。

