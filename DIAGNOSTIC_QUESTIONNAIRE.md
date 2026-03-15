# 招工详情页面诊断问卷

## 问题
招工详情页面显示已有两个人报名，但没有展示报名者详情（名字、信用分、接单数）。

## 已确认
✅ `users.totalOrders` 列已存在

## 需要确认的信息

### 1. 数据库列状态

请运行以下命令并提供结果：

```sql
-- 检查 users 表的必需列
SHOW COLUMNS FROM users WHERE Field IN (
    'totalOrders', 'completedJobs', 'averageRating', 'creditScore', 'nickname'
);
```

**预期结果**:
```
Field              | Type           | Null | Key | Default
totalOrders        | int(11)        | NO   |     | 0
completedJobs      | int(11)        | NO   |     | 0
averageRating      | decimal(3,1)   | NO   |     | 0.0
creditScore        | int(11)        | NO   |     | 100
nickname           | varchar(64)    | YES  |     | NULL
```

---

```sql
-- 检查 job_applications 表的必需列
SHOW COLUMNS FROM job_applications WHERE Field IN (
    'acceptedAt', 'confirmedAt', 'rejectedAt'
);
```

**预期结果**:
```
Field              | Type           | Null | Key | Default
acceptedAt         | datetime       | YES  |     | NULL
confirmedAt        | datetime       | YES  |     | NULL
rejectedAt         | datetime       | YES  |     | NULL
```

### 2. Worker 数据状态

请运行以下命令并提供结果：

```sql
-- 检查 worker 数据
SELECT id, nickname, creditScore, totalOrders, completedJobs, averageRating
FROM users
WHERE role = 'worker'
LIMIT 5;
```

**问题**:
- [ ] 是否有 worker 记录？
- [ ] nickname 是否为 NULL？
- [ ] creditScore 是否为 0 或 NULL？
- [ ] totalOrders 是否为 0 或 NULL？

### 3. 应用数据状态

请运行以下命令并提供结果：

```sql
-- 检查应用数据
SELECT id, jobId, workerId, status, acceptedAt, confirmedAt, rejectedAt
FROM job_applications
LIMIT 5;
```

**问题**:
- [ ] 是否有应用记录？
- [ ] workerId 是否正确？
- [ ] status 是否正确？

### 4. 后端 API 测试

请在浏览器开发者工具中查看网络请求：

1. 打开微信开发者工具
2. 进入招工详情页面
3. 打开 Network 标签
4. 查看 `GET /jobs/{jobId}/applications` 请求
5. 检查 Response 数据

**问题**:
- [ ] API 是否返回了 worker 对象？
- [ ] worker 对象是否包含 nickname, creditScore, totalOrders？
- [ ] 是否有错误信息？

**预期响应**:
```json
{
  "pending": [
    {
      "id": 1,
      "worker": {
        "id": 2,
        "nickname": "张三",
        "creditScore": 98,
        "totalOrders": 15
      },
      "status": "pending"
    }
  ]
}
```

### 5. 前端日志

请在浏览器控制台中查看日志：

1. 打开微信开发者工具
2. 打开 Console 标签
3. 进入招工详情页面
4. 查看是否有错误信息

**问题**:
- [ ] 是否有 JavaScript 错误？
- [ ] 是否有网络错误？
- [ ] 是否有数据处理错误？

## 诊断流程

根据上述信息，我将按以下顺序诊断：

1. **数据库列检查** - 确认所有必需的列都存在
2. **数据检查** - 确认 worker 和应用数据完整
3. **API 检查** - 确认后端正确返回数据
4. **前端检查** - 确认前端正确处理数据
5. **缓存检查** - 清除缓存并重新加载

## 提交诊断信息

请提供以上查询的结果，我将进行完整的诊断并提供解决方案。
