# 快速测试执行指南

## 📋 概述

本指南提供了快速运行19项修改的自动化测试的步骤。

---

## 🚀 快速开始

### 1. 准备环境

```bash
# 进入项目目录
cd /c/Users/15700/Desktop/work/project/小灵通

# 安装依赖
cd server
npm install
```

### 2. 启动MySQL

```bash
# Windows - 使用Services管理器
# Win + R -> services.msc -> 找到MySQL80 -> 右键Start

# 或使用命令行
net start MySQL80

# 验证连接
mysql -h localhost -u xlt -p
# 输入密码: XLT2026db
```

### 3. 初始化测试数据库

```bash
cd server
npm run test:setup
```

---

## 🧪 运行测试

### 运行所有后端集成测试

```bash
cd server
npm run test:integration
```

### 运行豆子模块测试（新增）

```bash
cd server
npm run test:integration -- bean.integration.spec.ts
```

### 运行所有E2E测试

```bash
cd server
npx playwright test
```

### 运行特定E2E测试

```bash
# 数据同步测试
npx playwright test test/e2e/data-sync.e2e-spec.ts

# UI一致性测试
npx playwright test test/e2e/ui-consistency.e2e-spec.ts

# 导航交互测试
npx playwright test test/e2e/navigation.e2e-spec.ts
```

### 运行完整测试套件

```bash
cd server
npm run test:all
```

---

## 📊 查看测试报告

### 生成覆盖率报告

```bash
cd server
npm run test:coverage
```

### 查看E2E测试报告

```bash
cd server
npx playwright show-report
```

---

## 🔍 测试验证清单

运行测试后，验证以下内容：

- [ ] 后端集成测试全部通过 (8个)
- [ ] 数据同步E2E测试全部通过 (7个)
- [ ] UI一致性E2E测试全部通过 (11个)
- [ ] 导航交互E2E测试全部通过 (8个)
- [ ] 代码覆盖率 ≥ 90%
- [ ] 无新增警告或错误

---

## 🐛 故障排除

### 问题: MySQL连接失败

**症状**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决**:
```bash
# 检查MySQL服务状态
net start MySQL80

# 验证连接
mysql -h localhost -u xlt -p
```

### 问题: E2E测试超时

**症状**: `Timeout waiting for webServer`

**解决**:
```bash
# 增加超时时间
npx playwright test --timeout=60000

# 或检查应用是否启动
npm run start:dev
```

### 问题: 测试数据不一致

**症状**: 某些测试随机失败

**解决**:
```bash
# 重新初始化测试数据库
npm run test:setup

# 清除缓存
rm -rf node_modules/.cache
```

---

## 📈 测试统计

| 类别 | 测试数 | 文件 |
|------|--------|------|
| 后端集成测试 | 8 | bean.integration.spec.ts |
| 数据同步E2E | 7 | data-sync.e2e-spec.ts |
| UI一致性E2E | 11 | ui-consistency.e2e-spec.ts |
| 导航交互E2E | 8 | navigation.e2e-spec.ts |
| **总计** | **34** | **4个文件** |

---

## 📚 相关文档

- [完整测试策略](./TESTING_STRATEGY_FOR_19_MODIFICATIONS.md)
- [测试集成总结](./TESTING_INTEGRATION_SUMMARY.md)
- [E2E测试诊断](./server/E2E_TEST_EXECUTION_DIAGNOSTIC.md)
- [MySQL安装指南](./server/MYSQL_INSTALLATION_GUIDE.md)

---

## ✅ 预期结果

### 成功运行后的输出

```
Running 34 tests using 2 workers

✓ Bean Module Integration Tests › should return correct beanBalance field
✓ Bean Module Integration Tests › should format beanBalance to two decimal places
✓ Bean Module Integration Tests › should include totalIn and totalOut
...

✓ Data Synchronization E2E › should sync wallet balance between pages
✓ Data Synchronization E2E › should display consistent credit score
✓ Data Synchronization E2E › should persist favorite status
...

✓ UI Consistency E2E › should not display "all" and "other" categories
✓ UI Consistency E2E › should display formatted time for messages
✓ UI Consistency E2E › should display consistent layout
...

✓ Navigation E2E › should navigate to job detail
✓ Navigation E2E › should navigate to bean detail
✓ Navigation E2E › should navigate to wallet
...

34 passed (5m 30s)
```

---

## 🎯 下一步

1. **运行测试**: 按照上述步骤运行完整测试套件
2. **验证结果**: 确保所有34个测试通过
3. **生成报告**: 收集代码覆盖率数据
4. **持续集成**: 集成到CI/CD流程

---

**最后更新**: 2026-03-08
**项目**: 小灵通 (XiaoLingTong)
**测试框架**: Jest + Playwright

