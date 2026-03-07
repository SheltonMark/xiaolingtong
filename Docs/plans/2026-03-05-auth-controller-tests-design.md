# Auth Controller 单元测试设计文档

**日期**: 2026-03-05
**模块**: Auth Controller
**目标**: 100% 语句覆盖率
**预计用例数**: 17 个
**预计迭代**: 10-12 次

---

## 1. 概述

为 Auth Controller 编写完整的单元测试，使用 Mock Service 方案，专注于测试 Controller 层的职责：
- 参数验证（code、role 不能为空）
- 装饰器功能（@CurrentUser、@Public）
- 权限验证
- 请求-响应映射
- 错误处理

---

## 2. 测试架构

### 2.1 端点清单

Auth Controller 有 4 个端点：

| 方法 | 路由 | 认证 | 描述 |
|------|------|------|------|
| POST | /auth/wx-login | 否 | 微信登录（公开） |
| POST | /auth/choose-role | 是 | 选择角色 |
| GET | /auth/profile | 是 | 获取个人资料 |
| POST | /auth/logout | 否 | 退出登录（公开） |

### 2.2 测试场景矩阵

| 端点 | 成功 | 参数错误 | 权限错误 | Service 异常 | 边界 | 小计 |
|------|------|--------|--------|------------|------|------|
| wxLogin | 1 | 2 | - | 1 | 1 | 5 |
| chooseRole | 1 | 2 | 1 | 1 | 1 | 6 |
| getProfile | 1 | - | 1 | 1 | 1 | 4 |
| logout | 1 | - | - | - | - | 1 |
| **总计** | **4** | **4** | **2** | **3** | **3** | **17** |

---

## 3. Mock 策略

### 3.1 Service Mock

```typescript
authService = {
  wxLogin: jest.fn(),
  chooseRole: jest.fn(),
  getProfile: jest.fn(),
}
```

### 3.2 装饰器 Mock

使用 NestJS Testing 模块的 `@CurrentUser` 装饰器注入：
- 认证用户：userId = 1
- 未认证用户：userId = undefined

### 3.3 测试数据

```typescript
// wxLogin 成功响应
{
  token: 'jwt_token_xxx',
  userId: 1,
  openid: 'wx_openid_xxx',
}

// chooseRole 成功响应
{
  userId: 1,
  role: 'buyer',
  message: '角色选择成功',
}

// getProfile 成功响应
{
  id: 1,
  openid: 'wx_openid_xxx',
  nickname: 'User Name',
  avatar: 'avatar_url',
  role: 'buyer',
}

// 错误响应
BadRequestException('code 不能为空')
BadRequestException('role 不能为空')
```

---

## 4. 详细测试场景

### 4.1 wxLogin 端点 (5 个用例)

**用例 1: 成功登录**
- 输入：有效的 code
- 预期：返回 token 和用户信息

**用例 2: code 为空字符串**
- 输入：code = ''
- 预期：抛出 BadRequestException('code 不能为空')

**用例 3: code 为 null**
- 输入：code = null
- 预期：抛出 BadRequestException('code 不能为空')

**用例 4: Service 异常**
- 输入：有效的 code，但 Service 抛出异常
- 预期：异常传播

**用例 5: 特殊字符 code**
- 输入：code 包含特殊字符
- 预期：Service 处理或抛出异常

### 4.2 chooseRole 端点 (6 个用例)

**用例 1: 成功选择角色**
- 输入：userId = 1, role = 'buyer'
- 预期：返回成功消息

**用例 2: role 为空字符串**
- 输入：role = ''
- 预期：抛出 BadRequestException('role 不能为空')

**用例 3: role 为 null**
- 输入：role = null
- 预期：抛出 BadRequestException('role 不能为空')

**用例 4: 未认证用户**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 5: Service 异常**
- 输入：有效的 userId 和 role，但 Service 抛出异常
- 预期：异常传播

**用例 6: 无效的 role 值**
- 输入：role = 'invalid_role'
- 预期：Service 验证失败

### 4.3 getProfile 端点 (4 个用例)

**用例 1: 成功获取个人资料**
- 输入：userId = 1
- 预期：返回用户信息

**用例 2: 未认证用户**
- 输入：userId = undefined
- 预期：Service 抛出异常或权限错误

**用例 3: Service 异常**
- 输入：有效的 userId，但 Service 抛出异常
- 预期：异常传播

**用例 4: userId 为 0**
- 输入：userId = 0
- 预期：Service 处理或抛出异常

### 4.4 logout 端点 (1 个用例)

**用例 1: 成功退出**
- 输入：无
- 预期：返回 { message: '已退出' }

---

## 5. Ralph 循环配置

### 5.1 命令

```bash
/ralph-loop "为 Auth Controller 编写完整的单元测试。

目标：
- 为所有 4 个端点编写测试
- 每个端点覆盖：成功路径、参数验证、权限验证、异常处理、边界情况
- 达到 100% 语句覆盖率
- 所有测试通过

使用 Mock Service 方案，不依赖真实数据库。

完成标志：<promise>COMPLETE</promise>" \
  --max-iterations 12 \
  --completion-promise "COMPLETE"
```

### 5.2 迭代策略

- **迭代 1-3**: 基础框架 + wxLogin 端点
- **迭代 4-7**: chooseRole 端点
- **迭代 8-10**: getProfile 和 logout 端点
- **迭代 11-12**: 覆盖率补充和最终调整

---

## 6. 成功标准

### 6.1 功能完整性

- ✅ 所有 4 个端点都有测试
- ✅ 共 17 个测试用例
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
server/src/modules/auth/
├── auth.controller.ts (现有)
├── auth.service.ts (现有)
├── auth.service.spec.ts (现有)
└── auth.controller.spec.ts (新建)
```

---

## 8. 参考

- 现有 Service 测试：auth.service.spec.ts (10 个用例，100% 覆盖率)
- Post Controller 测试：post.controller.spec.ts (33 个用例，100% 覆盖率)
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 9. 后续计划

完成 Auth Controller 测试后，按以下顺序继续其他模块：
1. User Controller (5 个端点，预计 20-25 个用例)
2. Wallet Controller (4 个端点，预计 16-20 个用例)
3. Payment Controller (3 个端点，预计 12-15 个用例)
4. Favorite Controller (2 个端点，预计 8-10 个用例)

总计：约 100+ 个 Controller 测试用例，完整覆盖所有核心业务流程。
