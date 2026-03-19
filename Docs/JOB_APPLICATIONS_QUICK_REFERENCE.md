# 招工详情管理 - 快速参考

## 页面路径
```
我的 → 工资结算 → 招工管理 → 点击招工项目 → 招工详情管理
```

## 页面文件
- **路径**: `pages/job-applications/`
- **文件**: `job-applications.wxml|js|wxss|json`

## 核心功能

### 1. 查看招工信息
- 招工标题、状态、工价、人数、日期

### 2. 查看报名者列表
按状态分类：
- **待审核** - 可接受/拒绝
- **已接受** - 等待报名者确认
- **已确认** - 已入选，可进行后续操作
- **已拒绝** - 已拒绝的报名

### 3. 接受/拒绝报名
- 点击按钮 → 确认对话框 → 操作完成
- 页面自动刷新，报名者移到对应分组

## 后端 API

### 获取报名者列表
```
GET /jobs/:jobId/applications
```

### 接受/拒绝报名
```
POST /jobs/:jobId/applications/:applicationId/accept
Body: { action: "accepted" | "rejected" }
```

## 权限
- 只有招工发布者（企业）可以操作
- 只有待审核状态可以接受/拒绝

## 状态流转
```
pending → accepted → confirmed
       → rejected
```

## 报名者信息
- 姓名
- 信用分（0-100）
- 订单数（完成的工作数）

## 相关页面
- 招工管理列表: `pages/settlement/settlement`
- 招工详情（临工视角）: `pages/job-detail/job-detail`
- 我的报名（临工视角）: `pages/my-applications/my-applications`
