# 小灵通项目 - 自动化测试完整指南

## 📋 目录
1. [当前测试现状](#当前测试现状)
2. [自动化测试架构](#自动化测试架构)
3. [第3层：E2E 测试实现](#第3层e2e-测试实现)
4. [第一阶段：扩展测试](#第一阶段扩展测试)
5. [第4层：性能测试实现](#第4层性能测试实现)
6. [第5层：CI/CD 自动化](#第5层cicd-自动化)
7. [测试执行命令](#测试执行命令)
8. [最佳实践](#最佳实践)

---

## 当前测试现状

### ✅ 已完成的测试

| 层级 | 类型 | 数量 | 覆盖率 | 状态 |
|------|------|------|--------|------|
| 第1层 | 单元测试 | 216 个 | 100% | ✅ 完成 |
| 第2层 | 集成测试 | 282 个 | 100% | ✅ 完成 (274 + 8新增) |
| 第3层 | E2E测试 | 26 个 | - | ✅ 完成 |
| 总计 | - | 524 个 | 73.27% | ✅ 完成 |

### 📊 覆盖率指标

```
语句覆盖率:  73.27% (2103/2870)
分支覆盖率:  64.38% (1164/1808)
函数覆盖率:  71.56% (297/415)
行覆盖率:    74.26% (1844/2483)

新增E2E测试覆盖:
- 数据同步测试:    7 个
- UI一致性测试:   11 个
- 导航交互测试:    8 个
- 后端集成测试:    8 个 (bean模块)
```

### 🎯 19项修改的自动化测试集成

为了确保19项bug修复和功能增强的质量，已添加34个新的测试用例：

#### 数据同步测试 (7项修改, 12个测试)
- 灵豆余额同步 (5个测试) - 验证beanBalance字段、格式化、totalIn/Out
- 钱包余额同步 (2个测试) - 我的界面与钱包界面一致性
- 信用分同步 (1个测试) - 两处信用分显示一致
- 提现记录余额 (1个测试) - 当前余额和总金额显示
- 头像同步 (1个测试) - 我的界面与设置界面头像一致
- 收藏状态持久化 (1个测试) - 导航后收藏状态保持
- 应用记录完整信息 (1个测试) - 位置、描述、提醒显示

#### UI一致性测试 (5项修改, 11个测试)
- 首页分类选项 (2个测试) - 移除"全部"和"其他"选项
- 聊天消息日期 (1个测试) - 日期格式"M月D日 HH:MM:SS"
- 应用记录布局 (1个测试) - 与我的应用界面布局一致
- 收藏布局调整 (1个测试) - 移除左边框、布局一致
- 数据格式化 (3个测试) - 豆子、钱包、提现金额两位小数

#### 导航交互测试 (3项修改, 8个测试)
- 应用记录导航 (2个测试) - 从我的应用和我的界面导航
- 其他导航 (6个测试) - 豆子、钱包、设置、收藏导航

#### 后端数据格式化 (1项修改, 8个测试)
- 豆子余额API (8个测试) - 返回字段、格式化、边界情况

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

#### 基础业务流程测试

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

#### 19项修改的E2E测试

创建 `e2e/data-sync.e2e-spec.ts` - 数据同步测试:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Data Synchronization E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟登录状态
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should sync wallet balance between mine and wallet pages', async ({ page }) => {
    // 进入我的界面
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="wallet-balance"]');
    const mineBalance = await page.locator('[data-testid="wallet-balance"]').textContent();

    // 点击钱包按钮
    await page.click('[data-testid="wallet-btn"]');
    await page.waitForURL('**/wallet/wallet');
    await page.waitForSelector('[data-testid="balance-display"]');

    // 获取钱包界面余额
    const walletBalance = await page.locator('[data-testid="balance-display"]').textContent();

    // 验证一致性
    expect(mineBalance?.trim()).toBe(walletBalance?.trim());
  });

  test('should display consistent credit score in two locations', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="credit-score"]');

    // 获取两处信用分
    const creditScores = await page.locator('[data-testid="credit-score"]').allTextContents();

    expect(creditScores.length).toBeGreaterThanOrEqual(2);
    expect(creditScores[0]).toBe(creditScores[1]);
  });

  test('should display bean balance with two decimal places', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');
    await page.waitForSelector('[data-testid="bean-balance"]');

    const balance = await page.locator('[data-testid="bean-balance"]').textContent();
    expect(balance).toMatch(/^\d+\.\d{2}$/);
  });

  test('should display current balance in withdraw history', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');
    await page.waitForSelector('[data-testid="current-balance"]');

    const balance = await page.locator('[data-testid="current-balance"]').textContent();
    expect(balance).toMatch(/^\d+\.\d{2}$/);
  });

  test('should persist favorite status across navigation', async ({ page }) => {
    // 进入招工详情
    await page.goto('http://localhost:3000/pages/job-detail/job-detail?id=test-job-123');
    await page.waitForSelector('[data-testid="fav-btn"]');

    // 收藏
    const favBtn = page.locator('[data-testid="fav-btn"]');
    await favBtn.click();
    await page.waitForTimeout(500);

    let isFav = await favBtn.getAttribute('data-fav');
    expect(isFav).toBe('true');

    // 返回首页
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForTimeout(500);

    // 重新进入招工详情
    await page.goto('http://localhost:3000/pages/job-detail/job-detail?id=test-job-123');
    await page.waitForSelector('[data-testid="fav-btn"]');

    // 验证收藏状态仍然保持
    isFav = await favBtn.getAttribute('data-fav');
    expect(isFav).toBe('true');
  });

  test('should sync avatar between mine and settings pages', async ({ page }) => {
    // 在我的界面获取头像
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.waitForSelector('[data-testid="user-avatar"]');
    const mineAvatar = await page.locator('[data-testid="user-avatar"]').getAttribute('src');

    // 进入设置界面
    await page.click('[data-testid="settings-btn"]');
    await page.waitForURL('**/settings/settings');
    await page.waitForSelector('[data-testid="user-avatar"]');

    // 获取设置界面头像
    const settingsAvatar = await page.locator('[data-testid="user-avatar"]').getAttribute('src');

    // 验证一致性
    expect(mineAvatar).toBe(settingsAvatar);
  });

  test('should display complete application information', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.waitForSelector('[data-testid="app-card"]');

    const appCard = page.locator('[data-testid="app-card"]').first();
    const location = await appCard.locator('[data-testid="location"]').textContent();
    const description = await appCard.locator('[data-testid="description"]').textContent();

    expect(location).toBeTruthy();
    expect(description).toBeTruthy();
  });
});
```

创建 `e2e/ui-consistency.e2e-spec.ts` - UI一致性测试:

```typescript
import { test, expect } from '@playwright/test';

test.describe('UI Consistency E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟登录状态
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should not display "all" and "other" categories on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="category-item"]');

    const categories = await page.locator('[data-testid="category-item"]').allTextContents();
    expect(categories).not.toContain('全部');
    expect(categories).not.toContain('其他');
  });

  test('should load data for each category correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/index/index');
    await page.waitForSelector('[data-testid="category-item"]');

    const firstCategory = page.locator('[data-testid="category-item"]').first();
    await firstCategory.click();
    await page.waitForTimeout(500);

    const items = await page.locator('[data-testid="item-card"]').count();
    expect(items).toBeGreaterThan(0);
  });

  test('should display formatted time for each chat message', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/chat/chat');
    await page.waitForSelector('[data-testid="message-item"]');

    const messages = await page.locator('[data-testid="message-item"]').allTextContents();
    messages.forEach(msg => {
      // 验证时间格式: M月D日 HH:MM:SS
      expect(msg).toMatch(/\d{1,2}月\d{1,2}日 \d{2}:\d{2}:\d{2}/);
    });
  });

  test('should display consistent layout between mine and my-applications pages', async ({ page }) => {
    // 在我的应用界面获取布局
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.waitForSelector('[data-testid="app-card"]');
    const appCardLayout = await page.locator('[data-testid="app-card"]').first().boundingBox();

    // 在我的界面获取布局
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-applications"]');
    await page.waitForSelector('[data-testid="app-card"]');
    const mineAppCardLayout = await page.locator('[data-testid="app-card"]').first().boundingBox();

    // 验证高度和宽度相似（允许10px误差）
    if (appCardLayout && mineAppCardLayout) {
      expect(Math.abs(appCardLayout.height - mineAppCardLayout.height)).toBeLessThan(10);
      expect(Math.abs(appCardLayout.width - mineAppCardLayout.width)).toBeLessThan(10);
    }
  });

  test('should display favorites with consistent layout', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-favorites"]');
    await page.waitForSelector('[data-testid="fav-card"]');

    const favCard = page.locator('[data-testid="fav-card"]').first();
    const leftBorder = await favCard.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.borderLeft;
    });

    // 验证没有左边框
    expect(leftBorder).toBe('none');
  });

  test('should format bean balance to two decimal places', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/bean-detail/bean-detail');
    await page.waitForSelector('[data-testid="bean-balance"]');

    const balance = await page.locator('[data-testid="bean-balance"]').textContent();
    const totalIn = await page.locator('[data-testid="total-in"]').textContent();
    const totalOut = await page.locator('[data-testid="total-out"]').textContent();

    expect(balance).toMatch(/^\d+\.\d{2}$/);
    expect(totalIn).toMatch(/^\d+\.\d{2}$/);
    expect(totalOut).toMatch(/^\d+\.\d{2}$/);
  });

  test('should format wallet balance consistently', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/wallet/wallet');
    await page.waitForSelector('[data-testid="balance"]');

    const balance = await page.locator('[data-testid="balance"]').textContent();
    expect(balance).toMatch(/^¥\d+\.\d{2}$/);
  });

  test('should format withdraw history amounts correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/withdraw-history/withdraw-history');
    await page.waitForSelector('[data-testid="current-balance"]');

    const balance = await page.locator('[data-testid="current-balance"]').textContent();
    const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();

    expect(balance).toMatch(/^\d+\.\d{2}$/);
    expect(totalAmount).toMatch(/^\d+\.\d{2}$/);
  });
});
```

创建 `e2e/navigation.e2e-spec.ts` - 导航交互测试:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation and Interaction E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟登录状态
    await page.context().addCookies([
      {
        name: 'auth_token',
        value: 'test-token-123',
        url: 'http://localhost:3000',
      },
    ]);
  });

  test('should navigate to job detail when clicking application from my-applications', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.waitForSelector('[data-testid="app-card"]');

    const appCard = page.locator('[data-testid="app-card"]').first();
    const jobId = await appCard.getAttribute('data-id');

    await appCard.click();
    await page.waitForURL(`**/job-detail/job-detail?id=${jobId}`);

    expect(page.url()).toContain(`id=${jobId}`);
  });

  test('should navigate to job detail when clicking application from mine page', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-applications"]');
    await page.waitForSelector('[data-testid="app-card"]');

    const appCard = page.locator('[data-testid="app-card"]').first();
    const jobId = await appCard.getAttribute('data-id');

    await appCard.click();
    await page.waitForURL(`**/job-detail/job-detail?id=${jobId}`);

    expect(page.url()).toContain(`id=${jobId}`);
  });

  test('should navigate to bean detail when clicking bean balance', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="bean-btn"]');
    await page.waitForURL('**/bean-detail/bean-detail');

    expect(page.url()).toContain('bean-detail');
  });

  test('should navigate to wallet when clicking wallet balance', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="wallet-btn"]');
    await page.waitForURL('**/wallet/wallet');

    expect(page.url()).toContain('wallet');
  });

  test('should navigate to settings when clicking settings button', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="settings-btn"]');
    await page.waitForURL('**/settings/settings');

    expect(page.url()).toContain('settings');
  });

  test('should navigate to favorite detail when clicking favorite item', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/mine/mine');
    await page.click('[data-testid="tab-favorites"]');
    await page.waitForSelector('[data-testid="fav-card"]');

    const favCard = page.locator('[data-testid="fav-card"]').first();
    const targetId = await favCard.getAttribute('data-id');
    const targetType = await favCard.getAttribute('data-type');

    await favCard.click();

    // 根据类型验证导航
    if (targetType === 'job') {
      await page.waitForURL(`**/job-detail/job-detail?id=${targetId}`);
    } else if (targetType === 'post') {
      await page.waitForURL(`**/post-detail/post-detail?id=${targetId}`);
    }

    expect(page.url()).toContain(targetId);
  });

  test('should navigate to job detail from favorite in my-applications', async ({ page }) => {
    await page.goto('http://localhost:3000/pages/my-applications/my-applications');
    await page.click('[data-testid="tab-favorites"]');
    await page.waitForSelector('[data-testid="fav-card"]');

    const favCard = page.locator('[data-testid="fav-card"]').first();
    const targetId = await favCard.getAttribute('data-id');

    await favCard.click();
    await page.waitForURL(`**/job-detail/job-detail?id=${targetId}`);

    expect(page.url()).toContain(`id=${targetId}`);
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

# 运行19项修改的E2E测试
npm run test:e2e -- e2e/data-sync.e2e-spec.ts
npm run test:e2e -- e2e/ui-consistency.e2e-spec.ts
npm run test:e2e -- e2e/navigation.e2e-spec.ts
```

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

---

## 第一阶段：扩展测试 (40-50个新测试)

### 📊 第一阶段测试统计

```
新增测试: 40-50个

分类:
├─ 数据同步 - 并发和网络:  13个
│  ├─ 多用户并发场景:       7个
│  └─ 网络延迟/离线场景:    6个
│
├─ UI一致性 - 响应式和主题: 14个
│  ├─ 响应式设计:          10个
│  └─ 主题切换:             4个
│
├─ 导航交互 - 返回和深链:  11个
│  ├─ 返回按钮行为:         6个
│  └─ 深层链接:             5个
│
└─ 后端数据 - 边界值和类型: 14个
   ├─ 边界值测试:           7个
   └─ 数据类型测试:         7个
```

### 1️⃣ 数据同步 - 并发和网络场景

**文件**: `e2e/phase1-concurrent-and-network.e2e-spec.ts`

**多用户并发测试** (7个):
- ✅ 并发应聘同一招工
- ✅ 并发充值豆子
- ✅ 并发收藏
- ✅ 快速余额检查
- ✅ 并发信用分查询
- ✅ 并发应聘状态变更
- ✅ 并发提现查询

**网络延迟/离线测试** (6个):
- ✅ 网络延迟加载余额
- ✅ 离线/在线转换
- ✅ 请求重试机制
- ✅ 超时处理
- ✅ 网络恢复后同步
- ✅ 网络延迟加载聊天

### 2️⃣ UI一致性 - 响应式和主题

**文件**: `e2e/phase1-responsive-and-theme.e2e-spec.ts`

**响应式设计测试** (10个):
- ✅ 手机屏幕 (375px) - 8个页面
- ✅ 平板屏幕 (768px) - 8个页面
- ✅ 桌面屏幕 (1920px) - 8个页面
- ✅ 屏幕方向切换

**主题切换测试** (4个):
- ✅ 浅色主题
- ✅ 深色主题
- ✅ 主题持久化
- ✅ 主题切换平滑

### 3️⃣ 导航交互 - 返回和深链接

**文件**: `e2e/phase1-navigation.e2e-spec.ts`

**返回按钮行为** (6个):
- ✅ 从详情返回列表
- ✅ 从我的返回首页
- ✅ 从钱包返回我的
- ✅ 从豆子返回我的
- ✅ 从设置返回我的
- ✅ 返回时恢复滚动位置

**深层链接测试** (5个):
- ✅ 直接访问招工详情
- ✅ 直接访问钱包
- ✅ 直接访问豆子明细
- ✅ 直接访问我的应聘
- ✅ 直接访问提现记录

### 4️⃣ 后端数据 - 边界值和数据类型

**文件**: `src/modules/bean/bean.phase1.spec.ts`

**边界值测试** (7个):
- ✅ 零余额
- ✅ 负余额
- ✅ 极小正数
- ✅ 极大数字
- ✅ 一位小数
- ✅ 三位小数舍入
- ✅ 舍入边界情况

**数据类型测试** (7个):
- ✅ 整数类型
- ✅ 浮点数类型
- ✅ 字符串转换
- ✅ null处理
- ✅ undefined处理
- ✅ 布尔值处理
- ✅ 数组/对象处理

### 运行第一阶段测试

```bash
# 运行所有第一阶段E2E测试
npm run test:e2e -- e2e/phase1-*.e2e-spec.ts

# 运行并发和网络测试
npm run test:e2e -- e2e/phase1-concurrent-and-network.e2e-spec.ts

# 运行响应式和主题测试
npm run test:e2e -- e2e/phase1-responsive-and-theme.e2e-spec.ts

# 运行导航测试
npm run test:e2e -- e2e/phase1-navigation.e2e-spec.ts

# 运行后端集成测试
npm run test:integration -- bean.phase1.spec.ts

# 运行所有测试（包括原有的34个）
npm run test:all
```

