# 最简单的修复方式 - 直接复制粘贴

## 在你的本地终端执行这个命令

```bash
ssh root@49.235.166.177 "mysql -h localhost -u root -p xiaolingtong << 'EOF'
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`name\` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`totalOrders\` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`completedJobs\` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`averageRating\` DECIMAL(3,1) NOT NULL DEFAULT 0;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS \`acceptedAt\` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS \`confirmedAt\` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS \`rejectedAt\` DATETIME NULL DEFAULT NULL;
SELECT '✓ 修复完成' as status;
EOF
" && ssh root@49.235.166.177 "pm2 restart xiaolingtong-api && sleep 2 && pm2 logs xiaolingtong-api --lines 20"
```

## 或者更简单的方式 - 分两步

### 第一步：修复数据库
```bash
ssh root@49.235.166.177 "mysql -h localhost -u root -p xiaolingtong < /root/xiaolingtong/fix-all-columns.sql"
```

### 第二步：重启服务
```bash
ssh root@49.235.166.177 "pm2 restart xiaolingtong-api && sleep 2 && pm2 logs xiaolingtong-api --lines 20"
```

## 或者最直接的方式 - 交互式

### 第一步：连接到服务器
```bash
ssh root@49.235.166.177
```

### 第二步：执行修复（在服务器上）
```bash
mysql -h localhost -u root -p xiaolingtong
```

### 第三步：在 MySQL 中粘贴这些命令
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS `name` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `totalOrders` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `completedJobs` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `averageRating` DECIMAL(3,1) NOT NULL DEFAULT 0;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `acceptedAt` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `confirmedAt` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS `rejectedAt` DATETIME NULL DEFAULT NULL;
EXIT;
```

### 第四步：重启服务（在服务器上）
```bash
pm2 restart xiaolingtong-api
pm2 logs xiaolingtong-api --lines 20
```

---

## 预期结果

看到这个说明成功：
```
[Nest] ... LOG [NestApplication] Nest application successfully started
```

看到这个说明还有问题：
```
ERROR [ExceptionFilter] Unknown column
```
