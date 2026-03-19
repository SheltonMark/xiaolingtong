#!/bin/bash

# 招工详情界面诊断脚本
# 用法: bash diagnose.sh

echo "=========================================="
echo "招工详情界面 - 快速诊断脚本"
echo "=========================================="
echo ""

# 配置
DB_USER="root"
DB_PASSWORD=""
DB_HOST="localhost"
DB_NAME="xiaolingtong"
JOB_ID="1"

echo "1. 检查数据库连接..."
mysql -u $DB_USER -p"$DB_PASSWORD" -h $DB_HOST $DB_NAME -e "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "   ✅ 数据库连接成功"
else
  echo "   ❌ 数据库连接失败"
  exit 1
fi
echo ""

echo "2. 检查报名数据..."
TOTAL_APPS=$(mysql -u $DB_USER -p"$DB_PASSWORD" -h $DB_HOST $DB_NAME -N -e "SELECT COUNT(*) FROM job_applications WHERE jobId = $JOB_ID;")
echo "   招工 ID $JOB_ID 的报名数: $TOTAL_APPS"
if [ "$TOTAL_APPS" -eq 0 ]; then
  echo "   ⚠️  没有报名数据"
else
  echo "   ✅ 有报名数据"
fi
echo ""

echo "3. 检查 Worker 用户信息..."
mysql -u $DB_USER -p"$DB_PASSWORD" -h $DB_HOST $DB_NAME << EOF
SELECT
  '   应用ID' as label, 'Worker ID' as worker_id, '昵称' as nickname, '信用分' as credit, '订单数' as orders
UNION ALL
SELECT
  CONCAT('   ', ja.id),
  CONCAT(ja.workerId),
  u.nickname,
  CONCAT(u.creditScore),
  CONCAT(u.totalOrders)
FROM job_applications ja
LEFT JOIN users u ON ja.workerId = u.id
WHERE ja.jobId = $JOB_ID
LIMIT 5;
EOF
echo ""

echo "4. 检查 Worker 认证信息..."
mysql -u $DB_USER -p"$DB_PASSWORD" -h $DB_HOST $DB_NAME << EOF
SELECT
  '   User ID' as label, '真实姓名' as realName, '状态' as status
UNION ALL
SELECT
  CONCAT('   ', userId),
  realName,
  status
FROM worker_certs
WHERE userId IN (
  SELECT DISTINCT workerId FROM job_applications WHERE jobId = $JOB_ID
)
LIMIT 5;
EOF
echo ""

echo "5. 检查数据完整性..."
mysql -u $DB_USER -p"$DB_PASSWORD" -h $DB_HOST $DB_NAME << EOF
SELECT
  CONCAT('   总 Worker 数: ', COUNT(*)) as info
FROM users
WHERE role = 'worker'
UNION ALL
SELECT
  CONCAT('   NULL totalOrders: ', SUM(CASE WHEN totalOrders IS NULL THEN 1 ELSE 0 END))
FROM users
WHERE role = 'worker'
UNION ALL
SELECT
  CONCAT('   NULL completedJobs: ', SUM(CASE WHEN completedJobs IS NULL THEN 1 ELSE 0 END))
FROM users
WHERE role = 'worker'
UNION ALL
SELECT
  CONCAT('   NULL averageRating: ', SUM(CASE WHEN averageRating IS NULL THEN 1 ELSE 0 END))
FROM users
WHERE role = 'worker';
EOF
echo ""

echo "6. 检查孤立的报名记录..."
ORPHANED=$(mysql -u $DB_USER -p"$DB_PASSWORD" -h $DB_HOST $DB_NAME -N -e "SELECT COUNT(*) FROM job_applications ja LEFT JOIN users u ON ja.workerId = u.id WHERE u.id IS NULL;")
echo "   孤立的报名记录: $ORPHANED"
if [ "$ORPHANED" -gt 0 ]; then
  echo "   ⚠️  有孤立的报名记录"
else
  echo "   ✅ 没有孤立的报名记录"
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "建议:"
echo "1. 如果报名数为 0，需要创建测试数据"
echo "2. 如果 Worker 信息为空，检查数据库关系"
echo "3. 如果有 NULL 值，需要更新数据库"
echo "4. 如果有孤立记录，需要清理数据"
