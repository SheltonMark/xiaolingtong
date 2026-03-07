# Wallet Controller 单元测试设计文档

**日期**: 2026-03-05
**模块**: Wallet Controller
**目标**: 100% 语句覆盖率
**预计用例数**: 20 个
**预计迭代**: 10-12 次

---

## 1. 概述

为 Wallet Controller 编写完整的单元测试，使用 Mock Service 方案，专注于测试 Controller 层的职责：
- 参数验证（分页参数、金额等）
- 装饰器功能（@CurrentUser）
- 权限验证
- 请求-响应映射
- 错误处理

---

## 2. 测试架构

### 2.1 端点清单

Wallet Controller 有 4 个端点（全部需要认证）：

| 方法 | 路由 | 认证 | 描述 |
|------|------|------|------|
| GET | /wallet | 是 | 获取余额 |
| GET | /wallet/transactions | 是 | 获取交易记录 |
| GET | /wallet/income | 是 | 获取收入 |
| POST | /wallet/withdraw | 是 | 提现 |

### 2.2 测试场景矩阵

| 端点 | 成功 | 参数错误 | 权限错误 | Service 异常 | 边界 | 小计 |
|------|------|--------|--------|------------|------|------|
| getBalance | 1 | - | 1 | 1 | 1 | 4 |
| getTransactions | 1 | 1 | 1 | 1 | 1 | 5 |
| getIncome | 1 | 1 | 1 | 1 | 1 | 5 |
| withdraw | 1 | 2 | 1 | 1 | 1 | 6 |
| **总计** | **4** | **4** | **4** | **4** | **4** | **20** |

---

## 3. Mock 策略

### 3.1 Service Mock

```typescript
walletService = {
  getBalance: jest.fn(),
  getTransactions: jest.fn(),
  getIncome: jest.fn(),
  withdraw: jest.fn(),
}
```

### 3.2 装饰器 Mock

使用 NestJS Testing 模块的 `@CurrentUser` 装饰器注入：
- 认证用户：userId = 1
- 未认证用户：userId = undefined

### 3.3 测试数据

```typescript
// getBalance 成功响应
{
  id: 1,
  userId: 1,
  balance: 1000,
  totalIncome: 5000,
  totalWithdraw: 4000,
}

// getTransactions 成功响应
{
  list: [
    { id: 1, userId: 1, type: 'income', amount: 100, createdAt: new Date() },
    { id: 2, userId: 1, type: 'withdraw', amount: 50, createdAt: new Date() },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

// getIncome 成功响应
{
  list: [
    { id: 1, userId: 1, type: 'income', amount: 500, status: 'success', createdAt: new Date() },
  ],
  totalAmount: 500,
  month: '2026-03',
}

// withdraw 成功响应
{
  message: '提现成功',
  balance: 500,
  transactionId: 'tx_123',
}

// 错误响应
BadRequestException('Invalid parameters')
BadRequestException('Insufficient balance')
```

---

## 4. 详细测试场景

### 4.1 getBalance 端点 (4 个用例)

**用例 1: 成功获取余额**
- 输入：userId = 1
- 预期：返回钱包余额信息

**用例 2: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 3: Service 异常**
- 输入：有效的 userId，但 Service 抛出异常
- 预期：异常传播

**用例 4: userId 为 0**
- 输入：userId = 0
- 预期：Service 处理或抛出异常

### 4.2 getTransactions 端点 (5 个用例)

**用例 1: 成功获取交易记录**
- 输入：userId = 1, query = { page: 1, pageSize: 20 }
- 预期：返回交易列表和分页信息

**用例 2: 无效的分页参数**
- 输入：query = { page: -1, pageSize: 0 }
- 预期：Service 验证失败或异常

**用例 3: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 4: Service 异常**
- 输入：有效的参数，但 Service 抛出异常
- 预期：异常传播

**用例 5: 空交易列表**
- 输入：userId = 1，但用户无交易记录
- 预期：返回空列表

### 4.3 getIncome 端点 (5 个用例)

**用例 1: 成功获取收入**
- 输入：userId = 1, query = { month: '2026-03' }
- 预期：返回收入列表和总金额

**用例 2: 无效的月份参数**
- 输入：query = { month: 'invalid_month' }
- 预期：Service 验证失败或异常

**用例 3: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 4: Service 异常**
- 输入：有效的参数，但 Service 抛出异常
- 预期：异常传播

**用例 5: 无收入记录**
- 输入：userId = 1，但用户无收入记录
- 预期：返回空列表和零总金额

### 4.4 withdraw 端点 (6 个用例)

**用例 1: 成功提现**
- 输入：userId = 1, amount = 500
- 预期：返回提现成功消息和新余额

**用例 2: 金额为负数**
- 输入：amount = -100
- 预期：Service 验证失败或异常

**用例 3: 金额为零**
- 输入：amount = 0
- 预期：Service 验证失败或异常

**用例 4: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 5: Service 异常**
- 输入：有效的参数，但 Service 抛出异常
- 预期：异常传播

**用例 6: 超大金额**
- 输入：amount = 999999999
- 预期：Service 处理或抛出异常

---

## 5. Ralph 循环配置

### 5.1 命令

```bash
/ralph-loop "为 Wallet Controller 编写完整的单元测试。

目标：
- 为所有 4 个端点编写测试
- 每个端点覆盖：成功路径、参数验证、权限验证、异常处理、边界情况
- 达到 100% 语句覆盖率
- 所有测试通过

使用 Mock Service 方案，不依赖真实数据库。

完成标志：<promise>COMPLETE</promise>" \
  --max-iterations 12 \
  --completion-promise "COMPLETE"
```

### 5.2 迭代策略

- **迭代 1-3**: 基础框架 + getBalance 端点
- **迭代 4-6**: getTransactions 端点
- **迭代 7-9**: getIncome 端点
- **迭代 10-11**: withdraw 端点
- **迭代 12**: 覆盖率补充和最终调整

---

## 6. 成功标准

### 6.1 功能完整性

- ✅ 所有 4 个端点都有测试
- ✅ 共 20 个测试用例
- ✅ 覆盖所有场景（成功、参数错误、权限错误、异常、边界）

### 6.2 代码质量

- ✅ 100% 语句覆盖率
- ✅ 所有测试通过
- ✅ 代码遵循项目规范
- ✅ 使用 ESLint 禁用注释处理 TypeScript 不安全类型

### 6.3 集成

- ✅ 代码提交到 git
- ✅ 合并到 origin/main
- ✅ 推送到远程仓库

---

## 7. 文件结构

```
server/src/modules/wallet/
├── wallet.controller.ts (现有)
├── wallet.service.ts (现有)
├── wallet.service.spec.ts (现有)
└── wallet.controller.spec.ts (新建)
```

---

## 8. 参考

- 现有 Service 测试：wallet.service.spec.ts (16 个用例，100% 覆盖率)
- Post Controller 测试：post.controller.spec.ts (33 个用例，100% 覆盖率)
- Auth Controller 测试：auth.controller.spec.ts (16 个用例，100% 覆盖率)
- User Controller 测试：user.controller.spec.ts (28 个用例，100% 覆盖率)
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 9. 后续计划

完成 Wallet Controller 测试后，按以下顺序继续其他模块：
1. Payment Controller (3 个端点，预计 12-15 个用例)
2. Favorite Controller (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
