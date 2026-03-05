# Favorite Controller 单元测试设计文档

**日期**: 2026-03-05
**模块**: Favorite Controller
**目标**: 100% 语句覆盖率
**预计用例数**: 10 个
**预计迭代**: 6-8 次

---

## 1. 概述

为 Favorite Controller 编写完整的单元测试，使用 Mock Service 方案，专注于测试 Controller 层的职责：
- 请求处理和参数验证
- 权限检查（用户认证）
- 收藏状态管理
- 错误处理和恢复
- HTTP 响应生成

---

## 2. 测试架构

### 2.1 端点清单

Favorite Controller 有 2 个公开端点：

| 方法 | 路由 | 认证 | 描述 |
|------|------|------|------|
| GET | /favorite/list | 是 | 获取用户收藏列表（支持分页） |
| POST | /favorite/toggle | 是 | 切换收藏状态（收藏/取消收藏） |

### 2.2 测试场景矩阵

| 场景 | 用例数 | 描述 |
|------|--------|------|
| 成功获取收藏列表 | 2 | 有数据、空列表 |
| 分页验证 | 1 | 无效分页参数 |
| list 权限验证 | 1 | 未认证用户 |
| list 异常处理 | 1 | 服务异常 |
| 成功切换收藏 | 2 | 收藏、取消收藏 |
| toggle 权限验证 | 1 | 未认证用户 |
| toggle 参数验证 | 1 | 缺少必需字段 |
| toggle 异常处理 | 1 | 服务异常 |
| **总计** | **10** | - |

---

## 3. Mock 策略

### 3.1 Service Mock

```typescript
favoriteService = {
  getFavorites: jest.fn(),
  toggleFavorite: jest.fn(),
} as jest.Mocked<FavoriteService>;
```

### 3.2 Request/Response Mock

使用 Express 的 Request 和 Response 对象：
- req.user：包含认证用户信息
- req.query：分页参数
- req.body：请求体（postId）
- res.json()：返回 JSON 响应
- res.status()：设置 HTTP 状态码

### 3.3 测试数据

```typescript
// 成功获取收藏列表
{
  list: [
    { id: 1, userId: 1, postId: 101, createdAt: new Date() },
    { id: 2, userId: 1, postId: 102, createdAt: new Date() },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
}

// 空收藏列表
{
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
}

// 成功收藏响应
{ message: '收藏成功', isFavorited: true }

// 成功取消收藏响应
{ message: '取消收藏成功', isFavorited: false }

// 失败响应
{ code: 'FAIL', message: 'error message' }
```

---

## 4. 详细测试场景

### 4.1 list 端点 (5 个用例)

**用例 1: 成功获取收藏列表（有数据）**
- 输入：userId = 1, page = 1, pageSize = 20
- 预期：返回分页数据，total = 2

**用例 2: 成功获取收藏列表（空列表）**
- 输入：userId = 1, page = 1, pageSize = 20
- 预期：返回空数组，total = 0

**用例 3: 分页参数验证**
- 输入：page = -1 或 pageSize = 0
- 预期：抛出 BadRequestException

**用例 4: 权限验证**
- 输入：userId = undefined（未认证）
- 预期：抛出 UnauthorizedException

**用例 5: 服务异常处理**
- 输入：有效请求，但 getFavorites 抛出异常
- 预期：返回 500 错误响应

### 4.2 toggle 端点 (5 个用例)

**用例 1: 成功收藏**
- 输入：userId = 1, postId = 101
- 预期：返回 { isFavorited: true }

**用例 2: 成功取消收藏**
- 输入：userId = 1, postId = 101（已收藏）
- 预期：返回 { isFavorited: false }

**用例 3: 权限验证**
- 输入：userId = undefined（未认证）
- 预期：抛出 UnauthorizedException

**用例 4: 参数验证**
- 输入：postId = undefined 或 postId = null
- 预期：抛出 BadRequestException

**用例 5: 服务异常处理**
- 输入：有效请求，但 toggleFavorite 抛出异常
- 预期：返回 500 错误响应

---

## 5. 成功标准

### 5.1 功能完整性

- ✅ list 端点有完整测试
- ✅ toggle 端点有完整测试
- ✅ 共 10 个测试用例
- ✅ 覆盖所有场景（成功、失败、异常、验证）

### 5.2 代码质量

- ✅ 100% 语句覆盖率
- ✅ 所有测试通过
- ✅ 代码遵循项目规范
- ✅ 使用 ESLint 禁用注释处理 TypeScript 不安全类型

### 5.3 集成

- ✅ 代码提交到 git
- ✅ 合并到 origin/main
- ✅ 推送到远程仓库

---

## 6. 文件结构

```
server/src/modules/favorite/
├── favorite.controller.ts (现有)
├── favorite.service.ts (现有)
├── favorite.service.spec.ts (现有)
└── favorite.controller.spec.ts (新建)
```

---

## 7. 参考

- 现有 Service 测试：favorite.service.spec.ts
- Post Controller 测试：post.controller.spec.ts (33 个用例，100% 覆盖率)
- Auth Controller 测试：auth.controller.spec.ts (16 个用例，100% 覆盖率)
- User Controller 测试：user.controller.spec.ts (28 个用例，100% 覆盖率)
- Wallet Controller 测试：wallet.controller.spec.ts (20 个用例，100% 覆盖率)
- Payment Controller 测试：payment.controller.spec.ts (10 个用例，100% 覆盖率)
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 8. 项目总结

完成 Favorite Controller 测试后，将完成整个项目的 Controller 层测试：

| 模块 | 端点数 | 用例数 | 覆盖率 |
|------|--------|--------|--------|
| Post Controller | 7 | 33 | 100% |
| Auth Controller | 4 | 16 | 100% |
| User Controller | 5 | 28 | 100% |
| Wallet Controller | 4 | 20 | 100% |
| Payment Controller | 1 | 10 | 100% |
| Favorite Controller | 2 | 10 | 100% |
| **总计** | **23** | **117** | **100%** |

