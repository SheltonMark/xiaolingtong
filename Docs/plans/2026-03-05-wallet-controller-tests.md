# Wallet Controller 单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Wallet Controller 编写 20 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Service 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock，为 4 个端点编写完整的单元测试。每个端点测试成功路径、参数验证、权限验证、异常处理和边界情况。

**Tech Stack:** NestJS, Jest, TypeORM, Mock Functions

---

## 任务分解

### Task 1: 创建测试文件框架和 Mock 设置

**文件:**
- Create: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/wallet/wallet.controller.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { BadRequestException } from '@nestjs/common';

describe('WalletController', () => {
  let controller: WalletController;
  let walletService: jest.Mocked<WalletService>;

  beforeEach(async () => {
    walletService = {
      getBalance: jest.fn(),
      getTransactions: jest.fn(),
      getIncome: jest.fn(),
      withdraw: jest.fn(),
    } as jest.Mocked<WalletService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: walletService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  describe('getBalance', () => {
    // 测试将在后续步骤中添加
  });

  describe('getTransactions', () => {
    // 测试将在后续步骤中添加
  });

  describe('getIncome', () => {
    // 测试将在后续步骤中添加
  });

  describe('withdraw', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- wallet.controller.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/wallet/wallet.controller.spec.ts
git commit -m "test: 创建 Wallet Controller 测试框架"
```

---

### Task 2: 实现 getBalance 端点测试 (4 个用例)

**文件:**
- Modify: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 编写 getBalance 端点的完整测试**

在 `describe('getBalance', ...)` 块中添加：

```typescript
describe('getBalance', () => {
  it('should return wallet balance', async () => {
    const userId = 1;
    const mockBalance = {
      id: 1,
      userId,
      balance: 1000,
      totalIncome: 5000,
      totalWithdraw: 4000,
    };

    walletService.getBalance.mockResolvedValue(mockBalance);

    const result = await controller.getBalance(userId);

    expect(walletService.getBalance).toHaveBeenCalledWith(userId);
    expect(result.balance).toBe(1000);
    expect(result.totalIncome).toBe(5000);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;

    walletService.getBalance.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(controller.getBalance(userId as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when service fails', async () => {
    const userId = 1;

    walletService.getBalance.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(controller.getBalance(userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle userId as 0', async () => {
    const userId = 0;

    walletService.getBalance.mockRejectedValue(
      new BadRequestException('Invalid user id'),
    );

    await expect(controller.getBalance(userId)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- wallet.controller.spec.ts --testNamePattern="getBalance"
```

Expected: 4 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/wallet/wallet.controller.spec.ts
git commit -m "test: 添加 getBalance 端点测试 (4 个用例)"
```

---

### Task 3: 实现 getTransactions 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 编写 getTransactions 端点的完整测试**

在 `describe('getTransactions', ...)` 块中添加：

```typescript
describe('getTransactions', () => {
  it('should return transactions with pagination', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };
    const mockResult = {
      list: [
        { id: 1, userId, type: 'income', amount: 100, createdAt: new Date() },
        { id: 2, userId, type: 'withdraw', amount: 50, createdAt: new Date() },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    };

    walletService.getTransactions.mockResolvedValue(mockResult);

    const result = await controller.getTransactions(userId, query);

    expect(walletService.getTransactions).toHaveBeenCalledWith(userId, query);
    expect(result.list).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should throw error when pagination is invalid', async () => {
    const userId = 1;
    const query = { page: -1, pageSize: 0 };

    walletService.getTransactions.mockRejectedValue(
      new BadRequestException('Invalid pagination'),
    );

    await expect(
      controller.getTransactions(userId, query),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const query = { page: 1, pageSize: 20 };

    walletService.getTransactions.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.getTransactions(userId as any, query),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };

    walletService.getTransactions.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(
      controller.getTransactions(userId, query),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return empty transaction list', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };
    const mockResult = {
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };

    walletService.getTransactions.mockResolvedValue(mockResult);

    const result = await controller.getTransactions(userId, query);

    expect(result.list).toEqual([]);
    expect(result.total).toBe(0);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- wallet.controller.spec.ts --testNamePattern="getTransactions"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/wallet/wallet.controller.spec.ts
git commit -m "test: 添加 getTransactions 端点测试 (5 个用例)"
```

---

### Task 4: 实现 getIncome 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 编写 getIncome 端点的完整测试**

在 `describe('getIncome', ...)` 块中添加：

```typescript
describe('getIncome', () => {
  it('should return income transactions', async () => {
    const userId = 1;
    const query = { month: '2026-03' };
    const mockResult = {
      list: [
        {
          id: 1,
          userId,
          type: 'income',
          amount: 500,
          status: 'success',
          createdAt: new Date(),
        },
      ],
      totalAmount: 500,
      month: '2026-03',
    };

    walletService.getIncome.mockResolvedValue(mockResult);

    const result = await controller.getIncome(userId, query);

    expect(walletService.getIncome).toHaveBeenCalledWith(userId, query);
    expect(result.list).toHaveLength(1);
    expect(result.totalAmount).toBe(500);
  });

  it('should throw error when month is invalid', async () => {
    const userId = 1;
    const query = { month: 'invalid_month' };

    walletService.getIncome.mockRejectedValue(
      new BadRequestException('Invalid month format'),
    );

    await expect(controller.getIncome(userId, query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const query = { month: '2026-03' };

    walletService.getIncome.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.getIncome(userId as any, query),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const query = { month: '2026-03' };

    walletService.getIncome.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(controller.getIncome(userId, query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should return zero income when no records', async () => {
    const userId = 1;
    const query = { month: '2026-03' };
    const mockResult = {
      list: [],
      totalAmount: 0,
      month: '2026-03',
    };

    walletService.getIncome.mockResolvedValue(mockResult);

    const result = await controller.getIncome(userId, query);

    expect(result.list).toEqual([]);
    expect(result.totalAmount).toBe(0);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- wallet.controller.spec.ts --testNamePattern="getIncome"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/wallet/wallet.controller.spec.ts
git commit -m "test: 添加 getIncome 端点测试 (5 个用例)"
```

---

### Task 5: 实现 withdraw 端点测试 (6 个用例)

**文件:**
- Modify: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 编写 withdraw 端点的完整测试**

在 `describe('withdraw', ...)` 块中添加：

```typescript
describe('withdraw', () => {
  it('should successfully withdraw', async () => {
    const userId = 1;
    const amount = 500;
    const mockResult = {
      message: '提现成功',
      balance: 500,
      transactionId: 'tx_123',
    };

    walletService.withdraw.mockResolvedValue(mockResult);

    const result = await controller.withdraw(userId, amount);

    expect(walletService.withdraw).toHaveBeenCalledWith(userId, amount);
    expect(result.message).toBe('提现成功');
    expect(result.balance).toBe(500);
  });

  it('should throw error when amount is negative', async () => {
    const userId = 1;
    const amount = -100;

    walletService.withdraw.mockRejectedValue(
      new BadRequestException('Amount must be positive'),
    );

    await expect(controller.withdraw(userId, amount)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when amount is zero', async () => {
    const userId = 1;
    const amount = 0;

    walletService.withdraw.mockRejectedValue(
      new BadRequestException('Amount must be greater than zero'),
    );

    await expect(controller.withdraw(userId, amount)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const amount = 500;

    walletService.withdraw.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.withdraw(userId as any, amount),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const amount = 500;

    walletService.withdraw.mockRejectedValue(
      new BadRequestException('Insufficient balance'),
    );

    await expect(controller.withdraw(userId, amount)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle very large amount', async () => {
    const userId = 1;
    const amount = 999999999;

    walletService.withdraw.mockRejectedValue(
      new BadRequestException('Amount exceeds limit'),
    );

    await expect(controller.withdraw(userId, amount)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- wallet.controller.spec.ts --testNamePattern="withdraw"
```

Expected: 6 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/wallet/wallet.controller.spec.ts
git commit -m "test: 添加 withdraw 端点测试 (6 个用例)"
```

---

### Task 6: 验证完整测试覆盖率

**文件:**
- Check: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 运行所有测试**

```bash
cd server
npm test -- wallet.controller.spec.ts
```

Expected: 20 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- wallet.controller.spec.ts --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 如果覆盖率不足 100%，识别未覆盖的代码行**

查看覆盖率报告，找出未覆盖的代码行，添加额外的测试用例。

**Step 4: 提交**

```bash
git add server/src/modules/wallet/wallet.controller.spec.ts
git commit -m "test: Wallet Controller 测试完成，100% 覆盖率"
```

---

### Task 7: 合并到 origin/main 并推送

**文件:**
- Commit: `server/src/modules/wallet/wallet.controller.spec.ts`

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- wallet.controller.spec.ts
```

Expected: 20 个测试通过

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

- **总测试用例数**: 20 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 7 次（Task 1-6）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 Wallet Controller 测试后，按以下顺序继续其他模块：

1. **Payment Controller** (3 个端点，预计 12-15 个用例)
2. **Favorite Controller** (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
