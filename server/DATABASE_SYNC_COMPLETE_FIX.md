# 服务器数据库同步问题 - 完整分析和解决方案

## 问题诊断

### 错误演变过程
1. **第一阶段**: `Unknown column 'User.name' in 'SELECT'`
2. **第二阶段**: `Unknown column 'u.totalOrders' in 'SELECT'`
3. **第三阶段**: `Unknown column 'a.acceptedAt' in 'SELECT'` ← 当前

### 根本原因
**系统性的数据库同步失败**：
- TypeORM 的 `synchronize: true` 配置未能正确同步所有实体到数据库
- 多个表都缺少对应实体定义的列
- 每次修复一个表后，应用启动时会尝试查询下一个表的缺失列

### 缺失的列清单

#### users 表
- `name` - VARCHAR(64)
- `totalOrders` - INT (默认: 0)
- `completedJobs` - INT (默认: 0)
- `averageRating` - DECIMAL(3,1) (默认: 0)

#### job_applications 表
- `acceptedAt` - DATETIME
- `confirmedAt` - DATETIME
- `rejectedAt` - DATETIME

## 解决方案

### 方案 1：一键修复脚本（最推荐）

在服务器上执行：
```bash
ssh root@49.235.166.177
bash /root/xiaolingtong/fix-all-columns.sh
```

这个脚本会：
1. ✅ 添加 users 表的所有缺失列
2. ✅ 添加 job_applications 表的所有缺失列
3. ✅ 验证修复结果
4. ✅ 自动重启服务
5. ✅ 显示服务日志

### 方案 2：手动修复

#### 步骤 1：连接到数据库
```bash
ssh root@49.235.166.177
mysql -h localhost -u root -p xiaolingtong
```

#### 步骤 2：执行 SQL 修复
```sql
-- 修复 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS `name` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `totalOrders` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `completedJobs` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `averageRating` DECIMAL(3,1) NOT NULL DEFAULT 0;

-- 修复 job_applications 表
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `acceptedAt` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `confirmedAt` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `rejectedAt` DATETIME NULL DEFAULT NULL;

-- 验证修复
SHOW COLUMNS FROM users WHERE Field IN ('name', 'totalOrders', 'completedJobs', 'averageRating');
SHOW COLUMNS FROM job_applications WHERE Field IN ('acceptedAt', 'confirmedAt', 'rejectedAt');

EXIT;
```

#### 步骤 3：重启服务
```bash
pm2 restart xiaolingtong-api
pm2 logs xiaolingtong-api --lines 30
```

## 预防措施

### 1. 启用数据库同步日志
修改 `app.module.ts`：
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    // ... 其他配置
    synchronize: true,
    logging: ['query', 'error', 'schema'],  // 添加日志
  }),
})
```

### 2. 定期检查数据库一致性
创建一个健康检查端点来验证所有表和列是否存在。

### 3. 使用迁移而不是同步
对于生产环境，建议使用 TypeORM 迁移：
```bash
npm run typeorm -- migration:generate -n SyncAllColumns
npm run typeorm -- migration:run
```

## 验证修复

修复成功的标志：
```
[Nest] ... LOG [NestApplication] Nest application successfully started
```

如果还有错误，会看到：
```
ERROR [ExceptionFilter] Unknown column
```

## 相关文件
- `fix-all-columns.sh` - 一键修复脚本
- `fix-all-columns.sql` - SQL 修复脚本
- `server/src/entities/user.entity.ts` - User 实体定义
- `server/src/entities/job-application.entity.ts` - JobApplication 实体定义
- `server/src/app.module.ts` - TypeORM 配置

## 后续检查清单
- [ ] 执行修复脚本
- [ ] 验证服务启动成功
- [ ] 检查服务日志，确认没有 QueryFailedError
- [ ] 测试 API 端点
- [ ] 监控错误日志 24 小时
- [ ] 考虑迁移到使用 TypeORM 迁移而不是 synchronize
