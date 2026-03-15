# 招工详情界面 - 获取临工 realName 信息实现

## 问题
招工详情界面显示已报名2人，但未显示临工的详情信息。需要获取临工的 realName（真实姓名）信息。

## 解决方案

### 修改 1：后端添加 realName 字段

**文件**：`server/src/modules/job/job.service.ts`

**修改位置**：`getApplicationsForEnterprise()` 方法（第 658-678 行）

**改动**：
```typescript
applications.forEach((app) => {
  // 优先使用认证名字，然后是 nickname
  const cert = certMap.get(app.worker.id);
  const workerName = cert?.realName || app.worker.nickname || `用户${app.worker.id}`;
  const realName = cert?.realName || '';  // ← 添加这行

  // 计算完成度和主管候选资格
  const totalOrders = app.worker.totalOrders || 0;
  const completedJobs = app.worker.completedJobs || 0;
  const completionRate = totalOrders > 0 ? Math.round((completedJobs / totalOrders) * 100) : 0;
  const isSupervisorCandidate = app.worker.creditScore >= 95 && totalOrders >= 10;

  const workerData = {
    id: app.worker.id,
    nickname: workerName,
    realName: realName,  // ← 添加这行
    creditScore: app.worker.creditScore,
    totalOrders: totalOrders,
    completedJobs: completedJobs,
    completionRate: completionRate,
    averageRating: app.worker.averageRating || 0,
    isSupervisorCandidate: isSupervisorCandidate,
  };
  // ... 继续
});
```

### 修改 2：前端存储 realName

**文件**：`pages/job-applications/job-applications.js`

**修改位置**：`formatApplication()` 方法（第 94-107 行）

**改动**：
```javascript
formatApplication(app) {
  const workerInfo = app.worker || {}
  return {
    id: app.id,
    workerName: workerInfo.nickname || '未知',
    realName: workerInfo.realName || '',  // ← 添加这行
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

## 数据流

```
后端 getApplicationsForEnterprise()
  ↓
查询 WorkerCert 表获取 realName
  ↓
返回 workerData 包含 realName 字段
  ↓
前端 formatApplication()
  ↓
存储 realName 到页面数据
  ↓
模板可以使用 {{item.realName}} 显示
```

## 使用方式

在前端模板中可以这样使用：

```wxml
<!-- 显示真实姓名 -->
<text class="worker-realname">{{item.realName}}</text>

<!-- 或者在需要时显示 -->
<text wx:if="{{item.realName}}">{{item.realName}}</text>
<text wx:else>{{item.workerName}}</text>
```

## 测试结果

✅ 所有测试通过（38/38）

```
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
Time:        2.504 s
```

## 修改文件清单

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| `server/src/modules/job/job.service.ts` | 添加 realName 字段到 workerData | 658-678 |
| `pages/job-applications/job-applications.js` | 在 formatApplication 中存储 realName | 94-107 |

## 数据结构

### 后端返回的 workerData

```javascript
{
  id: 1,
  nickname: "张三",           // 显示名称（优先使用 realName）
  realName: "张三",           // 真实姓名（新增）
  creditScore: 95,
  totalOrders: 10,
  completedJobs: 9,
  completionRate: 90,
  averageRating: 4.5,
  isSupervisorCandidate: true
}
```

### 前端存储的数据

```javascript
{
  id: 1,
  workerName: "张三",
  realName: "张三",           // 新增
  creditScore: 95,
  totalOrders: 10,
  completionRate: 90,
  averageRating: 4.5,
  isSupervisorCandidate: true,
  appliedAt: "03-14 10:30",
  status: "pending"
}
```

## 相关文件

- 后端：`server/src/modules/job/job.service.ts`
- 前端：`pages/job-applications/job-applications.js`
- 前端：`pages/job-applications/job-applications.wxml`（可选，如需显示 realName）

## 下一步

如果需要在前端模板中显示 realName，可以修改 `pages/job-applications/job-applications.wxml`，在适当的位置添加：

```wxml
<text class="worker-realname">{{item.realName}}</text>
```
