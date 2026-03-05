# Service 层单元测试设计文档

**日期**: 2026-03-05
**范围**: 所有 Service 层单元测试
**目标**: 160-225 个测试用例，100% 覆盖率
**预计迭代**: 4 周

---

## 1. 概述

为所有 Service 类编写完整的单元测试，使用 Mock Repository 方案，专注于测试 Service 层的职责：
- 业务逻辑实现
- 数据验证和转换
- 异常处理和错误恢复
- 数据库操作（Mock）
- 事务管理

---

## 2. 测试架构

### 2.1 Service 测试优先级

按业务重要性排序：

| 优先级 | Service | 方法数 | 预计用例 | 描述 |
|--------|---------|--------|---------|------|
| 1 | AuthService | 3-4 | 15-20 | 认证核心，最关键 |
| 2 | PostService | 6-8 | 30-40 | 主要业务功能 |
| 3 | UserService | 5-6 | 20-25 | 用户管理 |
| 4 | WalletService | 4-5 | 20-25 | 财务相关 |
| 5 | PaymentService | 3-4 | 15-20 | 支付相关 |
| 6 | FavoriteService | 2-3 | 10-15 | 收藏功能 |
| 7 | 其他 Service | 多个 | 50-80 | 辅助功能 |
| **总计** | **6+** | **23+** | **160-225** | - |

### 2.2 Mock 策略

**Repository Mock：**
```typescript
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  findByIds: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
} as jest.Mocked<Repository<Entity>>;
```

**Service 依赖 Mock：**
- 其他 Service 依赖使用 Mock
- 外部 API 调用使用 Mock
- 工具函数使用 Mock

---

## 3. 详细测试场景

### 3.1 AuthService (15-20 个用例)

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

### 3.2 PostService (30-40 个用例)

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

### 3.3 UserService (20-25 个用例)

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

### 3.4 WalletService (20-25 个用例)

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

### 3.5 PaymentService (15-20 个用例)

**decryptNotify 方法：**
- 解密回调成功
- 格式验证失败
- 签名验证失败
- 异常处理

**handlePaySuccess 方法：**
- 处理支付成功
- 更新订单状态
- 更新用户余额
- 异常处理

### 3.6 FavoriteService (10-15 个用例)

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

### 3.7 其他 Service (50-80 个用例)

按类似模式覆盖其他 Service：
- AdminService
- ApplicationService
- BeanService
- ChatService
- ConfigService
- ExposureService
- JobService
- 等等

---

## 4. 执行计划

### 4.1 阶段 1：核心 Service (Week 1)

**AuthService (15-20 用例)**
- Task 1: 创建测试框架和 Mock 设置
- Task 2: 实现 wxLogin 测试
- Task 3: 实现 chooseRole 测试
- Task 4: 实现 getProfile 和 logout 测试
- Task 5: 验证覆盖率和提交

**PostService (30-40 用例)**
- Task 6: 创建测试框架
- Task 7: 实现 list 和 myPosts 测试
- Task 8: 实现 detail 和 create 测试
- Task 9: 实现 update 和 remove 测试
- Task 10: 实现 unlockContact 测试
- Task 11: 验证覆盖率和提交

### 4.2 阶段 2：用户和财务 (Week 2)

**UserService (20-25 用例)**
- Task 12-15: 实现所有方法测试

**WalletService (20-25 用例)**
- Task 16-19: 实现所有方法测试

### 4.3 阶段 3：支付和收藏 (Week 3)

**PaymentService (15-20 用例)**
- Task 20-22: 实现所有方法测试

**FavoriteService (10-15 用例)**
- Task 23-24: 实现所有方法测试

### 4.4 阶段 4：其他 Service (Week 4)

**其他 Service (50-80 用例)**
- Task 25+: 按优先级实现其他 Service 测试

---

## 5. 成功标准

### 5.1 功能完整性

- ✅ 所有 Service 有完整测试
- ✅ 共 160-225 个测试用例
- ✅ 覆盖所有场景（成功、失败、异常、验证）

### 5.2 代码质量

- ✅ 100% 语句覆盖率
- ✅ 所有测试通过
- ✅ 代码遵循项目规范
- ✅ Mock 设置正确

### 5.3 集成

- ✅ 代码提交到 git
- ✅ 合并到 origin/main
- ✅ 推送到远程仓库

---

## 6. 文件结构

```
server/src/modules/
├── auth/
│   ├── auth.service.ts (现有)
│   └── auth.service.spec.ts (新建)
├── post/
│   ├── post.service.ts (现有)
│   └── post.service.spec.ts (新建)
├── user/
│   ├── user.service.ts (现有)
│   └── user.service.spec.ts (新建)
├── wallet/
│   ├── wallet.service.ts (现有)
│   └── wallet.service.spec.ts (新建)
├── payment/
│   ├── payment.service.ts (现有)
│   └── payment.service.spec.ts (新建)
├── favorite/
│   ├── favorite.service.ts (现有)
│   └── favorite.service.spec.ts (新建)
└── ...
```

---

## 7. 参考

- 现有 Controller 测试：6 个 Controller，117 个用例，100% 覆盖率
- NestJS 测试文档：https://docs.nestjs.com/fundamentals/testing
- Jest Mock 文档：https://jestjs.io/docs/mock-functions
- TypeORM 测试：https://typeorm.io/

---

## 8. 项目总结

完成 Service 层测试后，将完成整个应用的单元测试：

| 层级 | 模块数 | 用例数 | 覆盖率 |
|------|--------|--------|--------|
| Controller 层 | 6 | 117 | 100% |
| Service 层 | 6+ | 160-225 | 100% |
| **总计** | **12+** | **277-342** | **100%** |

这将为项目提供完整的单元测试覆盖，确保代码质量和可维护性。

