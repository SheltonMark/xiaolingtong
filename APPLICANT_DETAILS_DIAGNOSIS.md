# 招工详情页面 - 报名者详情不显示诊断

## 问题描述
招工详情页面显示已有两个人报名，但没有展示报名者详情（名字、信用分、接单数）。

## 代码流程分析

### 前端流程 (pages/job-applications/job-applications.js)
```
loadApplications(jobId)
  ↓
GET /jobs/{jobId}/applications
  ↓
formatApplication(app) - 提取 worker 信息
  ↓
setData() - 更新页面数据
```

**formatApplication 方法** (第87-96行):
```javascript
formatApplication(app) {
  const workerInfo = app.worker || {}
  return {
    id: app.id,
    workerName: workerInfo.nickname || '未知',
    creditScore: workerInfo.creditScore || 0,
    totalOrders: workerInfo.totalOrders || 0,
    status: app.status
  }
}
```

**关键点**: 前端期望 `app.worker` 对象包含:
- `nickname` - 工人昵称
- `creditScore` - 信用分
- `totalOrders` - 接单数

### 后端流程 (server/src/modules/job/job.service.ts)

**getApplicationsForEnterprise 方法** (第535-620行):

1. **查询应用** (第543-547行):
```typescript
const applications = await this.appRepo.find({
  where: { jobId },
  relations: ['worker'],  // ✅ 加载 worker 关系
  order: { createdAt: 'DESC' },
});
```

2. **构建 workerData** (第573-578行):
```typescript
const workerData = {
  id: app.worker.id,
  nickname: workerName,  // 使用认证名字或 nickname
  creditScore: app.worker.creditScore,
  totalOrders: app.worker.totalOrders || 0,
};
```

3. **按状态分组返回** (第580-620行):
```typescript
if (app.status === 'pending') {
  grouped.pending.push({
    ...app,
    worker: workerData,  // ✅ 包含 worker 信息
  });
}
// ... 其他状态类似
```

## 可能的问题

### 问题 1: 数据库列缺失 ❌
根据 MEMORY.md 记录，存在系统性数据库同步失败：
- `users` 表缺失: `name`, `totalOrders`, `completedJobs`, `averageRating`
- `job_applications` 表缺失: `acceptedAt`, `confirmedAt`, `rejectedAt`

**症状**:
- `app.worker.creditScore` 为 undefined
- `app.worker.totalOrders` 为 undefined
- 前端显示 "信用分: 0" 和 "订单数: 0"

**验证方法**:
```sql
-- 检查 users 表结构
DESCRIBE users;

-- 检查是否有 totalOrders 列
SHOW COLUMNS FROM users LIKE 'totalOrders';
```

### 问题 2: Worker 关系未正确加载 ❌
如果 `relations: ['worker']` 未生效，则 `app.worker` 为 undefined。

**症状**:
- 前端显示 "未知" (因为 `workerInfo.nickname` 为 undefined)
- 信用分和订单数都为 0

### 问题 3: 前端数据绑定问题 ❌
虽然后端返回了正确的数据，但前端可能没有正确绑定。

**检查点**:
- `formatApplication` 是否被调用
- `setData()` 是否正确更新了 `pendingApps` 等数组
- WXML 模板是否正确引用了 `item.workerName` 等字段

## 快速诊断步骤

### 1. 检查后端返回的数据
在浏览器开发者工具中查看网络请求：
```
GET /jobs/{jobId}/applications
Response:
{
  "pending": [
    {
      "id": 1,
      "worker": {
        "id": 2,
        "nickname": "张三",      // ← 应该有值
        "creditScore": 95,       // ← 应该有值
        "totalOrders": 10        // ← 应该有值
      },
      "status": "pending"
    }
  ]
}
```

### 2. 检查前端数据处理
在 `job-applications.js` 的 `loadApplications` 方法中添加日志：
```javascript
loadApplications(jobId) {
  this.setData({ loading: true })
  get('/jobs/' + jobId + '/applications').then(res => {
    console.log('API Response:', res.data)  // ← 添加这行
    const data = res.data || {}
    const pending = (data.pending || []).map(app => {
      console.log('Formatting app:', app)  // ← 添加这行
      return this.formatApplication(app)
    })
    // ...
  })
}
```

### 3. 检查数据库
```sql
-- 检查 users 表是否有必要的列
SELECT id, nickname, creditScore, totalOrders FROM users LIMIT 5;

-- 检查 job_applications 表
SELECT id, jobId, workerId, status FROM job_applications LIMIT 5;

-- 检查 worker 数据是否存在
SELECT u.id, u.nickname, u.creditScore, u.totalOrders
FROM users u
WHERE u.id IN (SELECT workerId FROM job_applications);
```

## 解决方案

### 方案 A: 修复数据库列（如果缺失）
参考 `server/fix-all-columns.sql` 或 `server/fix-all-columns.sh`

### 方案 B: 验证后端 API 返回
运行测试确保 `getApplicationsForEnterprise` 返回正确的数据：
```bash
cd server
npm test -- job.phase2.integration.spec.ts
```

### 方案 C: 添加前端调试
在 `job-applications.js` 中添加日志，确认数据流正确。

## 测试验证

当前测试状态: ✅ 38/38 通过 (job.phase2.integration.spec.ts)

**发现的问题**: 测试中的 "should retrieve all worker applications grouped by status" 测试：
- ✅ 验证了 `applications` 是否 defined
- ❌ **没有验证** worker 对象是否包含 nickname, creditScore, totalOrders
- ❌ **没有验证** 返回的数据结构是否正确

**测试代码** (第910-912行):
```typescript
const applications = await service.getApplicationsForEnterprise(1, mockEnterprise.id);
expect(applications).toBeDefined();  // ← 只检查是否存在，没有检查内容
```

**应该验证**:
```typescript
expect(applications.pending).toBeDefined();
expect(applications.pending[0].worker).toBeDefined();
expect(applications.pending[0].worker.nickname).toBe('Test Worker');
expect(applications.pending[0].worker.creditScore).toBe(98);
expect(applications.pending[0].worker.totalOrders).toBe(15);
```

## 建议的修复步骤

1. **立即检查**: 在浏览器中查看 API 返回的实际数据
2. **如果数据缺失**: 执行数据库修复脚本
3. **如果数据正确**: 检查前端 WXML 模板是否正确绑定
4. **增强测试**: 添加验证 worker 详情字段的测试用例
