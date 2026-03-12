-- 修复 wallet_transactions.type 枚举，添加 commission
ALTER TABLE wallet_transactions MODIFY COLUMN type ENUM('income','withdraw','refund','commission') NOT NULL;

-- 给铭品日用品(userId=2)加5元余额，模拟邀请返佣收入
UPDATE wallets SET balance = 5.00, totalIncome = 5.00 WHERE userId = 2;

INSERT INTO wallet_transactions (userId, type, amount, refType, refId, status, remark)
VALUES (2, 'commission', 5.00, 'bean_recharge', 0, 'success', '邀请返佣(测试数据)');

-- 给临工用户(userId=8)加3元余额，模拟工资收入
UPDATE wallets SET balance = 3.00, totalIncome = 3.00 WHERE userId = 8;

INSERT INTO wallet_transactions (userId, type, amount, refType, refId, status, remark)
VALUES (8, 'income', 3.00, 'settlement', 0, 'success', '工资结算(测试数据)');
