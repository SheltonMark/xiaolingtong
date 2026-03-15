# 招工详情界面 - 临工详情信息未显示诊断指南

## 问题描述
招工详情界面显示"已报名2人"，但未显示临工的详情信息（信用分、订单数、完成度等）。

## 问题诊断

### 第一步：检查浏览器控制台日志

打开微信开发者工具，进入招工详情页面，查看控制台输出：

```
=== API Response ===
Status: 200
Data: { pending: [...], accepted: [], ... }
Pending apps count: 2
Formatted pending apps: [...]
Page data after setData: { pendingApps: [...], ... }
```

**预期结果**：
- Status 应该是 200
- Pending apps count 应该是 2
- Formatted pending apps 应该有 2 个对象

### 第二步：检查 API 响应数据结构

在控制台查看 `Data` 的内容，应该看到：

```javascript
{
  pending: [
    {
      id: 1,
      jobId: 1,
      workerId: 1,
      status: "pending",
      createdAt: "2026-03-14T10:30:00Z",
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
    },
    // ... 第二个应用
  ],
  accepted: [],
  confirmed: [],
  rejected: [],
  released: [],
  cancelled: [],
  working: [],
  done: []
}
```

**检查点**：
- ✅ `pending` 数组是否有 2 个元素
- ✅ 每个元素是否有 `worker` 对象
- ✅ `worker` 对象是否包含所有字段（nickname, creditScore, totalOrders 等）

### 第三步：检查格式化后的数据

在控制台查看 `Formatted pending apps`，应该看到：

```javascript
[
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
  // ... 第二个应用
]
```

**检查点**：
- ✅ 数组长度是否为 2
- ✅ 每个对象是否有所有字段
- ✅ 字段值是否正确

### 第四步：检查页面数据

在控制台查看 `Page data after setData`，查看 `pendingApps` 字段：

```javascript
pendingApps: [
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
  // ... 第二个应用
]
```

**检查点**：
- ✅ `pendingApps` 是否有 2 个元素
- ✅ 每个元素是否有所有字段

### 第五步：检查模板渲染

如果前面的步骤都正确，但页面仍未显示，检查：

1. **模板条件**：
   ```wxml
   <view class="status-group" wx:if="{{pendingApps.length > 0}}">
   ```
   这个条件应该为 true（因为 pendingApps.length = 2）

2. **循环渲染**：
   ```wxml
   <view class="application-item" wx:for="{{pendingApps}}" wx:key="id">
   ```
   应该渲染 2 个 application-item

3. **数据绑定**：
   ```wxml
   <text class="detail-item">信用分: {{item.creditScore}}</text>
   ```
   应该显示 95

## 可能的问题和解决方案

### 问题 1：API 返回 401 或 403 错误

**症状**：
```
Status: 401
Error: Unauthorized
```

**原因**：
- 用户未登录
- Token 过期
- 权限不足

**解决**：
- 检查是否已登录
- 检查 Token 是否有效
- 确保用户是企业端用户

### 问题 2：API 返回空数据

**症状**：
```
Pending apps count: 0
```

**原因**：
- 数据库中没有报名数据
- 查询条件错误
- Worker 关系加载失败

**解决**：
```sql
-- 检查数据库中是否有报名数据
SELECT COUNT(*) FROM job_applications WHERE jobId = ?;

-- 检查报名者的 worker 是否存在
SELECT ja.id, ja.workerId, u.id
FROM job_applications ja
LEFT JOIN users u ON ja.workerId = u.id
WHERE ja.jobId = ?;
```

### 问题 3：Worker 数据为空

**症状**：
```
worker: null
```

**原因**：
- Worker 用户被删除
- 数据库关系配置错误
- 查询时未加载 worker 关系

**解决**：
- 检查后端是否正确加载了 worker 关系
- 检查 Worker 用户是否存在

### 问题 4：Worker 字段值为空

**症状**：
```
worker: {
  id: 1,
  nickname: null,
  creditScore: null,
  totalOrders: null,
  // ...
}
```

**原因**：
- 数据库字段为 NULL
- 数据库同步失败

**解决**：
```sql
-- 检查 users 表中的字段
SELECT id, nickname, creditScore, totalOrders, completedJobs, averageRating
FROM users
WHERE id IN (SELECT DISTINCT workerId FROM job_applications WHERE jobId = ?);
```

### 问题 5：模板未显示

**症状**：
- 控制台日志显示数据正确
- 但页面未显示

**原因**：
- 样式隐藏了内容
- 模板条件判断错误
- 数据绑定错误

**解决**：
1. 检查 CSS 是否隐藏了内容
2. 检查 `wx:if` 条件
3. 使用浏览器开发者工具检查 DOM

## 调试步骤

### 步骤 1：启用详细日志

已在 `pages/job-applications/job-applications.js` 中添加详细的 console.log 语句。

### 步骤 2：打开微信开发者工具

1. 打开微信开发者工具
2. 进入招工详情页面
3. 打开控制台（Console 标签）

### 步骤 3：查看日志

在控制台中查看以下日志：
- `=== API Response ===`
- `Status: 200`
- `Pending apps count: 2`
- `Formatted pending apps: [...]`
- `Page data after setData: {...}`

### 步骤 4：根据日志诊断

根据日志输出，按照上面的"可能的问题和解决方案"部分进行诊断。

## 快速检查清单

- [ ] 用户已登录
- [ ] 用户是企业端用户
- [ ] 招工 ID 正确
- [ ] 数据库中有报名数据
- [ ] Worker 用户存在
- [ ] Worker 字段值不为 NULL
- [ ] API 返回状态码 200
- [ ] API 返回的数据格式正确
- [ ] 前端正确格式化了数据
- [ ] 页面数据正确更新
- [ ] 模板条件判断正确
- [ ] 样式未隐藏内容

## 相关文件

- 前端：`pages/job-applications/job-applications.js`
- 前端：`pages/job-applications/job-applications.wxml`
- 后端：`server/src/modules/job/job.service.ts`
- 后端：`server/src/modules/job/job.controller.ts`

## 下一步

1. 打开微信开发者工具
2. 进入招工详情页面
3. 查看控制台日志
4. 根据日志诊断问题
5. 提供日志内容以便进一步诊断
