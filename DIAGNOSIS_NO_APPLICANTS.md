# 招工详情页面 - 报名者不显示诊断报告

**日期**: 2026-03-14
**问题**: 招工详情页面（job-applications）显示"暂无报名者"，即使有报名者存在

---

## 问题分析

### 1. 前端数据流问题

#### 问题位置：`pages/job-applications/job-applications.js` - `formatApplication()` 方法

```javascript
formatApplication(app) {
  const workerInfo = app.worker || {}
  return {
    id: app.id,
    workerName: workerInfo.nickname || '未知',
    creditScore: workerInfo.creditScore || 0,
    totalOrders: workerInfo.totalOrders || 0,  // ❌ 后端没有返回这个字段
    status: app.status
  }
}
```

**问题**: 后端返回的 `worker` 对象中只有 `id`, `nickname`, `creditScore` 三个字段，**没有 `totalOrders` 字段**。

#### 后端返回的数据结构

`server/src/modules/job/job.service.ts` - `getApplicationsForEnterprise()` 方法（第 535-610 行）：

```javascript
// 后端返回的 worker 对象
worker: {
  id: app.worker.id,
  nickname: workerName,
  creditScore: app.worker.creditScore,
  // ❌ 缺少 totalOrders 字段
}
```

---

### 2. 可能的根本原因

#### 原因 A：数据库查询不完整 ✅ 最可能

后端在查询 `JobApplication` 时，只关联了 `worker` 关系，但没有获取 `worker` 的完整信息：

```typescript
const applications = await this.appRepo.find({
  where: { jobId },
  relations: ['worker'],  // ← 只加载了 worker 关系
  order: { createdAt: 'DESC' },
});
```

**问题**: `User` 实体中的 `totalOrders` 字段可能：
1. 在数据库中不存在（数据库同步失败）
2. 在查询时没有被加载
3. 在 `User` 实体中定义但值为 NULL

#### 原因 B：前端 API 调用失败

`loadApplications()` 方法中的错误处理：

```javascript
loadApplications(jobId) {
  this.setData({ loading: true })
  get('/jobs/' + jobId + '/applications').then(res => {
    // ... 处理数据
  }).catch(() => {
    this.setData({ loading: false })  // ← 只设置 loading，没有显示错误
  })
}
```

**问题**: 如果 API 调用失败，用户看不到任何错误提示，只会看到"暂无报名者"。

#### 原因 C：权限问题

`getApplicationsForEnterprise()` 方法有权限检查：

```typescript
const job = await this.jobRepo.findOne({ where: { id: jobId } });
if (!job || job.userId !== userId) {
  throw new ForbiddenException('You do not have permission to view this job');
}
```

**问题**: 如果当前用户不是招工的发布者，会返回 403 错误。

---

## 诊断步骤

### 第一步：检查浏览器控制台

1. 打开微信开发者工具
2. 进入招工详情页面
3. 打开 Console 标签
4. 查看是否有错误信息

**预期错误**:
- `403 Forbidden` - 权限问题
- `500 Internal Server Error` - 服务器错误
- `Unknown column 'u.totalOrders'` - 数据库列缺失

### 第二步：检查网络请求

1. 打开 Network 标签
2. 查看 `/jobs/:jobId/applications` 请求
3. 检查响应状态码和响应体

**预期响应**:
```json
{
  "pending": [
    {
      "id": 1,
      "status": "pending",
      "worker": {
        "id": 123,
        "nickname": "张三",
        "creditScore": 95
      }
    }
  ],
  "accepted": [],
  "confirmed": [],
  "rejected": []
}
```

### 第三步：检查数据库

```sql
-- 检查 users 表是否有 totalOrders 列
DESCRIBE users;

-- 检查是否有报名数据
SELECT * FROM job_applications WHERE job_id = :jobId;

-- 检查 worker 信息
SELECT id, nickname, credit_score, total_orders FROM users WHERE id IN (
  SELECT worker_id FROM job_applications WHERE job_id = :jobId
);
```

---

## 解决方案

### 方案 1：修复后端数据返回（推荐）

**文件**: `server/src/modules/job/job.service.ts`

**修改**: `getApplicationsForEnterprise()` 方法，添加 `totalOrders` 字段

```typescript
async getApplicationsForEnterprise(jobId: number, userId: number) {
  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  if (!job || job.userId !== userId) {
    throw new ForbiddenException('You do not have permission to view this job');
  }

  const applications = await this.appRepo.find({
    where: { jobId },
    relations: ['worker'],
    order: { createdAt: 'DESC' },
  });

  // 获取所有 worker 的认证信息
  const workerIds = applications.map(app => app.worker.id);
  const workerCerts = await this.workerCertRepo.find({
    where: workerIds.length > 0 ? { userId: In(workerIds) } : { userId: In([0]) },
  });
  const certMap = new Map(workerCerts.map(cert => [cert.userId, cert]));

  // 按状态分类
  const grouped: any = {
    pending: [],
    accepted: [],
    confirmed: [],
    rejected: [],
  };

  applications.forEach((app) => {
    const cert = certMap.get(app.worker.id);
    const workerName = cert?.realName || app.worker.nickname || `用户${app.worker.id}`;

    const workerData = {
      id: app.worker.id,
      nickname: workerName,
      creditScore: app.worker.creditScore,
      totalOrders: app.worker.totalOrders || 0,  // ✅ 添加这一行
    };

    if (app.status === 'pending') {
      grouped.pending.push({
        ...app,
        worker: workerData,
      });
    } else if (app.status === 'accepted') {
      grouped.accepted.push({
        ...app,
        worker: workerData,
      });
    } else if (app.status === 'confirmed') {
      grouped.confirmed.push({
        ...app,
        worker: workerData,
        isSupervisor: app.isSupervisor,
      });
    } else if (app.status === 'rejected') {
      grouped.rejected.push({
        ...app,
        worker: workerData,
      });
    }
  });

  return grouped;
}
```

### 方案 2：修复前端错误处理

**文件**: `pages/job-applications/job-applications.js`

**修改**: `loadApplications()` 方法，添加错误提示

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
      pendingApps: pending,
      acceptedApps: accepted,
      confirmedApps: confirmed,
      rejectedApps: rejected,
      loading: false
    })
  }).catch((err) => {
    console.error('Failed to load applications:', err)  // ✅ 添加日志
    wx.showToast({  // ✅ 显示错误提示
      title: err.message || '加载失败',
      icon: 'none'
    })
    this.setData({ loading: false })
  })
}
```

### 方案 3：修复前端数据处理

**文件**: `pages/job-applications/job-applications.js`

**修改**: `formatApplication()` 方法，处理缺失的字段

```javascript
formatApplication(app) {
  const workerInfo = app.worker || {}
  return {
    id: app.id,
    workerName: workerInfo.nickname || '未知',
    creditScore: workerInfo.creditScore || 0,
    totalOrders: workerInfo.totalOrders || 0,  // 如果后端没有返回，默认为 0
    status: app.status
  }
}
```

---

## 检查清单

- [ ] 确认数据库中有 `job_applications` 记录
- [ ] 确认 `users` 表有 `total_orders` 列
- [ ] 确认当前用户是招工的发布者
- [ ] 检查浏览器控制台是否有错误
- [ ] 检查网络请求是否返回 200 状态码
- [ ] 检查响应数据是否包含报名者信息
- [ ] 应用方案 1 的修复
- [ ] 应用方案 2 的修复
- [ ] 重新测试页面

---

## 相关文件

- 前端: `pages/job-applications/job-applications.js` (第 51-72 行)
- 后端: `server/src/modules/job/job.service.ts` (第 535-610 行)
- 路由: `server/src/modules/job/job.controller.ts` (第 99-106 行)
- 设计文档: `Docs/plans/2026-03-12-worker-recruitment-enhancement-design.md`

