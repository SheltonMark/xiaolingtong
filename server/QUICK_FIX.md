# 快速修复指南

## 问题
服务器报错：`Unknown column 'a.acceptedAt' in 'SELECT'`

## 原因
**系统性数据库同步失败** - 多个表缺少列：
- **users 表**: `name`, `totalOrders`, `completedJobs`, `averageRating`
- **job_applications 表**: `acceptedAt`, `confirmedAt`, `rejectedAt`

## 快速修复（推荐）

### 方式 1：一键脚本（最简单）✅
```bash
ssh root@49.235.166.177
bash /root/xiaolingtong/fix-all-columns.sh
```

### 方式 2：手动修复
```bash
ssh root@49.235.166.177
mysql -h localhost -u root -p xiaolingtong << EOF
-- 修复 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`name\` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`totalOrders\` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`completedJobs\` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS \`averageRating\` DECIMAL(3,1) NOT NULL DEFAULT 0;

-- 修复 job_applications 表
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS \`acceptedAt\` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS \`confirmedAt\` DATETIME NULL DEFAULT NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS \`rejectedAt\` DATETIME NULL DEFAULT NULL;

EXIT;
EOF

pm2 restart xiaolingtong-api
pm2 logs xiaolingtong-api --lines 30
```

## 验证修复
看到这个日志说明修复成功：
```
[Nest] ... LOG [NestApplication] Nest application successfully started
```

看到这个日志说明还有问题：
```
ERROR [ExceptionFilter] Unknown column
```

## 文件位置
- 脚本: `/root/xiaolingtong/fix-all-columns.sh`
- SQL: `/root/xiaolingtong/fix-all-columns.sql`
- 详细文档: `DATABASE_SYNC_COMPLETE_FIX.md`
