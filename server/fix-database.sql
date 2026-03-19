-- 修复数据库缺失列问题
-- 这个脚本添加 User 表中所有缺失的列

-- 添加所有缺失的列到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS `name` VARCHAR(64) NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `totalOrders` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `completedJobs` INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS `averageRating` DECIMAL(3,1) NOT NULL DEFAULT 0;

-- 验证所有列是否存在
SHOW COLUMNS FROM users WHERE Field IN ('name', 'totalOrders', 'completedJobs', 'averageRating');

-- 显示完整的表结构
DESCRIBE users;
