# 招工详情页面 - 诊断流程图

## 问题现象
```
招工详情界面
    ↓
显示: "已报名2人"
    ↓
但是: 没有显示临工详情信息
    ↓
缺少: 昵称、信用分、订单数、完成度等
```

---

## 代码流程检查

### 前端流程
```
页面加载 (onLoad)
    ↓
调用 loadApplications(jobId)
    ↓
发送 GET /jobs/{jobId}/applications
    ↓
接收响应数据
    ↓
格式化数据 (formatApplication)
    ↓
设置到 data 中
    ↓
模板绑定显示
    ↓
✅ 代码完全正确
```

### 后端流程
```
收到请求 GET /jobs/{jobId}/applications
    ↓
验证权限 (enterprise)
    ↓
查询 job_applications
    ↓
关联 worker 表 (relations: ['worker'])
    ↓
处理数据:
  - 提取 worker 信息
  - 计算 completionRate
  - 计算 isSupervisorCandidate
    ↓
按状态分类
    ↓
返回 JSON
    ↓
✅ 代码完全正确
```

---

## 问题诊断树

```
显示"已报名2人"但没有详情
    │
    ├─ 代码是否正确?
    │   ├─ 后端 API? ✅ 正确
    │   ├─ 后端处理? ✅ 正确
    │   ├─ 前端调用? ✅ 正确
    │   └─ 前端显示? ✅ 正确
    │
    └─ 数据是否正确?
        ├─ 数据库有报名数据?
        │   ├─ 是 → 继续检查
        │   └─ 否 → 问题 1: 没有报名数据
        │
        ├─ Worker 信息完整?
        │   ├─ 是 → 继续检查
        │   └─ 否 → 问题 2: Worker 信息为空
        │
        ├─ API 返回 worker 数据?
        │   ├─ 是 → 继续检查
        │   └─ 否 → 问题 3: API 没有返回数据
        │
        └─ 前端正确接收?
            ├─ 是 → 问题 4: 前端显示逻辑错误
            └─ 否 → 问题 5: 前端没有接收数据
```

---

## 快速诊断决策树

```
第一步: 检查数据库
    │
    ├─ SELECT COUNT(*) FROM job_applications;
    │   ├─ 返回 0 → 问题 1: 没有报名数据
    │   └─ 返回 > 0 → 继续
    │
    └─ 第二步: 检查 Worker 信息
        │
        ├─ SELECT ... LEFT JOIN users ...
        │   ├─ u.id IS NULL → 问题 2: Worker 不存在
        │   ├─ u.nickname IS NULL → 问题 3: Worker 信息不完整
        │   └─ 都有数据 → 继续
        │
        └─ 第三步: 检查 API 响应
            │
            ├─ 打开浏览器 F12
            ├─ 查看网络请求
            │   ├─ 没有 worker 字段 → 问题 4: 后端没有返回
            │   └─ 有 worker 字段 → 继续
            │
            └─ 第四步: 检查前端日志
                │
                ├─ 查看 Console
                │   ├─ 有错误 → 问题 5: 前端错误
                │   ├─ 没有数据 → 问题 6: 前端没有接收
                │   └─ 有数据 → 问题 7: 前端显示逻辑错误
```

---

## 问题映射表

| 问题 | 症状 | 检查方法 | 解决方案 |
|------|------|--------|--------|
| 1 | 没有报名数据 | `SELECT COUNT(*) FROM job_applications;` 返回 0 | 检查报名流程，创建测试数据 |
| 2 | Worker 不存在 | `u.id IS NULL` | 检查 worker_id 关联，修复数据 |
| 3 | Worker 信息不完整 | `u.nickname IS NULL` | 更新 worker 信息 |
| 4 | API 没有返回 worker | 网络请求中没有 worker 字段 | 检查后端代码，查看日志 |
| 5 | 前端有错误 | Console 中有错误信息 | 查看错误信息，修复代码 |
| 6 | 前端没有接收数据 | Console 中没有数据日志 | 检查网络请求，调试前端 |
| 7 | 前端显示逻辑错误 | 有数据但不显示 | 检查模板绑定，调试前端 |

---

## 数据流向图

```
用户操作
    ↓
前端: onLoad(jobId)
    ↓
前端: loadApplications(jobId)
    ↓
前端: GET /jobs/{jobId}/applications
    ↓
后端: getApplicationsForEnterprise(jobId, userId)
    ↓
后端: 查询 job_applications
    ↓
后端: 关联 worker 表
    ↓
后端: 处理数据
    ↓
后端: 返回 JSON
    ↓
前端: 接收响应
    ↓
前端: formatApplication(app)
    ↓
前端: setData({ pendingApps, ... })
    ↓
前端: 模板绑定
    ↓
用户看到: 报名者详情
```

---

## 关键检查点

### 检查点 1: 数据库
```sql
-- 报名数据是否存在
SELECT COUNT(*) FROM job_applications;

-- Worker 信息是否完整
SELECT ja.*, u.nickname, u.credit_score
FROM job_applications ja
LEFT JOIN users u ON ja.worker_id = u.id;
```

### 检查点 2: API 响应
```javascript
// 打开浏览器 F12
// 查看网络请求
// GET /jobs/1/applications
// 响应中是否有 worker 字段?
```

### 检查点 3: 前端日志
```javascript
// 打开浏览器 F12
// 查看 Console 标签
// 是否有错误信息?
// 是否有数据日志?
```

### 检查点 4: 前端显示
```wxml
<!-- 模板中是否正确绑定了数据? -->
<view class="worker-name">{{item.workerName}}</view>
<text class="detail-item">信用分: {{item.creditScore}}</text>
```

---

## 最可能的问题排序

1. **最可能**: 数据库中没有报名数据
2. **次可能**: Worker 信息为空或不完整
3. **可能**: API 没有正确返回数据
4. **较少**: 前端没有正确接收数据
5. **最少**: 前端显示逻辑错误（代码已验证正确）

---

## 建议的诊断顺序

1. ✅ 检查代码 (已完成 - 代码完全正确)
2. 🔍 检查数据库 (立即执行)
3. 🔍 检查 API 响应 (如果有数据)
4. 🔍 检查前端日志 (如果 API 返回数据)
5. 🔍 检查前端显示 (如果前端接收数据)
