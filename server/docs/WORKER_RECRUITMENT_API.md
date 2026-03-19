# 临工招工流程 API 文档

## 基础信息

- **基础 URL**: `http://localhost:3000/api`
- **认证**: Bearer Token (JWT)
- **内容类型**: application/json

## 数据模型

### JobApplication 状态

```typescript
type ApplicationStatus =
  | 'pending'      // 待审核
  | 'accepted'     // 已接受
  | 'confirmed'    // 已确认
  | 'working'      // 进行中
  | 'done'         // 已完成
  | 'rejected'     // 已拒绝
  | 'released'     // 已释放
  | 'cancelled';   // 已取消
```

### 应用对象

```json
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "supervisorId": null,
  "status": "pending",
  "appliedAt": "2026-03-12T10:00:00Z",
  "acceptedAt": "2026-03-12T11:00:00Z",
  "confirmedAt": null,
  "startedAt": null,
  "completedAt": null,
  "createdAt": "2026-03-12T10:00:00Z",
  "updatedAt": "2026-03-12T10:00:00Z"
}
```

## 企业端 API

### 1. 接受/拒绝应用

**端点**: `POST /jobs/:jobId/applications/:applicationId/accept`

**权限**: 企业用户（必须是招工发布者）

**请求体**:
```json
{
  "action": "accepted"
}
```

**参数说明**:
| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| action | string | ✓ | 'accepted' 或 'rejected' |

**成功响应** (200):
```json
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "status": "accepted",
  "appliedAt": "2026-03-12T10:00:00Z",
  "acceptedAt": "2026-03-12T11:00:00Z",
  "createdAt": "2026-03-12T10:00:00Z",
  "updatedAt": "2026-03-12T11:00:00Z"
}
```

**错误响应**:
```json
// 403 - 无权操作
{
  "statusCode": 403,
  "message": "无权操作"
}

// 400 - 无效的状态转换
{
  "statusCode": 400,
  "message": "应用状态不符合要求"
}
```

**示例**:
```bash
curl -X POST http://localhost:3000/api/jobs/1/applications/1/accept \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "accepted"}'
```

---

### 2. 选择主管

**端点**: `POST /jobs/:jobId/select-supervisor`

**权限**: 企业用户（必须是招工发布者）

**请求体**:
```json
{
  "workerId": 2
}
```

**参数说明**:
| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| workerId | number | ✓ | 工人 ID |

**资格要求**:
- 信用分 (creditScore) >= 95
- 订单数 (totalOrders) >= 10

**成功响应** (200):
```json
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "supervisorId": 2,
  "status": "confirmed",
  "appliedAt": "2026-03-12T10:00:00Z",
  "acceptedAt": "2026-03-12T11:00:00Z",
  "confirmedAt": "2026-03-12T12:00:00Z",
  "createdAt": "2026-03-12T10:00:00Z",
  "updatedAt": "2026-03-12T12:00:00Z"
}
```

**错误响应**:
```json
// 403 - 无权操作
{
  "statusCode": 403,
  "message": "无权操作"
}

// 400 - 资格不符
{
  "statusCode": 400,
  "message": "工人资格不符：信用分需≥95，订单数需≥10"
}

// 400 - 应用不存在或状态不对
{
  "statusCode": 400,
  "message": "应用不存在或状态不符合要求"
}
```

**示例**:
```bash
curl -X POST http://localhost:3000/api/jobs/1/select-supervisor \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"workerId": 2}'
```

---

### 3. 查询应用列表

**端点**: `GET /jobs/:jobId/applications`

**权限**: 企业用户（必须是招工发布者）

**查询参数**: 无

**成功响应** (200):
```json
{
  "pending": [
    {
      "id": 1,
      "workerId": 2,
      "workerName": "张三",
      "workerPhone": "13800138000",
      "workerAvatar": "https://...",
      "creditScore": 95,
      "totalOrders": 10,
      "status": "pending",
      "appliedAt": "2026-03-12T10:00:00Z"
    }
  ],
  "accepted": [
    {
      "id": 2,
      "workerId": 3,
      "workerName": "李四",
      "workerPhone": "13800138001",
      "workerAvatar": "https://...",
      "creditScore": 98,
      "totalOrders": 15,
      "status": "accepted",
      "appliedAt": "2026-03-12T10:00:00Z",
      "acceptedAt": "2026-03-12T11:00:00Z"
    }
  ],
  "confirmed": [],
  "working": [],
  "done": [],
  "rejected": [],
  "released": [],
  "cancelled": []
}
```

**错误响应**:
```json
// 403 - 无权操作
{
  "statusCode": 403,
  "message": "无权操作"
}

// 404 - 招工不存在
{
  "statusCode": 404,
  "message": "招工信息不存在"
}
```

**示例**:
```bash
curl -X GET http://localhost:3000/api/jobs/1/applications \
  -H "Authorization: Bearer <token>"
```

---

## 工人端 API

### 1. 确认出勤

**端点**: `POST /applications/:applicationId/confirm-attendance`

**权限**: 工人用户（必须是应用的申请者）

**请求体**:
```json
{}
```

**成功响应** (200):
```json
{
  "id": 1,
  "jobId": 1,
  "workerId": 2,
  "status": "confirmed",
  "appliedAt": "2026-03-12T10:00:00Z",
  "acceptedAt": "2026-03-12T11:00:00Z",
  "confirmedAt": "2026-03-12T12:00:00Z",
  "createdAt": "2026-03-12T10:00:00Z",
  "updatedAt": "2026-03-12T12:00:00Z"
}
```

**错误响应**:
```json
// 403 - 无权操作
{
  "statusCode": 403,
  "message": "无权操作"
}

// 400 - 应用状态不符合要求
{
  "statusCode": 400,
  "message": "应用状态不符合要求"
}

// 404 - 应用不存在
{
  "statusCode": 404,
  "message": "应用不存在"
}
```

**示例**:
```bash
curl -X POST http://localhost:3000/api/applications/1/confirm-attendance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 2. 查询我的应用

**端点**: `GET /applications/my-applications`

**权限**: 工人用户

**查询参数**: 无

**成功响应** (200):
```json
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
      "workHours": "08:00-17:00",
      "companyName": "搬家公司",
      "status": "pending",
      "appliedAt": "2026-03-12T10:00:00Z"
    }
  ],
  "accepted": [
    {
      "id": 2,
      "jobId": 2,
      "jobTitle": "装修工",
      "salary": 200,
      "salaryUnit": "元/时",
      "location": "东莞·南城",
      "dateRange": "2026-03-20~2026-03-25",
      "workHours": "09:00-18:00",
      "companyName": "装修公司",
      "status": "accepted",
      "appliedAt": "2026-03-12T10:00:00Z",
      "acceptedAt": "2026-03-12T11:00:00Z"
    }
  ],
  "confirmed": [],
  "working": [],
  "done": [],
  "rejected": [],
  "released": [],
  "cancelled": []
}
```

**错误响应**:
```json
// 401 - 未认证
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**示例**:
```bash
curl -X GET http://localhost:3000/api/applications/my-applications \
  -H "Authorization: Bearer <token>"
```

---

## 状态转换流程

### 正常流程

```
pending (工人申请)
   ↓
accepted (企业接受)
   ↓
confirmed (企业选择主管)
   ↓
working (自动转换 - 工作开始日期到达)
   ↓
done (工作完成)
```

### 异常流程

```
pending (工人申请)
   ↓
rejected (企业拒绝)
   ↓
[结束]

pending/accepted (工人未确认)
   ↓
released (自动释放 - 距离工作开始 < 12小时)
   ↓
[结束]
```

---

## 自动化任务

### 1. 释放未确认应用

**触发时间**: 每小时执行

**条件**:
- 应用状态 = 'accepted'
- 距离工作开始时间 < 12小时
- 工人未确认出勤

**动作**:
- 状态变更为 'released'

**日志**:
```
[Scheduler] Releasing unconfirmed applications...
[Scheduler] Released application #1 for job #1
```

---

### 2. 开始工作

**触发时间**: 每小时执行

**条件**:
- 应用状态 = 'confirmed'
- 工作开始日期 = 今天

**动作**:
- 状态变更为 'working'

**日志**:
```
[Scheduler] Starting work for confirmed applications...
[Scheduler] Started work for application #1 on job #1
```

---

## 错误处理

### 常见错误码

| 状态码 | 错误信息 | 原因 |
|--------|---------|------|
| 400 | 应用状态不符合要求 | 状态转换无效 |
| 400 | 工人资格不符 | 信用分或订单数不足 |
| 400 | 应用不存在或状态不符合要求 | 应用不存在或状态错误 |
| 403 | 无权操作 | 用户权限不足 |
| 404 | 应用不存在 | 应用 ID 不存在 |
| 404 | 招工信息不存在 | 招工 ID 不存在 |
| 401 | Unauthorized | 未提供有效的认证令牌 |

---

## 使用示例

### 完整工作流程

```bash
# 1. 企业发布招工
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer <enterprise-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "搬家工",
    "salary": 150,
    "salaryUnit": "元/时",
    "needCount": 5,
    "location": "东莞·长安",
    "dateStart": "2026-03-15",
    "dateEnd": "2026-03-20",
    "contactName": "李四",
    "contactPhone": "13800138000"
  }'
# 返回: { "id": 1, ... }

# 2. 工人申请
curl -X POST http://localhost:3000/api/jobs/1/apply \
  -H "Authorization: Bearer <worker-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
# 返回: { "id": 1, "status": "pending", ... }

# 3. 企业查看应用
curl -X GET http://localhost:3000/api/jobs/1/applications \
  -H "Authorization: Bearer <enterprise-token>"
# 返回: { "pending": [...], "accepted": [], ... }

# 4. 企业接受应用
curl -X POST http://localhost:3000/api/jobs/1/applications/1/accept \
  -H "Authorization: Bearer <enterprise-token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "accepted"}'
# 返回: { "id": 1, "status": "accepted", ... }

# 5. 企业选择主管
curl -X POST http://localhost:3000/api/jobs/1/select-supervisor \
  -H "Authorization: Bearer <enterprise-token>" \
  -H "Content-Type: application/json" \
  -d '{"workerId": 2}'
# 返回: { "id": 1, "status": "confirmed", "supervisorId": 2, ... }

# 6. 工人确认出勤
curl -X POST http://localhost:3000/api/applications/1/confirm-attendance \
  -H "Authorization: Bearer <worker-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
# 返回: { "id": 1, "status": "confirmed", ... }

# 7. 工人查看我的应用
curl -X GET http://localhost:3000/api/applications/my-applications \
  -H "Authorization: Bearer <worker-token>"
# 返回: { "pending": [], "accepted": [], "confirmed": [...], ... }

# 8. 等待工作开始（自动转换）
# 当工作开始日期到达时，调度任务会自动将状态改为 'working'

# 9. 查看最新状态
curl -X GET http://localhost:3000/api/applications/my-applications \
  -H "Authorization: Bearer <worker-token>"
# 返回: { "pending": [], "accepted": [], "confirmed": [], "working": [...], ... }
```

---

## 相关文档

- [测试指南](./WORKER_RECRUITMENT_TESTING_GUIDE.md)
- [测试最佳实践](./TESTING_BEST_PRACTICES.md)
- [E2E 测试文档](./E2E_TESTING.md)
