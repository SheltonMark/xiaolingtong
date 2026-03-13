# 服务器运行异常 - SQL 查询错误修复

## 问题分析

### 错误信息
```
ERROR [ExceptionFilter] Unknown column 'Job__Job_user.name' in 'SELECT'
QueryFailedError: Unknown column 'Job__Job_user.name' in 'SELECT'
```

### 根本原因
1. User 实体中添加了 `name` 字段
2. 但数据库中的 `users` 表还没有 `name` 列
3. 当 Job 实体加载关联的 User 时，TypeORM 试图查询不存在的列

## 解决方案

### 方案 1: 使用 TypeORM 自动同步（推荐用于开发）

编辑 `server/src/app.module.ts`，启用 `synchronize`:

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
    synchronize: true,  // 启用自动同步
    charset: 'utf8mb4',
  }),
}),
```

然后重启服务器，TypeORM 会自动创建缺失的列。

### 方案 2: 手动执行 SQL 语句

连接到数据库并执行以下 SQL：

```sql
-- 添加 name 列
ALTER TABLE users ADD COLUMN name VARCHAR(64) NULL AFTER nickname;

-- 添加 completedJobs 列
ALTER TABLE users ADD COLUMN completedJobs INT DEFAULT 0 AFTER totalOrders;

-- 添加 averageRating 列
ALTER TABLE users ADD COLUMN averageRating DECIMAL(3,1) DEFAULT 0 AFTER completedJobs;

-- 添加 acceptedAt 列到 job_applications
ALTER TABLE job_applications ADD COLUMN acceptedAt DATETIME NULL AFTER confirmedAt;

-- 添加 rejectedAt 列到 job_applications
ALTER TABLE job_applications ADD COLUMN rejectedAt DATETIME NULL AFTER acceptedAt;
```

### 方案 3: 重置数据库（如果使用 Docker）

```bash
# 停止并删除容器和数据
docker-compose down -v

# 重新启动
docker-compose up -d

# 等待 MySQL 初始化
sleep 10

# 启动服务器
cd server
npm run start:dev
```

## 推荐步骤

1. **快速修复（开发环境）**
   ```bash
   # 编辑 app.module.ts，设置 synchronize: true
   # 重启服务器
   npm run start:dev
   ```

2. **验证修复**
   ```bash
   # 检查服务器日志，确认没有 SQL 错误
   # 访问 API 端点测试
   curl http://localhost:3000/health
   ```

3. **生产环境**
   - 使用 TypeORM 迁移而不是 synchronize
   - 或手动执行 SQL 语句

## 相关文件

- `server/src/app.module.ts` - 数据库配置
- `server/src/entities/user.entity.ts` - User 实体
- `server/src/entities/job-application.entity.ts` - JobApplication 实体
