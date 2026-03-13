# 服务器启动指南

## 问题

服务器启动时出现数据库连接错误：
```
ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
AggregateError [ECONNREFUSED]
```

## 原因

MySQL 数据库服务未运行。项目使用 Docker Compose 管理数据库和 Redis。

## 解决方案

### 方案 1: 使用 Docker Compose（推荐）

#### 前置条件
- 安装 Docker Desktop（包含 Docker 和 Docker Compose）
- 下载地址: https://www.docker.com/products/docker-desktop

#### 启动步骤

1. **启动数据库和 Redis**
```bash
cd /c/Users/15700/Desktop/work/project/小灵通
docker-compose up -d
```

2. **验证服务状态**
```bash
docker-compose ps
```

应该看到：
```
NAME                    STATUS
xiaolingtong-mysql      Up (healthy)
xiaolingtong-redis      Up (healthy)
```

3. **启动服务器**
```bash
cd server
npm run start:dev
```

4. **停止服务**
```bash
docker-compose down
```

### 方案 2: 本地 MySQL 安装

如果不想使用 Docker，可以在本地安装 MySQL：

1. **安装 MySQL 8.0**
   - 下载: https://dev.mysql.com/downloads/mysql/
   - 或使用包管理器: `brew install mysql` (macOS) 或 `choco install mysql` (Windows)

2. **创建数据库和用户**
```sql
CREATE DATABASE xiaolingtong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xlt'@'localhost' IDENTIFIED BY 'XLT2026db';
GRANT ALL PRIVILEGES ON xiaolingtong.* TO 'xlt'@'localhost';
FLUSH PRIVILEGES;
```

3. **启动 MySQL 服务**
   - Windows: 在服务管理器中启动 MySQL 服务
   - macOS: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`

4. **启动服务器**
```bash
cd server
npm run start:dev
```

## 环境配置

数据库连接配置在 `.env` 文件中：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=xlt
DB_PASSWORD=XLT2026db
DB_DATABASE=xiaolingtong
```

## 验证服务器运行

服务器成功启动时会显示：

```
[Nest] 44080  - 2026/03/14 00:17:42     LOG [NestFactory] Starting Nest application...
[Nest] 44080  - 2026/03/14 00:17:42     LOG [InstanceLoader] AppModule dependencies initialized
...
[Nest] 44080  - 2026/03/14 00:17:43     LOG [NestFactory] Nest application successfully started
```

## 常见问题

### Q: 如何检查 MySQL 是否运行？
```bash
# 检查端口
netstat -an | grep 3306

# 或尝试连接
mysql -h localhost -u xlt -p
```

### Q: 如何查看 Docker 容器日志？
```bash
docker-compose logs mysql
docker-compose logs redis
```

### Q: 如何重置数据库？
```bash
# 删除容器和数据
docker-compose down -v

# 重新启动
docker-compose up -d
```

### Q: 端口已被占用怎么办？
修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "3307:3306"  # 改为 3307
```

然后修改 `.env` 文件：
```env
DB_PORT=3307
```

## 推荐工作流

1. **开发环境**
```bash
# 启动数据库
docker-compose up -d

# 启动服务器（watch 模式）
cd server
npm run start:dev

# 在另一个终端运行测试
npm test
```

2. **生产环境**
```bash
# 构建
npm run build

# 启动
npm start
```

## 相关文件

- `docker-compose.yml` - Docker 服务配置
- `server/.env` - 环境变量配置
- `server/src/app.module.ts` - 数据库连接配置
