# 临工招工流程 - 研究发现

## 业务流程理解

### 临工端状态流转
```
报名 → 待分配 → 入选 → 待出勤确认 → 已确认 → 进行中 → 待结算 → 已完成
                  ↓
                落选
```

### 展示层映射
- **待确认**: pending + accepted（企业审核中）
- **已入选**: confirmed（已确认出勤）
- **进行中**: working（工作执行中）
- **已完成**: done（工资已到账）

### 企业端流程
1. **报名管理**: 查看报名者 → 接受/拒绝
2. **选择管理员**: 从报名者中选择管理员（资格：信用分≥95、接单数≥10）
3. **工作执行**: 查看进度、处理异常
4. **结算支付**: 确认结算单 → 支付工资

---

## 数据库设计

### JobApplication 实体
```typescript
- id: bigint (PK)
- jobId: bigint (FK)
- workerId: bigint (FK)
- status: enum ['pending', 'accepted', 'confirmed', 'working', 'done', 'rejected', 'released', 'cancelled']
- isSupervisor: tinyint (0|1)
- confirmedAt: datetime (出勤确认时间)
- createdAt: timestamp
- updatedAt: timestamp
```

### Job 实体
```typescript
- status: enum ['recruiting', 'full', 'working', 'pending_settlement', 'settled', 'closed']
- dateStart: date
- dateEnd: date
```

---

## 关键业务规则

### 出勤确认
- 触发时间: 工作开始前 24 小时推送提醒
- 截止时间: 工作开始前 12 小时
- 未确认处理: 自动释放名额（status = 'released'）

### 管理员选择
- 资格条件:
  - 累计接单数 ≥ 10 单
  - 信用分 ≥ 95 分
  - 无违规记录
- 收益: 正常工资 + 监管服务费

### 定时任务
- 自动释放: 每小时检查，距离工作开始 < 12 小时且未确认则释放
- 工作开始: 每小时检查，到达工作开始日期则更新为 working

---

## 现有代码分析

### 已有的实体和服务
- ✅ JobApplication 实体已存在（status 字段已支持）
- ✅ Job 实体已存在（dateStart、dateEnd 字段已支持）
- ✅ JobService 已存在（需要扩展方法）
- ✅ JobController 已存在（需要添加新接口）

### 需要新增的文件
- ❌ JobStateMachine 类（状态转移验证）
- ❌ JobScheduler 类（定时任务）
- ❌ DTO 文件（accept-application.dto.ts、select-supervisor.dto.ts）

---

## 技术决策

### 状态机实现
- 使用静态方法验证状态转移
- 在 Service 层调用验证
- 提供清晰的错误消息

### 定时任务
- 使用 @nestjs/schedule 的 @Cron 装饰器
- 每小时执行一次（平衡实时性和性能）
- 添加日志记录便于调试

### 前端展示
- 后端返回分组数据（按状态分类）
- 前端直接使用分组数据渲染标签页
- 支持实时更新（WebSocket 或轮询）

---

## 测试策略

### 单元测试
- 状态转移合法性验证
- 出勤确认逻辑
- 管理员选择的资格验证

### 集成测试
- 完整的招工流程
- 异常场景（拒绝、释放、取消）
- 定时任务触发

### E2E 测试
- 临工端完整流程
- 企业端完整流程
- 两端数据一致性

---

## 已知问题和注意事项

1. **状态转移的原子性**: 需要确保状态转移是原子操作，避免并发问题
2. **定时任务的幂等性**: 定时任务需要支持重复执行而不产生副作用
3. **前后端同步**: 需要实现实时通知机制，确保前端及时获取最新状态
4. **权限验证**: 需要在每个接口中验证用户权限（企业只能操作自己的工作）

---

## 参考文档

- 设计文档: `Docs/plans/2026-03-10-worker-recruitment-flow-implementation.md`
- PRD: `Docs/prd_from_superpower/03-临工用工模块.md`
- 当前实体: `server/src/entities/job-application.entity.ts`、`server/src/entities/job.entity.ts`

