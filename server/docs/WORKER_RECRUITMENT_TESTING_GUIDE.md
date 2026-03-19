# 临工招工流程测试指南

## 概述

本文档描述如何测试临工招工流程（Worker Recruitment Flow）的实现。该功能包括：
- 招工应用状态管理（8个状态）
- 企业端应用审核流程
- 工人端应用确认流程
- 自动化工作流调度

## 测试覆盖范围

### 1. 单元测试 (41个测试)

#### 1.1 状态机测试 (job.service.spec.ts)
```bash
npm test -- job.service.spec.ts
```

**测试内容**:
- 应用创建和初始状态
- 企业端接受/拒绝应用
- 主管选择和资格验证
- 工人端确认出勤
- 应用分组查询

**关键测试用例**:
```typescript
// 企业接受应用
POST /jobs/:jobId/applications/:applicationId/accept
Body: { action: 'accepted' }
Expected: status = 'accepted'

// 企业拒绝应用
POST /jobs/:jobId/applications/:applicationId/accept
Body: { action: 'rejected' }
Expected: status = 'rejected'

// 选择主管（需要资格验证）
POST /jobs/:jobId/select-supervisor
Body: { workerId: 123 }
Validation: creditScore >= 95 && totalOrders >= 10

// 工人确认出勤
POST /applications/:applicationId/confirm-attendance
Expected: status = 'confirmed'
```

#### 1.2 控制器测试 (job.controller.spec.ts)
```bash
npm test -- job.controller.spec.ts
```

**测试内容**:
- 权限验证（企业/工人角色）
- 请求参数验证
- 响应格式验证
- 错误处理

#### 1.3 集成测试 (job.integration.spec.ts)
```bash
npm test -- job.integration.spec.ts
```

**测试内容**:
- 数据库操作
- 事务处理
- 关联数据查询

### 2. 运行所有测试

```bash
# 运行所有job模块测试
cd server
npm test -- job

# 运行所有测试（包括其他模块）
npm test

# 生成覆盖率报告
npm test -- --coverage
```

**预期结果**:
```
Test Suites: 3 passed, 3 total
Tests:       41 passed, 41 total
Time:        ~3.5s
```

## API 端点测试

### 2.1 企业端 API

#### 接受/拒绝应用
```bash
POST /api/jobs/:jobId/applications/:applicationId/accept
Authorization: Bearer <enterprise-token>
Content-Type: application/json

{
  "action": "accepted"  // 或 "rejected"
}

# 成功响应 (200)
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "status": "accepted",
  "createdAt": "2026-03-12T10:00:00Z"
}

# 错误响应 (403)
{
  "statusCode": 403,
  "message": "无权操作"
}
```

#### 选择主管
```bash
POST /api/jobs/:jobId/select-supervisor
Authorization: Bearer <enterprise-token>
Content-Type: application/json

{
  "workerId": 2
}

# 成功响应 (200)
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "status": "confirmed",
  "supervisorId": 2,
  "createdAt": "2026-03-12T10:00:00Z"
}

# 错误响应 (400) - 资格不符
{
  "statusCode": 400,
  "message": "工人资格不符：信用分需≥95，订单数需≥10"
}
```

#### 查询应用列表
```bash
GET /api/jobs/:jobId/applications
Authorization: Bearer <enterprise-token>

# 成功响应 (200)
{
  "pending": [
    {
      "id": 1,
      "workerId": 2,
      "workerName": "张三",
      "workerPhone": "13800138000",
      "status": "pending",
      "appliedAt": "2026-03-12T10:00:00Z"
    }
  ],
  "accepted": [...],
  "confirmed": [...],
  "working": [...],
  "done": [...],
  "rejected": [...],
  "released": [...],
  "cancelled": [...]
}
```

### 2.2 工人端 API

#### 确认出勤
```bash
POST /api/applications/:applicationId/confirm-attendance
Authorization: Bearer <worker-token>
Content-Type: application/json

{}

# 成功响应 (200)
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "status": "confirmed",
  "createdAt": "2026-03-12T10:00:00Z"
}

# 错误响应 (400) - 状态不对
{
  "statusCode": 400,
  "message": "应用状态不符合要求"
}
```

#### 查询我的应用
```bash
GET /api/applications/my-applications
Authorization: Bearer <worker-token>

# 成功响应 (200)
{
  "pending": [
    {
      "id": 1,
      "jobId": 1,
      "jobTitle": "搬家工",
      "salary": 150,
      "salaryUnit": "元/时",
      "location": "东莞·长安",
      "dateRange": "2026-03-15~2026-03-20",
      "status": "pending",
      "appliedAt": "2026-03-12T10:00:00Z"
    }
  ],
  "accepted": [...],
  "confirmed": [...],
  "working": [...],
  "done": [...],
  "rejected": [...],
  "released": [...],
  "cancelled": [...]
}
```

## 状态机流程测试

### 3.1 完整工作流程

```
工人申请 (pending)
    ↓
企业审核 → 接受 (accepted) 或 拒绝 (rejected)
    ↓
企业选择主管 (confirmed)
    ↓
工作开始 (working) [自动化]
    ↓
工作完成 (done)
```

### 3.2 自动化流程

#### 释放未确认应用 (hourly)
```
条件:
- 应用状态 = 'accepted'
- 距离工作开始 < 12小时
- 工人未确认出勤

动作:
- 状态变更为 'released'
```

#### 开始工作 (hourly)
```
条件:
- 应用状态 = 'confirmed'
- 工作开始日期 = 今天

动作:
- 状态变更为 'working'
```

## 手动测试场景

### 场景 1: 企业发布招工 → 工人申请 → 企业审核 → 工人确认

1. **企业发布招工**
   ```bash
   POST /api/jobs
   {
     "title": "搬家工",
     "salary": 150,
     "salaryUnit": "元/时",
     "needCount": 5,
     "location": "东莞·长安",
     "dateStart": "2026-03-15",
     "dateEnd": "2026-03-20",
     "contactName": "李四",
     "contactPhone": "13800138000"
   }
   ```

2. **工人申请**
   ```bash
   POST /api/jobs/:jobId/apply
   {}
   ```

3. **企业查看应用**
   ```bash
   GET /api/jobs/:jobId/applications
   ```

4. **企业接受应用**
   ```bash
   POST /api/jobs/:jobId/applications/:applicationId/accept
   {
     "action": "accepted"
   }
   ```

5. **企业选择主管**
   ```bash
   POST /api/jobs/:jobId/select-supervisor
   {
     "workerId": <worker-id>
   }
   ```

6. **工人确认出勤**
   ```bash
   POST /api/applications/:applicationId/confirm-attendance
   {}
   ```

7. **验证状态**
   ```bash
   GET /api/applications/my-applications
   # 应该看到应用状态为 'confirmed'
   ```

### 场景 2: 企业拒绝应用

1. **企业拒绝应用**
   ```bash
   POST /api/jobs/:jobId/applications/:applicationId/accept
   {
     "action": "rejected"
   }
   ```

2. **验证状态**
   ```bash
   GET /api/applications/my-applications
   # 应该看到应用状态为 'rejected'
   ```

### 场景 3: 自动释放未确认应用

1. **企业接受应用**
   ```bash
   POST /api/jobs/:jobId/applications/:applicationId/accept
   {
     "action": "accepted"
   }
   ```

2. **等待 12 小时或修改系统时间**

3. **运行调度任务**
   ```bash
   # 调度任务会自动运行，或手动触发
   ```

4. **验证状态**
   ```bash
   GET /api/applications/my-applications
   # 应该看到应用状态为 'released'
   ```

## 权限验证测试

### 4.1 企业端权限

```bash
# ✅ 企业可以接受自己发布的招工的应用
POST /api/jobs/:jobId/applications/:applicationId/accept
Authorization: Bearer <enterprise-token>

# ❌ 企业不能接受其他企业发布的招工的应用
POST /api/jobs/:other-job-id/applications/:applicationId/accept
Authorization: Bearer <enterprise-token>
# 预期: 403 Forbidden

# ❌ 工人不能接受应用
POST /api/jobs/:jobId/applications/:applicationId/accept
Authorization: Bearer <worker-token>
# 预期: 403 Forbidden
```

### 4.2 工人端权限

```bash
# ✅ 工人可以确认自己的应用
POST /api/applications/:applicationId/confirm-attendance
Authorization: Bearer <worker-token>

# ❌ 工人不能确认其他工人的应用
POST /api/applications/:other-application-id/confirm-attendance
Authorization: Bearer <worker-token>
# 预期: 403 Forbidden

# ❌ 企业不能确认应用
POST /api/applications/:applicationId/confirm-attendance
Authorization: Bearer <enterprise-token>
# 预期: 403 Forbidden
```

## 数据验证测试

### 5.1 主管资格验证

```bash
# ✅ 资格符合 (creditScore >= 95, totalOrders >= 10)
POST /api/jobs/:jobId/select-supervisor
{
  "workerId": 2  // creditScore: 95, totalOrders: 10
}
# 预期: 200 OK

# ❌ 信用分不足
POST /api/jobs/:jobId/select-supervisor
{
  "workerId": 3  // creditScore: 90, totalOrders: 10
}
# 预期: 400 Bad Request

# ❌ 订单数不足
POST /api/jobs/:jobId/select-supervisor
{
  "workerId": 4  // creditScore: 95, totalOrders: 5
}
# 预期: 400 Bad Request
```

### 5.2 状态转换验证

```bash
# ✅ 有效转换
pending → accepted → confirmed → working → done

# ❌ 无效转换
pending → working  # 跳过中间状态
# 预期: 400 Bad Request

# ❌ 重复转换
accepted → accepted
# 预期: 400 Bad Request
```

## 性能测试

### 6.1 查询性能

```bash
# 测试大量应用查询
GET /api/jobs/:jobId/applications
# 预期: < 500ms (1000个应用)

GET /api/applications/my-applications
# 预期: < 500ms (100个应用)
```

### 6.2 并发测试

```bash
# 同时多个工人申请
for i in {1..10}; do
  curl -X POST /api/jobs/:jobId/apply \
    -H "Authorization: Bearer <worker-token-$i>"
done
# 预期: 所有请求成功，无数据冲突
```

## 调试技巧

### 7.1 查看数据库状态

```bash
# 查看应用表
SELECT * FROM job_application WHERE job_id = :jobId;

# 查看应用状态分布
SELECT status, COUNT(*) FROM job_application
GROUP BY status;

# 查看特定应用详情
SELECT * FROM job_application WHERE id = :applicationId;
```

### 7.2 查看日志

```bash
# 查看应用接受日志
grep "Application accepted" server/logs/*.log

# 查看主管选择日志
grep "Supervisor selected" server/logs/*.log

# 查看调度任务日志
grep "Scheduler" server/logs/*.log
```

### 7.3 测试调度任务

```bash
# 手动触发释放任务
curl -X POST http://localhost:3000/admin/scheduler/release-unconfirmed

# 手动触发开始工作任务
curl -X POST http://localhost:3000/admin/scheduler/start-work
```

## 常见问题

### Q1: 为什么应用状态没有变更？
**A**: 检查以下几点：
1. 用户权限是否正确（企业/工人）
2. 应用状态是否允许转换
3. 数据库是否正确保存
4. 查看服务器日志获取详细错误信息

### Q2: 主管选择失败，提示资格不符？
**A**: 检查工人的资格：
1. 信用分 (creditScore) >= 95
2. 订单数 (totalOrders) >= 10
3. 在 user 表中查看这两个字段的值

### Q3: 自动化任务没有执行？
**A**: 检查以下几点：
1. NestJS 应用是否正常运行
2. @nestjs/schedule 模块是否正确配置
3. 查看应用日志中的调度任务执行记录
4. 检查系统时间是否正确

### Q4: 如何测试本地开发环境？
**A**:
1. 启动 NestJS 开发服务器：`npm run start:dev`
2. 使用 Postman 或 curl 测试 API
3. 查看实时日志输出
4. 使用数据库工具查看数据变化

## 测试清单

- [ ] 所有单元测试通过 (41/41)
- [ ] 企业接受应用功能正常
- [ ] 企业拒绝应用功能正常
- [ ] 企业选择主管功能正常
- [ ] 主管资格验证正确
- [ ] 工人确认出勤功能正常
- [ ] 工人查询应用列表正常
- [ ] 企业查询应用列表正常
- [ ] 应用状态分组正确
- [ ] 权限验证正确
- [ ] 自动释放任务正常运行
- [ ] 自动开始工作任务正常运行
- [ ] 数据库事务处理正确
- [ ] 错误处理和异常捕获正确
- [ ] 性能满足要求

## 相关文档

- [测试最佳实践](./TESTING_BEST_PRACTICES.md)
- [E2E 测试文档](./E2E_TESTING.md)
- [临工招工流程实现计划](../Docs/plans/2026-03-10-worker-recruitment-flow-implementation.md)
