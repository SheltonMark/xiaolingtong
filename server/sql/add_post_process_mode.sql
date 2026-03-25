-- Add explicit process mode storage for process posts.
-- Run this once in production before deploying the backend that writes posts.processMode.

SET @db = DATABASE();

SET @sql = IF(
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'processMode'
  ),
  'SELECT ''posts.processMode exists''',
  'ALTER TABLE posts ADD COLUMN processMode VARCHAR(16) NULL AFTER industry'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE posts
SET processMode = JSON_UNQUOTE(JSON_EXTRACT(fields, '$.processMode'))
WHERE processMode IS NULL
  AND JSON_EXTRACT(fields, '$.processMode') IS NOT NULL;
