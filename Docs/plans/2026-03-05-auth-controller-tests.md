# Auth Controller 单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Auth Controller 编写 17 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Service 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock，为 4 个端点编写完整的单元测试。每个端点测试成功路径、参数验证、权限验证、异常处理和边界情况。

**Tech Stack:** NestJS, Jest, TypeORM, Mock Functions

---

## 任务分解

### Task 1: 创建测试文件框架和 Mock 设置

**文件:**
- Create: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/auth/auth.controller.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    authService = {
      wxLogin: jest.fn(),
      chooseRole: jest.fn(),
      getProfile: jest.fn(),
    } as jest.Mocked<AuthService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
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
npm test -- auth.controller.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.controller.spec.ts
git commit -m "test: 创建 Auth Controller 测试框架"
```

---

### Task 2: 实现 wxLogin 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 编写 wxLogin 端点的完整测试**

在 `describe('wxLogin', ...)` 块中添加：

```typescript
describe('wxLogin', () => {
  it('should successfully login with valid code', async () => {
    const code = 'valid_code_123';
    const mockResult = {
      token: 'jwt_token_xxx',
      userId: 1,
      openid: 'wx_openid_xxx',
    };

    authService.wxLogin.mockResolvedValue(mockResult);

    const result = await controller.wxLogin(code);

    expect(authService.wxLogin).toHaveBeenCalledWith(code);
    expect(result.token).toBeDefined();
    expect(result.userId).toBe(1);
  });

  it('should throw error when code is empty string', async () => {
    const code = '';

    expect(() => controller.wxLogin(code)).toThrow(
      BadRequestException,
    );
  });

  it('should throw error when code is null', async () => {
    const code = null;

    expect(() => controller.wxLogin(code as any)).toThrow(
      BadRequestException,
    );
  });

  it('should throw error when service fails', async () => {
    const code = 'valid_code_123';

    authService.wxLogin.mockRejectedValue(
      new BadRequestException('Invalid code'),
    );

    await expect(controller.wxLogin(code)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle special characters in code', async () => {
    const code = 'code_with_!@#$%^&*()';
    const mockResult = {
      token: 'jwt_token_xxx',
      userId: 1,
      openid: 'wx_openid_xxx',
    };

    authService.wxLogin.mockResolvedValue(mockResult);

    const result = await controller.wxLogin(code);

    expect(authService.wxLogin).toHaveBeenCalledWith(code);
    expect(result).toBeDefined();
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- auth.controller.spec.ts --testNamePattern="wxLogin"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.controller.spec.ts
git commit -m "test: 添加 wxLogin 端点测试 (5 个用例)"
```

---

### Task 3: 实现 chooseRole 端点测试 (6 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 编写 chooseRole 端点的完整测试**

在 `describe('chooseRole', ...)` 块中添加：

```typescript
describe('chooseRole', () => {
  it('should successfully choose role', async () => {
    const userId = 1;
    const role = 'buyer';
    const mockResult = {
      userId,
      role,
      message: '角色选择成功',
    };

    authService.chooseRole.mockResolvedValue(mockResult);

    const result = await controller.chooseRole(userId, role);

    expect(authService.chooseRole).toHaveBeenCalledWith(userId, role);
    expect(result.role).toBe('buyer');
  });

  it('should throw error when role is empty string', async () => {
    const userId = 1;
    const role = '';

    expect(() => controller.chooseRole(userId, role)).toThrow(
      BadRequestException,
    );
  });

  it('should throw error when role is null', async () => {
    const userId = 1;
    const role = null;

    expect(() => controller.chooseRole(userId, role as any)).toThrow(
      BadRequestException,
    );
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const role = 'buyer';

    authService.chooseRole.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.chooseRole(userId as any, role),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const role = 'buyer';

    authService.chooseRole.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(controller.chooseRole(userId, role)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle invalid role value', async () => {
    const userId = 1;
    const role = 'invalid_role';

    authService.chooseRole.mockRejectedValue(
      new BadRequestException('Invalid role'),
    );

    await expect(controller.chooseRole(userId, role)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- auth.controller.spec.ts --testNamePattern="chooseRole"
```

Expected: 6 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.controller.spec.ts
git commit -m "test: 添加 chooseRole 端点测试 (6 个用例)"
```

---

### Task 4: 实现 getProfile 端点测试 (4 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 编写 getProfile 端点的完整测试**

在 `describe('getProfile', ...)` 块中添加：

```typescript
describe('getProfile', () => {
  it('should return user profile', async () => {
    const userId = 1;
    const mockProfile = {
      id: userId,
      openid: 'wx_openid_xxx',
      nickname: 'User Name',
      avatar: 'avatar_url',
      role: 'buyer',
    };

    authService.getProfile.mockResolvedValue(mockProfile);

    const result = await controller.getProfile(userId);

    expect(authService.getProfile).toHaveBeenCalledWith(userId);
    expect(result.id).toBe(userId);
    expect(result.nickname).toBe('User Name');
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;

    authService.getProfile.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(controller.getProfile(userId as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when service fails', async () => {
    const userId = 1;

    authService.getProfile.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(controller.getProfile(userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle userId as 0', async () => {
    const userId = 0;

    authService.getProfile.mockRejectedValue(
      new BadRequestException('Invalid user id'),
    );

    await expect(controller.getProfile(userId)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- auth.controller.spec.ts --testNamePattern="getProfile"
```

Expected: 4 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.controller.spec.ts
git commit -m "test: 添加 getProfile 端点测试 (4 个用例)"
```

---

### Task 5: 实现 logout 端点测试 (1 个用例)

**文件:**
- Modify: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 编写 logout 端点的测试**

在 `describe('logout', ...)` 块中添加：

```typescript
describe('logout', () => {
  it('should return logout message', async () => {
    const result = await controller.logout();

    expect(result.message).toBe('已退出');
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- auth.controller.spec.ts --testNamePattern="logout"
```

Expected: 1 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/auth/auth.controller.spec.ts
git commit -m "test: 添加 logout 端点测试 (1 个用例)"
```

---

### Task 6: 验证完整测试覆盖率

**文件:**
- Check: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 运行所有测试**

```bash
cd server
npm test -- auth.controller.spec.ts
```

Expected: 17 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- auth.controller.spec.ts --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 如果覆盖率不足 100%，识别未覆盖的代码行**

查看覆盖率报告，找出未覆盖的代码行，添加额外的测试用例。

**Step 4: 提交**

```bash
git add server/src/modules/auth/auth.controller.spec.ts
git commit -m "test: Auth Controller 测试完成，100% 覆盖率"
```

---

### Task 7: 合并到 origin/main 并推送

**文件:**
- Commit: `server/src/modules/auth/auth.controller.spec.ts`

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- auth.controller.spec.ts
```

Expected: 17 个测试通过

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

- **总测试用例数**: 17 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 7 次（Task 1-6）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 Auth Controller 测试后，按以下顺序继续其他模块：

1. **User Controller** (5 个端点，预计 20-25 个用例)
2. **Wallet Controller** (4 个端点，预计 16-20 个用例)
3. **Payment Controller** (3 个端点，预计 12-15 个用例)
4. **Favorite Controller** (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
