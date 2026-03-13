#!/bin/bash

# 完整数据库修复脚本 - 添加所有缺失的列
# 在服务器上运行: bash /root/xiaolingtong/fix-all-columns.sh

set -e

echo "=========================================="
echo "完整数据库修复 - 添加所有缺失的列"
echo "=========================================="
echo ""

# 读取 .env 文件获取数据库配置
if [ -f /root/xiaolingtong/.env ]; then
    export $(cat /root/xiaolingtong/.env | grep DB_ | xargs)
else
    echo "错误: 找不到 .env 文件"
    exit 1
fi

# 设置默认值
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USERNAME=${DB_USERNAME:-root}
DB_DATABASE=${DB_DATABASE:-xiaolingtong}

echo "数据库配置:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  用户: $DB_USERNAME"
echo "  数据库: $DB_DATABASE"
echo ""

# 执行完整的 SQL 修复脚本
echo "执行完整的 SQL 修复脚本..."
echo ""

mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME -p$DB_PASSWORD $DB_DATABASE << 'EOSQL'

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

EOSQL

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ 数据库修复成功"
    echo ""
    echo "重启服务..."
    pm2 restart xiaolingtong-api

    echo ""
    echo "等待服务启动..."
    sleep 3

    echo ""
    echo "查看服务日志..."
    pm2 logs xiaolingtong-api --lines 30
else
    echo ""
    echo "✗ 数据库修复失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="
