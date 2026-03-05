# Service 层单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为所有 Service 层编写 160-225 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Repository 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock TypeORM Repository，为所有 Service 编写完整的单元测试。按业务重要性优先级实现，从 AuthService 开始，逐步覆盖所有 Service 层的业务逻辑、数据验证、异常处理和边界情况。

**Tech Stack:** NestJS, Jest, TypeORM, Mock Functions

---

## 任务分解

### Task 1: AuthService 测试框架和 Mock 设置

**文件:**
- Create: `server/src/modules/auth/auth.service.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/auth/auth.service.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
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
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('wxLogin', () => {
    // 测试将在后续步骤中添加
  });

  describe('chooseRole', () => {
    // 测试将在后续步骤中添加
  });

  describe('getProfile', () => {
    // 测试将在后续步骤中添加
  });

  describe('logout', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- auth.service.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.service.spec.ts
git commit -m "test: 创建 AuthService 测试框架"
```

---

### Task 2: AuthService wxLogin 方法测试 (4 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.service.spec.ts`

**Step 1: 编写 wxLogin 测试**

在 `describe('wxLogin', ...)` 块中添加：

```typescript
describe('wxLogin', () => {
  it('should login successfully with new user', async () => {
    const code = 'test_code_123';
    const mockUser = {
      id: 1,
      openId: 'wx_open_id_123',
      lastLoginAt: new Date(),
    };

    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockReturnValue(mockUser as any);
    userRepository.save.mockResolvedValue(mockUser as any);

    const result = await service.wxLogin(code);

    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { openId: expect.any(String) } });
    expect(userRepository.save).toHaveBeenCalled();
    expect(result).toHaveProperty('id');
  });

  it('should login successfully with existing user', async () => {
    const code = 'test_code_123';
    const mockUser = {
      id: 1,
      openId: 'wx_open_id_123',
      lastLoginAt: new Date(),
    };

    userRepository.findOne.mockResolvedValue(mockUser as any);
    userRepository.save.mockResolvedValue(mockUser as any);

    const result = await service.wxLogin(code);

    expect(userRepository.findOne).toHaveBeenCalled();
    expect(userRepository.save).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });

  it('should throw error when code is invalid', async () => {
    const code = '';

    userRepository.findOne.mockRejectedValue(
      new BadRequestException('Invalid code'),
    );

    await expect(service.wxLogin(code)).rejects.toThrow(BadRequestException);
  });

  it('should handle database error', async () => {
    const code = 'test_code_123';

    userRepository.findOne.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(service.wxLogin(code)).rejects.toThrow('Database error');
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- auth.service.spec.ts --testNamePattern="wxLogin"
```

Expected: 4 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.service.spec.ts
git commit -m "test: 添加 AuthService wxLogin 测试 (4 个用例)"
```

---

### Task 3: AuthService 其他方法测试 (11-16 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.service.spec.ts`

**Step 1: 编写 chooseRole、getProfile、logout 测试**

在相应的 describe 块中添加测试用例，覆盖：
- chooseRole: 角色选择成功、无效角色、权限验证、重复选择
- getProfile: 获取资料成功、用户不存在、权限验证、异常处理
- logout: 登出成功、清理 token、异常处理

**Step 2: 运行测试验证**

```bash
cd server
npm test -- auth.service.spec.ts
```

Expected: 15-20 个测试全部通过

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.service.spec.ts
git commit -m "test: 添加 AuthService 其他方法测试 (11-16 个用例)"
```

---

### Task 4: PostService 测试框架 (类似 Task 1)

**文件:**
- Create: `server/src/modules/post/post.service.spec.ts`

按照 Task 1 的模式创建 PostService 测试框架，包含所有方法的 describe 块。

---

### Task 5: PostService 方法测试 (30-40 个用例)

**文件:**
- Modify: `server/src/modules/post/post.service.spec.ts`

为 PostService 的所有方法添加测试：
- list: 分页、筛选、排序、空结果、异常处理
- myPosts: 用户文章、权限验证、分页、异常处理
- detail: 获取详情、不存在、权限检查、异常处理
- create: 创建成功、参数验证、业务规则、异常处理
- update: 更新成功、权限验证、冲突处理、异常处理
- remove: 删除成功、权限验证、级联删除、异常处理
- unlockContact: 解锁成功、费用扣除、余额不足、异常处理

---

### Task 6: UserService 测试 (20-25 个用例)

**文件:**
- Create: `server/src/modules/user/user.service.spec.ts`

创建测试框架并实现所有方法的测试：
- submitEnterpriseCert: 提交成功、参数验证、重复提交、异常处理
- submitWorkerCert: 提交成功、参数验证、重复提交、异常处理
- getCertStatus: 获取成功、不存在、异常处理
- updateAvatar: 更新成功、文件验证、存储异常、异常处理
- updateProfile: 更新成功、参数验证、业务规则、异常处理

---

### Task 7: WalletService 测试 (20-25 个用例)

**文件:**
- Create: `server/src/modules/wallet/wallet.service.spec.ts`

创建测试框架并实现所有方法的测试：
- getBalance: 获取成功、用户不存在、异常处理
- getTransactions: 获取成功、分页、筛选、空结果、异常处理
- getIncome: 获取成功、按月份、无记录、异常处理
- withdraw: 提现成功、余额验证、手续费计算、异常处理

---

### Task 8: PaymentService 测试 (15-20 个用例)

**文件:**
- Create: `server/src/modules/payment/payment.service.spec.ts`

创建测试框架并实现所有方法的测试：
- decryptNotify: 解密成功、格式验证、签名验证、异常处理
- handlePaySuccess: 处理成功、更新订单、更新余额、异常处理

---

### Task 9: FavoriteService 测试 (10-15 个用例)

**文件:**
- Create: `server/src/modules/favorite/favorite.service.spec.ts`

创建测试框架并实现所有方法的测试：
- list: 获取成功、多类型、排序、空结果、异常处理
- toggle: 切换成功（收藏）、切换成功（取消）、重复操作、异常处理

---

### Task 10: 其他 Service 测试 (50-80 个用例)

**文件:**
- Create: 其他 Service 的 .spec.ts 文件

按优先级为其他 Service 创建测试：
- AdminService
- ApplicationService
- BeanService
- ChatService
- ConfigService
- ExposureService
- JobService
- 等等

---

### Task 11: 验证完整测试覆盖率

**文件:**
- Check: 所有 Service 测试文件

**Step 1: 运行所有 Service 测试**

```bash
cd server
npm test -- --testPathPattern="\.service\.spec\.ts$"
```

Expected: 160-225 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- --testPathPattern="\.service\.spec\.ts$" --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 提交**

```bash
git add server/src/modules/*/
git commit -m "test: Service 层测试完成，100% 覆盖率"
```

---

### Task 12: 合并到 origin/main 并推送

**文件:**
- Commit: 所有 Service 测试文件

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- --testPathPattern="\.service\.spec\.ts$"
```

Expected: 160-225 个测试通过

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

- **总测试用例数**: 160-225 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 12 次（Task 1-11）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 Service 层测试后，整个应用的单元测试将全部完成：

| 层级 | 模块数 | 用例数 | 覆盖率 |
|------|--------|--------|--------|
| Controller 层 | 6 | 117 | 100% |
| Service 层 | 6+ | 160-225 | 100% |
| **总计** | **12+** | **277-342** | **100%** |

下一步可以考虑：
1. 集成测试（Controller + Service）
2. E2E 测试（完整业务流程）
3. 性能测试
4. 安全性测试

