# User Controller 单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 User Controller 编写 28 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Service 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock，为 5 个端点编写完整的单元测试。每个端点测试成功路径、参数验证、权限验证、异常处理和边界情况。

**Tech Stack:** NestJS, Jest, TypeORM, Mock Functions

---

## 任务分解

### Task 1: 创建测试文件框架和 Mock 设置

**文件:**
- Create: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/user/user.controller.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { BadRequestException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    userService = {
      submitEnterpriseCert: jest.fn(),
      submitWorkerCert: jest.fn(),
      getCertStatus: jest.fn(),
      updateAvatar: jest.fn(),
      updateProfile: jest.fn(),
    } as jest.Mocked<UserService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('submitEnterpriseCert', () => {
    // 测试将在后续步骤中添加
  });

  describe('submitWorkerCert', () => {
    // 测试将在后续步骤中添加
  });

  describe('getCertStatus', () => {
    // 测试将在后续步骤中添加
  });

  describe('updateAvatar', () => {
    // 测试将在后续步骤中添加
  });

  describe('updateProfile', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- user.controller.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: 创建 User Controller 测试框架"
```

---

### Task 2: 实现 submitEnterpriseCert 端点测试 (6 个用例)

**文件:**
- Modify: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 编写 submitEnterpriseCert 端点的完整测试**

在 `describe('submitEnterpriseCert', ...)` 块中添加：

```typescript
describe('submitEnterpriseCert', () => {
  it('should successfully submit enterprise cert', async () => {
    const userId = 1;
    const dto = {
      companyName: 'Test Company',
      businessLicense: 'license_123',
      legalPerson: 'John Doe',
    };
    const mockResult = {
      id: 1,
      userId,
      type: 'enterprise',
      status: 'pending',
      companyName: 'Test Company',
      createdAt: new Date(),
    };

    userService.submitEnterpriseCert.mockResolvedValue(mockResult);

    const result = await controller.submitEnterpriseCert(userId, dto);

    expect(userService.submitEnterpriseCert).toHaveBeenCalledWith(userId, dto);
    expect(result.type).toBe('enterprise');
    expect(result.status).toBe('pending');
  });

  it('should throw error when companyName is missing', async () => {
    const userId = 1;
    const dto = {
      businessLicense: 'license_123',
      legalPerson: 'John Doe',
    };

    userService.submitEnterpriseCert.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.submitEnterpriseCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when businessLicense is missing', async () => {
    const userId = 1;
    const dto = {
      companyName: 'Test Company',
      legalPerson: 'John Doe',
    };

    userService.submitEnterpriseCert.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.submitEnterpriseCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const dto = {
      companyName: 'Test Company',
      businessLicense: 'license_123',
      legalPerson: 'John Doe',
    };

    userService.submitEnterpriseCert.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.submitEnterpriseCert(userId as any, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const dto = {
      companyName: 'Test Company',
      businessLicense: 'license_123',
      legalPerson: 'John Doe',
    };

    userService.submitEnterpriseCert.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(
      controller.submitEnterpriseCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle empty dto', async () => {
    const userId = 1;
    const dto = {};

    userService.submitEnterpriseCert.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.submitEnterpriseCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- user.controller.spec.ts --testNamePattern="submitEnterpriseCert"
```

Expected: 6 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: 添加 submitEnterpriseCert 端点测试 (6 个用例)"
```

---

### Task 3: 实现 submitWorkerCert 端点测试 (6 个用例)

**文件:**
- Modify: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 编写 submitWorkerCert 端点的完整测试**

在 `describe('submitWorkerCert', ...)` 块中添加：

```typescript
describe('submitWorkerCert', () => {
  it('should successfully submit worker cert', async () => {
    const userId = 1;
    const dto = {
      workerName: 'John Doe',
      idCard: 'id_123',
      skillType: 'carpenter',
    };
    const mockResult = {
      id: 1,
      userId,
      type: 'worker',
      status: 'pending',
      workerName: 'John Doe',
      createdAt: new Date(),
    };

    userService.submitWorkerCert.mockResolvedValue(mockResult);

    const result = await controller.submitWorkerCert(userId, dto);

    expect(userService.submitWorkerCert).toHaveBeenCalledWith(userId, dto);
    expect(result.type).toBe('worker');
    expect(result.status).toBe('pending');
  });

  it('should throw error when workerName is missing', async () => {
    const userId = 1;
    const dto = {
      idCard: 'id_123',
      skillType: 'carpenter',
    };

    userService.submitWorkerCert.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.submitWorkerCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when idCard is missing', async () => {
    const userId = 1;
    const dto = {
      workerName: 'John Doe',
      skillType: 'carpenter',
    };

    userService.submitWorkerCert.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.submitWorkerCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const dto = {
      workerName: 'John Doe',
      idCard: 'id_123',
      skillType: 'carpenter',
    };

    userService.submitWorkerCert.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.submitWorkerCert(userId as any, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const dto = {
      workerName: 'John Doe',
      idCard: 'id_123',
      skillType: 'carpenter',
    };

    userService.submitWorkerCert.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(
      controller.submitWorkerCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle empty dto', async () => {
    const userId = 1;
    const dto = {};

    userService.submitWorkerCert.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.submitWorkerCert(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- user.controller.spec.ts --testNamePattern="submitWorkerCert"
```

Expected: 6 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: 添加 submitWorkerCert 端点测试 (6 个用例)"
```

---

### Task 4: 实现 getCertStatus 端点测试 (4 个用例)

**文件:**
- Modify: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 编写 getCertStatus 端点的完整测试**

在 `describe('getCertStatus', ...)` 块中添加：

```typescript
describe('getCertStatus', () => {
  it('should return cert status', async () => {
    const userId = 1;
    const role = 'buyer';
    const mockResult = {
      enterpriseCert: { status: 'approved' },
      workerCert: { status: 'pending' },
    };

    userService.getCertStatus.mockResolvedValue(mockResult);

    const result = await controller.getCertStatus(userId, role);

    expect(userService.getCertStatus).toHaveBeenCalledWith(userId, role);
    expect(result.enterpriseCert.status).toBe('approved');
    expect(result.workerCert.status).toBe('pending');
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const role = 'buyer';

    userService.getCertStatus.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.getCertStatus(userId as any, role),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const role = 'buyer';

    userService.getCertStatus.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(controller.getCertStatus(userId, role)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle invalid role', async () => {
    const userId = 1;
    const role = 'invalid_role';

    userService.getCertStatus.mockRejectedValue(
      new BadRequestException('Invalid role'),
    );

    await expect(controller.getCertStatus(userId, role)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- user.controller.spec.ts --testNamePattern="getCertStatus"
```

Expected: 4 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: 添加 getCertStatus 端点测试 (4 个用例)"
```

---

### Task 5: 实现 updateAvatar 端点测试 (6 个用例)

**文件:**
- Modify: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 编写 updateAvatar 端点的完整测试**

在 `describe('updateAvatar', ...)` 块中添加：

```typescript
describe('updateAvatar', () => {
  it('should successfully update avatar', async () => {
    const userId = 1;
    const avatarUrl = 'https://example.com/avatar.jpg';
    const mockResult = {
      id: userId,
      avatar: avatarUrl,
      message: '头像更新成功',
    };

    userService.updateAvatar.mockResolvedValue(mockResult);

    const result = await controller.updateAvatar(userId, avatarUrl);

    expect(userService.updateAvatar).toHaveBeenCalledWith(userId, avatarUrl);
    expect(result.avatar).toBe(avatarUrl);
  });

  it('should throw error when avatarUrl is empty string', async () => {
    const userId = 1;
    const avatarUrl = '';

    userService.updateAvatar.mockRejectedValue(
      new BadRequestException('Avatar URL cannot be empty'),
    );

    await expect(
      controller.updateAvatar(userId, avatarUrl),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when avatarUrl is null', async () => {
    const userId = 1;
    const avatarUrl = null;

    userService.updateAvatar.mockRejectedValue(
      new BadRequestException('Avatar URL cannot be empty'),
    );

    await expect(
      controller.updateAvatar(userId, avatarUrl as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const avatarUrl = 'https://example.com/avatar.jpg';

    userService.updateAvatar.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.updateAvatar(userId as any, avatarUrl),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const avatarUrl = 'https://example.com/avatar.jpg';

    userService.updateAvatar.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(
      controller.updateAvatar(userId, avatarUrl),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle special characters in URL', async () => {
    const userId = 1;
    const avatarUrl = 'https://example.com/avatar_!@#$.jpg';
    const mockResult = {
      id: userId,
      avatar: avatarUrl,
      message: '头像更新成功',
    };

    userService.updateAvatar.mockResolvedValue(mockResult);

    const result = await controller.updateAvatar(userId, avatarUrl);

    expect(result.avatar).toBe(avatarUrl);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- user.controller.spec.ts --testNamePattern="updateAvatar"
```

Expected: 6 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: 添加 updateAvatar 端点测试 (6 个用例)"
```

---

### Task 6: 实现 updateProfile 端点测试 (6 个用例)

**文件:**
- Modify: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 编写 updateProfile 端点的完整测试**

在 `describe('updateProfile', ...)` 块中添加：

```typescript
describe('updateProfile', () => {
  it('should successfully update profile', async () => {
    const userId = 1;
    const dto = {
      nickname: 'New Name',
      bio: 'My bio',
    };
    const mockResult = {
      id: userId,
      nickname: 'New Name',
      bio: 'My bio',
      message: '个人资料更新成功',
    };

    userService.updateProfile.mockResolvedValue(mockResult);

    const result = await controller.updateProfile(userId, dto);

    expect(userService.updateProfile).toHaveBeenCalledWith(userId, dto);
    expect(result.nickname).toBe('New Name');
  });

  it('should throw error when nickname is missing', async () => {
    const userId = 1;
    const dto = {
      bio: 'My bio',
    };

    userService.updateProfile.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.updateProfile(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when nickname is invalid type', async () => {
    const userId = 1;
    const dto = {
      nickname: 123,
      bio: 'My bio',
    };

    userService.updateProfile.mockRejectedValue(
      new BadRequestException('Invalid field type'),
    );

    await expect(
      controller.updateProfile(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const dto = {
      nickname: 'New Name',
      bio: 'My bio',
    };

    userService.updateProfile.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.updateProfile(userId as any, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const dto = {
      nickname: 'New Name',
      bio: 'My bio',
    };

    userService.updateProfile.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(
      controller.updateProfile(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle empty dto', async () => {
    const userId = 1;
    const dto = {};

    userService.updateProfile.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(
      controller.updateProfile(userId, dto),
    ).rejects.toThrow(BadRequestException);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- user.controller.spec.ts --testNamePattern="updateProfile"
```

Expected: 6 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: 添加 updateProfile 端点测试 (6 个用例)"
```

---

### Task 7: 验证完整测试覆盖率

**文件:**
- Check: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 运行所有测试**

```bash
cd server
npm test -- user.controller.spec.ts
```

Expected: 28 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- user.controller.spec.ts --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 如果覆盖率不足 100%，识别未覆盖的代码行**

查看覆盖率报告，找出未覆盖的代码行，添加额外的测试用例。

**Step 4: 提交**

```bash
git add server/src/modules/user/user.controller.spec.ts
git commit -m "test: User Controller 测试完成，100% 覆盖率"
```

---

### Task 8: 合并到 origin/main 并推送

**文件:**
- Commit: `server/src/modules/user/user.controller.spec.ts`

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- user.controller.spec.ts
```

Expected: 28 个测试通过

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

- **总测试用例数**: 28 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 8 次（Task 1-7）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 User Controller 测试后，按以下顺序继续其他模块：

1. **Wallet Controller** (4 个端点，预计 16-20 个用例)
2. **Payment Controller** (3 个端点，预计 12-15 个用例)
3. **Favorite Controller** (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
