-- Backfill missing exposure images discovered on 2026-03-22.
--
-- Source of truth for candidate objects:
-- 1) Production `exposures.images` is NULL for ids 1/2/3.
-- 2) Matching COS objects were identified by creation-time windows.
--
-- Confidence:
-- - id=2: high, single candidate around 2026-03-04 15:19 CST
-- - id=3: high, two candidates around 2026-03-20 15:00 CST
-- - id=1: medium, multiple candidates; this script uses the two closest
--         objects to the exposure create time and excludes the tiny test file
--         plus the much later uploads.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS exposure_image_backfill_backup_20260322 (
  exposureId BIGINT NOT NULL PRIMARY KEY,
  previousImages JSON NULL,
  note VARCHAR(255) NOT NULL,
  backedUpAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO exposure_image_backfill_backup_20260322 (exposureId, previousImages, note)
SELECT
  id,
  images,
  'Backfill exposure images on 2026-03-22'
FROM exposures
WHERE id IN (1, 2, 3)
ON DUPLICATE KEY UPDATE
  previousImages = VALUES(previousImages),
  note = VALUES(note),
  backedUpAt = CURRENT_TIMESTAMP;

UPDATE exposures
SET images = JSON_ARRAY(
  'https://xiaolingtong-1406107844.cos.ap-shanghai.myqcloud.com/uploads/1772608752602-799331850.png'
)
WHERE id = 2
  AND (images IS NULL OR JSON_LENGTH(images) = 0);

UPDATE exposures
SET images = JSON_ARRAY(
  'https://xiaolingtong-1406107844.cos.ap-shanghai.myqcloud.com/uploads/1773990028120-484717531.jpg',
  'https://xiaolingtong-1406107844.cos.ap-shanghai.myqcloud.com/uploads/1773990036495-429114477.jpg'
)
WHERE id = 3
  AND (images IS NULL OR JSON_LENGTH(images) = 0);

UPDATE exposures
SET images = JSON_ARRAY(
  'https://xiaolingtong-1406107844.cos.ap-shanghai.myqcloud.com/uploads/1772591360717-591738340.jpg',
  'https://xiaolingtong-1406107844.cos.ap-shanghai.myqcloud.com/uploads/1772591383528-236243523.png'
)
WHERE id = 1
  AND (images IS NULL OR JSON_LENGTH(images) = 0);

COMMIT;

SELECT
  id,
  createdAt,
  JSON_LENGTH(images) AS imageCount,
  images
FROM exposures
WHERE id IN (1, 2, 3)
ORDER BY id;
