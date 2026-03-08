# 小灵通项目 - 自动化测试完整指南

## 📋 目录
1. [当前测试现状](#当前测试现状)
2. [自动化测试架构](#自动化测试架构)
3. [第3层：E2E 测试实现](#第3层e2e-测试实现)
4. [第4层：性能测试实现](#第4层性能测试实现)
5. [第5层：CI/CD 自动化](#第5层cicd-自动化)
6. [测试执行命令](#测试执行命令)
7. [最佳实践](#最佳实践)

---

## 当前测试现状

### ✅ 已完成的测试

| 层级 | 类型 | 数量 | 覆盖率 | 状态 |
|------|------|------|--------|------|
| 第1层 | 单元测试 | 216 个 | 100% | ✅ 完成 |
| 第2层 | 集成测试 | 274 个 | 100% | ✅ 完成 |
| 总计 | - | 490 个 | 73.27% | ✅ 完成 |

### 📊 覆盖率指标

```
语句覆盖率:  73.27% (2103/2870)
分支覆盖率:  64.38% (1164/1808)
函数覆盖率:  71.56% (297/415)
行覆盖率:    74.26% (1844/2483)
```

---

## 自动化测试架构

### 测试金字塔

```
        ▲
       /│\
      / │ \
     /  │  \  E2E 测试 (10-20%)
    /   │   \
   /────┼────\
  /     │     \  集成测试 (30-40%)
 /      │      \
/───────┼───────\
        │        单元测试 (50-60%)
        │
```

### 测试流程图

```
代码提交
   ↓
单元测试 (Jest) ✅
   ↓
集成测试 (Jest) ✅
   ↓
E2E 测试 (Playwright/Cypress) ⏳
   ↓
性能测试 (k6/Artillery) ⏳
   ↓
覆盖率检查 (Istanbul)
   ↓
CI/CD 流程 (GitHub Actions) ⏳
   ↓
自动部署
```

---

## 第3层：E2E 测试实现

### 3.1 安装 Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 3.2 创建 E2E 测试配置

创建 `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### 3.3 创建 E2E 测试用例

创建 `e2e/auth.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('用户登录流程', async ({ page }) => {
    // 访问登录页
    await page.goto('/login');

    // 填写登录信息
    await page.fill('input[name="phone"]', '13800000000');
    await page.fill('input[name="password"]', 'password123');

    // 点击登录按钮
    await page.click('button:has-text("登录")');

    // 验证登录成功
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=欢迎')).toBeVisible();
  });

  test('用户注册流程', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="phone"]', '13800000001');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');

    await page.click('button:has-text("注册")');

    await expect(page).toHaveURL('/login');
  });

  test('密码重置流程', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('input[name="phone"]', '13800000000');
    await page.click('button:has-text("发送验证码")');

    // 等待验证码输入框出现
    await expect(page.locator('input[name="code"]')).toBeVisible();
  });
});
```

创建 `e2e/job.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Job Management', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="phone"]', '13800000000');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("登录")');
    await page.waitForURL('/dashboard');
  });

  test('发布招工信息', async ({ page }) => {
    await page.goto('/job/create');

    await page.fill('input[name="title"]', '招聘工人');
    await page.fill('input[name="salary"]', '100');
    await page.fill('input[name="needCount"]', '5');
    await page.fill('input[name="location"]', '北京');

    await page.click('button:has-text("发布")');

    await expect(page.locator('text=发布成功')).toBeVisible();
  });

  test('搜索招工信息', async ({ page }) => {
    await page.goto('/job/list');

    await page.fill('input[name="keyword"]', '工人');
    await page.click('button:has-text("搜索")');

    // 验证搜索结果
    await expect(page.locator('.job-item')).toHaveCount(1);
  });

  test('应聘招工信息', async ({ page }) => {
    await page.goto('/job/list');

    // 点击第一个招工信息
    await page.click('.job-item:first-child');

    // 点击应聘按钮
    await page.click('button:has-text("应聘")');

    await expect(page.locator('text=应聘成功')).toBeVisible();
  });
});
```

### 3.4 运行 E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试文件
npm run test:e2e -- e2e/auth.spec.ts

# 以 UI 模式运行（可视化）
npm run test:e2e -- --ui

# 生成 HTML 报告
npm run test:e2e -- --reporter=html
```

---

## 第4层：性能测试实现

### 4.1 安装性能测试工具

```bash
npm install --save-dev k6 artillery
```

### 4.2 创建 k6 性能测试

创建 `performance/load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 30秒内增加到20个虚拟用户
    { duration: '1m30s', target: 20 }, // 保持20个虚拟用户1分30秒
    { duration: '30s', target: 0 },    // 30秒内降低到0个虚拟用户
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99%的请求应在1500ms内完成
    http_req_failed: ['<0.1'],         // 失败率应低于0.1%
  },
};

export default function () {
  // 测试登录接口
  const loginRes = http.post('http://localhost:3000/api/auth/login', {
    phone: '13800000000',
    password: 'password123',
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  const token = loginRes.json('token');
  sleep(1);

  // 测试获取招工列表
  const listRes = http.get('http://localhost:3000/api/job/list', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  check(listRes, {
    'list status is 200': (r) => r.status === 200,
    'list response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
```

### 4.3 运行性能测试

```bash
# 运行 k6 性能测试
k6 run performance/load-test.js

# 生成 HTML 报告
k6 run performance/load-test.js --out html=performance-report.html
```

---

## 第5层：CI/CD 自动化

### 5.1 创建 GitHub Actions 工作流

创建 `.github/workflows/test.yml`:

```yaml
name: Automated Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm run test:unit

    - name: Run integration tests
      run: npm run test:integration

    - name: Generate coverage report
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: Check coverage threshold
      run: |
        COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"lines"[^}]*' | grep -o '[0-9.]*' | head -1)
        if (( $(echo "$COVERAGE < 70" | bc -l) )); then
          echo "Coverage is below 70%: $COVERAGE%"
          exit 1
        fi

  e2e:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20.x'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright
      run: npx playwright install --with-deps

    - name: Run E2E tests
      run: npm run test:e2e

    - name: Upload Playwright report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30

  performance:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20.x'

    - name: Install k6
      run: sudo apt-get install -y k6

    - name: Run performance tests
      run: k6 run performance/load-test.js
```

### 5.2 package.json 脚本配置

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern='\\.spec\\.ts$' --coverage",
    "test:integration": "jest --testPathPattern='\\.integration\\.spec\\.ts$'",
    "test:coverage": "jest --coverage --coverageReporters=json --coverageReporters=lcov",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:performance": "k6 run performance/load-test.js",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## 测试执行命令

### 本地开发

```bash
# 运行所有测试
npm test

# 监听模式（自动重新运行）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e

# 运行 E2E 测试（UI 模式）
npm run test:e2e:ui

# 运行性能测试
npm run test:performance
```

### CI/CD 环境

```bash
# 运行所有测试（CI 模式）
npm run test:ci

# 运行完整测试套件
npm run test:all
```

---

## 最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe('UserService', () => {
  it('应该在用户存在时返回用户信息', () => {});
  it('应该在用户不存在时抛出异常', () => {});
});

// ❌ 不好的命名
describe('test', () => {
  it('test1', () => {});
  it('should work', () => {});
});
```

### 2. 测试隔离

```typescript
// ✅ 好的做法
describe('JobService', () => {
  let service: JobService;
  let repository: any;

  beforeEach(() => {
    // 每个测试前重新初始化
    repository = { find: jest.fn() };
    service = new JobService(repository);
  });

  afterEach(() => {
    // 清理 mock
    jest.clearAllMocks();
  });
});
```

### 3. 避免测试间依赖

```typescript
// ❌ 不好的做法
let userId: number;

test('创建用户', () => {
  userId = createUser(); // 依赖全局变量
});

test('获取用户', () => {
  getUser(userId); // 依赖前一个测试
});

// ✅ 好的做法
test('创建和获取用户', () => {
  const userId = createUser();
  const user = getUser(userId);
  expect(user).toBeDefined();
});
```

### 4. 覆盖率目标

```
目标覆盖率:
- 语句覆盖率: 80%+
- 分支覆盖率: 75%+
- 函数覆盖率: 80%+
- 行覆盖率: 80%+
```

### 5. 测试优先级

```
优先级 1 (高):
- 核心业务逻辑
- 支付/结算功能
- 用户认证

优先级 2 (中):
- 数据验证
- 错误处理
- 边界情况

优先级 3 (低):
- UI 交互
- 日志记录
- 缓存逻辑
```

---

## 下一步行动

### 立即实施 (第1周)

- [ ] 配置 Playwright E2E 测试框架
- [ ] 编写核心业务流程的 E2E 测试
- [ ] 配置 GitHub Actions CI/CD

### 短期计划 (第2-3周)

- [ ] 添加性能测试（k6）
- [ ] 集成覆盖率检查
- [ ] 设置自动化部署

### 长期计划 (第4周+)

- [ ] 扩展 E2E 测试覆盖
- [ ] 添加安全性测试
- [ ] 实现持续监控

---

## 参考资源

- [Jest 官方文档](https://jestjs.io/)
- [Playwright 官方文档](https://playwright.dev/)
- [k6 官方文档](https://k6.io/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [NestJS 测试指南](https://docs.nestjs.com/fundamentals/testing)

---

**最后更新**: 2026-03-08
**项目**: 小灵通
**维护者**: Claude Code
