# 服务器启动异常 - 故障排除指南

## 问题诊断

### 错误信息
```
ERROR [TypeOrmModule] Unable to connect to the database. Retrying (1)...
AggregateError [ECONNREFUSED]
```

### 根本原因
MySQL 数据库服务未运行。服务器无法连接到 `localhost:3306`。

## 快速解决方案

### Windows 用户
```bash
# 双击运行启动脚本
start-server.bat
```

### macOS/Linux 用户
```bash
# 运行启动脚本
bash start-server.sh
```

## 详细步骤

### 步骤 1: 安装 Docker Desktop

1. 访问 https://www.docker.com/products/docker-desktop
2. 下载适合您操作系统的版本
3. 安装并启动 Docker Desktop
4. 验证安装：
```bash
docker --version
docker-compose --version
```

### 步骤 2: 启动数据库

```bash
# 进入项目目录
cd /c/Users/15700/Desktop/work/project/小灵通

# 启动 MySQL 和 Redis
docker-compose up -d

# 验证服务状态
docker-compose ps
```

预期输出：
```
NAME                    STATUS
xiaolingtong-mysql      Up (healthy)
xiaolingtong-redis      Up (healthy)
```

### 步骤 3: 启动服务器

```bash
# 进入服务器目录
cd server

# 启动开发服务器
npm run start:dev
```

预期输出：
```
[Nest] 44080  - 2026/03/14 00:17:42     LOG [NestFactory] Starting Nest application...
[Nest] 44080  - 2026/03/14 00:17:42     LOG [InstanceLoader] AppModule dependencies initialized
...
[Nest] 44080  - 2026/03/14 00:17:43     LOG [NestFactory] Nest application successfully started
```

## 常见问题排查

### 问题 1: Docker 未安装

**症状**: `docker: command not found`

**解决方案**:
1. 安装 Docker Desktop
2. 重启终端
3. 验证: `docker --version`

### 问题 2: Docker 未运行

**症状**: `Cannot connect to Docker daemon`

**解决方案**:
1. 启动 Docker Desktop 应用
2. 等待 Docker 完全启动（通常需要 30 秒）
3. 重试: `docker ps`

### 问题 3: 端口已被占用

**症状**: `Error response from daemon: Ports are not available`

**解决方案**:

方案 A: 停止占用端口的服务
```bash
# 查找占用 3306 端口的进程
netstat -ano | findstr :3306

# 停止该进程
taskkill /PID <PID> /F
```

方案 B: 修改 Docker 端口映射
```yaml
# 编辑 docker-compose.yml
services:
  mysql:
    ports:
      - "3307:3306"  # 改为 3307
```

然后修改 `.env`:
```env
DB_PORT=3307
```

### 问题 4: 数据库连接超时

**症状**: `Unable to connect to the database. Retrying...`

**解决方案**:
```bash
# 检查 MySQL 容器日志
docker-compose logs mysql

# 重启容器
docker-compose restart mysql

# 或完全重建
docker-compose down -v
docker-compose up -d
```

### 问题 5: 权限错误

**症状**: `Access denied for user 'xlt'@'localhost'`

**解决方案**:
```bash
# 重置数据库
docker-compose down -v
docker-compose up -d

# 等待 MySQL 完全启动
sleep 10

# 验证连接
docker-compose exec mysql mysql -u xlt -pXLT2026db xiaolingtong -e "SELECT 1"
```

### 问题 6: 服务器启动缓慢

**症状**: 启动需要超过 30 秒

**解决方案**:
```bash
# 检查 MySQL 健康状态
docker-compose ps

# 查看 MySQL 日志
docker-compose logs mysql

# 如果不健康，重启
docker-compose restart mysql
```

## 验证步骤

### 1. 验证 Docker 服务

```bash
docker-compose ps
```

应该显示两个服务都是 `Up (healthy)`:
```
NAME                    STATUS
xiaolingtong-mysql      Up (healthy)
xiaolingtong-redis      Up (healthy)
```

### 2. 验证数据库连接

```bash
# 连接到 MySQL
docker-compose exec mysql mysql -u xlt -pXLT2026db xiaolingtong -e "SELECT 1"

# 应该返回:
# +---+
# | 1 |
# +---+
# | 1 |
# +---+
```

### 3. 验证服务器启动

```bash
# 查看服务器日志
npm run start:dev

# 应该看到:
# [Nest] ... LOG [NestFactory] Nest application successfully started
```

### 4. 验证 API 可用

```bash
# 在另一个终端测试 API
curl http://localhost:3000/health

# 应该返回 200 OK
```

## 清理和重置

### 完全重置数据库

```bash
# 停止并删除所有容器和数据
docker-compose down -v

# 重新启动
docker-compose up -d

# 等待服务就绪
sleep 10

# 验证
docker-compose ps
```

### 查看日志

```bash
# MySQL 日志
docker-compose logs mysql

# Redis 日志
docker-compose logs redis

# 所有日志
docker-compose logs

# 实时日志
docker-compose logs -f
```

### 停止服务

```bash
# 停止但保留数据
docker-compose stop

# 停止并删除容器（保留数据）
docker-compose down

# 停止并删除所有（包括数据）
docker-compose down -v
```

## 性能优化

### 1. 增加 MySQL 内存

编辑 `docker-compose.yml`:
```yaml
services:
  mysql:
    environment:
      MYSQL_MAX_CONNECTIONS: 1000
```

### 2. 启用 MySQL 查询缓存

```yaml
services:
  mysql:
    command: --query_cache_type=1 --query_cache_size=256M
```

### 3. 优化 Redis 配置

```yaml
services:
  redis:
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## 获取帮助

### 查看完整日志

```bash
# 保存日志到文件
docker-compose logs > logs.txt

# 查看特定服务的日志
docker-compose logs mysql > mysql.log
docker-compose logs redis > redis.log
```

### 检查系统资源

```bash
# 查看 Docker 容器资源使用
docker stats

# 查看磁盘空间
df -h

# 查看内存使用
free -h
```

## 相关文件

- `docker-compose.yml` - Docker 服务配置
- `server/.env` - 环境变量
- `server/src/app.module.ts` - 数据库连接配置
- `SERVER_STARTUP_GUIDE.md` - 启动指南
- `start-server.sh` - Linux/macOS 启动脚本
- `start-server.bat` - Windows 启动脚本
