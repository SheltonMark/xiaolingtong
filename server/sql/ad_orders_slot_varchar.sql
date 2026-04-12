-- 将 ad_orders.slot 从 enum 扩展为可存 home_* 等位（MySQL）
-- 执行前请备份；若已同步为 varchar 可跳过。

ALTER TABLE `ad_orders`
  MODIFY COLUMN `slot` VARCHAR(32) NOT NULL DEFAULT 'banner';
