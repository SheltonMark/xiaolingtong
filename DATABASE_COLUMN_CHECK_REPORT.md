# 数据库列检查报告

## 检查时间
2026-03-14

## 检查结果

### ✅ User 实体定义 (user.entity.ts)

**所有必需的列都已在实体中定义**:

| 列名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| id | bigint | - | 主键 |
| openid | varchar(64) | - | 微信 openid |
| unionId | varchar(64) | NULL | 微信 unionId |
| role | enum | NULL | 角色 (enterprise/worker) |
| phone | varchar(20) | NULL | 电话 |
| nickname | varchar(64) | NULL | 昵称 |
| name | varchar(64) | NULL | 真实名字 |
| avatarUrl | varchar(512) | NULL | 头像 URL |
| isMember | tinyint | 0 | 是否会员 |
| memberExpireAt | datetime | NULL | 会员过期时间 |
| beanBalance | int | 0 | 灵豆余额 |
| **creditScore** | int | 100 | ✅ 信用分 |
| **totalOrders** | int | 0 | ✅ 接单数 |
| **completedJobs** | int | 0 | ✅ 完成工作数 |
| **averageRating** | decimal(3,1) | 0 | ✅ 平均评分 |
| status | enum | active | 状态 (active/banned) |
| inviteCode | varchar(8) | NULL | 邀请码 |
| invitedBy | bigint | NULL | 邀请人 ID |
| createdAt | datetime | - | 创建时间 |
| updatedAt | datetime | - | 更新时间 |

**关键发现**: ✅ **totalOrders 列已在实体中定义** (第50行)

### ✅ JobApplication 实体定义 (job-application.entity.ts)

**所有必需的列都已在实体中定义**:

| 列名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| id | bigint | - | 主键 |
| jobId | bigint | - | 招工 ID |
| workerId | bigint | - | 工人 ID |
| status | enum | pending | 状态 |
| isSupervisor | tinyint | 0 | 是否主管 |
| **confirmedAt** | datetime | NULL | ✅ 确认时间 |
| **acceptedAt** | datetime | NULL | ✅ 接受时间 |
| **rejectedAt** | datetime | NULL | ✅ 拒绝时间 |
| createdAt | datetime | - | 创建时间 |
| updatedAt | datetime | - | 更新时间 |

**关键发现**: ✅ **所有时间戳列都已在实体中定义**

## 问题分析

### 问题 1: 数据库可能未同步 ⚠️
虽然实体定义中包含了所有必需的列，但**实际数据库可能没有这些列**。

**原因**:
- TypeORM 的 `synchronize: true` 可能未正确执行
- 数据库迁移可能失败
- 手动删除了列

**症状**:
- 后端运行时出现 `Unknown column 'u.totalOrders'` 错误
- 前端无法获取 worker 详情

### 问题 2: 数据库连接失败 ❌
当前无法连接到数据库验证实际列是否存在。

**原因**:
- 数据库服务器未运行
- 连接凭证错误
- 防火墙阻止

## 修复方案

### 方案 A: 使用 TypeORM 同步 (推荐)

**步骤 1**: 确保 TypeORM 配置启用了 synchronize
```typescript
// src/database.module.ts
TypeOrmModule.forRoot({
  synchronize: true,  // ← 必须为 true
  // ...
})
```

**步骤 2**: 重启服务器
```bash
npm run start
```

TypeORM 会自动创建缺失的列。

### 方案 B: 手动执行 SQL 修复

如果 TypeORM 同步失败，手动执行以下 SQL：

```sql
-- 添加 users 表缺失的列
ALTER TABLE users ADD COLUMN IF NOT EXISTS totalOrders INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completedJobs INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS averageRating DECIMAL(3,1) DEFAULT 0;

-- 添加 job_applications 表缺失的列
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS acceptedAt DATETIME NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS confirmedAt DATETIME NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS rejectedAt DATETIME NULL;
```

### 方案 C: 使用修复脚本

项目中已准备好的修复脚本：
```bash
# 在服务器上执行
bash server/fix-all-columns.sh
```

或直接执行 SQL 文件：
```bash
mysql -h localhost -u xlt -pXLT2026db xiaolingtong < server/fix-all-columns.sql
```

## 验证步骤

### 步骤 1: 检查实体定义 ✅
```bash
grep -n "totalOrders\|acceptedAt\|confirmedAt\|rejectedAt" \
  server/src/entities/user.entity.ts \
  server/src/entities/job-application.entity.ts
```

**结果**: ✅ 所有列都已在实体中定义

### 步骤 2: 检查数据库列 (需要数据库连接)
```sql
SHOW COLUMNS FROM users;
SHOW COLUMNS FROM job_applications;
```

### 步骤 3: 运行测试
```bash
cd server
npm test -- job.phase2.integration.spec.ts
```

**当前结果**: ✅ 所有 38 个测试通过

## 结论

✅ **实体定义完整** - 所有必需的列都已在 TypeORM 实体中定义

⚠️ **数据库同步状态未知** - 无法连接到数据库验证实际列是否存在

📋 **建议**:
1. 确保数据库服务器正在运行
2. 重启后端服务器，让 TypeORM 同步数据库
3. 如果同步失败，手动执行修复脚本
4. 运行测试验证修复是否成功

## 相关文件

- `server/src/entities/user.entity.ts` - User 实体定义
- `server/src/entities/job-application.entity.ts` - JobApplication 实体定义
- `server/fix-all-columns.sql` - SQL 修复脚本
- `server/fix-all-columns.sh` - Shell 修复脚本
