#!/bin/bash

# =====================================================
# 创建 worker_certs 表并插入测试数据
# 在服务器上直接运行: bash create-worker-certs.sh
# =====================================================

set -e

DB_HOST="localhost"
DB_USER="xlt"
DB_PASSWORD="XLT2026db"
DB_NAME="xiaolingtong"

echo "=========================================="
echo "开始创建 worker_certs 表"
echo "=========================================="
echo ""

# 1. 创建表
echo "📝 步骤 1: 创建 worker_certs 表..."
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

if [ $? -eq 0 ]; then
  echo "✅ 表创建成功"
else
  echo "❌ 表创建失败"
  exit 1
fi

echo ""

# 2. 插入测试数据
echo "📝 步骤 2: 插入测试数据..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
INSERT INTO `worker_certs` (`userId`, `realName`, `idNo`, `idFrontImage`, `idBackImage`, `status`, `createdAt`)
VALUES
  (2, '张三', '110101199001011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW()),
  (3, '李四', '110101199101011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW());
EOF

if [ $? -eq 0 ]; then
  echo "✅ 测试数据插入成功"
else
  echo "❌ 测试数据插入失败"
  exit 1
fi

echo ""

# 3. 验证
echo "📝 步骤 3: 验证数据..."
echo ""
echo "worker_certs 表数据:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM worker_certs;"

echo ""
echo "报名者与认证的关联:"
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
echo "=========================================="
echo "✅ 完成！worker_certs 表已创建并填充数据"
echo "=========================================="
echo ""
echo "现在前端应该能显示报名者的 realName 了"
echo ""
