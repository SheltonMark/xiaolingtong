# 集成测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为所有 Controller 和 Service 的集成编写 85-110 个集成测试用例，达到 100% 覆盖率，使用 Mock Repository 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock TypeORM Repository，为所有 Controller 和 Service 的集成编写完整的集成测试。测试完整的请求-响应流程，验证 Controller 层和 Service 层的协作，确保数据正确流转。

**Tech Stack:** NestJS, Jest, TypeORM, Mock Functions

---

## 任务分解

### Task 1: AuthModule 集成测试框架和 Mock 设置

**文件:**
- Create: `server/src/modules/auth/auth.integration.spec.ts`

**Step 1: 创建集成测试文件框架**

创建 `server/src/modules/auth/auth.integration.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';

describe('AuthModule Integration Tests', () => {
  let controller: AuthController;
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<Repository<User>>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('wxLogin Integration', () => {
    // 测试将在后续步骤中添加
  });

  describe('chooseRole Integration', () => {
    // 测试将在后续步骤中添加
  });

  describe('getProfile Integration', () => {
    // 测试将在后续步骤中添加
  });

  describe('logout Integration', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- auth.integration.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.integration.spec.ts
git commit -m "test: 创建 AuthModule 集成测试框架"
```

---

### Task 2: AuthModule 集成测试用例 (12-15 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.integration.spec.ts`

**Step 1: 编写 wxLogin 集成测试**

在 `describe('wxLogin Integration', ...)` 块中添加：

```typescript
describe('wxLogin Integration', () => {
  it('should login successfully with valid code', async () => {
    const code = 'test_code_123';
    const mockUser = {
      id: 1,
      openId: 'wx_open_id_123',
      lastLoginAt: new Date(),
    };

    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockReturnValue(mockUser as any);
    userRepository.save.mockResolvedValue(mockUser as any);

    const result = await controller.wxLogin(code);

    expect(service.wxLogin).toBeDefined();
    expect(userRepository.findOne).toHaveBeenCalled();
    expect(userRepository.save).toHaveBeenCalled();
    expect(result).toHaveProperty('id');
  });

  it('should login existing user successfully', async () => {
    const code = 'test_code_123';
    const mockUser = {
      id: 1,
      openId: 'wx_open_id_123',
      lastLoginAt: new Date(),
    };

    userRepository.findOne.mockResolvedValue(mockUser as any);
    userRepository.save.mockResolvedValue(mockUser as any);

    const result = await controller.wxLogin(code);

    expect(userRepository.findOne).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('should handle login failure', async () => {
    const code = '';

    userRepository.findOne.mockRejectedValue(new Error('Invalid code'));

    await expect(controller.wxLogin(code)).rejects.toThrow();
  });

  it('should handle database error during login', async () => {
    const code = 'test_code_123';

    userRepository.findOne.mockRejectedValue(new Error('Database error'));

    await expect(controller.wxLogin(code)).rejects.toThrow('Database error');
  });
});
```

**Step 2: 编写 chooseRole、getProfile、logout 集成测试**

在相应的 describe 块中添加测试用例，覆盖：
- chooseRole: 角色选择成功、无效角色、权限验证、重复选择
- getProfile: 获取资料成功、用户不存在、权限验证、异常处理
- logout: 登出成功、清理 token、异常处理

**Step 3: 运行测试验证**

```bash
cd server
npm test -- auth.integration.spec.ts
```

Expected: 12-15 个测试全部通过

**Step 4: 提交**

```bash
git add server/src/modules/auth/auth.integration.spec.ts
git commit -m "test: 添加 AuthModule 集成测试 (12-15 个用例)"
```

---

### Task 3: PostModule 集成测试 (25-30 个用例)

**文件:**
- Create: `server/src/modules/post/post.integration.spec.ts`

按照 Task 1-2 的模式创建 PostModule 集成测试框架，然后为所有方法添加集成测试：
- list: 分页、筛选、排序、空结果、异常处理
- myPosts: 用户文章、权限验证、分页、异常处理
- detail: 获取详情、不存在、权限检查、异常处理
- create: 创建成功、参数验证、业务规则、异常处理
- update: 更新成功、权限验证、冲突处理、异常处理
- remove: 删除成功、权限验证、级联删除、异常处理
- unlockContact: 解锁成功、费用扣除、余额不足、异常处理

---

### Task 4: UserModule 集成测试 (15-20 个用例)

**文件:**
- Create: `server/src/modules/user/user.integration.spec.ts`

创建测试框架并实现所有方法的集成测试：
- submitEnterpriseCert: 提交成功、参数验证、重复提交、异常处理
- submitWorkerCert: 提交成功、参数验证、重复提交、异常处理
- getCertStatus: 获取成功、不存在、异常处理
- updateAvatar: 更新成功、文件验证、存储异常、异常处理
- updateProfile: 更新成功、参数验证、业务规则、异常处理

---

### Task 5: WalletModule 集成测试 (15-20 个用例)

**文件:**
- Create: `server/src/modules/wallet/wallet.integration.spec.ts`

创建测试框架并实现所有方法的集成测试：
- getBalance: 获取成功、用户不存在、异常处理
- getTransactions: 获取成功、分页、筛选、空结果、异常处理
- getIncome: 获取成功、按月份、无记录、异常处理
- withdraw: 提现成功、余额验证、手续费计算、异常处理

---

### Task 6: PaymentModule 集成测试 (8-10 个用例)

**文件:**
- Create: `server/src/modules/payment/payment.integration.spec.ts`

创建测试框架并实现所有方法的集成测试：
- notify: 支付成功回调、支付失败、解密失败、异常处理

---

### Task 7: FavoriteModule 集成测试 (10-15 个用例)

**文件:**
- Create: `server/src/modules/favorite/favorite.integration.spec.ts`

创建测试框架并实现所有方法的集成测试：
- list: 获取成功、多类型、排序、空结果、异常处理
- toggle: 切换成功（收藏）、切换成功（取消）、重复操作、异常处理

---

### Task 8: 验证完整集成测试覆盖率

**文件:**
- Check: 所有集成测试文件

**Step 1: 运行所有集成测试**

```bash
cd server
npm test -- --testPathPattern="\.integration\.spec\.ts$"
```

Expected: 85-110 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- --testPathPattern="\.integration\.spec\.ts$" --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 提交**

```bash
git add server/src/modules/*/
git commit -m "test: 集成测试完成，100% 覆盖率"
```

---

### Task 9: 合并到 origin/main 并推送

**文件:**
- Commit: 所有集成测试文件

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- --testPathPattern="\.integration\.spec\.ts$"
```

Expected: 85-110 个测试通过

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

- **总测试用例数**: 85-110 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 9 次（Task 1-8）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成集成测试后，整个应用的测试将全部完成：

| 层级 | 模块数 | 用例数 | 覆盖率 |
|------|--------|--------|--------|
| Controller 单元测试 | 6 | 117 | 100% |
| Service 单元测试 | 6 | 99 | 100% |
| 集成测试 | 6 | 85-110 | 100% |
| **总计** | **6** | **301-326** | **100%** |

下一步可以考虑：
1. E2E 测试（完整业务流程）
2. 性能测试
3. 安全性测试

