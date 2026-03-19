-- 创建 worker_certs 表
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

-- 为现有的报名者插入测试数据
-- 先查询有哪些 worker_id
-- SELECT DISTINCT workerId FROM job_applications;

-- 插入测试数据（根据实际的 worker_id 修改）
INSERT INTO `worker_certs` (`userId`, `realName`, `idNo`, `idFrontImage`, `idBackImage`, `status`, `createdAt`)
VALUES
  (2, '张三', '110101199001011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW()),
  (3, '李四', '110101199101011234', 'https://example.com/id-front.jpg', 'https://example.com/id-back.jpg', 'approved', NOW());
