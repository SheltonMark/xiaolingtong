-- 帖子关联开放城市（首页地区筛选）
-- 执行前请备份。若库中尚无「义乌」，先插入再回填。

INSERT INTO open_cities (name, isActive, createdAt)
SELECT '义乌', 1, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM open_cities WHERE name = '义乌' LIMIT 1);

ALTER TABLE posts
  ADD COLUMN openCityId INT NULL COMMENT '开放城市ID，关联 open_cities.id' AFTER lng;

-- 历史数据：全部归为义乌
UPDATE posts p
INNER JOIN open_cities c ON c.name = '义乌' AND c.isActive = 1
SET p.openCityId = c.id
WHERE p.openCityId IS NULL;
