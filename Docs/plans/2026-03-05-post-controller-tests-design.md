# Post Controller 单元测试设计文档

**日期**: 2026-03-05
**模块**: Post Controller
**目标**: 100% 语句覆盖率
**预计用例数**: 25-30 个
**预计迭代**: 10-12 次

---

## 1. 概述

为 Post Controller 编写完整的单元测试，使用 Mock Service 方案，专注于测试 Controller 层的职责：
- 参数解析和验证
- 装饰器功能（@CurrentUser、@Public）
- 权限验证
- 请求-响应映射
- 错误处理

---

## 2. 测试架构

### 2.1 端点清单

Post Controller 有 7 个端点：

| 方法 | 路由 | 认证 | 描述 |
|------|------|------|------|
| GET | /posts | 否 | 列表（公开） |
| GET | /posts/mine | 是 | 我的发布 |
| GET | /posts/:id | 否 | 详情（公开） |
| POST | /posts | 是 | 创建 |
| PUT | /posts/:id | 是 | 更新 |
| DELETE | /posts/:id | 是 | 删除 |
| POST | /posts/:id/unlock | 是 | 解锁联系方式 |

### 2.2 测试场景矩阵

每个端点的测试场景：

```
成功路径 (1-2 个用例)
  ├── 基础成功场景
  └── 带可选参数的成功场景

参数验证失败 (1-2 个用例)
  ├── 缺少必需参数
  └── 参数类型错误

权限验证失败 (1 个用例，仅需认证端点)
  └── 未认证用户访问

Service 异常处理 (1-2 个用例)
  ├── Service 抛出 BadRequestException
  └── Service 抛出 ForbiddenException

边界情况 (1 个用例)
  └── 特殊值处理（null、0、空字符串等）
```

### 2.3 预计用例分布

| 端点 | 成功 | 参数 | 权限 | 异常 | 边界 | 小计 |
|------|------|------|------|------|------|------|
| list | 1 | 1 | - | 1 | 1 | 4 |
| myPosts | 1 | 1 | 1 | 1 | 1 | 5 |
| detail | 1 | 1 | - | 1 | 1 | 4 |
| create | 1 | 1 | 1 | 1 | 1 | 5 |
| update | 1 | 1 | 1 | 1 | 1 | 5 |
| remove | 1 | 1 | 1 | 1 | 1 | 5 |
| unlockContact | 1 | 1 | 1 | 1 | 1 | 5 |
| **总计** | **7** | **7** | **5** | **7** | **7** | **33** |

---

## 3. Mock 策略

### 3.1 Service Mock

```typescript
postService = {
  list: jest.fn(),
  myPosts: jest.fn(),
  detail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  unlockContact: jest.fn(),
}
```

### 3.2 装饰器 Mock

使用 NestJS Testing 模块的 `@CurrentUser` 装饰器注入：
- 认证用户：userId = 1
- 未认证用户：userId = undefined

### 3.3 测试数据

```typescript
// 成功响应示例
{
  id: 1,
  userId: 1,
  type: 'purchase',
  title: 'Test Post',
  content: 'Test content',
  status: 'active',
  createdAt: new Date(),
}

// 错误响应示例
BadRequestException('Invalid parameters')
ForbiddenException('Permission denied')
```

---

## 4. Ralph 循环配置

### 4.1 命令

```bash
/ralph-loop "为 Post Controller 编写完整的单元测试。

目标：
- 为所有 7 个端点编写测试
- 每个端点覆盖：成功路径、参数验证、权限验证、异常处理、边界情况
- 达到 100% 语句覆盖率
- 所有测试通过

使用 Mock Service 方案，不依赖真实数据库。

完成标志：<promise>COMPLETE</promise>" \
  --max-iterations 12 \
  --completion-promise "COMPLETE"
```

### 4.2 迭代策略

- **迭代 1-3**: 基础框架 + list、detail、myPosts 端点
- **迭代 4-7**: create、update、remove 端点
- **迭代 8-10**: unlockContact 端点 + 覆盖率补充
- **迭代 11-12**: 最终调整和优化

---

## 5. 成功标准

### 5.1 功能完整性

- ✅ 所有 7 个端点都有测试
- ✅ 每个端点至少 4-5 个测试用例
- ✅ 覆盖所有场景（成功、参数错误、权限错误、异常、边界）

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
server/src/modules/post/
├── post.controller.ts (现有)
├── post.service.ts (现有)
├── post.service.spec.ts (现有)
└── post.controller.spec.ts (新建)
```

---

## 7. 参考

- 现有 Service 测试：post.service.spec.ts (20 个用例，93.78% 覆盖率)
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 8. 后续计划

完成 Post Controller 测试后，按以下顺序继续其他模块：
1. Auth Controller (3 个端点)
2. User Controller (5 个端点)
3. Wallet Controller (4 个端点)
4. Payment Controller (3 个端点)
5. Favorite Controller (2 个端点)
