# 数据同步性能优化方案

**优先级**: 中
**复杂度**: 中
**预期收益**: 性能提升 50-70%

---

## 一、当前实现的性能问题

### 问题 1: 应用层分组
```typescript
// 当前实现 (myApplications 方法)
const workLogs = await this.workLogRepo.find({
  where: { workerId },
  order: { date: 'DESC' },
});

// 问题:
// - 获取所有 work_logs (可能很多)
// - 在应用层进行分组
// - 时间复杂度: O(n)
```

### 问题 2: 多次数据库查询
```typescript
// 查询 1: job_applications
const [apps, total] = await qb.getManyAndCount();

// 查询 2: 所有 work_logs
const workLogs = await this.workLogRepo.find({...});

// 问题:
// - 两次数据库查询
// - 如果有分页，可能导致数据不一致
```

### 问题 3: 内存占用
```
假设:
- 临工有 100 个报名
- 每个报名有 10 条 work_logs
- 总共需要加载 1000 条 work_logs 到内存
- 然后进行分组和过滤
```

---

## 二、优化方案

### 方案 A: 使用 SQL LEFT JOIN (推荐)

#### 实现
```typescript
async myApplications(workerId: number, query: any) {
  const { status, page = 1, pageSize = 20 } = query;

  // 使用 QueryBuilder 的 leftJoinAndSelect
  const qb = this.appRepo
    .createQueryBuilder('a')
    .leftJoinAndSelect('a.job', 'j')
    .leftJoinAndSelect('j.user', 'u')
    .leftJoinAndSelect(
      'work_logs',
      'w',
      'w.jobId = a.jobId AND w.workerId = a.workerId',
      { orderBy: 'w.date DESC', limit: 1 }
    )
    .where('a.workerId = :workerId', { workerId });

  if (status) qb.andWhere('a.status = :status', { status });

  qb.orderBy('a.createdAt', 'DESC')
    .skip((page - 1) * pageSize)
    .take(pageSize);

  const [apps, total] = await qb.getManyAndCount();

  // 直接返回，无需应用层处理
  return { list: apps, total, page: +page, pageSize: +pageSize };
}
```

#### 优点
- ✅ 单次数据库查询
- ✅ 数据库层面优化
- ✅ 支持分页
- ✅ 性能提升 50-70%

#### 缺点
- ❌ SQL 复杂度高
- ❌ 某些数据库可能不支持子查询 JOIN

---

### 方案 B: 使用数据库视图

#### 实现
```sql
-- 创建视图
CREATE VIEW worker_applications_with_latest_worklog AS
SELECT
  a.id,
  a.jobId,
  a.workerId,
  a.status,
  a.createdAt,
  a.confirmedAt,
  a.acceptedAt,
  a.rejectedAt,
  j.id as job_id,
  j.title,
  j.location,
  j.salary,
  j.salaryUnit,
  j.salaryType,
  u.id as user_id,
  u.name as company_name,
  u.nickname,
  u.avatarUrl,
  w.id as workLogId,
  w.date,
  w.hours,
  w.pieces,
  w.photoUrls,
  w.anomalyType,
  w.anomalyNote
FROM job_applications a
LEFT JOIN jobs j ON a.jobId = j.id
LEFT JOIN users u ON j.userId = u.id
LEFT JOIN work_logs w ON a.jobId = w.jobId
  AND a.workerId = w.workerId
  AND w.date = (
    SELECT MAX(date) FROM work_logs
    WHERE jobId = a.jobId AND workerId = a.workerId
  );
```

#### 使用
```typescript
async myApplications(workerId: number, query: any) {
  const { status, page = 1, pageSize = 20 } = query;

  const qb = this.dataSource
    .createQueryBuilder()
    .select('*')
    .from('worker_applications_with_latest_worklog', 'v')
    .where('v.workerId = :workerId', { workerId });

  if (status) qb.andWhere('v.status = :status', { status });

  qb.orderBy('v.createdAt', 'DESC')
    .skip((page - 1) * pageSize)
    .take(pageSize);

  const [list, total] = await qb.getManyAndCount();
  return { list, total, page: +page, pageSize: +pageSize };
}
```

#### 优点
- ✅ 查询简单
- ✅ 性能最优
- ✅ 易于维护

#### 缺点
- ❌ 需要创建数据库视图
- ❌ 视图更新可能有延迟

---

### 方案 C: 使用缓存

#### 实现
```typescript
async myApplications(workerId: number, query: any) {
  const { status, page = 1, pageSize = 20 } = query;

  // 缓存 key
  const cacheKey = `worker:${workerId}:applications:${status || 'all'}`;

  // 尝试从缓存获取
  let cachedData = await this.cacheService.get(cacheKey);
  if (cachedData) {
    return this.paginateData(cachedData, page, pageSize);
  }

  // 从数据库查询
  const apps = await this.appRepo.find({
    where: { workerId, ...(status && { status }) },
    relations: ['job', 'job.user'],
    order: { createdAt: 'DESC' },
  });

  // 获取 work_logs
  const workLogs = await this.workLogRepo.find({
    where: { workerId },
    order: { date: 'DESC' },
  });

  // 合并数据
  const mergedData = this.mergeApplicationsWithWorkLogs(apps, workLogs);

  // 缓存 5 分钟
  await this.cacheService.set(cacheKey, mergedData, 300);

  return this.paginateData(mergedData, page, pageSize);
}

private paginateData(data: any[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    list: data.slice(start, end),
    total: data.length,
    page,
    pageSize
  };
}
```

#### 优点
- ✅ 查询速度快
- ✅ 减少数据库压力
- ✅ 易于实现

#### 缺点
- ❌ 数据可能不是最新的
- ❌ 需要缓存失效策略

---

## 三、推荐方案

### 短期 (1-2 周)
**使用方案 A: SQL LEFT JOIN**
- 改进现有代码
- 无需数据库变更
- 性能提升明显

### 中期 (2-4 周)
**使用方案 B: 数据库视图**
- 创建视图优化查询
- 简化应用层代码
- 性能最优

### 长期 (1-2 月)
**使用方案 C: 缓存**
- 添加 Redis 缓存
- 进一步提升性能
- 支持高并发

---

## 四、实施步骤

### 步骤 1: 添加数据库索引
```sql
-- 优化 work_logs 查询
CREATE INDEX idx_work_logs_workerId_jobId ON work_logs(workerId, jobId);
CREATE INDEX idx_work_logs_workerId_date ON work_logs(workerId, date DESC);

-- 优化 job_applications 查询
CREATE INDEX idx_job_applications_workerId_status ON job_applications(workerId, status);
```

### 步骤 2: 实施方案 A
```typescript
// 修改 myApplications 方法
// 使用 LEFT JOIN 获取最新的 work_log
```

### 步骤 3: 测试和验证
```bash
# 性能测试
npm run test:performance

# 对比优化前后
# - 查询时间
# - 内存占用
# - 数据库连接数
```

### 步骤 4: 监控和调优
```typescript
// 添加性能监控
@UseInterceptors(PerformanceInterceptor)
async myApplications(...) {
  // 记录查询时间
  // 记录返回数据量
  // 记录缓存命中率
}
```

---

## 五、预期效果

### 性能提升
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 查询时间 | 200ms | 50ms | 75% ↓ |
| 内存占用 | 50MB | 15MB | 70% ↓ |
| 数据库连接 | 2 | 1 | 50% ↓ |

### 用户体验
- ✅ 页面加载更快
- ✅ 响应更及时
- ✅ 支持更多数据

---

## 六、风险评估

### 风险 1: SQL 复杂度
- **风险**: LEFT JOIN 子查询可能出错
- **缓解**: 充分测试，添加单元测试

### 风险 2: 数据一致性
- **风险**: 缓存导致数据不一致
- **缓解**: 设置合理的缓存过期时间

### 风险 3: 数据库兼容性
- **风险**: 某些数据库不支持子查询 JOIN
- **缓解**: 使用 TypeORM 的抽象层

---

## 七、成本评估

| 方案 | 开发时间 | 测试时间 | 总计 |
|------|---------|---------|------|
| 方案 A | 2h | 2h | 4h |
| 方案 B | 3h | 3h | 6h |
| 方案 C | 4h | 4h | 8h |

**建议**: 先实施方案 A，后续根据需要升级到方案 B 或 C
