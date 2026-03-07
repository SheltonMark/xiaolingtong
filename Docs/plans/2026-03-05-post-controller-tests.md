# Post Controller 单元测试实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Post Controller 编写 33 个单元测试用例，达到 100% 语句覆盖率，使用 Mock Service 方案。

**Architecture:** 使用 NestJS Testing 模块 + Jest Mock，为 7 个端点编写完整的单元测试。每个端点测试成功路径、参数验证、权限验证、异常处理和边界情况。

**Tech Stack:** NestJS, Jest, TypeORM, Mock Functions

---

## 任务分解

### Task 1: 创建测试文件框架和 Mock 设置

**文件:**
- Create: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 创建测试文件框架**

创建 `server/src/modules/post/post.controller.spec.ts`，包含基础的 Mock 设置和测试模块配置：

```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PostController', () => {
  let controller: PostController;
  let postService: jest.Mocked<PostService>;

  beforeEach(async () => {
    postService = {
      list: jest.fn(),
      myPosts: jest.fn(),
      detail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      unlockContact: jest.fn(),
    } as jest.Mocked<PostService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: postService,
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
  });

  describe('list', () => {
    // 测试将在后续步骤中添加
  });

  describe('myPosts', () => {
    // 测试将在后续步骤中添加
  });

  describe('detail', () => {
    // 测试将在后续步骤中添加
  });

  describe('create', () => {
    // 测试将在后续步骤中添加
  });

  describe('update', () => {
    // 测试将在后续步骤中添加
  });

  describe('remove', () => {
    // 测试将在后续步骤中添加
  });

  describe('unlockContact', () => {
    // 测试将在后续步骤中添加
  });
});
```

**Step 2: 运行测试验证框架**

```bash
cd server
npm test -- post.controller.spec.ts
```

Expected: 测试框架加载成功，0 个测试用例

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 创建 Post Controller 测试框架"
```

---

### Task 2: 实现 list 端点测试 (4 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 list 端点的成功路径测试**

在 `describe('list', ...)` 块中添加：

```typescript
describe('list', () => {
  it('should return posts list with pagination', async () => {
    const query = { page: 1, pageSize: 20 };
    const mockResult = {
      list: [
        {
          id: 1,
          userId: 1,
          type: 'purchase',
          title: 'Test Post',
          status: 'active',
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    postService.list.mockResolvedValue(mockResult);

    const result = await controller.list(query);

    expect(postService.list).toHaveBeenCalledWith(query);
    expect(result.list).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should handle empty list', async () => {
    const query = { page: 1, pageSize: 20 };
    const mockResult = { list: [], total: 0, page: 1, pageSize: 20 };

    postService.list.mockResolvedValue(mockResult);

    const result = await controller.list(query);

    expect(result.list).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should throw error when service fails', async () => {
    const query = { page: 1, pageSize: 20 };

    postService.list.mockRejectedValue(
      new BadRequestException('Invalid query'),
    );

    await expect(controller.list(query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle invalid pagination parameters', async () => {
    const query = { page: -1, pageSize: 0 };

    postService.list.mockRejectedValue(
      new BadRequestException('Invalid pagination'),
    );

    await expect(controller.list(query)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="list"
```

Expected: 4 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 list 端点测试 (4 个用例)"
```

---

### Task 3: 实现 myPosts 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 myPosts 端点的完整测试**

在 `describe('myPosts', ...)` 块中添加：

```typescript
describe('myPosts', () => {
  it('should return user posts with pagination', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };
    const mockResult = {
      list: [
        {
          id: 1,
          userId,
          type: 'purchase',
          title: 'My Post',
          status: 'active',
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    };

    postService.myPosts.mockResolvedValue(mockResult);

    const result = await controller.myPosts(userId, query);

    expect(postService.myPosts).toHaveBeenCalledWith(userId, query);
    expect(result.list).toHaveLength(1);
    expect(result.list[0].userId).toBe(userId);
  });

  it('should return empty list when user has no posts', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };
    const mockResult = { list: [], total: 0, page: 1, pageSize: 20 };

    postService.myPosts.mockResolvedValue(mockResult);

    const result = await controller.myPosts(userId, query);

    expect(result.list).toEqual([]);
  });

  it('should throw error when userId is undefined', async () => {
    const userId = undefined;
    const query = { page: 1, pageSize: 20 };

    postService.myPosts.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(controller.myPosts(userId as any, query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when service fails', async () => {
    const userId = 1;
    const query = { page: 1, pageSize: 20 };

    postService.myPosts.mockRejectedValue(
      new BadRequestException('Database error'),
    );

    await expect(controller.myPosts(userId, query)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle pagination correctly', async () => {
    const userId = 1;
    const query = { page: 2, pageSize: 10 };
    const mockResult = { list: [], total: 25, page: 2, pageSize: 10 };

    postService.myPosts.mockResolvedValue(mockResult);

    const result = await controller.myPosts(userId, query);

    expect(postService.myPosts).toHaveBeenCalledWith(userId, query);
    expect(result.page).toBe(2);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="myPosts"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 myPosts 端点测试 (5 个用例)"
```

---

### Task 4: 实现 detail 端点测试 (4 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 detail 端点的完整测试**

在 `describe('detail', ...)` 块中添加：

```typescript
describe('detail', () => {
  it('should return post detail', async () => {
    const postId = 1;
    const userId = 1;
    const mockPost = {
      id: postId,
      userId: 2,
      title: 'Test Post',
      content: 'Test content',
      viewCount: 10,
      contactUnlocked: false,
      postCount: 5,
      createdAt: new Date(),
    };

    postService.detail.mockResolvedValue(mockPost);

    const result = await controller.detail(postId, userId);

    expect(postService.detail).toHaveBeenCalledWith(postId, userId);
    expect(result.id).toBe(postId);
    expect(result.title).toBe('Test Post');
  });

  it('should return post detail for unauthenticated user', async () => {
    const postId = 1;
    const userId = 0; // 未认证用户
    const mockPost = {
      id: postId,
      userId: 2,
      title: 'Test Post',
      content: 'Test content',
      viewCount: 10,
      contactUnlocked: false,
      postCount: 5,
      createdAt: new Date(),
    };

    postService.detail.mockResolvedValue(mockPost);

    const result = await controller.detail(postId, userId);

    expect(postService.detail).toHaveBeenCalledWith(postId, userId);
    expect(result).toBeDefined();
  });

  it('should throw error when post not found', async () => {
    const postId = 999;
    const userId = 1;

    postService.detail.mockRejectedValue(
      new BadRequestException('Post not found'),
    );

    await expect(controller.detail(postId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle invalid post id', async () => {
    const postId = -1;
    const userId = 1;

    postService.detail.mockRejectedValue(
      new BadRequestException('Invalid post id'),
    );

    await expect(controller.detail(postId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="detail"
```

Expected: 4 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 detail 端点测试 (4 个用例)"
```

---

### Task 5: 实现 create 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 create 端点的完整测试**

在 `describe('create', ...)` 块中添加：

```typescript
describe('create', () => {
  it('should create a new post', async () => {
    const userId = 1;
    const dto = {
      type: 'purchase',
      title: 'New Post',
      category: 'electronics',
      description: 'Test description',
      images: ['image1.jpg'],
      showPhone: true,
      showWechat: true,
      validityDays: 30,
      contactName: 'John',
      contactPhone: '13800138000',
      contactWechat: 'john_wechat',
    };
    const mockPost = { id: 1, userId, ...dto };

    postService.create.mockResolvedValue(mockPost);

    const result = await controller.create(userId, dto);

    expect(postService.create).toHaveBeenCalledWith(userId, dto);
    expect(result.id).toBe(1);
    expect(result.userId).toBe(userId);
  });

  it('should throw error when user not authenticated', async () => {
    const userId = undefined;
    const dto = { type: 'purchase', title: 'New Post' };

    postService.create.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(controller.create(userId as any, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when required fields missing', async () => {
    const userId = 1;
    const dto = { type: 'purchase' }; // 缺少 title

    postService.create.mockRejectedValue(
      new BadRequestException('Missing required fields'),
    );

    await expect(controller.create(userId, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when content contains forbidden keyword', async () => {
    const userId = 1;
    const dto = {
      type: 'purchase',
      title: 'forbidden keyword',
      category: 'electronics',
      description: 'Test description',
    };

    postService.create.mockRejectedValue(
      new BadRequestException('Content contains forbidden keyword'),
    );

    await expect(controller.create(userId, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle empty images array', async () => {
    const userId = 1;
    const dto = {
      type: 'purchase',
      title: 'New Post',
      category: 'electronics',
      description: 'Test description',
      images: [],
    };
    const mockPost = { id: 1, userId, ...dto };

    postService.create.mockResolvedValue(mockPost);

    const result = await controller.create(userId, dto);

    expect(result.images).toEqual([]);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="create"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 create 端点测试 (5 个用例)"
```

---

### Task 6: 实现 update 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 update 端点的完整测试**

在 `describe('update', ...)` 块中添加：

```typescript
describe('update', () => {
  it('should update post by owner', async () => {
    const postId = 1;
    const userId = 1;
    const dto = { title: 'Updated Title', content: 'Updated content' };
    const mockPost = { id: postId, userId, ...dto };

    postService.update.mockResolvedValue(mockPost);

    const result = await controller.update(postId, userId, dto);

    expect(postService.update).toHaveBeenCalledWith(postId, userId, dto);
    expect(result.title).toBe('Updated Title');
  });

  it('should throw error when user is not post owner', async () => {
    const postId = 1;
    const userId = 2; // 不是所有者
    const dto = { title: 'Updated Title' };

    postService.update.mockRejectedValue(
      new ForbiddenException('Not post owner'),
    );

    await expect(controller.update(postId, userId, dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw error when post not found', async () => {
    const postId = 999;
    const userId = 1;
    const dto = { title: 'Updated Title' };

    postService.update.mockRejectedValue(
      new ForbiddenException('Post not found'),
    );

    await expect(controller.update(postId, userId, dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw error when content contains forbidden keyword', async () => {
    const postId = 1;
    const userId = 1;
    const dto = { title: 'forbidden keyword' };

    postService.update.mockRejectedValue(
      new BadRequestException('Content contains forbidden keyword'),
    );

    await expect(controller.update(postId, userId, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle partial update', async () => {
    const postId = 1;
    const userId = 1;
    const dto = { title: 'Updated Title' }; // 只更新 title
    const mockPost = {
      id: postId,
      userId,
      title: 'Updated Title',
      content: 'Original content',
    };

    postService.update.mockResolvedValue(mockPost);

    const result = await controller.update(postId, userId, dto);

    expect(result.title).toBe('Updated Title');
    expect(result.content).toBe('Original content');
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="update"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 update 端点测试 (5 个用例)"
```

---

### Task 7: 实现 remove 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 remove 端点的完整测试**

在 `describe('remove', ...)` 块中添加：

```typescript
describe('remove', () => {
  it('should delete post by owner', async () => {
    const postId = 1;
    const userId = 1;
    const mockResult = { message: '已删除' };

    postService.remove.mockResolvedValue(mockResult);

    const result = await controller.remove(postId, userId);

    expect(postService.remove).toHaveBeenCalledWith(postId, userId);
    expect(result.message).toBe('已删除');
  });

  it('should throw error when user is not post owner', async () => {
    const postId = 1;
    const userId = 2; // 不是所有者

    postService.remove.mockRejectedValue(
      new ForbiddenException('Not post owner'),
    );

    await expect(controller.remove(postId, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw error when post not found', async () => {
    const postId = 999;
    const userId = 1;

    postService.remove.mockRejectedValue(
      new ForbiddenException('Post not found'),
    );

    await expect(controller.remove(postId, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw error when post already deleted', async () => {
    const postId = 1;
    const userId = 1;

    postService.remove.mockRejectedValue(
      new BadRequestException('Post already deleted'),
    );

    await expect(controller.remove(postId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle invalid post id', async () => {
    const postId = -1;
    const userId = 1;

    postService.remove.mockRejectedValue(
      new BadRequestException('Invalid post id'),
    );

    await expect(controller.remove(postId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="remove"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 remove 端点测试 (5 个用例)"
```

---

### Task 8: 实现 unlockContact 端点测试 (5 个用例)

**文件:**
- Modify: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 编写 unlockContact 端点的完整测试**

在 `describe('unlockContact', ...)` 块中添加：

```typescript
describe('unlockContact', () => {
  it('should unlock contact for non-owner with sufficient beans', async () => {
    const postId = 1;
    const userId = 1;
    const mockResult = { unlocked: true, beanBalance: 90 };

    postService.unlockContact.mockResolvedValue(mockResult);

    const result = await controller.unlockContact(postId, userId);

    expect(postService.unlockContact).toHaveBeenCalledWith(postId, userId);
    expect(result.unlocked).toBe(true);
    expect(result.beanBalance).toBe(90);
  });

  it('should return unlocked for post owner', async () => {
    const postId = 1;
    const userId = 1; // 是所有者
    const mockResult = { unlocked: true };

    postService.unlockContact.mockResolvedValue(mockResult);

    const result = await controller.unlockContact(postId, userId);

    expect(result.unlocked).toBe(true);
  });

  it('should throw error when beans insufficient', async () => {
    const postId = 1;
    const userId = 1;

    postService.unlockContact.mockRejectedValue(
      new BadRequestException('Insufficient beans'),
    );

    await expect(controller.unlockContact(postId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when post not found', async () => {
    const postId = 999;
    const userId = 1;

    postService.unlockContact.mockRejectedValue(
      new BadRequestException('Post not found'),
    );

    await expect(controller.unlockContact(postId, userId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw error when user not authenticated', async () => {
    const postId = 1;
    const userId = undefined;

    postService.unlockContact.mockRejectedValue(
      new BadRequestException('User not authenticated'),
    );

    await expect(
      controller.unlockContact(postId, userId as any),
    ).rejects.toThrow(BadRequestException);
  });
});
```

**Step 2: 运行测试验证**

```bash
cd server
npm test -- post.controller.spec.ts --testNamePattern="unlockContact"
```

Expected: 5 个测试通过

**Step 3: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: 添加 unlockContact 端点测试 (5 个用例)"
```

---

### Task 9: 验证完整测试覆盖率

**文件:**
- Check: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 运行所有测试**

```bash
cd server
npm test -- post.controller.spec.ts
```

Expected: 33 个测试全部通过

**Step 2: 检查覆盖率**

```bash
cd server
npm test -- post.controller.spec.ts --coverage
```

Expected: 100% 语句覆盖率

**Step 3: 如果覆盖率不足 100%，识别未覆盖的代码行**

查看覆盖率报告，找出未覆盖的代码行，添加额外的测试用例。

**Step 4: 提交**

```bash
git add server/src/modules/post/post.controller.spec.ts
git commit -m "test: Post Controller 测试完成，100% 覆盖率"
```

---

### Task 10: 合并到 origin/main 并推送

**文件:**
- Commit: `server/src/modules/post/post.controller.spec.ts`

**Step 1: 确保所有测试通过**

```bash
cd server
npm test -- post.controller.spec.ts
```

Expected: 33 个测试通过

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

- **总测试用例数**: 33 个
- **预计覆盖率**: 100% 语句覆盖率
- **预计迭代**: 10 次（Task 1-9）
- **最终提交**: 合并到 origin/main

---

## 后续步骤

完成 Post Controller 测试后，按以下顺序继续其他模块：

1. **Auth Controller** (3 个端点，预计 12-15 个用例)
2. **User Controller** (5 个端点，预计 20-25 个用例)
3. **Wallet Controller** (4 个端点，预计 16-20 个用例)
4. **Payment Controller** (3 个端点，预计 12-15 个用例)
5. **Favorite Controller** (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
