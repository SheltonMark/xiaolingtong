# 应聘者管理 API 文档

## 概述

应聘者管理 API 提供企业端查看、接受和拒绝工作应聘者的功能。

## API 端点

### 1. 获取工作的应聘者列表

**端点**: `GET /jobs/:jobId/applications`

**权限**: 企业端（@Roles('enterprise')）

**参数**:
- `jobId` (path) - 工作 ID

**请求示例**:
```bash
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer <token>"
```

**响应示例** (200 OK):
```json
{
  "list": [
    {
      "id": 1,
      "jobId": 1,
      "workerId": 2,
      "status": "pending",
      "appliedAt": "2026-03-13T10:30:00Z",
      "worker": {
        "id": 2,
        "name": "张三",
        "creditScore": 95,
        "completedJobs": 10,
        "averageRating": 4.5
      }
    },
    {
      "id": 2,
      "jobId": 1,
      "workerId": 3,
      "status": "pending",
      "appliedAt": "2026-03-13T10:35:00Z",
      "worker": {
        "id": 3,
        "name": "李四",
        "creditScore": 90,
        "completedJobs": 8,
        "averageRating": 4.0
      }
    }
  ]
}
```

**错误响应**:
- 400 Bad Request - 招工信息不存在
- 403 Forbidden - 无权查看（不是工作所有者）

---

### 2. 接受应聘者

**端点**: `POST /jobs/:jobId/applications/:appId/accept`

**权限**: 企业端（@Roles('enterprise')）

**参数**:
- `jobId` (path) - 工作 ID
- `appId` (path) - 应聘记录 ID

**请求示例**:
```bash
curl -X POST http://localhost:3000/jobs/1/applications/1/accept \
  -H "Authorization: Bearer <token>"
```

**响应示例** (200 OK):
```json
{
  "id": 1,
  "status": "accepted",
  "acceptedAt": "2026-03-13T10:40:00Z"
}
```

**错误响应**:
- 400 Bad Request - 招工信息不存在 / 应聘记录不存在 / 只能接受待审核的应聘者
- 403 Forbidden - 无权操作（不是工作所有者）

---

### 3. 拒绝应聘者

**端点**: `POST /jobs/:jobId/applications/:appId/reject`

**权限**: 企业端（@Roles('enterprise')）

**参数**:
- `jobId` (path) - 工作 ID
- `appId` (path) - 应聘记录 ID

**请求示例**:
```bash
curl -X POST http://localhost:3000/jobs/1/applications/1/reject \
  -H "Authorization: Bearer <token>"
```

**响应示例** (200 OK):
```json
{
  "id": 1,
  "status": "rejected",
  "rejectedAt": "2026-03-13T10:42:00Z"
}
```

**错误响应**:
- 400 Bad Request - 招工信息不存在 / 应聘记录不存在 / 只能拒绝待审核的应聘者
- 403 Forbidden - 无权操作（不是工作所有者）

---

## 应聘者状态

| 状态 | 说明 | 可操作 |
|------|------|--------|
| pending | 待审核 | ✅ 可接受或拒绝 |
| accepted | 已接受 | ❌ 不可操作 |
| confirmed | 已确认 | ❌ 不可操作 |
| rejected | 已拒绝 | ❌ 不可操作 |
| cancelled | 已取消 | ❌ 不可操作 |
| working | 进行中 | ❌ 不可操作 |
| done | 已完成 | ❌ 不可操作 |

---

## 应聘者信息字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 应聘记录 ID |
| jobId | number | 工作 ID |
| workerId | number | 工人 ID |
| status | string | 应聘状态 |
| appliedAt | string | 应聘时间 (ISO 8601) |
| worker.id | number | 工人 ID |
| worker.name | string | 工人姓名 |
| worker.creditScore | number | 工人信用分 (0-100) |
| worker.completedJobs | number | 工人完成的工作数 |
| worker.averageRating | number | 工人平均评分 (0-5) |

---

## 权限验证

### 企业端权限检查

1. **工作所有者验证**: 只有工作的创建者（企业）可以接受/拒绝应聘者
2. **应聘状态验证**: 只有待审核状态的应聘者可以被接受或拒绝
3. **应聘记录验证**: 应聘记录必须属于指定的工作

### 错误处理

- 如果用户不是工作所有者，返回 403 Forbidden
- 如果应聘者不是待审核状态，返回 400 Bad Request
- 如果应聘记录不存在，返回 400 Bad Request

---

## 使用流程

### 企业端工作流程

1. **查看应聘者列表**
   ```
   GET /jobs/:jobId/applications
   ```
   获取该工作的所有应聘者

2. **接受应聘者**
   ```
   POST /jobs/:jobId/applications/:appId/accept
   ```
   应聘者状态变为 "accepted"，等待工人确认出勤

3. **拒绝应聘者**
   ```
   POST /jobs/:jobId/applications/:appId/reject
   ```
   应聘者状态变为 "rejected"

---

## 测试覆盖

- ✅ 获取应聘者列表 (4 个测试)
- ✅ 接受应聘者 (5 个测试)
- ✅ 拒绝应聘者 (5 个测试)
- ✅ 完整工作流 (2 个测试)
- **总计**: 16 个单元测试，100% 通过

---

## 集成示例

### 前端调用示例

```javascript
// 获取应聘者列表
const getApplications = async (jobId) => {
  const response = await fetch(`/jobs/${jobId}/applications`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// 接受应聘者
const acceptApplication = async (jobId, appId) => {
  const response = await fetch(`/jobs/${jobId}/applications/${appId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// 拒绝应聘者
const rejectApplication = async (jobId, appId) => {
  const response = await fetch(`/jobs/${jobId}/applications/${appId}/reject`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 实现日期

2026-03-13

## 提交信息

`feat: 实现应聘者管理 API 端点 - 获取列表、接受、拒绝`

## 相关文件

- `server/src/modules/application/application.controller.ts` - API 端点
- `server/src/modules/application/application.service.ts` - 业务逻辑
- `server/src/modules/application/application-management.spec.ts` - 单元测试
- `pages/job-detail/job-detail.js` - 前端实现
- `pages/job-detail/job-detail.wxml` - 前端 UI
- `pages/job-detail/job-detail.wxss` - 前端样式
