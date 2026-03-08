## 灵豆充值问题诊断指南

### 问题现象
企业端灵豆充值界面，选择套餐200，点击立即充值，进入立即确认支付界面，再点击确认后，当前灵豆余额还为0。

### 可能的原因

#### 1. 支付回调未被触发
**症状**: 支付成功但余额未更新
**检查方法**:
```bash
# 查看后端日志中是否有支付回调记录
grep "灵豆充值成功" server.log
grep "支付成功" server.log
```

**解决方案**:
- 检查微信支付回调 URL 配置是否正确
- 确保 `/api/payment/notify` 端点可以被微信服务器访问
- 检查防火墙和网络配置

#### 2. BeanOrder 表不存在或未初始化
**症状**: 日志中出现 "灵豆订单未找到" 警告
**检查方法**:
```sql
-- 检查表是否存在
SHOW TABLES LIKE 'bean_orders';

-- 检查表结构
DESCRIBE bean_orders;

-- 查看是否有订单记录
SELECT * FROM bean_orders WHERE outTradeNo LIKE 'BEAN_%' ORDER BY createdAt DESC LIMIT 10;
```

**解决方案**:
- 运行数据库迁移: `npm run typeorm migration:run`
- 或手动创建表（见下方 SQL）

#### 3. 订单保存失败
**症状**: 日志中出现数据库错误
**检查方法**:
```bash
# 查看是否有数据库错误
grep -i "error\|exception" server.log | grep -i "bean\|order"
```

**解决方案**:
- 检查数据库连接
- 检查用户权限
- 查看详细错误日志

#### 4. 支付金额与灵豆数量不匹配
**症状**: 充值成功但灵豆数量不对
**检查方法**:
```sql
-- 查看最近的充值记录
SELECT * FROM bean_transactions WHERE type = 'income' ORDER BY createdAt DESC LIMIT 10;

-- 查看用户余额
SELECT id, beanBalance FROM users WHERE id = ?;
```

**解决方案**:
- 检查充值套餐配置是否正确
- 验证支付金额与灵豆数量的对应关系

### 手动创建 BeanOrder 表

如果表不存在，可以手动执行以下 SQL：

```sql
CREATE TABLE IF NOT EXISTS bean_orders (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId BIGINT NOT NULL,
  outTradeNo VARCHAR(64) NOT NULL UNIQUE,
  beanAmount INT NOT NULL,
  totalFee INT NOT NULL COMMENT '单位：分',
  payStatus VARCHAR(32) NOT NULL DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paidAt TIMESTAMP NULL,
  KEY idx_userId (userId),
  KEY idx_outTradeNo (outTradeNo),
  KEY idx_payStatus (payStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 调试步骤

1. **启用详细日志**
```typescript
// 在 PaymentService 中添加更多日志
this.logger.debug(`支付回调详情: ${JSON.stringify(result)}`);
```

2. **测试支付回调**
```bash
# 使用 curl 模拟支付回调
curl -X POST http://localhost:3000/api/payment/notify \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_id",
    "create_time": "2026-03-09T00:00:00+08:00",
    "event_type": "TRANSACTION.SUCCESS",
    "resource_type": "encrypt-resource",
    "summary": "支付成功",
    "resource": {
      "original_type": "transaction",
      "algorithm": "AEAD_AES_256_GCM",
      "ciphertext": "...",
      "associated_data": "transaction",
      "nonce": "..."
    }
  }'
```

3. **检查数据库状态**
```sql
-- 查看最近的订单
SELECT * FROM bean_orders ORDER BY createdAt DESC LIMIT 5;

-- 查看最近的交易
SELECT * FROM bean_transactions WHERE refType = 'recharge' ORDER BY createdAt DESC LIMIT 5;

-- 查看用户余额
SELECT id, beanBalance FROM users WHERE id = ?;
```

### 常见错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|--------|
| 灵豆订单未找到 | BeanOrder 表中没有对应的订单 | 检查订单是否被正确保存 |
| 用户不存在 | 支付回调中的 userId 或 openid 无效 | 检查用户数据 |
| 灵豆充值已处理 | 重复的支付回调 | 正常情况，防重复机制生效 |
| 灵豆充值异常 | 未知错误 | 查看详细错误日志 |

### 前端调试

在前端控制台查看：
```javascript
// 查看支付请求
console.log('支付参数:', {
  timeStamp: data.timeStamp,
  nonceStr: data.nonceStr,
  package: data.package,
  signType: data.signType,
  paySign: data.paySign
});

// 查看轮询过程
console.log('轮询获取余额...');
```

### 性能优化建议

1. **添加缓存**
```typescript
// 缓存用户余额，减少数据库查询
@Cacheable('bean_balance')
async getBalance(userId: number) { ... }
```

2. **异步处理**
```typescript
// 支付回调异步处理，快速响应微信
this.handleBeanPayAsync(outTradeNo, result);
```

3. **批量更新**
```typescript
// 批量更新用户余额，提高性能
await this.userRepo.update(
  { id: In(userIds) },
  { beanBalance: () => `beanBalance + 100` }
);
```

### 联系支持

如果问题仍未解决，请收集以下信息：
1. 完整的后端日志（包含支付回调相关的日志）
2. 数据库中的订单记录
3. 用户的支付流程截图
4. 微信支付后台的交易记录
