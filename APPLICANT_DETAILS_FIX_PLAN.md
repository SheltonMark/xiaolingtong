# 招工详情页面 - 报名者详情显示修复方案

## 问题总结
招工详情页面显示已有两个人报名，但没有展示报名者详情（名字、信用分、接单数）。

## 根本原因分析

### 1. 测试覆盖不足 ❌
当前测试只验证了 API 返回是否 defined，**没有验证 worker 详情字段**。

**当前测试** (job.phase2.integration.spec.ts:910-912):
```typescript
const applications = await service.getApplicationsForEnterprise(1, mockEnterprise.id);
expect(applications).toBeDefined();  // ← 太宽松
```

### 2. 可能的数据库问题 ⚠️
根据 MEMORY.md，存在系统性数据库同步失败：
- `users` 表缺失: `totalOrders`, `completedJobs`, `averageRating`
- 这会导致 `app.worker.totalOrders` 为 undefined

### 3. 前端数据处理正确 ✅
- WXML 模板正确绑定了 `item.workerName`, `item.creditScore`, `item.totalOrders`
- `formatApplication` 方法正确提取了 worker 信息
- 后端 `getApplicationsForEnterprise` 正确返回了 worker 对象

## 修复步骤

### 步骤 1: 增强测试验证 worker 详情字段

**文件**: `server/src/modules/job/job.phase2.integration.spec.ts`

在第910-912行的测试中添加详细验证：

```typescript
it('should retrieve all worker applications grouped by status', async () => {
  const mockApplications = [
    {
      id: 1,
      jobId: 1,
      workerId: 2,
      status: 'pending',
      worker: mockWorker,  // ← 包含 worker 信息
    },
    {
      id: 2,
      jobId: 1,
      workerId: 3,
      status: 'pending',
      worker: mockSupervisor,
    },
  ];

  jobRepository.findOne.mockResolvedValue(mockJob);
  jobApplicationRepository.find.mockResolvedValue(mockApplications);
  workerCertRepository.find.mockResolvedValue([]);

  const applications = await service.getApplicationsForEnterprise(1, mockEnterprise.id);

  // ✅ 验证返回结构
  expect(applications).toBeDefined();
  expect(applications.pending).toBeDefined();
  expect(applications.pending.length).toBe(2);

  // ✅ 验证 worker 详情字段
  expect(applications.pending[0].worker).toBeDefined();
  expect(applications.pending[0].worker.nickname).toBe('Test Worker');
  expect(applications.pending[0].worker.creditScore).toBe(98);
  expect(applications.pending[0].worker.totalOrders).toBe(15);

  // ✅ 验证第二个 worker
  expect(applications.pending[1].worker.nickname).toBe('Test Supervisor');
  expect(applications.pending[1].worker.creditScore).toBe(98);
  expect(applications.pending[1].worker.totalOrders).toBe(15);
});
```

### 步骤 2: 验证数据库列是否存在

**检查命令**:
```sql
-- 检查 users 表是否有必要的列
SHOW COLUMNS FROM users;

-- 特别检查这些列
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users' AND COLUMN_NAME IN ('totalOrders', 'creditScore', 'nickname');
```

**如果缺失 totalOrders 列**，执行修复:
```sql
ALTER TABLE users ADD COLUMN totalOrders INT DEFAULT 0;
ALTER TABLE users ADD COLUMN completedJobs INT DEFAULT 0;
ALTER TABLE users ADD COLUMN averageRating DECIMAL(3,2) DEFAULT 0;
```

### 步骤 3: 前端调试验证

在 `pages/job-applications/job-applications.js` 的 `loadApplications` 方法中添加日志：

```javascript
loadApplications(jobId) {
  this.setData({ loading: true })
  get('/jobs/' + jobId + '/applications').then(res => {
    console.log('📡 API Response:', res.data)  // ← 查看原始数据
    const data = res.data || {}

    const pending = (data.pending || []).map(app => {
      console.log('📝 Formatting app:', app)  // ← 查看每个应用
      const formatted = this.formatApplication(app)
      console.log('✅ Formatted result:', formatted)  // ← 查看格式化后的结果
      return formatted
    })

    this.setData({
      applications: [...pending, ...accepted, ...confirmed, ...rejected],
      pendingApps: pending,
      acceptedApps: accepted,
      confirmedApps: confirmed,
      rejectedApps: rejected,
      loading: false
    })

    console.log('📊 Page data updated:', this.data)  // ← 查看最终页面数据
  }).catch((err) => {
    console.error('❌ Failed to load applications:', err)
    // ...
  })
}
```

### 步骤 4: 验证前端显示

在微信开发者工具中：
1. 打开 Console 查看日志
2. 检查 API 返回的数据结构
3. 检查 `formatApplication` 是否正确处理
4. 检查页面数据是否正确更新

## 验证清单

- [ ] 运行测试: `npm test -- job.phase2.integration.spec.ts`
- [ ] 验证测试中 worker 详情字段的断言
- [ ] 检查数据库 users 表是否有 totalOrders 列
- [ ] 在前端添加日志并查看 API 返回
- [ ] 在微信开发者工具中验证页面显示
- [ ] 确认报名者名字、信用分、接单数都正确显示

## 预期结果

修复后，招工详情页面应该显示：
```
待审核 (2)
├─ 张三
│  ├─ 信用分: 98
│  └─ 订单数: 15
└─ 李四
   ├─ 信用分: 95
   └─ 订单数: 12
```

## 相关文件

- 前端: `pages/job-applications/job-applications.js` (第87-96行)
- 前端: `pages/job-applications/job-applications.wxml` (第39-51行)
- 后端: `server/src/modules/job/job.service.ts` (第535-620行)
- 测试: `server/src/modules/job/job.phase2.integration.spec.ts` (第910-912行)
