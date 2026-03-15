#!/bin/bash

# 招工详情界面 - 报名者信息诊断脚本

echo "=========================================="
echo "招工详情界面 - 报名者信息诊断"
echo "=========================================="
echo ""

# 检查数据库连接
echo "1. 检查数据库连接..."
mysql -u root -p"$DB_PASSWORD" -h localhost xiaolingtong -e "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ 数据库连接成功"
else
  echo "❌ 数据库连接失败"
  exit 1
fi
echo ""

# 检查报名数据
echo "2. 检查报名数据..."
TOTAL_APPS=$(mysql -u root -p"$DB_PASSWORD" -h localhost xiaolingtong -N -e "SELECT COUNT(*) FROM job_applications;")
echo "   总报名数: $TOTAL_APPS"

if [ "$TOTAL_APPS" -eq 0 ]; then
  echo "   ⚠️  没有报名数据"
else
  echo "   ✅ 有报名数据"
fi
echo ""

# 检查报名者详情
echo "3. 检查报名者详情..."
mysql -u root -p"$DB_PASSWORD" -h localhost xiaolingtong -e "
SELECT
  ja.id as 'App ID',
  ja.jobId as 'Job ID',
  ja.workerId as 'Worker ID',
  ja.status as 'Status',
  u.nickname as 'Worker Name',
  u.creditScore as 'Credit Score',
  u.totalOrders as 'Total Orders',
  u.completedJobs as 'Completed Jobs',
  u.averageRating as 'Avg Rating'
FROM job_applications ja
LEFT JOIN users u ON ja.workerId = u.id
LIMIT 10;
"
echo ""

# 检查 Worker 字段
echo "4. 检查 Worker 字段是否为 NULL..."
NULL_WORKERS=$(mysql -u root -p"$DB_PASSWORD" -h localhost xiaolingtong -N -e "
SELECT COUNT(*) FROM job_applications ja
WHERE ja.workerId IS NULL;
")
echo "   NULL Worker 数: $NULL_WORKERS"

if [ "$NULL_WORKERS" -gt 0 ]; then
  echo "   ⚠️  有报名记录的 workerId 为 NULL"
else
  echo "   ✅ 所有报名记录都有 workerId"
fi
echo ""

# 检查 Worker 用户是否存在
echo "5. 检查 Worker 用户是否存在..."
MISSING_WORKERS=$(mysql -u root -p"$DB_PASSWORD" -h localhost xiaolingtong -N -e "
SELECT COUNT(*) FROM job_applications ja
WHERE ja.workerId IS NOT NULL
AND ja.workerId NOT IN (SELECT id FROM users);
")
echo "   缺失的 Worker 用户数: $MISSING_WORKERS"

if [ "$MISSING_WORKERS" -gt 0 ]; then
  echo "   ⚠️  有报名记录的 worker 用户不存在"
else
  echo "   ✅ 所有 worker 用户都存在"
fi
echo ""

# 检查 Worker 字段值
echo "6. 检查 Worker 字段值..."
mysql -u root -p"$DB_PASSWORD" -h localhost xiaolingtong -e "
SELECT
  COUNT(*) as 'Total',
  SUM(CASE WHEN totalOrders IS NULL THEN 1 ELSE 0 END) as 'NULL totalOrders',
  SUM(CASE WHEN completedJobs IS NULL THEN 1 ELSE 0 END) as 'NULL completedJobs',
  SUM(CASE WHEN averageRating IS NULL THEN 1 ELSE 0 END) as 'NULL averageRating',
  SUM(CASE WHEN creditScore IS NULL THEN 1 ELSE 0 END) as 'NULL creditScore'
FROM users
WHERE role = 'worker';
"
echo ""

# 检查后端测试
echo "7. 检查后端测试..."
cd server
npm test -- job.phase2 > /tmp/test_output.txt 2>&1
if grep -q "38 passed" /tmp/test_output.txt; then
  echo "   ✅ 后端测试全部通过 (38/38)"
else
  echo "   ❌ 后端测试失败"
  tail -20 /tmp/test_output.txt
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="
