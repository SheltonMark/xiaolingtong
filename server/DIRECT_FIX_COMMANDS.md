# 服务器修复 - 直接执行命令

## 一键修复命令（复制整个命令块执行）

```bash
ssh root@49.235.166.177 << 'EOF'
cd /root/xiaolingtong

# 执行 SQL 修复
mysql -h localhost -u root -p xiaolingtong << 'EOSQL'
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
SELECT '✓ 修复完成' as status;
EOSQL

# 重启服务
pm2 restart xiaolingtong-api

# 等待服务启动
sleep 3

# 显示日志
pm2 logs xiaolingtong-api --lines 30
EOF
```

## 或者分步执行

### 步骤 1：连接到服务器
```bash
ssh root@49.235.166.177
```

### 步骤 2：执行 SQL 修复
```bash
mysql -h localhost -u root -p xiaolingtong << 'EOF'
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
EOF
```

### 步骤 3：重启服务
```bash
pm2 restart xiaolingtong-api
pm2 logs xiaolingtong-api --lines 30
```

## 预期输出

修复成功后应该看到：
```
[Nest] ... LOG [NestApplication] Nest application successfully started
```

而不是：
```
ERROR [ExceptionFilter] Unknown column
```
