-- =====================================================
-- 创建 worker_certs 表并插入测试数据
-- 在服务器上运行: mysql -h localhost -u xlt -pXLT2026db xiaolingtong < create-worker-certs.sql
-- =====================================================

-- 1. 创建 worker_certs 表
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

-- 2. 插入测试数据
INSERT INTO `worker_certs` (`userId`, `realName`, `idNo`, `idFrontImage`, `idBackImage`, `status`, `createdAt`)
VALUES
  (2, '张三', '110101199001011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW()),
  (3, '李四', '110101199101011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW());

-- 3. 验证
SELECT '=== worker_certs 表数据 ===' as info;
SELECT * FROM worker_certs;

SELECT '' as blank;
SELECT '=== 报名者与认证的关联 ===' as info;
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
