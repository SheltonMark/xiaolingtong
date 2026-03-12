# MySQL 数据库安装和启动指南

## 📋 当前状态

❌ MySQL 未在系统中安装
❌ MySQL 服务未找到

---

## 🔧 Windows 上安装 MySQL 8.0

### 方法 1: 使用 MySQL 官方安装程序（推荐）

#### 步骤 1: 下载 MySQL 8.0

访问 MySQL 官方网站下载：
```
https://dev.mysql.com/downloads/mysql/
```

选择：
- **版本**: MySQL 8.0.x (最新稳定版)
- **操作系统**: Windows (x86, 64-bit)
- **文件**: MySQL Installer (msi)

#### 步骤 2: 运行安装程序

1. 双击下载的 `.msi` 文件
2. 选择 "Setup Type"：
   - 选择 "Developer Default" 或 "Server only"
3. 点击 "Next" 继续
4. 配置 MySQL Server：
   - **Port**: 3306 (默认)
   - **Config Type**: Development Machine
   - **MySQL Server Instance Configuration**: 选择默认
5. 配置 MySQL 账户：
   - **Root Account Password**: 设置密码（记住这个密码）
   - **MySQL User Accounts**: 添加用户
     - Username: `xlt`
     - Password: `XLT2026db`
     - Host: `%` (允许远程连接)
6. 完成安装

#### 步骤 3: 验证安装

```bash
# 打开命令提示符，输入
mysql --version

# 预期输出
mysql  Ver 8.0.x for Win64 on x86_64
```

---

### 方法 2: 使用 Chocolatey（如果已安装）

```bash
# 以管理员身份打开 PowerShell

# 安装 MySQL
choco install mysql

# 启动 MySQL 服务
net start MySQL80
```

---

### 方法 3: 使用 Docker（如果已安装 Docker）

```bash
# 创建 MySQL 容器
docker run --name xiaolingtong-mysql \
  -e MYSQL_ROOT_PASSWORD=root123456 \
  -e MYSQL_USER=xlt \
  -e MYSQL_PASSWORD=XLT2026db \
  -e MYSQL_DATABASE=xiaolingtong \
  -p 3306:3306 \
  -d mysql:8.0

# 验证容器运行
docker ps | grep xiaolingtong-mysql
```

---

## ✅ 启动 MySQL 服务

### 方法 1: 使用 Services 管理器（推荐）

1. 按 `Win + R`
2. 输入 `services.msc`
3. 找到 `MySQL80` 服务
4. 右键点击 → 选择 "Start"
5. 等待服务启动（状态变为 "Running"）

### 方法 2: 使用命令行

```bash
# 以管理员身份打开命令提示符

# 启动 MySQL 服务
net start MySQL80

# 预期输出
MySQL80 服务正在启动 .
MySQL80 服务已成功启动。

# 停止 MySQL 服务（如需要）
net stop MySQL80
```

### 方法 3: 使用 PowerShell

```powershell
# 以管理员身份打开 PowerShell

# 启动 MySQL 服务
Start-Service MySQL80

# 检查服务状态
Get-Service MySQL80

# 预期输出
Status   Name               DisplayName
------   ----               -----------
Running  MySQL80            MySQL80
```

---

## 🔐 验证 MySQL 连接

### 连接到 MySQL

```bash
# 使用 root 账户连接
mysql -h localhost -u root -p

# 输入 root 密码后，应该看到 MySQL 提示符
mysql>

# 查看数据库列表
SHOW DATABASES;

# 退出 MySQL
EXIT;
```

### 验证 xlt 用户

```bash
# 使用 xlt 账户连接
mysql -h localhost -u xlt -p

# 输入密码: XLT2026db

# 应该成功连接
mysql>

# 退出
EXIT;
```

---

## 📦 初始化测试数据库

### 使用初始化脚本

```bash
cd server

# Windows
scripts\init-test-db.bat

# macOS/Linux
bash scripts/init-test-db.sh
```

### 手动初始化

```bash
# 连接到 MySQL
mysql -h localhost -u root -p

# 输入 root 密码

# 在 MySQL 命令行执行
CREATE DATABASE xiaolingtong_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON xiaolingtong_test.* TO 'xlt'@'%' IDENTIFIED BY 'XLT2026db';
FLUSH PRIVILEGES;

# 验证数据库创建
SHOW DATABASES;

# 应该看到 xiaolingtong_test 数据库

EXIT;
```

---

## 🧪 运行 E2E 测试

### 前置条件

```bash
# 1. 确保 MySQL 正在运行
mysql -h localhost -u xlt -p
# 输入密码: XLT2026db
# 应该成功连接

# 2. 确保测试数据库已创建
# 运行初始化脚本或手动创建

# 3. 确保 Node.js 依赖已安装
cd server
npm install
```

### 运行 E2E 测试

```bash
cd server

# 运行所有 E2E 测试
npm run test:e2e

# 或使用 Playwright 命令
npx playwright test

# 查看测试报告
npx playwright show-report
```

### 预期输出

```
Running 20 tests using 2 workers

✓ Auth Module E2E › should register new user (1.2s)
✓ Auth Module E2E › should login user (0.8s)
✓ Auth Module E2E › should handle login failure (0.6s)
✓ Auth Module E2E › should refresh token (0.7s)

✓ Post Module E2E › should create new post (1.5s)
✓ Post Module E2E › should search posts (1.2s)
✓ Post Module E2E › should filter posts (1.1s)
✓ Post Module E2E › should get post details (0.9s)
✓ Post Module E2E › should update post (1.3s)

✓ Payment Module E2E › should create order (1.4s)
✓ Payment Module E2E › should check wallet balance (0.8s)
✓ Payment Module E2E › should view transactions (1.0s)
✓ Payment Module E2E › should unlock post (1.2s)

✓ Interaction Module E2E › should add to favorites (0.9s)
✓ Interaction Module E2E › should send message (1.1s)
✓ Interaction Module E2E › should rate user (0.8s)
✓ Interaction Module E2E › should view profile (1.0s)
✓ Interaction Module E2E › should update profile (1.2s)
✓ Interaction Module E2E › should view notifications (0.9s)
✓ Interaction Module E2E › should manage settings (0.8s)

20 passed (2m 15s)
```

---

## ⚠️ 常见问题

### 问题 1: MySQL 服务启动失败

**症状**: `MySQL80 服务启动失败`

**解决方案**:
1. 检查 MySQL 是否正确安装
2. 检查磁盘空间是否充足
3. 查看 MySQL 错误日志
4. 重新安装 MySQL

### 问题 2: 无法连接到 MySQL

**症状**: `ERROR 2003 (HY000): Can't connect to MySQL server`

**解决方案**:
1. 检查 MySQL 服务是否运行
2. 检查端口 3306 是否被占用
3. 检查防火墙设置
4. 检查连接信息是否正确

### 问题 3: 权限错误

**症状**: `ERROR 1045 (28000): Access denied for user 'xlt'@'localhost'`

**解决方案**:
1. 检查用户名和密码是否正确
2. 重新创建用户并授予权限
3. 使用 root 账户重新授权

### 问题 4: 数据库不存在

**症状**: `ERROR 1049 (42000): Unknown database 'xiaolingtong_test'`

**解决方案**:
1. 运行数据库初始化脚本
2. 或手动创建数据库

---

## 📚 相关资源

- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [MySQL 安装指南](https://dev.mysql.com/doc/mysql-installation-excerpt/8.0/en/)
- [MySQL 用户管理](https://dev.mysql.com/doc/refman/8.0/en/user-names.html)

---

## ✅ 检查清单

在运行 E2E 测试前，请确保：

- [ ] MySQL 8.0 已安装
- [ ] MySQL 服务已启动
- [ ] 可以使用 root 账户连接
- [ ] xlt 用户已创建
- [ ] xiaolingtong_test 数据库已创建
- [ ] 数据库权限已配置
- [ ] Node.js 依赖已安装
- [ ] Playwright 浏览器已安装

---

**最后更新**: 2026-03-08
**版本**: 1.0
**项目**: 小灵通 (XiaoLingTong)
