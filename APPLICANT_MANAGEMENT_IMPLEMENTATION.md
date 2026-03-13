# 应聘者管理功能实现

## 问题分析

**原问题**: 工资结算中的招工管理显示已报名的应聘者，但企业端没有接受或拒绝按钮。

**根本原因**: 工作详情页面没有为企业端实现应聘者列表和操作按钮。

## 解决方案

在工作详情页（`job-detail`）中为企业端添加完整的应聘者管理功能。

## 实现内容

### 1. 后端 API 端点（需要实现）

```
GET /jobs/:jobId/applications - 获取工作的应聘者列表
POST /jobs/:jobId/applications/:appId/accept - 接受应聘者
POST /jobs/:jobId/applications/:appId/reject - 拒绝应聘者
```

### 2. 前端修改

#### 文件: `pages/job-detail/job-detail.js`

**新增数据字段**:
- `applications` - 应聘者列表
- `showApplications` - 是否显示应聘者列表
- `applicationsLoading` - 加载状态

**新增方法**:
- `loadApplications(jobId)` - 加载应聘者列表
- `getApplicationStatusText(status)` - 获取状态文本
- `getApplicationStatusColor(status)` - 获取状态颜色
- `onAcceptApplication(e)` - 接受应聘者
- `onRejectApplication(e)` - 拒绝应聘者

**修改方法**:
- `onLoad()` - 加载时检查用户角色，企业端加载应聘者列表
- `onShow()` - 显示时重新加载应聘者列表

#### 文件: `pages/job-detail/job-detail.wxml`

**新增 UI 部分**:
- 应聘者列表卡片（仅企业端可见）
- 应聘者信息展示（姓名、信用分、完成工作数、平均评分）
- 接受/拒绝按钮（仅待审核状态显示）

#### 文件: `pages/job-detail/job-detail.wxss`

**新增样式**:
- `.applications-list` - 应聘者列表容器
- `.app-item` - 应聘者卡片
- `.app-header` - 应聘者头部（姓名、状态、时间）
- `.app-details` - 应聘者详情
- `.app-actions` - 操作按钮
- `.app-btn` - 按钮样式
- `.status-tag` - 状态标签

## 功能流程

### 企业端工作流程

1. **查看工作详情**
   - 企业用户打开工作详情页
   - 系统自动加载该工作的应聘者列表

2. **查看应聘者信息**
   - 显示应聘者的基本信息（姓名、信用分、完成工作数、平均评分）
   - 显示应聘时间和当前状态

3. **接受应聘者**
   - 点击"接受"按钮
   - 系统确认后调用 API 接受应聘者
   - 应聘者状态变为"已接受"
   - 列表自动刷新

4. **拒绝应聘者**
   - 点击"拒绝"按钮
   - 系统确认后调用 API 拒绝应聘者
   - 应聘者状态变为"已拒绝"
   - 列表自动刷新

## 应聘者状态

| 状态 | 文本 | 颜色 | 说明 |
|------|------|------|------|
| pending | 待审核 | amber | 初始状态，可接受或拒绝 |
| accepted | 已接受 | green | 企业已接受，等待工人确认 |
| confirmed | 已确认 | green | 工人已确认出勤 |
| rejected | 已拒绝 | red | 企业已拒绝 |
| cancelled | 已取消 | gray | 工人已取消 |
| working | 进行中 | blue | 工作进行中 |
| done | 已完成 | gray | 工作已完成 |

## 后端实现要求

### 1. 获取应聘者列表 API

```typescript
GET /jobs/:jobId/applications

Response:
{
  "data": {
    "list": [
      {
        "id": 1,
        "jobId": 1,
        "worker": {
          "id": 2,
          "name": "张三",
          "creditScore": 95,
          "completedJobs": 10,
          "averageRating": 4.5
        },
        "status": "pending",
        "appliedAt": "2026-03-13 10:30"
      }
    ]
  }
}
```

### 2. 接受应聘者 API

```typescript
POST /jobs/:jobId/applications/:appId/accept

Response:
{
  "data": {
    "id": 1,
    "status": "accepted",
    "acceptedAt": "2026-03-13 10:35"
  }
}
```

### 3. 拒绝应聘者 API

```typescript
POST /jobs/:jobId/applications/:appId/reject

Response:
{
  "data": {
    "id": 1,
    "status": "rejected",
    "rejectedAt": "2026-03-13 10:35"
  }
}
```

## 权限验证

- 只有工作的所有者（企业）可以接受/拒绝应聘者
- 只有待审核状态的应聘者可以被接受/拒绝
- 工人端不显示应聘者列表和操作按钮

## 测试场景

1. **企业端查看应聘者列表**
   - 打开工作详情页
   - 验证应聘者列表正确显示
   - 验证应聘者信息完整

2. **接受应聘者**
   - 点击接受按钮
   - 验证确认对话框显示
   - 验证状态更新为"已接受"
   - 验证列表自动刷新

3. **拒绝应聘者**
   - 点击拒绝按钮
   - 验证确认对话框显示
   - 验证状态更新为"已拒绝"
   - 验证列表自动刷新

4. **工人端不显示应聘者列表**
   - 以工人身份打开工作详情页
   - 验证不显示应聘者列表

## 下一步

1. **实现后端 API 端点**
   - 在 `ApplicationController` 中添加上述三个端点
   - 实现权限验证和业务逻辑

2. **测试**
   - 单元测试
   - 集成测试
   - E2E 测试

3. **优化**
   - 添加搜索和过滤功能
   - 添加批量操作
   - 添加应聘者评分和备注

## 文件修改清单

- ✅ `pages/job-detail/job-detail.js` - 添加应聘者管理逻辑
- ✅ `pages/job-detail/job-detail.wxml` - 添加应聘者列表 UI
- ✅ `pages/job-detail/job-detail.wxss` - 添加应聘者列表样式
- ⏳ `server/src/modules/application/application.controller.ts` - 需要实现 API 端点
- ⏳ `server/src/modules/application/application.service.ts` - 需要实现业务逻辑

## 完成日期

2026-03-13
