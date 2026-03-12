-- 添加急招价格配置
INSERT INTO sys_configs (`key`, `value`, `description`) VALUES
('urgent_price_per_day', '30', '急招价格（灵豆/天）'),
('urgent_price_3d', '90', '急招3天价格（灵豆）'),
('urgent_price_7d', '210', '急招7天价格（灵豆）'),
('urgent_price_30d', '900', '急招30天价格（灵豆）')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `description` = VALUES(`description`);
