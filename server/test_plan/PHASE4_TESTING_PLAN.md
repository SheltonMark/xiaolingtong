# Phase 4 自动化测试计划

**规划日期**: 2026-03-08
**当前基线**: 611 个测试（100% 通过）
**目标新增**: 85-100 个测试
**目标总数**: ~700 个测试

---

## 概述

Phase 4 聚焦于：
1. **剩余模块覆盖** - 关闭剩余的测试空白
2. **E2E 测试扩展** - 完整的用户流程测试
3. **性能和并发** - 高负载场景验证
4. **错误恢复** - 异常场景和边界条件

---

## 文件结构（7 个文件，85-100 个测试）

| 文件 | 位置 | 测试数 | 优先级 |
|------|------|--------|--------|
| `settlement.service.spec.ts` | `src/modules/settlement/` | 12 | 高 |
| `promotion.service.spec.ts` | `src/modules/promotion/` | 11 | 高 |
| `report.service.spec.ts` | `src/modules/report/` | 10 | 高 |
| `upload.service.spec.ts` | `src/modules/upload/` | 12 | 中 |
| `e2e-workflow.spec.ts` | `src/test/e2e/` | 20 | 高 |
| `performance.spec.ts` | `src/test/performance/` | 15 | 中 |
| `error-recovery.spec.ts` | `src/test/error-recovery/` | 13 | 中 |

---

## 详细计划

### 1. settlement.service.spec.ts（12 个测试）

**位置**: `src/modules/settlement/settlement.service.spec.ts`

**Mock 模式**: C - getRepositoryToken

**测试用例**:
- `calculateSettlement — 计算结算金额（基础）`
- `calculateSettlement — 应用折扣规则`
- `calculateSettlement — 处理多个工作订单`
- `calculateSettlement — 边界值：0 金额`
- `calculateSettlement — 边界值：最大金额`
- `createSettlement — 创建结算记录`
- `createSettlement — 检查重复结算`
- `createSettlement — 更新用户钱包余额`
- `approveSettlement — 批准结算`
- `approveSettlement — 发送通知`
- `rejectSettlement — 拒绝结算并返还`
- `getSettlementHistory — 分页查询结算历史`

**关键依赖**:
```typescript
settlementRepo = { create, save, findOne, find, update };
walletRepo = { findOne, update, decrement, increment };
userRepo = { findOne, update };
notificationService = { create };
```

---

### 2. promotion.service.spec.ts（11 个测试）

**位置**: `src/modules/promotion/promotion.service.spec.ts`

**Mock 模式**: C - getRepositoryToken

**测试用例**:
- `createPromotion — 创建促销活动`
- `createPromotion — 验证时间范围`
- `createPromotion — 检查重复活动`
- `applyPromotion — 应用促销码`
- `applyPromotion — 验证促销码有效性`
- `applyPromotion — 计算折扣金额`
- `applyPromotion — 检查使用次数限制`
- `getActivePromotions — 获取活跃促销`
- `getActivePromotions — 按类型过滤`
- `expirePromotion — 过期促销活动`
- `getPromotionStats — 统计促销效果`

**关键依赖**:
```typescript
promotionRepo = { create, save, findOne, find, update };
promotionCodeRepo = { findOne, update, increment };
userPromotionRepo = { create, save, find };
```

---

### 3. report.service.spec.ts（10 个测试）

**位置**: `src/modules/report/report.service.spec.ts`

**Mock 模式**: C - getRepositoryToken

**测试用例**:
- `createReport — 创建举报记录`
- `createReport — 验证举报类型`
- `createReport — 检查重复举报`
- `processReport — 处理举报`
- `processReport — 更新举报状态`
- `processReport — 触发处罚流程`
- `getReportStats — 获取举报统计`
- `getReportStats — 按类型分组`
- `closeReport — 关闭举报`
- `getReportHistory — 查询举报历史`

**关键依赖**:
```typescript
reportRepo = { create, save, findOne, find, update };
userRepo = { findOne, update, decrement };
reportActionRepo = { create, save };
```

---

### 4. upload.service.spec.ts（12 个测试）

**位置**: `src/modules/upload/upload.service.spec.ts`

**Mock 模式**: C - getRepositoryToken + 文件系统 mock

**测试用例**:
- `uploadFile — 上传单个文件`
- `uploadFile — 验证文件类型`
- `uploadFile — 验证文件大小`
- `uploadFile — 生成唯一文件名`
- `uploadMultiple — 批量上传文件`
- `uploadMultiple — 处理部分失败`
- `deleteFile — 删除文件`
- `deleteFile — 清理存储空间`
- `getFileUrl — 生成访问 URL`
- `getFileUrl — 处理过期 URL`
- `validateFile — 验证文件完整性`
- `getUploadStats — 统计上传数据`

**关键依赖**:
```typescript
uploadRepo = { create, save, findOne, delete };
fileSystem = { writeFile, deleteFile, stat };
storageService = { upload, delete, getUrl };
```

---

### 5. e2e-workflow.spec.ts（20 个测试）

**位置**: `src/test/e2e/e2e-workflow.spec.ts`

**Mock 模式**: 集成测试 + 真实数据库

**完整用户流程**:

**工人工作流（8 个测试）**
- `worker-signup — 工人注册和认证`
- `worker-browse-jobs — 浏览工作列表`
- `worker-apply-job — 申请工作`
- `worker-checkin — 签到工作`
- `worker-submit-log — 提交工作日志`
- `worker-receive-payment — 接收报酬`
- `worker-rate-enterprise — 评价企业`
- `worker-view-history — 查看工作历史`

**企业工作流（7 个测试）**
- `enterprise-signup — 企业注册和认证`
- `enterprise-post-job — 发布工作`
- `enterprise-review-applications — 审核申请`
- `enterprise-confirm-workers — 确认工人`
- `enterprise-monitor-progress — 监控进度`
- `enterprise-settle-payment — 结算报酬`
- `enterprise-view-analytics — 查看分析`

**交互流程（5 个测试）**
- `messaging-workflow — 消息交互流程`
- `dispute-resolution — 纠纷解决流程`
- `promotion-usage — 促销码使用流程`
- `rating-feedback — 评价反馈流程`
- `notification-delivery — 通知投递流程`

---

### 6. performance.spec.ts（15 个测试）

**位置**: `src/test/performance/performance.spec.ts`

**Mock 模式**: 性能基准测试

**性能指标**:

**查询性能（5 个测试）**
- `list-jobs — 1000 条工作列表查询 < 200ms`
- `search-jobs — 关键词搜索 < 300ms`
- `get-notifications — 分页通知查询 < 150ms`
- `get-user-history — 用户历史查询 < 250ms`
- `get-analytics — 分析数据聚合 < 500ms`

**并发性能（5 个测试）**
- `concurrent-checkins — 100 个并发签到`
- `concurrent-applications — 50 个并发申请`
- `concurrent-payments — 30 个并发支付`
- `concurrent-uploads — 20 个并发上传`
- `concurrent-messaging — 100 个并发消息`

**负载测试（5 个测试）**
- `high-load-list — 高并发列表查询`
- `high-load-search — 高并发搜索`
- `high-load-create — 高并发创建`
- `high-load-update — 高并发更新`
- `memory-usage — 内存使用监控`

---

### 7. error-recovery.spec.ts（13 个测试）

**位置**: `src/test/error-recovery/error-recovery.spec.ts`

**Mock 模式**: 错误注入 + 恢复验证

**网络错误（4 个测试）**
- `timeout-recovery — 超时后重试`
- `connection-loss — 连接丢失恢复`
- `partial-failure — 部分失败处理`
- `circuit-breaker — 熔断器触发`

**数据错误（4 个测试）**
- `invalid-input — 无效输入处理`
- `data-corruption — 数据损坏检测`
- `concurrent-update — 并发更新冲突`
- `transaction-rollback — 事务回滚`

**业务错误（5 个测试）**
- `insufficient-balance — 余额不足处理`
- `duplicate-operation — 重复操作检测`
- `expired-resource — 过期资源处理`
- `permission-denied — 权限拒绝处理`
- `rate-limiting — 速率限制处理`

---

## 实现优先级

### 第一阶段（高优先级）- 第 1-2 周
1. settlement.service.spec.ts（12 个）
2. promotion.service.spec.ts（11 个）
3. e2e-workflow.spec.ts（20 个）
**小计**: 43 个测试

### 第二阶段（中优先级）- 第 3-4 周
4. report.service.spec.ts（10 个）
5. upload.service.spec.ts（12 个）
6. performance.spec.ts（15 个）
**小计**: 37 个测试

### 第三阶段（可选）- 第 5 周
7. error-recovery.spec.ts（13 个）
**小计**: 13 个测试

**总计**: 93 个测试

---

## Mock 模式参考

### 模式 C - Service 集成测试
```typescript
// settlement.service.spec.ts 示例
settlementRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
};

walletRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
  decrement: jest.fn(),
  increment: jest.fn(),
};

const module: TestingModule = await Test.createTestingModule({
  providers: [
    SettlementService,
    {
      provide: getRepositoryToken(Settlement),
      useValue: settlementRepo,
    },
    {
      provide: getRepositoryToken(Wallet),
      useValue: walletRepo,
    },
    // ...
  ],
}).compile();
```

### E2E 测试模式
```typescript
// e2e-workflow.spec.ts 示例
describe('Worker Job Application Workflow', () => {
  let app: INestApplication;
  let workerToken: string;
  let jobId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should complete full workflow', async () => {
    // 1. 注册工人
    // 2. 浏览工作
    // 3. 申请工作
    // 4. 签到
    // 5. 提交日志
    // 6. 接收报酬
  });
});
```

### 性能测试模式
```typescript
// performance.spec.ts 示例
describe('Performance Benchmarks', () => {
  it('should list 1000 jobs in < 200ms', async () => {
    const start = performance.now();

    const result = await jobService.list({
      page: 1,
      pageSize: 1000,
    });

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
    expect(result.list).toHaveLength(1000);
  });
});
```

---

## 验证方式

```bash
# 运行 Phase 4 测试
npm test -- --testPathPatterns="phase4|settlement.service.spec|promotion.service.spec|report.service.spec|upload.service.spec|e2e-workflow|performance|error-recovery"

# 运行性能测试
npm test -- --testPathPatterns="performance" --detectOpenHandles

# 运行 E2E 测试
npm test -- --testPathPatterns="e2e-workflow"

# 全套回归测试
npm test
```

---

## 预期结果

### 测试覆盖
- **总测试数**: ~700 个（611 + 93）
- **通过率**: 目标 100%
- **执行时间**: ~15 秒（包括性能测试）

### 覆盖范围
- ✅ 所有核心模块的单元测试
- ✅ 完整的用户工作流 E2E 测试
- ✅ 性能基准和并发测试
- ✅ 错误恢复和边界条件

### 质量指标
- 代码覆盖率: > 85%
- 关键路径覆盖: 100%
- 错误场景覆盖: > 90%

---

## 后续阶段（Phase 5+）

### Phase 5 - 高级场景
- 分布式事务测试
- 缓存一致性测试
- 数据迁移测试
- 灾难恢复测试

### Phase 6 - 持续优化
- 测试性能优化
- 覆盖率提升
- 文档完善
- 自动化 CI/CD 集成

---

## 资源需求

### 开发时间
- 第一阶段: 10-12 小时
- 第二阶段: 12-14 小时
- 第三阶段: 8-10 小时
- **总计**: 30-36 小时

### 技术栈
- Jest 测试框架
- TypeORM 数据库
- NestJS 应用框架
- 性能监控工具

---

## 成功标准

- ✅ 所有 93 个新测试通过
- ✅ 总测试数达到 ~700 个
- ✅ 代码覆盖率 > 85%
- ✅ 性能基准建立
- ✅ E2E 工作流完整
- ✅ 错误恢复验证完成

---

**状态**: 📋 规划完成
**就绪**: 可开始实施
**下一步**: 确认优先级并开始第一阶段实施
