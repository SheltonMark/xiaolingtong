# 服务器异常运行 - 完整分析和解决方案

## 问题诊断

### 错误信息（更新）
```
QueryFailedError: Unknown column 'ua.totalOrders' in 'SELECT'
QueryFailedError: Unknown column 'u.totalOrders' in 'SELECT'
QueryFailedError: Unknown column 'User.name' in 'SELECT'
```

### 缺失的列
User 表中缺失以下列：
- `name` - VARCHAR(64)
- `totalOrders` - INT (默认值: 0)
- `completedJobs` - INT (默认值: 0)
- `averageRating` - DECIMAL(3,1) (默认值: 0)

### 根本原因
1. **数据库表结构不匹配** - User 实体定义了多个字段，但数据库表中没有这些列
2. **TypeORM 同步失败** - 虽然 `synchronize: true` 已启用，但同步没有正确执行
3. **查询关联问题** - 任何涉及 User 表的 JOIN 操作都会尝试查询这些不存在的列

### 受影响的查询
- Job 列表查询 (job.service.ts:140)
- User 关联查询
- 任何涉及 User 表的 JOIN 操作

## 解决方案

### 方案 1：一键修复脚本（最推荐）
使用自动化脚本，一次性修复所有缺失的列

**在服务器上执行**：
```bash
ssh root@49.235.166.177
bash /root/xiaolingtong/fix-database.sh
```

这个脚本会：
1. 读取 `.env` 文件获取数据库配置
2. 添加所有缺失的列
3. 验证修复结果
4. 自动重启服务
5. 显示服务日志

### 方案 2：手动修复（如果脚本失败）
直接在数据库中添加缺失的列

**SQL 命令**：
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS `name` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `totalOrders` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `completedJobs` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `averageRating` DECIMAL(3,1) NOT NULL DEFAULT 0;
```

### 方案 2：完全重建（如果有多个列缺失）
删除所有表，让 TypeORM 重新创建

**步骤**：
1. 备份数据库
2. 删除所有表
3. 重启服务器，TypeORM 会自动创建表

**风险**：会丢失所有数据

### 方案 3：检查并修复所有缺失列
运行完整的数据库同步检查

**步骤**：
1. 检查所有实体定义
2. 对比数据库表结构
3. 添加所有缺失的列

## 实施步骤

### 立即修复（5分钟）
```bash
# 1. SSH 连接到服务器
ssh root@49.235.166.177

# 2. 运行一键修复脚本
bash /root/xiaolingtong/fix-database.sh

# 脚本会自动：
# - 添加所有缺失的列
# - 验证修复结果
# - 重启服务
# - 显示服务日志
```

### 手动修复步骤
```bash
# 1. SSH 连接到服务器
ssh root@49.235.166.177

# 2. 连接到 MySQL
mysql -h localhost -u root -p xiaolingtong

# 3. 在 MySQL 命令行执行
ALTER TABLE users ADD COLUMN IF NOT EXISTS `name` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `totalOrders` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `completedJobs` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `averageRating` DECIMAL(3,1) NOT NULL DEFAULT 0;

# 4. 验证修复
DESCRIBE users;
EXIT;

# 5. 重启服务
pm2 restart xiaolingtong-api
pm2 logs xiaolingtong-api --lines 30
```

## 预防措施

### 1. 启用自动同步日志
修改 `app.module.ts`：
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    // ... 其他配置
    synchronize: true,
    logging: ['query', 'error'],  // 添加日志
  }),
})
```

### 2. 定期检查数据库一致性
创建一个健康检查端点：
```typescript
@Get('/health/db')
async checkDatabase() {
  // 验证所有表和列是否存在
  // 返回不一致的列表
}
```

### 3. 使用迁移而不是同步
对于生产环境，建议使用 TypeORM 迁移：
```bash
npm run typeorm -- migration:generate -n AddNameColumn
npm run typeorm -- migration:run
```

## 相关文件
- `server/src/app.module.ts` - TypeORM 配置
- `server/src/entities/user.entity.ts` - User 实体定义
- `server/src/entities/job.entity.ts` - Job 实体定义
- `server/src/modules/job/job.service.ts` - Job 查询逻辑
- `server/fix-database.sql` - 修复脚本

## 后续检查清单
- [ ] 执行 SQL 修复脚本
- [ ] 重启服务器
- [ ] 检查服务日志，确认没有 QueryFailedError
- [ ] 测试 Job 列表 API
- [ ] 测试 User 关联查询
- [ ] 监控错误日志 24 小时
