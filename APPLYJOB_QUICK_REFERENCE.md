# 临工报名功能 - 快速参考

## 问题解决

**原问题**: 临工端报名信息没同步到数据库中

**根本原因**: 后端缺少 `POST /jobs/:jobId/apply` 端点

**解决方案**: 实现 applyJob 方法，添加完整的报名流程

## 实现概览

### 后端实现
```
JobController
  └─ @Post(':jobId/apply')
     └─ applyJob(jobId, workerId)

JobService
  ├─ applyJob() - 主方法
  ├─ checkTimeConflict() - 时间冲突检查
  └─ isTimeOverlap() - 时间重叠判断
```

### 前端调用
```javascript
// pages/job-detail/job-detail.js
post('/jobs/' + this.data.job.id + '/apply')
```

## 工作流程

```
1. 临工点击报名
   ↓
2. 前端调用 POST /jobs/:jobId/apply
   ↓
3. 后端验证：
   - 工作是否存在
   - 临工是否存在
   - 临工是否已认证
   - 是否已报名过
   - 是否有时间冲突
   ↓
4. 创建 JobApplication 记录（status = 'pending'）
   ↓
5. 返回成功响应
   ↓
6. 前端显示"报名成功"
   ↓
7. 数据库保存报名记录
```

## 测试验证

### 单元测试 (5 个)
- ✅ 应该成功报名工作
- ✅ 工作不存在时抛出错误
- ✅ 临工未认证时抛出错误
- ✅ 已报名过此工作时抛出错误
- ✅ 工作时间冲突时抛出错误

### 集成测试 (38 个)
- ✅ 所有 job.phase2 测试通过

## 关键验证

| 检查项 | 实现 | 说明 |
|------|------|------|
| 工作存在性 | ✅ | 检查 Job 表 |
| 临工存在性 | ✅ | 检查 User 表 |
| 认证状态 | ✅ | 检查 WorkerCert 表，status='approved' |
| 重复报名 | ✅ | 检查 JobApplication 表 |
| 时间冲突 | ✅ | 检查与已接受/已确认工作的时间重叠 |

## 时间冲突检查逻辑

```
新工作时间: [dateStart1, dateEnd1]
已有工作时间: [dateStart2, dateEnd2]

冲突判断: start1 <= end2 && end1 >= start2

示例：
- 新工作: 2026-03-15 ~ 2026-03-15
- 已有工作: 2026-03-15 ~ 2026-03-15
- 结果: 冲突 ❌
```

## 错误处理

| 错误 | 状态码 | 消息 |
|------|------|------|
| 工作不存在 | 404 | 工作不存在 |
| 临工未认证 | 400 | 请先完成实名认证 |
| 已报名过 | 400 | 您已报名过此工作 |
| 时间冲突 | 400 | 工作时间冲突 + 冲突信息 |

## 数据库变化

### 创建的记录
```sql
INSERT INTO job_applications (jobId, workerId, status, createdAt)
VALUES (1, 2, 'pending', NOW());
```

### 查询报名记录
```sql
SELECT * FROM job_applications
WHERE jobId = 1 AND workerId = 2;
```

## 前端测试步骤

1. 打开小程序
2. 登录为临工账号
3. 进入招工详情页面
4. 点击"报名"按钮
5. 确认报名
6. 验证：
   - 显示"报名成功"提示
   - 数据库中有新的 JobApplication 记录
   - 企业端可以看到报名者

## 后端测试命令

```bash
# 运行 applyJob 单元测试
npm test -- job.service.spec.ts

# 运行所有 job 模块测试
npm test -- job

# 运行集成测试
npm test -- job.phase2.integration.spec.ts
```

## 相关文件

| 文件 | 修改内容 |
|------|---------|
| job.controller.ts | 添加 applyJob 端点 |
| job.service.ts | 实现 applyJob、checkTimeConflict、isTimeOverlap |
| job.service.spec.ts | 添加 5 个测试用例 + WorkerCert mock |

## 完成状态

✅ **功能完整实现**
- 后端 API 端点实现
- 业务逻辑完整
- 测试覆盖完善
- 前端集成就绪

**现在临工可以正常报名，报名信息会同步到数据库中。**
