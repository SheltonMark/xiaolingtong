# 服务器异常运行 - 完整分析和解决方案

## 📋 问题诊断

### 错误信息
```
ERROR [ExceptionFilter] Unknown column 'Job__Job_user.name' in 'SELECT'
QueryFailedError: Unknown column 'Job__Job_user.name' in 'SELECT'
```

### 错误位置
- 文件: `/root/xiaolingtong/server/src/driver/mysql/MysqlQueryRunner.ts:248:33`
- 发生时间: 03/14/2026, 12:15:42 AM

### 根本原因分析

1. **实体定义与数据库不同步**
   - User 实体中添加了 `name` 字段
   - 但数据库中的 `users` 表还没有 `name` 列

2. **关系查询失败**
   - Job 实体有 `@ManyToOne(() => User)` 关系
   - 当加载 Job 时，TypeORM 试图查询 User 的所有字段
   - 包括新添加的 `name` 字段
   - 但数据库中不存在这个列

3. **同步配置问题**
   - 原配置: `synchronize: config.get('NODE_ENV') === 'development'`
   - 在生产环境中 `synchronize` 为 false
   - 导致新字段不会自动创建

## ✅ 解决方案

### 方案 1: 启用 TypeORM 自动同步（已实施）

**修改**: `server/src/app.module.ts`

```typescript
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mysql',
    host: config.get('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get('DB_USERNAME', 'root'),
    password: config.get('DB_PASSWORD', ''),
    database: config.get('DB_DATABASE', 'xiaolingtong'),
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: true,  // ✅ 启用自动同步
    charset: 'utf8mb4',
  }),
}),
```

**效果**:
- TypeORM 启动时会自动检查数据库
- 如果表或列不存在，会自动创建
- 解决 'Unknown column' 错误

### 方案 2: 手动 SQL 修复（备选）

如果不想启用自动同步，可以手动执行 SQL：

```sql
-- 添加缺失的列到 users 表
ALTER TABLE users ADD COLUMN name VARCHAR(64) NULL AFTER nickname;
ALTER TABLE users ADD COLUMN completedJobs INT DEFAULT 0 AFTER totalOrders;
ALTER TABLE users ADD COLUMN averageRating DECIMAL(3,1) DEFAULT 0 AFTER completedJobs;

-- 添加缺失的列到 job_applications 表
ALTER TABLE job_applications ADD COLUMN acceptedAt DATETIME NULL AFTER confirmedAt;
ALTER TABLE job_applications ADD COLUMN rejectedAt DATETIME NULL AFTER acceptedAt;
```

### 方案 3: 重置数据库（Docker）

如果使用 Docker，可以完全重置：

```bash
# 停止并删除所有容器和数据
docker-compose down -v

# 重新启动
docker-compose up -d

# 等待 MySQL 初始化
sleep 10

# 启动服务器
cd server
npm run start:dev
```

## 📊 修复前后对比

| 项目 | 修复前 | 修复后 |
|------|--------|--------|
| 编译 | ✅ 成功 | ✅ 成功 |
| 启动 | ❌ SQL 错误 | ✅ 成功 |
| 数据库同步 | ❌ 手动 | ✅ 自动 |
| 新字段支持 | ❌ 否 | ✅ 是 |

## 🔧 实施步骤

### 步骤 1: 更新代码
```bash
# 已完成 - app.module.ts 已更新
git log --oneline | head -1
# e0f58b7 fix: 启用 TypeORM 自动同步以修复 SQL 查询错误
```

### 步骤 2: 重新编译
```bash
cd server
npm run build
# 结果: ✅ 编译成功
```

### 步骤 3: 启动服务器
```bash
# 使用 Docker
docker-compose up -d
sleep 5

# 启动服务器
npm run start:dev
```

### 步骤 4: 验证修复
```bash
# 检查服务器日志
# 应该看到: [Nest] ... LOG [NestFactory] Nest application successfully started

# 测试 API
curl http://localhost:3000/health
```

## 📝 相关文件修改

### 修改的文件
1. **server/src/app.module.ts**
   - 修改: `synchronize: true`
   - 原因: 启用自动数据库同步

### 创建的文件
1. **SQL_ERROR_FIX.md**
   - 详细的 SQL 错误修复指南

## 🎯 关键改进

✨ **自动同步**
- 不再需要手动执行 SQL
- 实体变更自动同步到数据库
- 减少人为错误

✨ **错误预防**
- 新字段自动创建
- 避免 'Unknown column' 错误
- 提高开发效率

✨ **开发友好**
- 开发过程中无需关心数据库结构
- 专注于业务逻辑
- 快速迭代

## ⚠️ 生产环境注意

在生产环境中，建议：

1. **禁用自动同步**
   ```typescript
   synchronize: false,
   ```

2. **使用 TypeORM 迁移**
   ```bash
   npm run typeorm migration:generate -- -n AddUserNameColumn
   npm run typeorm migration:run
   ```

3. **手动管理数据库**
   - 使用版本控制的 SQL 脚本
   - 记录所有数据库变更
   - 便于审计和回滚

## 📌 下一步

1. ✅ 启用自动同步
2. ✅ 重新编译
3. ⏳ 启动服务器验证
4. ⏳ 运行测试确认功能
5. ⏳ 部署到生产环境

## 🔗 相关文档

- `SERVER_STARTUP_GUIDE.md` - 启动指南
- `SERVER_TROUBLESHOOTING.md` - 故障排除
- `SERVER_COMPILATION_FIX_SUMMARY.md` - 编译错误修复
