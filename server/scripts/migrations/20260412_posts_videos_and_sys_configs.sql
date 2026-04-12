-- 生产环境一次性迁移（MariaDB/MySQL）
-- 用途：posts 表增加 videos；sys_configs 补充灵豆/订阅模板等键（与代码一致）

SET @db := DATABASE();

-- 1) posts.videos（JSON，与 TypeORM json 列一致）
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'videos'
);
SET @q := IF(@exists = 0,
  'ALTER TABLE posts ADD COLUMN videos JSON NULL',
  'SELECT ''skip: posts.videos exists'' AS msg'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 系统配置（存在则跳过，不覆盖已有 value）
INSERT INTO sys_configs (`key`, `value`, `label`, `group`) VALUES
  ('new_user_bean_reward', '30', '新用户注册赠送灵豆数', 'bean'),
  ('invite_bean_reward', '5', '邀请好友注册奖励灵豆数', 'bean'),
  ('subscribe_tpl_new_message', '', '订阅消息模板ID-新消息通知', 'subscribe'),
  ('subscribe_tpl_application_status', '', '订阅消息模板ID-报名状态变更', 'subscribe')
ON DUPLICATE KEY UPDATE id = id;
