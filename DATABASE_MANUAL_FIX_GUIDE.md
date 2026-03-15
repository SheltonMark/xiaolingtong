# 数据库手动修复指南

## 问题
数据库服务器未运行，无法通过自动同步修复。需要手动执行 SQL 修复。

## 数据库连接信息
```
Host: localhost
Port: 3306
Username: xlt
Password: XLT2026db
Database: xiaolingtong
```

## 修复步骤

### 步骤 1: 启动 MySQL 服务器

#### Windows 系统
```bash
# 方式 1: 使用 Services 管理器
# 1. 按 Win + R，输入 services.msc
# 2. 找到 MySQL 服务（如 MySQL80）
# 3. 右键点击 → 启动

# 方式 2: 使用命令行（需要管理员权限）
net start MySQL80
# 或
net start MySQL57
# 或
net start MySQL

# 方式 3: 使用 MySQL 安装目录
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld" --install
net start MySQL80
```

#### Linux/Mac 系统
```bash
# Linux
sudo systemctl start mysql
# 或
sudo service mysql start

# Mac
brew services start mysql
```

### 步骤 2: 验证 MySQL 连接

```bash
# 测试连接
mysql -h localhost -u xlt -pXLT2026db xiaolingtong -e "SELECT 1;"

# 如果成功，应该看到:
# +---+
# | 1 |
# +---+
# | 1 |
# +---+
```

### 步骤 3: 执行 SQL 修复脚本

#### 方式 A: 使用 SQL 文件（推荐）

```bash
# 进入服务器目录
cd "C:\Users\15700\Desktop\work\project\小灵通\server"

# 执行修复脚本
mysql -h localhost -u xlt -pXLT2026db xiaolingtong < fix-all-columns.sql
```

#### 方式 B: 直接执行 SQL 命令

```bash
# 连接到数据库
mysql -h localhost -u xlt -pXLT2026db xiaolingtong

# 然后在 MySQL 提示符中执行以下命令:
```

```sql
-- ============================================
-- 修复 users 表缺失的列
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS `name` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `totalOrders` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `completedJobs` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `averageRating` DECIMAL(3,1) NOT NULL DEFAULT 0;

-- ============================================
-- 修复 job_applications 表缺失的列
-- ============================================
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `acceptedAt` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `confirmedAt` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `rejectedAt` DATETIME NULL DEFAULT NULL;

-- ============================================
-- 验证修复结果
-- ============================================
SELECT '========== users 表 ==========' as status;
SHOW COLUMNS FROM users WHERE Field IN ('name', 'totalOrders', 'completedJobs', 'averageRating');

SELECT '========== job_applications 表 ==========' as status;
SHOW COLUMNS FROM job_applications WHERE Field IN ('acceptedAt', 'confirmedAt', 'rejectedAt');

SELECT '✓ 所有缺失的列已添加' as result;
```

#### 方式 C: 使用 MySQL Workbench 或其他 GUI 工具

1. 打开 MySQL Workbench
2. 连接到数据库 (localhost:3306, user: xlt, password: XLT2026db)
3. 选择数据库 `xiaolingtong`
4. 打开 `fix-all-columns.sql` 文件
5. 执行脚本

### 步骤 4: 验证修复

```bash
# 检查 users 表
mysql -h localhost -u xlt -pXLT2026db xiaolingtong -e "SHOW COLUMNS FROM users;" | grep -E "totalOrders|completedJobs|averageRating"

# 检查 job_applications 表
mysql -h localhost -u xlt -pXLT2026db xiaolingtong -e "SHOW COLUMNS FROM job_applications;" | grep -E "acceptedAt|confirmedAt|rejectedAt"

# 应该看到所有列都已创建
```

### 步骤 5: 检查 worker 数据

```bash
mysql -h localhost -u xlt -pXLT2026db xiaolingtong << EOF
SELECT id, nickname, creditScore, totalOrders
FROM users
WHERE role = 'worker'
LIMIT 5;
EOF
```

### 步骤 6: 重启后端服务器

```bash
cd "C:\Users\15700\Desktop\work\project\小灵通\server"
npm run start
```

## 完整的一键修复脚本

### Windows 批处理脚本

创建文件 `fix-database.bat`:
```batch
@echo off
echo 启动 MySQL 服务...
net start MySQL80

echo 等待 MySQL 启动...
timeout /t 3

echo 执行数据库修复脚本...
mysql -h localhost -u xlt -pXLT2026db xiaolingtong < fix-all-columns.sql

if %errorlevel% equ 0 (
    echo ✓ 数据库修复成功！
) else (
    echo ✗ 数据库修复失败！
    pause
)

echo 重启后端服务器...
cd server
npm run start
```

### Linux/Mac Shell 脚本

创建文件 `fix-database.sh`:
```bash
#!/bin/bash

echo "启动 MySQL 服务..."
sudo systemctl start mysql

echo "等待 MySQL 启动..."
sleep 3

echo "执行数据库修复脚本..."
mysql -h localhost -u xlt -pXLT2026db xiaolingtong < fix-all-columns.sql

if [ $? -eq 0 ]; then
    echo "✓ 数据库修复成功！"
else
    echo "✗ 数据库修复失败！"
    exit 1
fi

echo "重启后端服务器..."
cd server
npm run start
```

## 故障排除

### 问题 1: MySQL 服务未启动
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案**:
```bash
# Windows
net start MySQL80

# Linux
sudo systemctl start mysql

# Mac
brew services start mysql
```

### 问题 2: 权限不足
```
Error: Access denied for user 'xlt'@'localhost'
```

**解决方案**:
- 检查用户名和密码是否正确
- 确保用户有修改表结构的权限

```bash
# 使用 root 用户连接
mysql -h localhost -u root -p
# 然后执行:
GRANT ALL PRIVILEGES ON xiaolingtong.* TO 'xlt'@'localhost';
FLUSH PRIVILEGES;
```

### 问题 3: 列已存在
```
Error: Duplicate column name 'totalOrders'
```

**解决方案**:
- 这是正常的，说明列已经存在
- 使用 `IF NOT EXISTS` 子句可以避免这个错误
- 修复脚本已经包含了这个子句

### 问题 4: 数据库不存在
```
Error: Unknown database 'xiaolingtong'
```

**解决方案**:
```bash
# 创建数据库
mysql -h localhost -u root -p << EOF
CREATE DATABASE xiaolingtong CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
```

## 验证修复成功

### 检查清单

- [ ] MySQL 服务已启动
- [ ] 可以连接到数据库
- [ ] `users` 表有 `totalOrders` 列
- [ ] `users` 表有 `completedJobs` 列
- [ ] `users` 表有 `averageRating` 列
- [ ] `job_applications` 表有 `acceptedAt` 列
- [ ] `job_applications` 表有 `confirmedAt` 列
- [ ] `job_applications` 表有 `rejectedAt` 列
- [ ] 后端服务器成功启动
- [ ] 所有测试通过

### 运行测试

```bash
cd server
npm test -- job.phase2.integration.spec.ts
```

应该看到:
```
Tests: 38 passed, 38 total
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `server/fix-all-columns.sql` | SQL 修复脚本 |
| `server/fix-all-columns.sh` | Shell 修复脚本 |
| `server/.env` | 数据库连接配置 |
| `server/src/app.module.ts` | TypeORM 配置 |

## 预期结果

修复后，招工详情页面应该正确显示：
```
待审核 (2)
├─ 张三
│  ├─ 信用分: 98
│  └─ 订单数: 15
└─ 李四
   ├─ 信用分: 95
   └─ 订单数: 12
```
