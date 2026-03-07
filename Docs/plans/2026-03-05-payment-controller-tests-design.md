# Payment Controller 单元测试设计文档

**日期**: 2026-03-05
**模块**: Payment Controller
**目标**: 100% 语句覆盖率
**预计用例数**: 10 个
**预计迭代**: 8-10 次

---

## 1. 概述

为 Payment Controller 编写完整的单元测试，使用 Mock Service 方案，专注于测试 Controller 层的职责：
- 请求处理和验证
- 加密数据解密
- 支付状态处理
- 错误处理和恢复
- HTTP 响应生成

---

## 2. 测试架构

### 2.1 端点清单

Payment Controller 有 1 个公开端点：

| 方法 | 路由 | 认证 | 描述 |
|------|------|------|------|
| POST | /payment/notify | 否 | 微信支付回调通知 |

### 2.2 测试场景矩阵

| 场景 | 用例数 | 描述 |
|------|--------|------|
| 成功支付回调 | 2 | 正常支付成功、多种支付类型 |
| 支付失败回调 | 1 | 支付失败状态处理 |
| 加密验证失败 | 2 | 解密异常、无效数据 |
| Service 异常 | 2 | handlePaySuccess 异常、其他异常 |
| 请求体验证 | 2 | 缺少必需字段、无效格式 |
| 边界情况 | 1 | 空请求体 |
| **总计** | **10** | - |

---

## 3. Mock 策略

### 3.1 Service Mock

```typescript
paymentService = {
  decryptNotify: jest.fn(),
  handlePaySuccess: jest.fn(),
}
```

### 3.2 Request/Response Mock

使用 Express 的 Request 和 Response 对象：
- req.body：包含加密的支付回调数据
- res.json()：返回 JSON 响应
- res.status()：设置 HTTP 状态码

### 3.3 测试数据

```typescript
// 成功支付回调数据
{
  out_trade_no: 'WD_1_123456_abcd',
  trade_state: 'SUCCESS',
  transaction_id: 'wx_transaction_123',
  amount: 500,
}

// 失败支付回调数据
{
  out_trade_no: 'WD_1_123456_abcd',
  trade_state: 'FAIL',
  transaction_id: 'wx_transaction_123',
}

// 成功响应
{ code: 'SUCCESS', message: '成功' }

// 失败响应
{ code: 'FAIL', message: 'error message' }
```

---

## 4. 详细测试场景

### 4.1 成功支付回调 (2 个用例)

**用例 1: 支付成功，返回 SUCCESS 响应**
- 输入：trade_state = 'SUCCESS' 的回调数据
- 预期：调用 handlePaySuccess，返回 { code: 'SUCCESS', message: '成功' }

**用例 2: 多种支付类型成功处理**
- 输入：不同 out_trade_no 前缀的成功回调
- 预期：正确分发处理，返回成功响应

### 4.2 支付失败回调 (1 个用例)

**用例 1: 支付失败状态，不调用 handlePaySuccess**
- 输入：trade_state != 'SUCCESS' 的回调数据
- 预期：不调用 handlePaySuccess，返回成功响应

### 4.3 加密验证失败 (2 个用例)

**用例 1: decryptNotify 抛出异常**
- 输入：无效的加密数据
- 预期：捕获异常，返回 { code: 'FAIL', message: 'error message' }

**用例 2: 无效的加密数据格式**
- 输入：格式错误的请求体
- 预期：decryptNotify 验证失败，返回错误响应

### 4.4 Service 异常 (2 个用例)

**用例 1: handlePaySuccess 抛出异常**
- 输入：有效的成功回调，但 handlePaySuccess 抛出异常
- 预期：捕获异常，返回错误响应

**用例 2: 其他 Service 异常**
- 输入：任何导致异常的情况
- 预期：返回 500 错误响应

### 4.5 请求体验证 (2 个用例)

**用例 1: 缺少必需字段**
- 输入：缺少 out_trade_no 或 trade_state 的数据
- 预期：验证失败，返回错误响应

**用例 2: 无效的请求格式**
- 输入：非 JSON 格式或格式错误的数据
- 预期：解析失败，返回错误响应

### 4.6 边界情况 (1 个用例)

**用例 1: 空请求体**
- 输入：空对象 {}
- 预期：验证失败或异常处理

---

## 5. Ralph 循环配置

### 5.1 命令

```bash
/ralph-loop "为 Payment Controller 编写完整的单元测试。

目标：
- 为 notify 端点编写测试
- 覆盖：成功回调、失败回调、加密验证、异常处理、请求验证、边界情况
- 达到 100% 语句覆盖率
- 所有测试通过

使用 Mock Service 方案，不依赖真实支付系统。

完成标志：<promise>COMPLETE</promise>" \
  --max-iterations 10 \
  --completion-promise "COMPLETE"
```

### 5.2 迭代策略

- **迭代 1-2**: 基础框架 + 成功回调测试
- **迭代 3-5**: 失败回调、加密验证、异常处理测试
- **迭代 6-8**: 请求验证、边界情况测试
- **迭代 9-10**: 覆盖率补充和最终调整

---

## 6. 成功标准

### 6.1 功能完整性

- ✅ notify 端点有完整测试
- ✅ 共 10 个测试用例
- ✅ 覆盖所有场景（成功、失败、异常、验证、边界）

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
server/src/modules/payment/
├── payment.controller.ts (现有)
├── payment.service.ts (现有)
├── payment.service.spec.ts (现有)
└── payment.controller.spec.ts (新建)
```

---

## 8. 参考

- 现有 Service 测试：payment.service.spec.ts (13 个用例，71.73% 覆盖率)
- Post Controller 测试：post.controller.spec.ts (33 个用例，100% 覆盖率)
- Auth Controller 测试：auth.controller.spec.ts (16 个用例，100% 覆盖率)
- User Controller 测试：user.controller.spec.ts (28 个用例，100% 覆盖率)
- Wallet Controller 测试：wallet.controller.spec.ts (20 个用例，100% 覆盖率)
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 9. 后续计划

完成 Payment Controller 测试后，继续最后一个模块：
1. Favorite Controller (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
