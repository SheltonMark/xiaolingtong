ALTER TABLE users
  ADD COLUMN IF NOT EXISTS lastActiveAt DATETIME NULL;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS jobId BIGINT NOT NULL DEFAULT 0;

SET @old_unique_index_name := (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversations'
    AND NON_UNIQUE = 0
  GROUP BY INDEX_NAME
  HAVING SUM(CASE WHEN COLUMN_NAME = 'userA' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN COLUMN_NAME = 'userB' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN COLUMN_NAME = 'postId' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN COLUMN_NAME = 'jobId' THEN 1 ELSE 0 END) = 0
  LIMIT 1
);

SET @drop_old_unique_sql := IF(
  @old_unique_index_name IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE conversations DROP INDEX ', @old_unique_index_name)
);

PREPARE drop_old_unique_stmt FROM @drop_old_unique_sql;
EXECUTE drop_old_unique_stmt;
DEALLOCATE PREPARE drop_old_unique_stmt;

SET @new_unique_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'conversations'
    AND INDEX_NAME = 'uk_conversations_users_context'
);

SET @create_new_unique_sql := IF(
  @new_unique_exists > 0,
  'SELECT 1',
  'ALTER TABLE conversations ADD UNIQUE KEY uk_conversations_users_context (userA, userB, postId, jobId)'
);

PREPARE create_new_unique_stmt FROM @create_new_unique_sql;
EXECUTE create_new_unique_stmt;
DEALLOCATE PREPARE create_new_unique_stmt;
