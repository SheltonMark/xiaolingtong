# 招工模块状态交换分析 - 脑暴报告

## 设计文档要求

### 状态映射表（来自 2026-03-12 设计方案）
```
后端状态 | 临工端显示 | 企业端显示 | 说明
---------|----------|----------|------
pending  | 待确认   | 待审核   | 企业还未审核
accepted | 待确认   | 已接受   | 企业已接受，待临工确认
confirmed| 已入选   | 已确认   | 双方都已确认
working  | 进行中   | 进行中   | 工作正在进行
done     | 已完成   | 已完成   | 工作已完成
rejected | 已拒绝   | 已拒绝   | 企业拒绝（异常显示）
released | 已释放   | 已释放   | 未及时确认（异常显示）
cancelled| 已取消   | 已取消   | 主动取消（异常显示）
```

---

## 代码实现分析

### 1. 后端状态机 ✅
**文件**: `job-state-machine.ts`

```typescript
TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['working', 'released', 'cancelled'],
  working: ['done', 'cancelled'],
  done: [],
  rejected: [],
  released: [],
  cancelled: [],
}
```

**状态转换流程**:
```
pending → accepted → confirmed → working → done
   ↓         ↓          ↓          ↓
rejected  rejected   released   cancelled
   ↓         ↓          ↓
cancelled cancelled  cancelled
```

**评估**: ✅ 状态机定义正确

---

### 2. 临工端状态显示 ⚠️
**文件**: `pages/my-applications/my-applications.js`

```javascript
const statusMap = {
  pending: { text: '待确认', bg: 'amber', tabKey: '待确认' },
  accepted: { text: '已入选', bg: 'green', tabKey: '已入选' },
  confirmed: { text: '进行中', bg: 'green', tabKey: '进行中' },
  completed: { text: '已完成', bg: 'gray', tabKey: '已完成' },
  rejected: { text: '未通过', bg: 'rose', tabKey: '待确认' },
  cancelled: { text: '已取消', bg: 'gray', tabKey: '待确认' }
}
```

**问题发现**:

| 后端状态 | 设计要求 | 代码实现 | 状态 |
|---------|---------|---------|------|
| pending | 待确认 | 待确认 | ✅ |
| accepted | 待确认 | **已入选** | ❌ |
| confirmed | 已入选 | 进行中 | ❌ |
| working | 进行中 | (缺失) | ❌ |
| done | 已完成 | (缺失) | ❌ |
| rejected | 已拒绝 | 未通过 | ⚠️ |
| released | 已释放 | (缺失) | ❌ |
| cancelled | 已取消 | 已取消 | ✅ |

**具体问题**:
1. ❌ `accepted` 状态显示为"已入选"，应该显示"待确认"
2. ❌ `confirmed` 状态显示为"进行中"，应该显示"已入选"
3. ❌ 缺少 `working` 状态的映射
4. ❌ 缺少 `done` 状态的映射（使用了 `completed` 代替）
5. ❌ 缺少 `released` 状态的映射
6. ⚠️ `rejected` 显示为"未通过"，应该显示"已拒绝"

---

### 3. 企业端状态显示 ✅
**文件**: `pages/job-applications/job-applications.js`

```javascript
// 后端返回分组数据
const pending = (data.pending || [])
const accepted = (data.accepted || [])
const confirmed = (data.confirmed || [])
const rejected = (data.rejected || [])
const released = (data.released || [])
const cancelled = (data.cancelled || [])
const working = (data.working || [])
const done = (data.done || [])
```

**评估**: ✅ 企业端正确处理了所有状态

---

### 4. 后端状态转换逻辑 ✅
**文件**: `job.service.ts`

#### acceptApplication 方法
```typescript
async acceptApplication(applicationId, action, userId) {
  // 检查状态是否为 pending
  if (application.status !== 'pending') {
    throw new BadRequestException('Application is not in pending status');
  }
  // 转换到 accepted 或 rejected
  return this.updateApplicationStatus(applicationId, action, userId);
}
```

**评估**: ✅ 逻辑正确

#### confirmAttendance 方法
```typescript
async confirmAttendance(applicationId, workerId) {
  // 检查状态是否为 accepted
  if (application.status !== 'accepted') {
    throw new NotFoundException('Application not found or not in accepted status');
  }
  // 转换到 confirmed
  application.status = 'confirmed';
}
```

**评估**: ✅ 逻辑正确

---

## 问题汇总

### 🔴 严重问题（影响用户体验）

#### 问题 1: 临工端状态显示错误
**现象**: 临工看到的状态与设计不符
**影响**: 临工无法正确理解自己的报名状态

**错误映射**:
- `accepted` → 显示"已入选"，应该"待确认"
- `confirmed` → 显示"进行中"，应该"已入选"

**原因**: 前端状态映射表与设计文档不一致

#### 问题 2: 缺少状态映射
**现象**: 某些状态没有对应的显示文本
**影响**: 如果出现这些状态，前端无法正确显示

**缺失状态**:
- `working` - 应该显示"进行中"
- `done` - 应该显示"已完成"（代码用了 `completed`）
- `released` - 应该显示"已释放"

#### 问题 3: 状态名称不一致
**现象**: 后端使用 `done`，前端期望 `completed`
**影响**: 状态转换时可能出现不匹配

---

### 🟡 中等问题（逻辑不清）

#### 问题 4: 临工端状态分类不完整
**现象**: 前端 tabs 只有 5 个，但后端有 8 个状态
```javascript
tabs: ['全部', '待确认', '已入选', '进行中', '已完成']
```

**缺失分类**:
- 异常状态（已拒绝、已释放、已取消）没有单独分类

**设计要求**: 异常状态应该单独显示

---

### 🟢 轻微问题（命名不规范）

#### 问题 5: 状态名称翻译不一致
- `rejected` → "未通过" vs 设计要求"已拒绝"
- `released` → 缺失 vs 设计要求"已释放"

---

## 三方状态交换流程分析

### 正常流程 ✅
```
临工报名
  ↓
后端创建: status = 'pending'
  ↓
企业端看到: pending (待审核)
临工端看到: pending (待确认) ✅
  ↓
企业接受
  ↓
后端更新: status = 'accepted'
  ↓
企业端看到: accepted (已接受) ✅
临工端看到: accepted (应该"待确认"，实际"已入选") ❌
  ↓
临工确认出勤
  ↓
后端更新: status = 'confirmed'
  ↓
企业端看到: confirmed (已确认) ✅
临工端看到: confirmed (应该"已入选"，实际"进行中") ❌
  ↓
工作开始
  ↓
后端更新: status = 'working'
  ↓
企业端看到: working (进行中) ✅
临工端看到: working (缺失映射) ❌
  ↓
工作完成
  ↓
后端更新: status = 'done'
  ↓
企业端看到: done (已完成) ✅
临工端看到: done (缺失映射，代码用 completed) ❌
```

### 主管选择流程 ⚠️
```
企业选择主管
  ↓
后端更新: status = 'confirmed', isSupervisor = true
  ↓
主管端看到: confirmed (进行中) ✅
临工端看到: confirmed (应该"已入选"，实际"进行中") ❌
```

---

## 根本原因分析

### 原因 1: 前端状态映射表过时
- 设计文档定义了 8 个状态
- 前端只映射了 6 个状态
- 映射关系与设计不符

### 原因 2: 后端状态名称不一致
- 后端使用 `done`
- 前端期望 `completed`
- 导致状态无法正确显示

### 原因 3: 前端 tabs 分类不完整
- 设计要求异常状态单独显示
- 前端没有实现异常状态分类

### 原因 4: 缺少状态转换测试
- 没有测试临工端的状态显示
- 没有测试三方状态同步

---

## 修复方案

### 🔴 必须修复（影响功能）

#### 修复 1: 更新临工端状态映射表
```javascript
const statusMap = {
  pending: { text: '待确认', bg: 'amber', tabKey: '待确认' },
  accepted: { text: '待确认', bg: 'amber', tabKey: '待确认' },  // 改为"待确认"
  confirmed: { text: '已入选', bg: 'green', tabKey: '已入选' },  // 改为"已入选"
  working: { text: '进行中', bg: 'green', tabKey: '进行中' },    // 新增
  done: { text: '已完成', bg: 'gray', tabKey: '已完成' },        // 改为 done
  rejected: { text: '已拒绝', bg: 'rose', tabKey: '异常' },      // 改为"已拒绝"
  released: { text: '已释放', bg: 'rose', tabKey: '异常' },      // 新增
  cancelled: { text: '已取消', bg: 'gray', tabKey: '异常' }      // 改为"异常"
}
```

#### 修复 2: 添加异常状态分类
```javascript
tabs: ['全部', '待确认', '已入选', '进行中', '已完成', '异常']
```

#### 修复 3: 统一后端状态名称
- 确保后端使用 `done` 而不是 `completed`
- 或在前端统一转换

### 🟡 应该修复（完整性）

#### 修复 4: 添加状态转换测试
- 测试临工端状态显示
- 测试企业端状态显示
- 测试三方状态同步

#### 修复 5: 添加主管状态显示
- 主管端应该看到自己的状态
- 主管端应该看到临工的状态

---

## 测试验证清单

- [ ] 临工报名后，临工端显示"待确认"
- [ ] 企业接受后，临工端显示"待确认"，企业端显示"已接受"
- [ ] 临工确认后，临工端显示"已入选"，企业端显示"已确认"
- [ ] 工作开始后，临工端显示"进行中"，企业端显示"进行中"
- [ ] 工作完成后，临工端显示"已完成"，企业端显示"已完成"
- [ ] 企业拒绝后，临工端显示"已拒绝"，企业端显示"已拒绝"
- [ ] 未及时确认后，临工端显示"已释放"，企业端显示"已释放"
- [ ] 临工取消后，临工端显示"已取消"，企业端显示"已取消"
- [ ] 异常状态单独分类显示
- [ ] 主管端能看到正确的状态

---

## 优先级

| 优先级 | 问题 | 工作量 |
|------|------|------|
| 🔴 高 | 临工端状态映射错误 | 小 |
| 🔴 高 | 缺少状态映射 | 小 |
| 🟡 中 | 异常状态分类 | 中 |
| 🟡 中 | 状态转换测试 | 中 |
| 🟢 低 | 主管状态显示 | 大 |

---

## 总结

**状态交换现状**: ⚠️ 部分正常，部分有问题

**关键问题**:
1. ❌ 临工端状态映射与设计不符
2. ❌ 缺少某些状态的映射
3. ⚠️ 异常状态分类不完整
4. ⚠️ 缺少状态转换测试

**影响范围**:
- 临工无法正确理解自己的报名状态
- 可能导致临工操作错误
- 用户体验下降

**建议**:
1. 立即修复临工端状态映射表
2. 添加缺失的状态映射
3. 实现异常状态分类
4. 添加状态转换测试
