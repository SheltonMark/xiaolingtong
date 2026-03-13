#!/bin/bash

# 直接修复命令 - 可以直接在本地终端执行
# 这个脚本会通过 SSH 连接到服务器并执行修复

echo "开始修复服务器数据库..."
echo ""

ssh root@49.235.166.177 << 'REMOTE_SCRIPT'

echo "=========================================="
echo "服务器数据库修复开始"
echo "=========================================="
echo ""

# 执行 SQL 修复
echo "执行 SQL 修复..."
mysql -h localhost -u root -p xiaolingtong << 'SQL_SCRIPT'

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
SELECT '========== users 表修复结果 ==========' as status;
SHOW COLUMNS FROM users WHERE Field IN ('name', 'totalOrders', 'completedJobs', 'averageRating');

SELECT '========== job_applications 表修复结果 ==========' as status;
SHOW COLUMNS FROM job_applications WHERE Field IN ('acceptedAt', 'confirmedAt', 'rejectedAt');

SELECT '✓ 所有缺失的列已添加' as result;

SQL_SCRIPT

echo ""
echo "重启服务..."
pm2 restart xiaolingtong-api

echo ""
echo "等待服务启动..."
sleep 3

echo ""
echo "=========================================="
echo "服务日志"
echo "=========================================="
pm2 logs xiaolingtong-api --lines 30

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="

REMOTE_SCRIPT

echo ""
echo "✓ 远程修复脚本执行完成"
