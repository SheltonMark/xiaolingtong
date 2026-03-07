# Payment Controller 单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Payment Controller 编写 10 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Service 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock，为 notify 端点编写完整的单元测试。测试支付回调处理、加密验证、异常处理和请求验证。

**Tech Stack:** NestJS, Jest, Express, Mock Functions

---

## 任务分解

### Task 1: 创建测试文件框架和 Mock 设置

**文件:**
- Create: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/payment/payment.controller.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { BadRequestException } from '@nestjs/common';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<PaymentService>;
  let req: any;
  let res: any;

  beforeEach(async () => {
    paymentService = {
      decryptNotify: jest.fn(),
      handlePaySuccess: jest.fn(),
    } as jest.Mocked<PaymentService>;

    req = {
      body: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  describe('notify', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- payment.controller.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 创建 Payment Controller 测试框架"
```

---

### Task 2: 实现成功支付回调测试 (2 个用例)

**文件:**
- Modify: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 编写成功支付回调的测试**

在 `describe('notify', ...)` 块中添加：

```typescript
describe('notify', () => {
  it('should handle successful payment notification', async () => {
    const notifyData = {
      out_trade_no: 'WD_1_123456_abcd',
      trade_state: 'SUCCESS',
      transaction_id: 'wx_transaction_123',
      amount: 500,
    };

    req.body = notifyData;
    paymentService.decryptNotify.mockReturnValue(notifyData);
    paymentService.handlePaySuccess.mockResolvedValue(undefined);

    await controller.notify(req, res);

    expect(paymentService.decryptNotify).toHaveBeenCalledWith(notifyData);
    expect(paymentService.handlePaySuccess).toHaveBeenCalledWith(
      'WD_1_123456_abcd',
      notifyData,
    );
    expect(res.json).toHaveBeenCalledWith({
      code: 'SUCCESS',
      message: '成功',
    });
  });

  it('should handle different payment types', async () => {
    const notifyData = {
      out_trade_no: 'BEAN_1_123456_abcd',
      trade_state: 'SUCCESS',
      transaction_id: 'wx_transaction_456',
      amount: 1000,
    };

    req.body = notifyData;
    paymentService.decryptNotify.mockReturnValue(notifyData);
    paymentService.handlePaySuccess.mockResolvedValue(undefined);

    await controller.notify(req, res);

    expect(paymentService.handlePaySuccess).toHaveBeenCalledWith(
      'BEAN_1_123456_abcd',
      notifyData,
    );
    expect(res.json).toHaveBeenCalledWith({
      code: 'SUCCESS',
      message: '成功',
    });
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- payment.controller.spec.ts --testNamePattern="should handle"
```

Expected: 2 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 添加成功支付回调测试 (2 个用例)"
```

---

### Task 3: 实现支付失败回调测试 (1 个用例)

**文件:**
- Modify: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 编写支付失败回调的测试**

在 `describe('notify', ...)` 块中添加：

```typescript
it('should not call handlePaySuccess when payment fails', async () => {
  const notifyData = {
    out_trade_no: 'WD_1_123456_abcd',
    trade_state: 'FAIL',
    transaction_id: 'wx_transaction_123',
  };

  req.body = notifyData;
  paymentService.decryptNotify.mockReturnValue(notifyData);

  await controller.notify(req, res);

  expect(paymentService.decryptNotify).toHaveBeenCalledWith(notifyData);
  expect(paymentService.handlePaySuccess).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({
    code: 'SUCCESS',
    message: '成功',
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- payment.controller.spec.ts --testNamePattern="should not call"
```

Expected: 1 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 添加支付失败回调测试 (1 个用例)"
```

---

### Task 4: 实现加密验证失败测试 (2 个用例)

**文件:**
- Modify: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 编写加密验证失败的测试**

在 `describe('notify', ...)` 块中添加：

```typescript
it('should handle decryption failure', async () => {
  req.body = { invalid: 'data' };
  paymentService.decryptNotify.mockImplementation(() => {
    throw new Error('Decryption failed');
  });

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Decryption failed',
  });
});

it('should handle invalid encrypted data format', async () => {
  req.body = {};
  paymentService.decryptNotify.mockImplementation(() => {
    throw new Error('Invalid data format');
  });

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Invalid data format',
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- payment.controller.spec.ts --testNamePattern="decryption|format"
```

Expected: 2 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 添加加密验证失败测试 (2 个用例)"
```

---

### Task 5: 实现 Service 异常测试 (2 个用例)

**文件:**
- Modify: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 编写 Service 异常的测试**

在 `describe('notify', ...)` 块中添加：

```typescript
it('should handle handlePaySuccess exception', async () => {
  const notifyData = {
    out_trade_no: 'WD_1_123456_abcd',
    trade_state: 'SUCCESS',
    transaction_id: 'wx_transaction_123',
  };

  req.body = notifyData;
  paymentService.decryptNotify.mockReturnValue(notifyData);
  paymentService.handlePaySuccess.mockRejectedValue(
    new Error('Database error'),
  );

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Database error',
  });
});

it('should handle other service exceptions', async () => {
  const notifyData = {
    out_trade_no: 'WD_1_123456_abcd',
    trade_state: 'SUCCESS',
  };

  req.body = notifyData;
  paymentService.decryptNotify.mockReturnValue(notifyData);
  paymentService.handlePaySuccess.mockRejectedValue(
    new Error('Service unavailable'),
  );

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Service unavailable',
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- payment.controller.spec.ts --testNamePattern="exception"
```

Expected: 2 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 添加 Service 异常测试 (2 个用例)"
```

---

### Task 6: 实现请求体验证测试 (2 个用例)

**文件:**
- Modify: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 编写请求体验证的测试**

在 `describe('notify', ...)` 块中添加：

```typescript
it('should handle missing required fields', async () => {
  req.body = { out_trade_no: 'WD_1_123456_abcd' }; // 缺少 trade_state
  paymentService.decryptNotify.mockImplementation(() => {
    throw new Error('Missing required fields');
  });

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Missing required fields',
  });
});

it('should handle invalid request format', async () => {
  req.body = 'invalid string'; // 无效格式
  paymentService.decryptNotify.mockImplementation(() => {
    throw new Error('Invalid request format');
  });

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Invalid request format',
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- payment.controller.spec.ts --testNamePattern="required|format"
```

Expected: 2 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 添加请求体验证测试 (2 个用例)"
```

---

### Task 7: 实现边界情况测试 (1 个用例)

**文件:**
- Modify: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 编写边界情况的测试**

在 `describe('notify', ...)` 块中添加：

```typescript
it('should handle empty request body', async () => {
  req.body = {};
  paymentService.decryptNotify.mockImplementation(() => {
    throw new Error('Empty request body');
  });

  await controller.notify(req, res);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    code: 'FAIL',
    message: 'Empty request body',
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- payment.controller.spec.ts --testNamePattern="empty"
```

Expected: 1 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: 添加边界情况测试 (1 个用例)"
```

---

### Task 8: 验证完整测试覆盖率

**文件:**
- Check: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 运行所有测试**

```bash
cd server
npm test -- payment.controller.spec.ts
```

Expected: 10 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- payment.controller.spec.ts --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 如果覆盖率不足 100%，识别未覆盖的代码行**

查看覆盖率报告，找出未覆盖的代码行，添加额外的测试用例。

**Step 4: 提交**

```bash
git add server/src/modules/payment/payment.controller.spec.ts
git commit -m "test: Payment Controller 测试完成，100% 覆盖率"
```

---

### Task 9: 合并到 origin/main 并推送

**文件:**
- Commit: `server/src/modules/payment/payment.controller.spec.ts`

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- payment.controller.spec.ts
```

Expected: 10 个测试通过

**Step 2: 合并到 main 分支**

```bash
cd "C:\Users\15700\Desktop\work\project\小灵通"
git checkout main
git merge master
```

**Step 3: 推送到远程**

```bash
git push origin main
```

**Step 4: 返回 master 分支**

```bash
git checkout master
```

---

## 执行总结

- **总测试用例数**: 10 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 9 次（Task 1-8）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 Payment Controller 测试后，继续最后一个模块：

1. **Favorite Controller** (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
