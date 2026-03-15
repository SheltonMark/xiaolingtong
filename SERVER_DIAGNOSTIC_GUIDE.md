# 服务器诊断指南 - 获取招工详情界面问题的辅助信息

## 1. 数据库诊断

### 1.1 连接数据库

```bash
# 使用 MySQL 客户端连接
mysql -u root -p -h localhost xiaolingtong

# 或者使用 Docker（如果数据库在 Docker 中）
docker exec -it mysql_container mysql -u root -p xiaolingtong
```

### 1.2 检查报名数据是否存在

```sql
-- 查看总的报名数
SELECT COUNT(*) as total_applications FROM job_applications;

-- 查看特定招工的报名数
SELECT COUNT(*) as pending_count FROM job_applications WHERE jobId = 1;

-- 查看所有报名数据（替换 jobId）
SELECT
  ja.id,
  ja.jobId,
  ja.workerId,
  ja.status,
  ja.createdAt,
  u.id as user_id,
  u.nickname,
  u.creditScore,
  u.totalOrders,
  u.completedJobs,
  u.averageRating
FROM job_applications ja
LEFT JOIN users u ON ja.workerId = u.id
WHERE ja.jobId = 1
ORDER BY ja.createdAt DESC;
```

### 1.3 检查 Worker 用户信息

```sql
-- 查看所有 worker 用户
SELECT
  id,
  nickname,
  creditScore,
  totalOrders,
  completedJobs,
  averageRating,
  role,
  createdAt
FROM users
WHERE role = 'worker'
LIMIT 10;

-- 查看特定 worker 的详细信息
SELECT
  id,
  nickname,
  creditScore,
  totalOrders,
  completedJobs,
  averageRating,
  phone,
  avatarUrl,
  status
FROM users
WHERE id = 1;
```

### 1.4 检查 Worker 认证信息

```sql
-- 查看 worker 认证信息
SELECT
  id,
  userId,
  realName,
  idNumber,
  status,
  createdAt,
  updatedAt
FROM worker_certs
WHERE userId IN (
  SELECT DISTINCT workerId FROM job_applications WHERE jobId = 1
);

-- 查看所有 worker 认证
SELECT
  id,
  userId,
  realName,
  status,
  createdAt
FROM worker_certs
LIMIT 10;
```

### 1.5 检查数据库字段是否存在

```sql
-- 查看 users 表的结构
DESCRIBE users;

-- 查看 job_applications 表的结构
DESCRIBE job_applications;

-- 查看 worker_certs 表的结构
DESCRIBE worker_certs;

-- 检查特定字段是否存在
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
AND TABLE_SCHEMA = 'xiaolingtong'
AND COLUMN_NAME IN ('totalOrders', 'completedJobs', 'averageRating', 'creditScore');
```

### 1.6 检查数据完整性

```sql
-- 检查是否有 NULL 值
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN totalOrders IS NULL THEN 1 ELSE 0 END) as null_totalOrders,
  SUM(CASE WHEN completedJobs IS NULL THEN 1 ELSE 0 END) as null_completedJobs,
  SUM(CASE WHEN averageRating IS NULL THEN 1 ELSE 0 END) as null_averageRating,
  SUM(CASE WHEN creditScore IS NULL THEN 1 ELSE 0 END) as null_creditScore
FROM users
WHERE role = 'worker';

-- 检查是否有孤立的报名记录
SELECT
  ja.id,
  ja.workerId,
  u.id as user_exists
FROM job_applications ja
LEFT JOIN users u ON ja.workerId = u.id
WHERE u.id IS NULL;
```

## 2. 服务器日志诊断

### 2.1 查看服务器日志

```bash
# 查看最近的日志
tail -f logs/app.log

# 查看特定时间的日志
grep "2026-03-14" logs/app.log

# 查看错误日志
grep "ERROR\|error" logs/app.log

# 查看 API 请求日志
grep "/jobs/.*/applications" logs/app.log
```

### 2.2 启用详细日志

在 `server/src/main.ts` 中添加日志：

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('JobApplications');

// 在 getApplicationsForEnterprise 方法中添加
logger.log(`Fetching applications for job ${jobId}, user ${userId}`);
logger.log(`Found ${applications.length} applications`);
logger.log(`Worker IDs: ${workerIds.join(',')}`);
logger.log(`Worker certs: ${workerCerts.length}`);
```

## 3. API 端点测试

### 3.1 使用 curl 测试 API

```bash
# 获取 Token（先登录）
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code"}'

# 获取招工详情
curl -X GET http://localhost:3000/jobs/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取报名者列表
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# 格式化输出
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.pending | length'
```

### 3.2 使用 Postman 测试

1. 打开 Postman
2. 创建新请求
3. 设置 URL：`http://localhost:3000/jobs/1/applications`
4. 设置 Method：GET
5. 添加 Header：`Authorization: Bearer YOUR_TOKEN`
6. 点击 Send
7. 查看响应

## 4. 后端代码调试

### 4.1 添加调试日志到后端

编辑 `server/src/modules/job/job.service.ts`：

```typescript
async getApplicationsForEnterprise(jobId: number, userId: number) {
  console.log(`[DEBUG] getApplicationsForEnterprise called with jobId=${jobId}, userId=${userId}`);

  const job = await this.jobRepo.findOne({ where: { id: jobId } });
  console.log(`[DEBUG] Job found:`, job);

  if (!job || job.userId !== userId) {
    throw new ForbiddenException('You do not have permission to view this job');
  }

  const applications = await this.appRepo.find({
    where: { jobId },
    relations: ['worker'],
    order: { createdAt: 'DESC' },
  });
  console.log(`[DEBUG] Found ${applications.length} applications`);

  const workerIds = applications.map(app => app.worker.id);
  console.log(`[DEBUG] Worker IDs:`, workerIds);

  const workerCerts = await this.workerCertRepo.find({
    where: workerIds.length > 0 ? { userId: In(workerIds) } : { userId: In([0]) },
  });
  console.log(`[DEBUG] Found ${workerCerts.length} worker certs`);

  const certMap = new Map(workerCerts.map(cert => [cert.userId, cert]));

  const grouped: any = {
    pending: [],
    accepted: [],
    confirmed: [],
    rejected: [],
    released: [],
    cancelled: [],
    working: [],
    done: [],
  };

  applications.forEach((app) => {
    console.log(`[DEBUG] Processing app ${app.id}:`, {
      workerId: app.worker.id,
      workerNickname: app.worker.nickname,
      creditScore: app.worker.creditScore,
      totalOrders: app.worker.totalOrders,
      status: app.status,
    });

    const cert = certMap.get(app.worker.id);
    const workerName = cert?.realName || app.worker.nickname || `用户${app.worker.id}`;
    const realName = cert?.realName || '';

    const totalOrders = app.worker.totalOrders || 0;
    const completedJobs = app.worker.completedJobs || 0;
    const completionRate = totalOrders > 0 ? Math.round((completedJobs / totalOrders) * 100) : 0;
    const isSupervisorCandidate = app.worker.creditScore >= 95 && totalOrders >= 10;

    const workerData = {
      id: app.worker.id,
      nickname: workerName,
      realName: realName,
      creditScore: app.worker.creditScore,
      totalOrders: totalOrders,
      completedJobs: completedJobs,
      completionRate: completionRate,
      averageRating: app.worker.averageRating || 0,
      isSupervisorCandidate: isSupervisorCandidate,
    };

    console.log(`[DEBUG] Worker data:`, workerData);

    if (app.status === 'pending') {
      grouped.pending.push({
        ...app,
        worker: workerData,
      });
    }
    // ... 其他状态
  });

  console.log(`[DEBUG] Final grouped data:`, {
    pending: grouped.pending.length,
    accepted: grouped.accepted.length,
    confirmed: grouped.confirmed.length,
    rejected: grouped.rejected.length,
  });

  return grouped;
}
```

### 4.2 运行服务器并查看日志

```bash
# 启动服务器（会输出所有 console.log）
npm run start

# 或者使用 debug 模式
npm run start:debug

# 在另一个终端测试 API
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN"

# 查看服务器输出中的 [DEBUG] 日志
```

## 5. 完整的诊断脚本

### 5.1 创建诊断脚本

创建文件 `server/diagnose.js`：

```javascript
const mysql = require('mysql2/promise');

async function diagnose() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password',
    database: 'xiaolingtong'
  });

  try {
    console.log('=== 诊断开始 ===\n');

    // 1. 检查报名数据
    console.log('1. 检查报名数据');
    const [apps] = await connection.query(
      `SELECT COUNT(*) as count FROM job_applications WHERE jobId = 1`
    );
    console.log(`   总报名数: ${apps[0].count}\n`);

    // 2. 检查 worker 数据
    console.log('2. 检查 worker 数据');
    const [workers] = await connection.query(
      `SELECT
        ja.id,
        ja.workerId,
        u.nickname,
        u.creditScore,
        u.totalOrders,
        u.completedJobs,
        u.averageRating
      FROM job_applications ja
      LEFT JOIN users u ON ja.workerId = u.id
      WHERE ja.jobId = 1`
    );
    console.log(`   找到 ${workers.length} 个 worker`);
    workers.forEach(w => {
      console.log(`   - Worker ${w.workerId}: ${w.nickname} (信用分: ${w.creditScore}, 订单: ${w.totalOrders})`);
    });
    console.log();

    // 3. 检查认证信息
    console.log('3. 检查认证信息');
    const [certs] = await connection.query(
      `SELECT
        id,
        userId,
        realName,
        status
      FROM worker_certs
      WHERE userId IN (
        SELECT DISTINCT workerId FROM job_applications WHERE jobId = 1
      )`
    );
    console.log(`   找到 ${certs.length} 个认证记录`);
    certs.forEach(c => {
      console.log(`   - User ${c.userId}: ${c.realName} (${c.status})`);
    });
    console.log();

    // 4. 检查数据完整性
    console.log('4. 检查数据完整性');
    const [nullCheck] = await connection.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN totalOrders IS NULL THEN 1 ELSE 0 END) as null_totalOrders,
        SUM(CASE WHEN completedJobs IS NULL THEN 1 ELSE 0 END) as null_completedJobs,
        SUM(CASE WHEN averageRating IS NULL THEN 1 ELSE 0 END) as null_averageRating
      FROM users
      WHERE role = 'worker'`
    );
    console.log(`   Worker 用户总数: ${nullCheck[0].total}`);
    console.log(`   NULL totalOrders: ${nullCheck[0].null_totalOrders}`);
    console.log(`   NULL completedJobs: ${nullCheck[0].null_completedJobs}`);
    console.log(`   NULL averageRating: ${nullCheck[0].null_averageRating}`);
    console.log();

    console.log('=== 诊断完成 ===');
  } finally {
    await connection.end();
  }
}

diagnose().catch(console.error);
```

### 5.2 运行诊断脚本

```bash
# 安装依赖
npm install mysql2

# 运行诊断
node server/diagnose.js
```

## 6. 快速诊断清单

### 6.1 数据库检查

```bash
# 1. 检查报名数据
mysql -u root -p xiaolingtong -e "SELECT COUNT(*) FROM job_applications WHERE jobId = 1;"

# 2. 检查 worker 数据
mysql -u root -p xiaolingtong -e "SELECT COUNT(*) FROM users WHERE role = 'worker';"

# 3. 检查认证数据
mysql -u root -p xiaolingtong -e "SELECT COUNT(*) FROM worker_certs;"

# 4. 检查数据关联
mysql -u root -p xiaolingtong -e "SELECT COUNT(*) FROM job_applications ja LEFT JOIN users u ON ja.workerId = u.id WHERE u.id IS NULL;"
```

### 6.2 API 检查

```bash
# 1. 测试 API 连接
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# 2. 查看响应大小
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -w "\nSize: %{size_download} bytes\n"

# 3. 查看响应时间
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -w "\nTime: %{time_total}s\n"
```

## 7. 获取诊断信息的步骤

### 步骤 1：收集数据库信息

```bash
# 运行以下命令并保存输出
mysql -u root -p xiaolingtong << EOF
SELECT COUNT(*) as total_applications FROM job_applications;
SELECT COUNT(*) as pending_applications FROM job_applications WHERE jobId = 1;
SELECT * FROM job_applications WHERE jobId = 1 LIMIT 5;
SELECT * FROM users WHERE role = 'worker' LIMIT 5;
SELECT * FROM worker_certs LIMIT 5;
EOF
```

### 步骤 2：收集 API 响应

```bash
# 获取 API 响应并保存到文件
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" > api_response.json

# 查看响应
cat api_response.json | jq .
```

### 步骤 3：收集服务器日志

```bash
# 查看最近的日志
tail -100 logs/app.log > server_logs.txt

# 查看错误
grep "ERROR" logs/app.log > server_errors.txt
```

### 步骤 4：生成诊断报告

```bash
# 创建诊断报告
cat > DIAGNOSTIC_REPORT.md << EOF
# 诊断报告

## 数据库信息
$(mysql -u root -p xiaolingtong -e "SELECT COUNT(*) FROM job_applications;")

## API 响应
$(curl -s http://localhost:3000/jobs/1/applications -H "Authorization: Bearer YOUR_TOKEN" | jq .)

## 服务器日志
$(tail -50 logs/app.log)
EOF
```

## 总结

通过以上方法，你可以获取：
- ✅ 数据库中的报名数据
- ✅ Worker 用户信息
- ✅ 认证信息
- ✅ API 响应数据
- ✅ 服务器日志
- ✅ 错误信息

这些信息将帮助准确诊断问题的根本原因。
