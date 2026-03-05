# User Controller 单元测试设计文档

**日期**: 2026-03-05
**模块**: User Controller
**目标**: 100% 语句覆盖率
**预计用例数**: 28 个
**预计迭代**: 12-15 次

---

## 1. 概述

为 User Controller 编写完整的单元测试，使用 Mock Service 方案，专注于测试 Controller 层的职责：
- 参数验证（DTO 字段、avatarUrl 等）
- 装饰器功能（@CurrentUser）
- 权限验证
- 请求-响应映射
- 错误处理

---

## 2. 测试架构

### 2.1 端点清单

User Controller 有 5 个端点（全部需要认证）：

| 方法 | 路由 | 认证 | 描述 |
|------|------|------|------|
| POST | /cert/enterprise | 是 | 提交企业认证 |
| POST | /cert/worker | 是 | 提交工人认证 |
| GET | /cert/status | 是 | 获取认证状态 |
| PUT | /settings/avatar | 是 | 更新头像 |
| PUT | /settings/profile | 是 | 更新个人资料 |

### 2.2 测试场景矩阵

| 端点 | 成功 | 参数错误 | 权限错误 | Service 异常 | 边界 | 小计 |
|------|------|--------|--------|------------|------|------|
| submitEnterpriseCert | 1 | 2 | 1 | 1 | 1 | 6 |
| submitWorkerCert | 1 | 2 | 1 | 1 | 1 | 6 |
| getCertStatus | 1 | - | 1 | 1 | 1 | 4 |
| updateAvatar | 1 | 2 | 1 | 1 | 1 | 6 |
| updateProfile | 1 | 2 | 1 | 1 | 1 | 6 |
| **总计** | **5** | **8** | **5** | **5** | **5** | **28** |

---

## 3. Mock 策略

### 3.1 Service Mock

```typescript
userService = {
  submitEnterpriseCert: jest.fn(),
  submitWorkerCert: jest.fn(),
  getCertStatus: jest.fn(),
  updateAvatar: jest.fn(),
  updateProfile: jest.fn(),
}
```

### 3.2 装饰器 Mock

使用 NestJS Testing 模块的 `@CurrentUser` 装饰器注入：
- 认证用户：userId = 1, role = 'buyer'
- 未认证用户：userId = undefined

### 3.3 测试数据

```typescript
// submitEnterpriseCert 成功响应
{
  id: 1,
  userId: 1,
  type: 'enterprise',
  status: 'pending',
  companyName: 'Test Company',
  createdAt: new Date(),
}

// submitWorkerCert 成功响应
{
  id: 1,
  userId: 1,
  type: 'worker',
  status: 'pending',
  workerName: 'John Doe',
  createdAt: new Date(),
}

// getCertStatus 成功响应
{
  enterpriseCert: { status: 'approved' },
  workerCert: { status: 'pending' },
}

// updateAvatar 成功响应
{
  id: 1,
  avatar: 'new_avatar_url',
  message: '头像更新成功',
}

// updateProfile 成功响应
{
  id: 1,
  nickname: 'New Name',
  message: '个人资料更新成功',
}

// 错误响应
BadRequestException('Missing required fields')
BadRequestException('Invalid parameter')
```

---

## 4. 详细测试场景

### 4.1 submitEnterpriseCert 端点 (6 个用例)

**用例 1: 成功提交企业认证**
- 输入：有效的企业认证 DTO
- 预期：返回认证记录

**用例 2: DTO 缺少必需字段**
- 输入：缺少 companyName 的 DTO
- 预期：Service 验证失败或异常

**用例 3: DTO 字段类型错误**
- 输入：companyName 为数字而非字符串
- 预期：Service 验证失败或异常

**用例 4: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 5: Service 异常**
- 输入：有效的 DTO，但 Service 抛出异常
- 预期：异常传播

**用例 6: 空 DTO**
- 输入：空对象 {}
- 预期：Service 验证失败

### 4.2 submitWorkerCert 端点 (6 个用例)

**用例 1: 成功提交工人认证**
- 输入：有效的工人认证 DTO
- 预期：返回认证记录

**用例 2: DTO 缺少必需字段**
- 输入：缺少 workerName 的 DTO
- 预期：Service 验证失败或异常

**用例 3: DTO 字段类型错误**
- 输入：workerName 为数字而非字符串
- 预期：Service 验证失败或异常

**用例 4: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 5: Service 异常**
- 输入：有效的 DTO，但 Service 抛出异常
- 预期：异常传播

**用例 6: 空 DTO**
- 输入：空对象 {}
- 预期：Service 验证失败

### 4.3 getCertStatus 端点 (4 个用例)

**用例 1: 成功获取认证状态**
- 输入：userId = 1, role = 'buyer'
- 预期：返回认证状态

**用例 2: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 3: Service 异常**
- 输入：有效的 userId，但 Service 抛出异常
- 预期：异常传播

**用例 4: 无效的 role**
- 输入：role = 'invalid_role'
- 预期：Service 处理或抛出异常

### 4.4 updateAvatar 端点 (6 个用例)

**用例 1: 成功更新头像**
- 输入：有效的 avatarUrl
- 预期：返回更新结果

**用例 2: avatarUrl 为空字符串**
- 输入：avatarUrl = ''
- 预期：Service 验证失败或异常

**用例 3: avatarUrl 为 null**
- 输入：avatarUrl = null
- 预期：Service 验证失败或异常

**用例 4: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 5: Service 异常**
- 输入：有效的 avatarUrl，但 Service 抛出异常
- 预期：异常传播

**用例 6: 特殊字符 URL**
- 输入：avatarUrl 包含特殊字符
- 预期：Service 处理或返回成功

### 4.5 updateProfile 端点 (6 个用例)

**用例 1: 成功更新个人资料**
- 输入：有效的个人资料 DTO
- 预期：返回更新结果

**用例 2: DTO 缺少必需字段**
- 输入：缺少 nickname 的 DTO
- 预期：Service 验证失败或异常

**用例 3: DTO 字段类型错误**
- 输入：nickname 为数字而非字符串
- 预期：Service 验证失败或异常

**用例 4: 未认证用户访问**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 5: Service 异常**
- 输入：有效的 DTO，但 Service 抛出异常
- 预期：异常传播

**用例 6: 空 DTO**
- 输入：空对象 {}
- 预期：Service 验证失败

---

## 5. Ralph 循环配置

### 5.1 命令

```bash
/ralph-loop "为 User Controller 编写完整的单元测试。

目标：
- 为所有 5 个端点编写测试
- 每个端点覆盖：成功路径、参数验证、权限验证、异常处理、边界情况
- 达到 100% 语句覆盖率
- 所有测试通过

使用 Mock Service 方案，不依赖真实数据库。

完成标志：<promise>COMPLETE</promise>" \
  --max-iterations 15 \
  --completion-promise "COMPLETE"
```

### 5.2 迭代策略

- **迭代 1-3**: 基础框架 + submitEnterpriseCert 端点
- **迭代 4-6**: submitWorkerCert 端点
- **迭代 7-9**: getCertStatus 和 updateAvatar 端点
- **迭代 10-13**: updateProfile 端点
- **迭代 14-15**: 覆盖率补充和最终调整

---

## 6. 成功标准

### 6.1 功能完整性

- ✅ 所有 5 个端点都有测试
- ✅ 共 28 个测试用例
- ✅ 覆盖所有场景（成功、参数错误、权限错误、异常、边界）

### 6.2 代码质量

- ✅ 100% 语句覆盖率
- ✅ 所有测试通过
- ✅ 代码遵循项目规范
- ✅ 使用 ESLint 禁用注释处理 TypeScript 不安全类型

### 6.3 集成

- ✅ 代码提交到 git
- ✅ 合并到 origin/main
- ✅ 推送到远程仓库

---

## 7. 文件结构

```
server/src/modules/user/
├── user.controller.ts (现有)
├── user.service.ts (现有)
├── user.service.spec.ts (现有)
└── user.controller.spec.ts (新建)
```

---

## 8. 参考

- 现有 Service 测试：user.service.spec.ts (13 个用例，100% 覆盖率)
- Post Controller 测试：post.controller.spec.ts (33 个用例，100% 覆盖率)
- Auth Controller 测试：auth.controller.spec.ts (16 个用例，100% 覆盖率)
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 9. 后续计划

完成 User Controller 测试后，按以下顺序继续其他模块：
1. Wallet Controller (4 个端点，预计 16-20 个用例)
2. Payment Controller (3 个端点，预计 12-15 个用例)
3. Favorite Controller (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
