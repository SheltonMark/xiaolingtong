# Favorite Controller 单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Favorite Controller 编写 10 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Service 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock，为 list 和 toggle 端点编写完整的单元测试。测试收藏列表获取、收藏状态切换、权限验证、参数验证和异常处理。

**Tech Stack:** NestJS, Jest, Express, Mock Functions

---

## 任务分解

### Task 1: 创建测试文件框架和 Mock 设置

**文件:**
- Create: `server/src/modules/favorite/favorite.controller.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/favorite/favorite.controller.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let favoriteService: jest.Mocked<FavoriteService>;

  beforeEach(async () => {
    favoriteService = {
      getFavorites: jest.fn(),
      toggleFavorite: jest.fn(),
    } as jest.Mocked<FavoriteService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        {
          provide: FavoriteService,
          useValue: favoriteService,
        },
      ],
    }).compile();

    controller = module.get<FavoriteController>(FavoriteController);
  });

  describe('list', () => {
    // 测试将在后续步骤中添加
  });

  describe('toggle', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- favorite.controller.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/favorite/favorite.controller.spec.ts
git commit -m "test: 创建 Favorite Controller 测试框架"
```

---

### Task 2: 实现 list 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/favorite/favorite.controller.spec.ts`

**Step 1: 编写 list 端点的完整测试**

在 `describe('list', ...)` 块中添加：

```typescript
describe('list', () => {
  it('should return favorites with pagination', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };
    const mockResult = {
      list: [
        { id: 1, userId, postId: 101, createdAt: new Date() },
        { id: 2, userId, postId: 102, createdAt: new Date() },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    };

    favoriteService.getFavorites.mockResolvedValue(mockResult);

    const result = await controller.list(userId, query);

    expect(favoriteService.getFavorites).toHaveBeenCalledWith(userId, query);
    expect(result.list).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should return empty favorites list', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };
    const mockResult = {
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
    };

    favoriteService.getFavorites.mockResolvedValue(mockResult);

    const result = await controller.list(userId, query);

    expect(result.list).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should throw error when pagination is invalid', async () => {
    const userId = 1;
    const query = { page: -1, pageSize: 0 };

    favoriteService.getFavorites.mockRejectedValue(
      new BadRequestException('Invalid pagination'),
    );

    await expect(controller.list(userId, query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const query = { page: 1, pageSize: 20 };

    favoriteService.getFavorites.mockRejectedValue(
      new UnauthorizedException('User not authenticated'),
    );

    await expect(controller.list(userId as any, query)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should handle service exception', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };

    favoriteService.getFavorites.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(controller.list(userId, query)).rejects.toThrow(
      'Database error',
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- favorite.controller.spec.ts --testNamePattern="list"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/favorite/favorite.controller.spec.ts
git commit -m "test: 添加 list 端点测试 (5 个用例)"
```

---

### Task 3: 实现 toggle 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/favorite/favorite.controller.spec.ts`

**Step 1: 编写 toggle 端点的完整测试**

在 `describe('toggle', ...)` 块中添加：

```typescript
describe('toggle', () => {
  it('should successfully favorite a post', async () => {
    const userId = 1;
    const postId = 101;
    const mockResult = {
      message: '收藏成功',
      isFavorited: true,
    };

    favoriteService.toggleFavorite.mockResolvedValue(mockResult);

    const result = await controller.toggle(userId, postId);

    expect(favoriteService.toggleFavorite).toHaveBeenCalledWith(userId, postId);
    expect(result.isFavorited).toBe(true);
    expect(result.message).toBe('收藏成功');
  });

  it('should successfully unfavorite a post', async () => {
    const userId = 1;
    const postId = 101;
    const mockResult = {
      message: '取消收藏成功',
      isFavorited: false,
    };

    favoriteService.toggleFavorite.mockResolvedValue(mockResult);

    const result = await controller.toggle(userId, postId);

    expect(favoriteService.toggleFavorite).toHaveBeenCalledWith(userId, postId);
    expect(result.isFavorited).toBe(false);
    expect(result.message).toBe('取消收藏成功');
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const postId = 101;

    favoriteService.toggleFavorite.mockRejectedValue(
      new UnauthorizedException('User not authenticated'),
    );

    await expect(controller.toggle(userId as any, postId)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw error when postId is missing', async () => {
    const userId = 1;
    const postId = undefined;

    favoriteService.toggleFavorite.mockRejectedValue(
      new BadRequestException('postId is required'),
    );

    await expect(controller.toggle(userId, postId as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle service exception', async () => {
    const userId = 1;
    const postId = 101;

    favoriteService.toggleFavorite.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(controller.toggle(userId, postId)).rejects.toThrow(
      'Database error',
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- favorite.controller.spec.ts --testNamePattern="toggle"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/favorite/favorite.controller.spec.ts
git commit -m "test: 添加 toggle 端点测试 (5 个用例)"
```

---

### Task 4: 验证完整测试覆盖率

**文件:**
- Check: `server/src/modules/favorite/favorite.controller.spec.ts`

**Step 1: 运行所有测试**

```bash
cd server
npm test -- favorite.controller.spec.ts
```

Expected: 10 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- favorite.controller.spec.ts --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 如果覆盖率不足 100%，识别未覆盖的代码行**

查看覆盖率报告，找出未覆盖的代码行，添加额外的测试用例。

**Step 4: 提交**

```bash
git add server/src/modules/favorite/favorite.controller.spec.ts
git commit -m "test: Favorite Controller 测试完成，100% 覆盖率"
```

---

### Task 5: 合并到 origin/main 并推送

**文件:**
- Commit: `server/src/modules/favorite/favorite.controller.spec.ts`

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- favorite.controller.spec.ts
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
- **预计迭代**: 5 次（Task 1-4）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 Favorite Controller 测试后，整个项目的 Controller 层测试将全部完成：

| 模块 | 端点数 | 用例数 | 覆盖率 |
|------|--------|--------|--------|
| Post Controller | 7 | 33 | 100% |
| Auth Controller | 4 | 16 | 100% |
| User Controller | 5 | 28 | 100% |
| Wallet Controller | 4 | 20 | 100% |
| Payment Controller | 1 | 10 | 100% |
| Favorite Controller | 2 | 10 | 100% |
| **总计** | **23** | **117** | **100%** |

