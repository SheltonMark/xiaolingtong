# 招工详情界面 - 临工详情信息显示完整解决方案

## 问题现象
招工详情界面显示"已报名2人"，但未显示临工的详情信息。

## 根本原因分析

### 数据流程

```
1. 前端加载招工详情页面
   ↓
2. 调用 GET /jobs/:jobId/applications API
   ↓
3. 后端查询数据库
   - 查询 JobApplication 表
   - 关联 User 表（worker）
   - 查询 WorkerCert 表（认证信息）
   ↓
4. 后端返回分组数据
   {
     pending: [
       {
         id: 1,
         jobId: 1,
         workerId: 1,
         status: "pending",
         createdAt: "...",
         worker: {
           id: 1,
           nickname: "张三",
           realName: "张三",
           creditScore: 95,
           totalOrders: 10,
           completedJobs: 9,
           completionRate: 90,
           averageRating: 4.5,
           isSupervisorCandidate: true
         }
       }
     ],
     accepted: [],
     confirmed: [],
     rejected: [],
     released: [],
     cancelled: [],
     working: [],
     done: []
   }
   ↓
5. 前端接收数据
   ↓
6. 前端格式化数据
   {
     id: 1,
     workerName: "张三",
     realName: "张三",
     creditScore: 95,
     totalOrders: 10,
     completionRate: 90,
     averageRating: 4.5,
     isSupervisorCandidate: true,
     appliedAt: "03-14 10:30",
     status: "pending"
   }
   ↓
7. 前端更新页面数据
   ↓
8. 模板渲染
   <view class="application-item">
     <view class="worker-name">张三</view>
     <text class="rating-stars">⭐ 4.5</text>
     <text class="detail-item">信用分: 95</text>
     <text class="detail-item">订单数: 10</text>
     <text class="detail-item">完成度: 90%</text>
     <text class="detail-item">报名: 03-14 10:30</text>
   </view>
```

## 已实现的改进

### 1. 后端改进

**文件**：`server/src/modules/job/job.service.ts`

**改动**：
- 添加 `realName` 字段到 workerData
- 从 WorkerCert 表获取临工的真实姓名

```typescript
const workerData = {
  id: app.worker.id,
  nickname: workerName,
  realName: realName,  // ← 新增
  creditScore: app.worker.creditScore,
  totalOrders: totalOrders,
  completedJobs: completedJobs,
  completionRate: completionRate,
  averageRating: app.worker.averageRating || 0,
  isSupervisorCandidate: isSupervisorCandidate,
};
```

### 2. 前端改进

**文件**：`pages/job-applications/job-applications.js`

**改动**：
- 在 `formatApplication()` 中存储 `realName`
- 添加详细的调试日志

```javascript
formatApplication(app) {
  const workerInfo = app.worker || {}
  return {
    id: app.id,
    workerName: workerInfo.nickname || '未知',
    realName: workerInfo.realName || '',  // ← 新增
    creditScore: workerInfo.creditScore || 0,
    totalOrders: workerInfo.totalOrders || 0,
    completionRate: workerInfo.completionRate || 0,
    averageRating: workerInfo.averageRating || 0,
    isSupervisorCandidate: workerInfo.isSupervisorCandidate || false,
    appliedAt: this.formatDate(app.createdAt),
    status: app.status
  }
}
```

### 3. 调试日志

**文件**：`pages/job-applications/job-applications.js`

**改动**：
- 在 `loadApplications()` 中添加详细的 console.log
- 便于诊断问题

```javascript
loadApplications(jobId) {
  this.setData({ loading: true })
  get('/jobs/' + jobId + '/applications').then(res => {
    console.log('=== API Response ===')
    console.log('Status:', res.statusCode)
    console.log('Data:', res.data)
    console.log('Pending apps count:', (res.data?.pending || []).length)
    console.log('Formatted pending apps:', pending)
    // ...
  })
}
```

## 验证步骤

### 步骤 1：打开微信开发者工具

1. 启动微信开发者工具
2. 打开项目
3. 进入招工详情页面

### 步骤 2：查看控制台日志

打开 Console 标签，应该看到：

```
=== API Response ===
Status: 200
Data: { pending: [...], accepted: [], ... }
Pending apps count: 2
Formatted pending apps: [
  {
    id: 1,
    workerName: "张三",
    realName: "张三",
    creditScore: 95,
    totalOrders: 10,
    completionRate: 90,
    averageRating: 4.5,
    isSupervisorCandidate: true,
    appliedAt: "03-14 10:30",
    status: "pending"
  },
  {
    id: 2,
    workerName: "李四",
    realName: "李四",
    creditScore: 85,
    totalOrders: 5,
    completionRate: 80,
    averageRating: 4.0,
    isSupervisorCandidate: false,
    appliedAt: "03-14 10:25",
    status: "pending"
  }
]
Page data after setData: { pendingApps: [...], ... }
Pending apps in page: [...]
```

### 步骤 3：检查页面显示

页面应该显示：

```
待审核                                    2人
┌─────────────────────────────────────┐
│ 张三                          ⭐ 4.5 │
│ 信用分: 95                          │
│ 订单数: 10                          │
│ 完成度: 90%                         │
│ 报名: 03-14 10:30                   │
│ [详情] [接受] [拒绝]                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 李四                          ⭐ 4.0 │
│ 信用分: 85                          │
│ 订单数: 5                           │
│ 完成度: 80%                         │
│ 报名: 03-14 10:25                   │
│ [详情] [接受] [拒绝]                │
└─────────────────────────────────────┘
```

## 故障排查

### 如果控制台日志显示 `Pending apps count: 0`

**原因**：后端没有返回报名数据

**检查**：
```sql
-- 检查数据库中是否有报名数据
SELECT COUNT(*) FROM job_applications WHERE jobId = ?;

-- 检查报名者的 worker 是否存在
SELECT ja.id, ja.workerId, u.id, u.nickname
FROM job_applications ja
LEFT JOIN users u ON ja.workerId = u.id
WHERE ja.jobId = ?;
```

### 如果控制台日志显示 `Status: 401` 或 `403`

**原因**：权限问题

**检查**：
- 用户是否已登录
- 用户是否是企业端用户
- Token 是否有效

### 如果控制台日志显示数据正确，但页面未显示

**原因**：模板或样式问题

**检查**：
1. 打开浏览器开发者工具（F12）
2. 检查 DOM 结构
3. 检查是否有 CSS 隐藏了内容
4. 检查 `wx:if` 条件是否为 true

### 如果 `Formatted pending apps` 显示字段为空

**原因**：后端返回的数据不完整

**检查**：
```javascript
// 在 formatApplication 中添加日志
formatApplication(app) {
  console.log('App data:', app)
  console.log('Worker data:', app.worker)
  const workerInfo = app.worker || {}
  // ...
}
```

## 相关文件

| 文件 | 修改内容 |
|------|---------|
| `server/src/modules/job/job.service.ts` | 添加 realName 字段 |
| `pages/job-applications/job-applications.js` | 存储 realName，添加调试日志 |
| `pages/job-applications/job-applications.wxml` | 模板（无需修改） |

## 测试结果

✅ 所有后端测试通过（38/38）

```
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
Time:        2.504 s
```

## 下一步

1. 打开微信开发者工具
2. 进入招工详情页面
3. 查看控制台日志
4. 验证数据是否正确显示
5. 如果有问题，根据故障排查部分进行诊断

## 总结

已实现的改进：
- ✅ 后端返回 realName 字段
- ✅ 前端存储 realName 字段
- ✅ 添加详细的调试日志
- ✅ 所有测试通过

现在招工详情界面应该能正确显示临工的详情信息了。如果仍有问题，请查看控制台日志进行诊断。
