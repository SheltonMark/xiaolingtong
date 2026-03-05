# 集成测试设计文档

**日期**: 2026-03-05
**范围**: 所有 Controller + Service 集成测试
**目标**: 85-110 个集成测试用例，100% 覆盖率
**预计迭代**: 3 周

---

## 1. 概述

为所有 Controller 和 Service 的集成编写完整的集成测试，使用 Mock Repository 方案，专注于测试完整的请求-响应流程和 Controller 与 Service 的协作。

---

## 2. 集成测试架构

### 2.1 集成测试范围

按业务重要性排序：

| 模块 | 端点数 | 预计用例 | 描述 |
|------|--------|---------|------|
| AuthModule | 4 | 12-15 | 登录、角色选择、获取资料、登出 |
| PostModule | 7 | 25-30 | 列表、详情、创建、更新、删除、解锁、我的文章 |
| UserModule | 5 | 15-20 | 企业认证、工人认证、认证状态、头像、资料 |
| WalletModule | 4 | 15-20 | 余额、交易记录、收入、提现 |
| PaymentModule | 1 | 8-10 | 支付回调通知 |
| FavoriteModule | 2 | 10-15 | 收藏列表、切换收藏 |
| **总计** | **23** | **85-110** | - |

### 2.2 Mock 策略

**完全 Mock 数据库：**
- Mock TypeORM Repository
- 不依赖真实数据库
- 测试速度快，隔离性好

**Service 依赖 Mock：**
- 其他 Service 依赖使用 Mock
- 外部 API 调用使用 Mock

---

## 3. 详细测试场景

### 3.1 AuthModule 集成测试 (12-15 个用例)

**wxLogin 方法：**
- 微信登录成功，返回 token
- 用户已存在，更新登录时间
- 登录失败，异常处理
- 参数验证失败

**chooseRole 方法：**
- 角色选择成功
- 无效角色，异常处理
- 权限验证失败
- 重复选择处理

**getProfile 方法：**
- 获取个人资料成功
- 用户不存在，异常处理
- 权限验证失败
- 数据库异常

**logout 方法：**
- 登出成功，清理 token
- 用户不存在，异常处理
- 异常处理

### 3.2 PostModule 集成测试 (25-30 个用例)

**list 方法：**
- 分页查询成功
- 筛选功能正确
- 排序功能正确
- 空结果处理
- 无效分页参数
- 数据库异常

**myPosts 方法：**
- 获取用户文章成功
- 权限验证失败
- 分页处理
- 空结果处理
- 异常处理

**detail 方法：**
- 获取文章详情成功
- 文章不存在
- 权限检查
- 异常处理

**create 方法：**
- 创建文章成功
- 参数验证失败
- 业务规则违反
- 数据库异常

**update 方法：**
- 更新文章成功
- 权限验证失败
- 文章不存在
- 冲突处理
- 异常处理

**remove 方法：**
- 删除文章成功
- 权限验证失败
- 文章不存在
- 级联删除
- 异常处理

**unlockContact 方法：**
- 解锁联系方式成功
- 费用扣除正确
- 余额不足
- 权限验证失败
- 异常处理

### 3.3 UserModule 集成测试 (15-20 个用例)

**submitEnterpriseCert 方法：**
- 企业认证提交成功
- 参数验证失败
- 重复提交处理
- 异常处理

**submitWorkerCert 方法：**
- 工人认证提交成功
- 参数验证失败
- 重复提交处理
- 异常处理

**getCertStatus 方法：**
- 获取认证状态成功
- 用户不存在
- 无认证记录
- 异常处理

**updateAvatar 方法：**
- 更新头像成功
- 文件验证失败
- 存储异常
- 权限验证失败

**updateProfile 方法：**
- 更新资料成功
- 参数验证失败
- 业务规则违反
- 异常处理

### 3.4 WalletModule 集成测试 (15-20 个用例)

**getBalance 方法：**
- 获取余额成功
- 用户不存在
- 异常处理

**getTransactions 方法：**
- 获取交易记录成功
- 分页处理
- 筛选功能
- 空结果处理
- 异常处理

**getIncome 方法：**
- 获取收入统计成功
- 按月份统计
- 无收入记录
- 异常处理

**withdraw 方法：**
- 提现成功
- 余额验证失败
- 手续费计算正确
- 异常处理

### 3.5 PaymentModule 集成测试 (8-10 个用例)

**notify 方法：**
- 支付成功回调处理
- 支付失败回调处理
- 解密失败处理
- 签名验证失败
- 异常处理

### 3.6 FavoriteModule 集成测试 (10-15 个用例)

**list 方法：**
- 获取收藏列表成功
- 多类型收藏
- 排序功能
- 空结果处理
- 异常处理

**toggle 方法：**
- 切换收藏成功（收藏）
- 切换收藏成功（取消收藏）
- 重复操作处理
- 异常处理

---

## 4. 集成测试的关键验证点

### 4.1 请求处理

- 参数正确传递到 Service
- 装饰器（@CurrentUser、@Body 等）正确工作
- 请求验证正确执行
- 权限检查正确执行

### 4.2 Service 调用

- Controller 正确调用 Service 方法
- 参数正确传递
- 返回值正确处理
- 异常正确传播

### 4.3 Repository 交互

- Service 正确调用 Repository
- Mock Repository 被正确调用
- 数据正确返回
- 异常正确处理

### 4.4 响应生成

- HTTP 状态码正确
- 响应体格式正确
- 错误信息正确
- 数据转换正确

---

## 5. 执行计划

### 5.1 阶段 1：核心模块 (Week 1)

**AuthModule 集成测试 (12-15 用例)**
- Task 1-2: 实现所有方法的集成测试

**PostModule 集成测试 (25-30 用例)**
- Task 3-5: 实现所有方法的集成测试

### 5.2 阶段 2：用户和财务 (Week 2)

**UserModule 集成测试 (15-20 用例)**
- Task 6-7: 实现所有方法的集成测试

**WalletModule 集成测试 (15-20 用例)**
- Task 8-9: 实现所有方法的集成测试

### 5.3 阶段 3：支付和收藏 (Week 3)

**PaymentModule 集成测试 (8-10 用例)**
- Task 10: 实现所有方法的集成测试

**FavoriteModule 集成测试 (10-15 用例)**
- Task 11: 实现所有方法的集成测试

---

## 6. 成功标准

### 6.1 功能完整性

- ✅ 所有 6 个模块有完整集成测试
- ✅ 共 85-110 个集成测试用例
- ✅ 覆盖所有场景（成功、失败、异常、验证）

### 6.2 代码质量

- ✅ 所有测试通过
- ✅ 代码遵循项目规范
- ✅ Mock 设置正确
- ✅ 验证点完整

### 6.3 集成

- ✅ 代码提交到 git
- ✅ 合并到 origin/main
- ✅ 推送到远程仓库

---

## 7. 文件结构

```
server/src/modules/
├── auth/
│   ├── auth.controller.ts (现有)
│   ├── auth.service.ts (现有)
│   ├── auth.controller.spec.ts (现有)
│   ├── auth.service.spec.ts (现有)
│   └── auth.integration.spec.ts (新建)
├── post/
│   ├── post.controller.ts (现有)
│   ├── post.service.ts (现有)
│   ├── post.controller.spec.ts (现有)
│   ├── post.service.spec.ts (现有)
│   └── post.integration.spec.ts (新建)
├── user/
│   ├── user.controller.ts (现有)
│   ├── user.service.ts (现有)
│   ├── user.controller.spec.ts (现有)
│   ├── user.service.spec.ts (现有)
│   └── user.integration.spec.ts (新建)
├── wallet/
│   ├── wallet.controller.ts (现有)
│   ├── wallet.service.ts (现有)
│   ├── wallet.controller.spec.ts (现有)
│   ├── wallet.service.spec.ts (现有)
│   └── wallet.integration.spec.ts (新建)
├── payment/
│   ├── payment.controller.ts (现有)
│   ├── payment.service.ts (现有)
│   ├── payment.controller.spec.ts (现有)
│   ├── payment.service.spec.ts (现有)
│   └── payment.integration.spec.ts (新建)
├── favorite/
│   ├── favorite.controller.ts (现有)
│   ├── favorite.service.ts (现有)
│   ├── favorite.controller.spec.ts (现有)
│   ├── favorite.service.spec.ts (现有)
│   └── favorite.integration.spec.ts (新建)
```

---

## 8. 参考

- 现有 Controller 测试：6 个 Controller，117 个用例，100% 覆盖率
- 现有 Service 测试：6 个 Service，99 个用例，100% 覆盖率
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions

---

## 9. 项目总结

完成集成测试后，将完成整个应用的测试覆盖：

| 层级 | 模块数 | 用例数 | 覆盖率 |
|------|--------|--------|--------|
| Controller 单元测试 | 6 | 117 | 100% |
| Service 单元测试 | 6 | 99 | 100% |
| 集成测试 | 6 | 85-110 | 100% |
| **总计** | **6** | **301-326** | **100%** |

这将为项目提供完整的单元测试和集成测试覆盖，确保代码质量和可维护性。

