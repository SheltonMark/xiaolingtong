-- 完整数据库修复脚本
-- 添加所有缺失的列到各个表

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
