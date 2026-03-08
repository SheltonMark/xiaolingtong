# 小灵通 - 自动化测试快速参考

## 🚀 快速开始

### 1. 运行现有测试

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- --testPathPattern="auth"

# 生成覆盖率报告
npm test -- --coverage

# 监听模式（开发时使用）
npm test -- --watch
```

### 2. 查看测试覆盖率

```bash
# 生成 HTML 覆盖率报告
npm test -- --coverage --coverageReporters=html

# 打开报告
open coverage/lcov-report/index.html
```

---

## 📊 测试统计

| 类型 | 数量 | 状态 | 覆盖率 |
|------|------|------|--------|
| 单元测试 | 216 | ✅ | 100% |
| 集成测试 | 274 | ✅ | 100% |
| E2E 测试 | 0 | ⏳ | - |
| 性能测试 | 0 | ⏳ | - |
| **总计** | **490** | **✅** | **73.27%** |

---

## 🎯 下一步：实现 E2E 测试

### 步骤 1: 安装 Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 步骤 2: 创建测试文件

```bash
mkdir -p e2e
touch e2e/auth.spec.ts
touch e2e/job.spec.ts
```

### 步骤 3: 编写第一个 E2E 测试

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('用户登录', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="phone"]', '13800000000');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("登录")');
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
});
```

### 步骤 4: 运行 E2E 测试

```bash
# 运行所有 E2E 测试
npx playwright test

# 以 UI 模式运行（可视化）
npx playwright test --ui

# 生成报告
npx playwright test --reporter=html
```

---

## 🔄 CI/CD 自动化

### 创建 GitHub Actions 工作流

```bash
mkdir -p .github/workflows
touch .github/workflows/test.yml
```

### 工作流配置

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## 📈 性能测试

### 安装 k6

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

### 创建性能测试

```javascript
// performance/load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 20 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api/job/list');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}
```

### 运行性能测试

```bash
k6 run performance/load-test.js
```

---

## 📋 测试命令速查表

```bash
# 单元测试
npm test -- --testPathPattern="\\.spec\\.ts$"

# 集成测试
npm test -- --testPathPattern="\\.integration\\.spec\\.ts$"

# 特定模块
npm test -- --testPathPattern="auth"

# 覆盖率
npm test -- --coverage

# 监听模式
npm test -- --watch

# E2E 测试
npx playwright test

# E2E UI 模式
npx playwright test --ui

# 性能测试
k6 run performance/load-test.js

# 所有测试
npm test && npx playwright test
```

---

## 🎓 学习资源

### 官方文档
- [Jest](https://jestjs.io/)
- [Playwright](https://playwright.dev/)
- [k6](https://k6.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

### 最佳实践
- 编写清晰的测试名称
- 保持测试独立
- 避免测试间依赖
- 定期检查覆盖率
- 优先测试核心业务逻辑

---

## ❓ 常见问题

### Q: 如何跳过某个测试？
```typescript
test.skip('跳过这个测试', () => {});
```

### Q: 如何只运行某个测试？
```typescript
test.only('只运行这个测试', () => {});
```

### Q: 如何调试测试？
```bash
# 使用 Node 调试器
node --inspect-brk node_modules/.bin/jest --runInBand

# 使用 Playwright Inspector
PWDEBUG=1 npx playwright test
```

### Q: 如何提高测试速度？
```bash
# 并行运行测试
npm test -- --maxWorkers=4

# 只运行改变的文件
npm test -- --onlyChanged
```

---

## 📞 获取帮助

- 查看完整指南: `AUTOMATION_TESTING_GUIDE.md`
- 查看覆盖率报告: `COVERAGE_REPORT.md`
- 查看项目总结: `TEST_COMPLETION_SUMMARY.md`

---

**最后更新**: 2026-03-08
**项目**: 小灵通
