#!/bin/bash

# =====================================================
# 一键修复：创建 worker_certs 表
# 使用方法: bash fix-worker-certs.sh
# =====================================================

set -e

DB_HOST="localhost"
DB_USER="xlt"
DB_PASSWORD="XLT2026db"
DB_NAME="xiaolingtong"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  修复招工详情页面报名者显示问题                ║"
echo "║  创建 worker_certs 表并插入测试数据            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# 检查 MySQL 是否可用
if ! command -v mysql &> /dev/null; then
  echo "❌ 错误: 未找到 mysql 命令"
  echo "请确保已安装 MySQL 客户端"
  exit 1
fi

# 测试数据库连接
echo "🔍 测试数据库连接..."
if ! mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT 1;" &> /dev/null; then
  echo "❌ 错误: 无法连接到数据库"
  echo "请检查数据库配置:"
  echo "  主机: $DB_HOST"
  echo "  用户: $DB_USER"
  echo "  数据库: $DB_NAME"
  exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 检查 worker_certs 表是否已存在
echo "🔍 检查 worker_certs 表..."
TABLE_EXISTS=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE 'worker_certs';" | wc -l)

if [ $TABLE_EXISTS -gt 1 ]; then
  echo "⚠️  worker_certs 表已存在"
  read -p "是否要清空并重新插入数据? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  清空现有数据..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DELETE FROM worker_certs;"
  else
    echo "⏭️  跳过创建表步骤"
  fi
else
  echo "📝 创建 worker_certs 表..."
  mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS `worker_certs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `userId` bigint(20) NOT NULL,
  `realName` varchar(32) NOT NULL,
  `idNo` varchar(32) NOT NULL,
  `idFrontImage` varchar(512) NOT NULL,
  `idBackImage` varchar(512) NOT NULL,
  `skills` json DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `rejectReason` varchar(256) DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `worker_certs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF
  echo "✅ 表创建成功"
fi

echo ""
echo "📝 插入测试数据..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
INSERT INTO `worker_certs` (`userId`, `realName`, `idNo`, `idFrontImage`, `idBackImage`, `status`, `createdAt`)
VALUES
  (2, '张三', '110101199001011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW()),
  (3, '李四', '110101199101011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW());
EOF
echo "✅ 测试数据插入成功"

echo ""
echo "📊 验证结果..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "worker_certs 表数据:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT id, userId, realName, status FROM worker_certs;"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "报名者与认证的关联:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT
  ja.id as appId,
  ja.jobId,
  ja.workerId,
  ja.status as appStatus,
  wc.realName,
  u.nickname,
  u.creditScore
FROM job_applications ja
LEFT JOIN worker_certs wc ON ja.workerId = wc.userId
LEFT JOIN users u ON ja.workerId = u.id
LIMIT 10;
"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║  ✅ 完成！worker_certs 表已创建并填充数据      ║"
echo "║  现在前端应该能显示报名者的 realName 了        ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
