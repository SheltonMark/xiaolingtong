# 自动化测试 - 快速参考卡

## 🎯 一句话总结
**516 个测试全部通过，Phase 1 完成，包含 52 个新增测试覆盖并发、网络、响应式、主题、导航、边界值、数据类型**

---

## ⚡ 最常用命令

```bash
npm test                    # 运行所有 516 个测试 (~10s)
npm test -- bean            # 运行 Bean 模块测试
npm test -- --coverage      # 生成覆盖率报告
```

---

## 📊 测试统计

```
总计: 516 个测试 ✅ 100% 通过
├─ 后端单元测试: 216 个
├─ 后端集成测试: 274 个
└─ E2E 测试: 52 个 (Phase 1)
```

---

## 🔍 Phase 1 测试分布

| 类别 | 数量 | 文件 |
|------|------|------|
| 边界值 | 8 | bean.phase1.spec.ts |
| 数据类型 | 7 | bean.phase1.spec.ts |
| 事务处理 | 7 | bean.phase1.spec.ts |
| 集成测试 | 30 | bean.integration.spec.ts |
| 导航 | 11 | phase1-navigation.e2e-spec.ts |
| 响应式 | 14 | phase1-responsive-and-theme.e2e-spec.ts |
| 并发/网络 | 13 | phase1-concurrent-and-network.e2e-spec.ts |

---

## 🚀 运行特定测试

```bash
# 后端测试
npm test -- bean.phase1.spec.ts
npm test -- bean.integration.spec.ts

# E2E 测试 (需要 MySQL + 后端)
npx playwright test test/e2e/phase1-navigation.e2e-spec.ts
npx playwright test test/e2e/phase1-responsive-and-theme.e2e-spec.ts
npx playwright test test/e2e/phase1-concurrent-and-network.e2e-spec.ts

# 特定测试用例
npm test -- bean.phase1.spec.ts -t "should handle zero balance"
```

---

## 📁 核心文档

| 文档 | 内容 |
|------|------|
| TESTING_MASTER.md | 📍 总览 |
| PHASE1_COMPLETION_SUMMARY.md | Phase 1 详细报告 |
| E2E_TEST_EXPANSION_PLAN.md | 扩展规划 |

---

## 🔧 常见问题

**Q: 测试失败怎么办?**
```bash
npm test -- --verbose      # 查看详细输出
npm test -- --no-coverage  # 跳过覆盖率计算
```

**Q: 如何运行 E2E 测试?**
需要先启动 MySQL 和后端服务，然后运行 `npx playwright test`

**Q: 如何添加新测试?**
参考 `bean.phase1.spec.ts` 的结构，遵循现有的 Mock 和测试模式

---

**最后更新**: 2026-03-08 | **项目**: 小灵通
