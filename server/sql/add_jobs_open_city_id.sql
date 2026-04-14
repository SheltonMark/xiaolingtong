-- 招工关联开放城市（临工端列表按地区筛选）
INSERT INTO open_cities (name, isActive, createdAt)
SELECT '义乌', 1, NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM open_cities WHERE name = '义乌' LIMIT 1);

ALTER TABLE jobs
  ADD COLUMN openCityId INT NULL COMMENT '开放城市ID' AFTER lng;

UPDATE jobs j
INNER JOIN open_cities c ON c.name = '义乌' AND c.isActive = 1
SET j.openCityId = c.id
WHERE j.openCityId IS NULL;
