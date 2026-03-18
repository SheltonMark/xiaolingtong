-- Contact profile + certification + contact visibility schema alignment
-- Run this once in production before enabling the related frontend/backend flows.

SET @db = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verifiedPhone'
  ),
  'SELECT ''users.verifiedPhone exists''',
  'ALTER TABLE users ADD COLUMN verifiedPhone VARCHAR(20) NULL AFTER phone'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS contact_profiles (
  id BIGINT NOT NULL AUTO_INCREMENT,
  userId BIGINT NOT NULL,
  contactName VARCHAR(32) NULL,
  phone VARCHAR(20) NULL,
  phoneVerified TINYINT NOT NULL DEFAULT 0,
  wechatId VARCHAR(64) NULL,
  wechatQrImage VARCHAR(512) NULL,
  isDefault TINYINT NOT NULL DEFAULT 1,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_profiles_user_status (userId, status),
  KEY idx_contact_profiles_user_default (userId, isDefault),
  CONSTRAINT fk_contact_profiles_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS verification_sessions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  userId BIGINT NOT NULL,
  scene ENUM('enterprise_cert', 'worker_cert') NOT NULL,
  phone VARCHAR(20) NOT NULL,
  smsCodeHash VARCHAR(128) NOT NULL,
  verificationToken VARCHAR(64) NULL,
  ocrPayload JSON NULL,
  verifiedAt DATETIME NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_verification_sessions_scene (userId, scene),
  KEY idx_verification_sessions_phone (phone),
  KEY idx_verification_sessions_token (userId, scene, verificationToken),
  CONSTRAINT fk_verification_sessions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'contactWechat'
  ),
  'SELECT ''posts.contactWechat exists''',
  'ALTER TABLE posts ADD COLUMN contactWechat VARCHAR(64) NULL AFTER contactPhone'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'contactWechatQr'
  ),
  'SELECT ''posts.contactWechatQr exists''',
  'ALTER TABLE posts ADD COLUMN contactWechatQr VARCHAR(512) NULL AFTER contactWechat'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'showPhone'
  ),
  'SELECT ''posts.showPhone exists''',
  'ALTER TABLE posts ADD COLUMN showPhone TINYINT NOT NULL DEFAULT 0 AFTER contactWechatQr'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'showWechat'
  ),
  'SELECT ''posts.showWechat exists''',
  'ALTER TABLE posts ADD COLUMN showWechat TINYINT NOT NULL DEFAULT 0 AFTER showPhone'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'showWechatQr'
  ),
  'SELECT ''posts.showWechatQr exists''',
  'ALTER TABLE posts ADD COLUMN showWechatQr TINYINT NOT NULL DEFAULT 0 AFTER showWechat'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'contactWechat'
  ),
  'SELECT ''jobs.contactWechat exists''',
  'ALTER TABLE jobs ADD COLUMN contactWechat VARCHAR(64) NULL AFTER contactPhone'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'contactWechatQr'
  ),
  'SELECT ''jobs.contactWechatQr exists''',
  'ALTER TABLE jobs ADD COLUMN contactWechatQr VARCHAR(512) NULL AFTER contactWechat'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'showPhone'
  ),
  'SELECT ''jobs.showPhone exists''',
  'ALTER TABLE jobs ADD COLUMN showPhone TINYINT NOT NULL DEFAULT 0 AFTER contactWechatQr'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'showWechat'
  ),
  'SELECT ''jobs.showWechat exists''',
  'ALTER TABLE jobs ADD COLUMN showWechat TINYINT NOT NULL DEFAULT 0 AFTER showPhone'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'showWechatQr'
  ),
  'SELECT ''jobs.showWechatQr exists''',
  'ALTER TABLE jobs ADD COLUMN showWechatQr TINYINT NOT NULL DEFAULT 0 AFTER showWechat'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
