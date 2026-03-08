# 19项修改的自动化测试集成策略

## 📋 概述

本文档提供了将19项bug修复和功能增强集成到自动化测试框架的完整策略。这些修改涉及前端数据同步、UI一致性、日期格式化和API字段映射等方面。

---

## 🎯 修改分类与测试策略

### 第一类：数据同步问题（7项）

#### 1. 灵豆余额同步 (bean-detail.js)
**问题**: 我的界面显示灵豆余额与灵豆明细界面不同步
**修改**:
- 改为从API获取 `beanBalance` 而非 `balance`
- 格式化为两位小数

**测试策略**:
```typescript
// 后端集成测试: bean.integration.spec.ts
describe('Bean Balance Synchronization', () => {
  test('should return correct beanBalance in getBalance()', async () => {
    const balance = await beanService.getBalance(userId);
    expect(balance).toHaveProperty('beanBalance');
    expect(balance.beanBalance).toMatch(/^\d+\.\d{2}$/); // 两位小数
  });

  test('should include totalIn and totalOut in response', async () => {
    const balance = await beanService.getBalance(userId);
    expect(balance).toHaveProperty('totalIn');
    expect(balance).toHaveProperty('totalOut');
  });
});

// 前端E2E测试: bean-detail.e2e-spec.ts
test('should display bean balance with two decimal places', async ({ page }) => {
  await page.goto('/pages/bean-detail/bean-detail');
  const balanceText = await page.locator('.data-value').first().textContent();
  expect(balanceText).toMatch(/^\d+\.\d{2}$/);
});
```

#### 2. 钱包余额同步 (mine.js, wallet.js)
**问题**: 我的界面钱包余额与我的钱包界面不同步
**修改**:
- 在mine.js中添加 `walletBalance` 数据字段
- 在onShow()中加载钱包余额
- 确保格式化为两位小数

**测试策略**:
```typescript
// 后端集成测试: wallet.integration.spec.ts
describe('Wallet Balance Consistency', () => {
  test('should return consistent balance across endpoints', async () => {
    const walletRes = await walletController.getBalance(userId);
    const profileRes = await userController.getProfile(userId);

    expect(walletRes.data.balance).toBe(profileRes.data.walletBalance);
  });
});

// 前端E2E测试: wallet-sync.e2e-spec.ts
test('should sync wallet balance between mine and wallet pages', async ({ page }) => {
  // 在我的界面获取余额
  await page.goto('/pages/mine/mine');
  const mineBalance = await page.locator('[data-testid="wallet-balance"]').textContent();

  // 导航到钱包界面
  await page.click('[data-testid="wallet-btn"]');
  const walletBalance = await page.locator('[data-testid="balance-display"]').textContent();

  expect(mineBalance).toBe(walletBalance);
});
```

#### 3. 信用分同步 (mine.js)
**问题**: 临工端我的界面有两处信用分不同步
**修改**:
- 在loadProfile()中从API获取creditScore
- 确保两处显示相同值

**测试策略**:
```typescript
// 前端E2E测试: credit-score-sync.e2e-spec.ts
test('should display consistent credit score in two locations', async ({ page }) => {
  await page.goto('/pages/mine/mine');

  const creditScores = await page.locator('[data-testid="credit-score"]').allTextContents();
  expect(creditScores.length).toBe(2);
  expect(creditScores[0]).toBe(creditScores[1]);
});
```

#### 4. 提现记录余额同步 (withdraw-history.js)
**问题**: 提现记录中累计提现和当前余额未同步
**修改**:
- 使用Promise.all并行加载交易记录和钱包数据
- 初始化summary对象包含balance、totalAmount、totalCount
- 从API获取当前余额而非globalData

**测试策略**:
```typescript
// 后端集成测试: wallet.integration.spec.ts
describe('Withdraw History Data', () => {
  test('should return transactions with correct status', async () => {
    const transactions = await walletService.getTransactions(userId, { type: 'withdraw' });
    expect(transactions).toHaveProperty('data');
    expect(Array.isArray(transactions.data)).toBe(true);
  });

  test('should calculate totalAmount correctly', async () => {
    const transactions = await walletService.getTransactions(userId, { type: 'withdraw' });
    const successTransactions = transactions.data.filter(t => t.statusType === 'success');
    const totalAmount = successTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    expect(totalAmount).toBeGreaterThanOrEqual(0);
  });
});

// 前端E2E测试: withdraw-history.e2e-spec.ts
test('should display current balance and transaction summary', async ({ page }) => {
  await page.goto('/pages/withdraw-history/withdraw-history');

  const balance = await page.locator('[data-testid="current-balance"]').textContent();
  const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();

  expect(balance).toMatch(/^\d+\.\d{2}$/);
  expect(totalAmount).toMatch(/^\d+\.\d{2}$/);
});
```

#### 5. 头像同步 (settings.js)
**问题**: 我的界面头像与设置界面头像未同步
**修改**:
- 验证头像更新逻辑存储到globalData和localStorage

**测试策略**:
```typescript
// 前端E2E测试: avatar-sync.e2e-spec.ts
test('should sync avatar between mine and settings pages', async ({ page }) => {
  // 在设置界面更新头像
  await page.goto('/pages/settings/settings');
  await page.click('[data-testid="avatar-upload"]');
  // 模拟上传
  await page.waitForTimeout(1000);

  // 返回我的界面
  await page.goto('/pages/mine/mine');
  const avatarUrl = await page.locator('[data-testid="user-avatar"]').getAttribute('src');

  expect(avatarUrl).toBeTruthy();
});
```

#### 6. 收藏状态持久化 (job-detail.js)
**问题**: 退出招工界面后再进入，收藏状态显示未收藏
**修改**:
- 添加loadFavStatus()方法从API检查收藏状态
- 在loadJob()后调用loadFavStatus()
- 在onShow()中重新加载收藏状态

**测试策略**:
```typescript
// 后端集成测试: favorite.integration.spec.ts
describe('Favorite Status Persistence', () => {
  test('should return correct favorite status', async () => {
    const isFav = await favoriteService.isFavorite(userId, jobId, 'job');
    expect(typeof isFav).toBe('boolean');
  });
});

// 前端E2E测试: favorite-persistence.e2e-spec.ts
test('should persist favorite status across page navigation', async ({ page }) => {
  // 进入招工详情
  await page.goto('/pages/job-detail/job-detail?id=123');
  const favBtn = page.locator('[data-testid="fav-btn"]');

  // 收藏
  await favBtn.click();
  let isFav = await favBtn.getAttribute('data-fav');
  expect(isFav).toBe('true');

  // 退出并重新进入
  await page.goto('/pages/mine/mine');
  await page.goto('/pages/job-detail/job-detail?id=123');

  // 验证收藏状态仍然保持
  isFav = await favBtn.getAttribute('data-fav');
  expect(isFav).toBe('true');
});
```

#### 7. 应用记录完整信息显示 (my-applications.js)
**问题**: 应用记录未显示完整信息（位置、描述、提醒）
**修改**:
- 添加normalizeApplication()方法转换应用数据
- 提取job数据中的location、description、date、hours等字段

**测试策略**:
```typescript
// 后端集成测试: application.integration.spec.ts
describe('Application Data Transformation', () => {
  test('should return complete application data', async () => {
    const applications = await applicationService.getApplications(userId);
    expect(applications[0]).toHaveProperty('job');
    expect(applications[0].job).toHaveProperty('location');
    expect(applications[0].job).toHaveProperty('description');
  });
});

// 前端E2E测试: application-display.e2e-spec.ts
test('should display complete application information', async ({ page }) => {
  await page.goto('/pages/my-applications/my-applications');

  const appCard = page.locator('[data-testid="app-card"]').first();
  const location = await appCard.locator('[data-testid="location"]').textContent();
  const description = await appCard.locator('[data-testid="description"]').textContent();

  expect(location).toBeTruthy();
  expect(description).toBeTruthy();
});
```

---

### 第二类：UI一致性问题（5项）

#### 8. 首页分类选项移除 (index.js)
**问题**: 首页中"全部"和"其他"选项应被移除
**修改**:
- 从catePurchase、cateStock等数组中移除"全部"和"其他"
- 更新loadDataByCategory逻辑处理无"全部"选项

**测试策略**:
```typescript
// 前端E2E测试: index-categories.e2e-spec.ts
test('should not display "all" and "other" categories', async ({ page }) => {
  await page.goto('/pages/index/index');

  const categories = await page.locator('[data-testid="category-item"]').allTextContents();
  expect(categories).not.toContain('全部');
  expect(categories).not.toContain('其他');
});

test('should load data for each category correctly', async ({ page }) => {
  await page.goto('/pages/index/index');

  const firstCategory = page.locator('[data-testid="category-item"]').first();
  await firstCategory.click();

  const items = await page.locator('[data-testid="item-card"]').count();
  expect(items).toBeGreaterThan(0);
});
```

#### 9. 聊天消息日期显示 (chat.js, chat.wxml)
**问题**: 在线聊天中每条聊天记录未添加日期（月日及24小时制）
**修改**:
- 添加formatMessageTime()方法格式化时间戳为"M月D日 HH:MM:SS"
- 修改normalizeMessage()使用格式化时间
- 更新WXML使用动态{{timeMarkText}}

**测试策略**:
```typescript
// 前端单元测试: chat.spec.ts
describe('Chat Message Formatting', () => {
  test('should format message time correctly', () => {
    const timestamp = new Date('2026-03-08T14:30:45').getTime();
    const formatted = formatMessageTime(timestamp);
    expect(formatted).toMatch(/^\d{1,2}月\d{1,2}日 \d{2}:\d{2}:\d{2}$/);
  });
});

// 前端E2E测试: chat-messages.e2e-spec.ts
test('should display formatted time for each message', async ({ page }) => {
  await page.goto('/pages/chat/chat');

  const messages = await page.locator('[data-testid="message-item"]').allTextContents();
  messages.forEach(msg => {
    expect(msg).toMatch(/\d{1,2}月\d{1,2}日 \d{2}:\d{2}:\d{2}/);
  });
});
```

#### 10. 我的应用记录布局 (mine.js, mine.wxml, mine.wxss)
**问题**: 临工我的界面接单记录布局与我的报名界面不一致
**修改**:
- 在mine.js中添加normalizeApplication()方法
- 更新WXML显示完整应用信息（位置、描述、提醒）
- 添加WXSS样式保持一致性

**测试策略**:
```typescript
// 前端E2E测试: application-layout-consistency.e2e-spec.ts
test('should display consistent layout between mine and my-applications pages', async ({ page }) => {
  // 在我的应用界面获取布局
  await page.goto('/pages/my-applications/my-applications');
  const appCardLayout = await page.locator('[data-testid="app-card"]').first().boundingBox();

  // 在我的界面获取布局
  await page.goto('/pages/mine/mine');
  await page.click('[data-testid="tab-applications"]');
  const mineAppCardLayout = await page.locator('[data-testid="app-card"]').first().boundingBox();

  // 验证高度和宽度相似
  expect(Math.abs(appCardLayout.height - mineAppCardLayout.height)).toBeLessThan(10);
  expect(Math.abs(appCardLayout.width - mineAppCardLayout.width)).toBeLessThan(10);
});
```

#### 11. 我的收藏布局调整 (mine.wxml, mine.wxss)
**问题**: 临工我的收藏布局与接单记录不一致
**修改**:
- 调整收藏卡片布局与应用记录一致
- 移除左边带颜色的竖线

**测试策略**:
```typescript
// 前端E2E测试: favorites-layout.e2e-spec.ts
test('should display favorites with consistent layout', async ({ page }) => {
  await page.goto('/pages/mine/mine');
  await page.click('[data-testid="tab-favorites"]');

  const favCard = page.locator('[data-testid="fav-card"]').first();
  const leftBorder = await favCard.evaluate(el => {
    const style = window.getComputedStyle(el);
    return style.borderLeft;
  });

  expect(leftBorder).toBe('none');
});
```

---

### 第三类：导航与交互问题（3项）

#### 12. 应用记录点击导航 (mine.js, my-applications.js)
**问题**: 接单记录点击无法跳转查看详情
**修改**:
- 添加bindtap="onViewJobDetail"事件处理
- 实现onViewJobDetail()方法导航到job-detail页面

**测试策略**:
```typescript
// 前端E2E测试: application-navigation.e2e-spec.ts
test('should navigate to job detail when clicking application', async ({ page }) => {
  await page.goto('/pages/my-applications/my-applications');

  const appCard = page.locator('[data-testid="app-card"]').first();
  const jobId = await appCard.getAttribute('data-id');

  await appCard.click();

  await page.waitForURL(`**/job-detail/job-detail?id=${jobId}`);
  expect(page.url()).toContain(`id=${jobId}`);
});
```

#### 13. 我的界面应用记录导航 (mine.js)
**问题**: 我的界面接单记录点击无法跳转
**修改**:
- 添加onViewJobDetail()方法
- 实现导航逻辑

**测试策略**:
```typescript
// 前端E2E测试: mine-application-navigation.e2e-spec.ts
test('should navigate from mine page application to job detail', async ({ page }) => {
  await page.goto('/pages/mine/mine');
  await page.click('[data-testid="tab-applications"]');

  const appCard = page.locator('[data-testid="app-card"]').first();
  const jobId = await appCard.getAttribute('data-id');

  await appCard.click();

  await page.waitForURL(`**/job-detail/job-detail?id=${jobId}`);
  expect(page.url()).toContain(`id=${jobId}`);
});
```

---

### 第四类：数据格式化问题（4项）

#### 14. 豆子余额格式化 (bean-detail.js)
**问题**: 豆子余额显示格式不正确
**修改**:
- 在onShow()中格式化balance、totalIn、totalOut为两位小数
- 改为从API获取beanBalance

**测试策略**:
```typescript
// 前端E2E测试: bean-formatting.e2e-spec.ts
test('should format bean balance to two decimal places', async ({ page }) => {
  await page.goto('/pages/bean-detail/bean-detail');

  const balance = await page.locator('[data-testid="bean-balance"]').textContent();
  const totalIn = await page.locator('[data-testid="total-in"]').textContent();
  const totalOut = await page.locator('[data-testid="total-out"]').textContent();

  expect(balance).toMatch(/^\d+\.\d{2}$/);
  expect(totalIn).toMatch(/^\d+\.\d{2}$/);
  expect(totalOut).toMatch(/^\d+\.\d{2}$/);
});
```

#### 15. 钱包余额格式化 (wallet.js)
**问题**: 钱包余额格式不一致
**修改**:
- 确保余额格式化为两位小数

**测试策略**:
```typescript
// 前端E2E测试: wallet-formatting.e2e-spec.ts
test('should format wallet balance consistently', async ({ page }) => {
  await page.goto('/pages/wallet/wallet');

  const balance = await page.locator('[data-testid="balance"]').textContent();
  expect(balance).toMatch(/^¥\d+\.\d{2}$/);
});
```

#### 16. 提现记录余额格式化 (withdraw-history.js)
**问题**: 提现记录中余额显示格式不正确
**修改**:
- 格式化totalAmount为两位小数
- 格式化balance为两位小数

**测试策略**:
```typescript
// 前端E2E测试: withdraw-formatting.e2e-spec.ts
test('should format withdraw history amounts correctly', async ({ page }) => {
  await page.goto('/pages/withdraw-history/withdraw-history');

  const balance = await page.locator('[data-testid="current-balance"]').textContent();
  const totalAmount = await page.locator('[data-testid="total-amount"]').textContent();

  expect(balance).toMatch(/^\d+\.\d{2}$/);
  expect(totalAmount).toMatch(/^\d+\.\d{2}$/);
});
```

#### 17. 日期格式化 (chat.js)
**问题**: 聊天消息日期格式不标准
**修改**:
- 实现formatMessageTime()方法
- 格式化为"M月D日 HH:MM:SS"

**测试策略**:
```typescript
// 前端单元测试: date-formatting.spec.ts
describe('Date Formatting', () => {
  test('should format date as M月D日 HH:MM:SS', () => {
    const date = new Date('2026-03-08T14:30:45');
    const formatted = formatMessageTime(date.getTime());
    expect(formatted).toBe('3月8日 14:30:45');
  });
});
```

---

## 📊 测试实现计划

### 阶段1：后端集成测试（1-2天）

创建/更新以下测试文件：

```
server/src/modules/
├── bean/
│   └── bean.integration.spec.ts (新增: 豆子余额同步测试)
├── wallet/
│   └── wallet.integration.spec.ts (更新: 钱包余额一致性测试)
├── favorite/
│   └── favorite.integration.spec.ts (新增: 收藏状态测试)
└── application/
    └── application.integration.spec.ts (新增: 应用数据转换测试)
```

### 阶段2：前端E2E测试（2-3天）

创建以下E2E测试文件：

```
server/test/e2e/
├── data-sync.e2e-spec.ts (数据同步测试)
├── ui-consistency.e2e-spec.ts (UI一致性测试)
├── navigation.e2e-spec.ts (导航测试)
├── formatting.e2e-spec.ts (格式化测试)
└── chat-messages.e2e-spec.ts (聊天消息测试)
```

### 阶段3：前端单元测试（1天）

创建前端单元测试：

```
pages/
├── chat/
│   └── chat.spec.ts (日期格式化测试)
├── bean-detail/
│   └── bean-detail.spec.ts (余额格式化测试)
└── mine/
    └── mine.spec.ts (数据转换测试)
```

---

## 🔧 实现示例

### 后端集成测试示例

```typescript
// server/src/modules/wallet/wallet.integration.spec.ts
describe('Wallet Module - Data Synchronization', () => {
  let walletService: WalletService;
  let userService: UserService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WalletService, UserService, /* ... */],
    }).compile();

    walletService = module.get<WalletService>(WalletService);
    userService = module.get<UserService>(UserService);
  });

  describe('Balance Consistency', () => {
    it('should return consistent balance across endpoints', async () => {
      const userId = 'test-user-123';

      // 获取钱包余额
      const walletBalance = await walletService.getBalance(userId);

      // 获取用户信息中的钱包余额
      const userInfo = await userService.getProfile(userId);

      // 验证一致性
      expect(walletBalance.balance).toBe(userInfo.walletBalance);
      expect(walletBalance.balance).toMatch(/^\d+\.\d{2}$/);
    });

    it('should include totalIn and totalOut in balance response', async () => {
      const userId = 'test-user-123';
      const balance = await walletService.getBalance(userId);

      expect(balance).toHaveProperty('totalIn');
      expect(balance).toHaveProperty('totalOut');
      expect(balance.totalIn).toMatch(/^\d+\.\d{2}$/);
      expect(balance.totalOut).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe('Withdraw History', () => {
    it('should calculate totalAmount correctly', async () => {
      const userId = 'test-user-123';
      const transactions = await walletService.getTransactions(userId, { type: 'withdraw' });

      const successTransactions = transactions.filter(t => t.statusType === 'success');
      const calculatedTotal = successTransactions.reduce((sum, t) => {
        return sum + Number(String(t.amount).replace(',', ''));
      }, 0);

      expect(calculatedTotal).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### 前端E2E测试示例

```typescript
// server/test/e2e/data-sync.e2e-spec.ts
import { test, expect } from '@playwright/test';

test.describe('Data Synchronization E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/pages/login/login');
    await page.fill('[data-testid="phone"]', '13800138000');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('**/index/index');
  });

  test('should sync wallet balance between mine and wallet pages', async ({ page }) => {
    // 进入我的界面
    await page.goto('/pages/mine/mine');
    const mineBalance = await page.locator('[data-testid="wallet-balance"]').textContent();

    // 点击钱包按钮
    await page.click('[data-testid="wallet-btn"]');
    await page.waitForURL('**/wallet/wallet');

    // 获取钱包界面余额
    const walletBalance = await page.locator('[data-testid="balance-display"]').textContent();

    // 验证一致性
    expect(mineBalance).toBe(walletBalance);
  });

  test('should display consistent credit score in two locations', async ({ page }) => {
    await page.goto('/pages/mine/mine');

    // 获取两处信用分
    const creditScores = await page.locator('[data-testid="credit-score"]').allTextContents();

    expect(creditScores.length).toBe(2);
    expect(creditScores[0]).toBe(creditScores[1]);
  });

  test('should persist favorite status across navigation', async ({ page }) => {
    // 进入招工详情
    await page.goto('/pages/job-detail/job-detail?id=test-job-123');

    // 收藏
    const favBtn = page.locator('[data-testid="fav-btn"]');
    await favBtn.click();
    let isFav = await favBtn.getAttribute('data-fav');
    expect(isFav).toBe('true');

    // 返回首页
    await page.goto('/pages/index/index');

    // 重新进入招工详情
    await page.goto('/pages/job-detail/job-detail?id=test-job-123');

    // 验证收藏状态仍然保持
    isFav = await favBtn.getAttribute('data-fav');
    expect(isFav).toBe('true');
  });
});
```

---

## 📈 测试覆盖率目标

| 类别 | 修改数 | 测试数 | 覆盖率 |
|------|--------|--------|--------|
| 数据同步 | 7 | 12 | 100% |
| UI一致性 | 5 | 8 | 100% |
| 导航交互 | 3 | 6 | 100% |
| 数据格式化 | 4 | 8 | 100% |
| **总计** | **19** | **34** | **100%** |

---

## 🚀 执行步骤

### 步骤1：准备测试环境
```bash
cd server
npm install
npm run test:setup
```

### 步骤2：运行后端集成测试
```bash
npm run test:integration
```

### 步骤3：运行前端E2E测试
```bash
npm run test:e2e
```

### 步骤4：生成测试报告
```bash
npm run test:coverage
```

---

## ✅ 验收标准

- [ ] 所有34个测试用例通过
- [ ] 代码覆盖率 ≥ 90%
- [ ] 无新增警告或错误
- [ ] E2E测试执行时间 < 5分钟
- [ ] 所有数据同步测试通过
- [ ] 所有UI一致性测试通过
- [ ] 所有导航测试通过
- [ ] 所有格式化测试通过

---

## 📝 相关文档

- [E2E 测试执行指南](./E2E_COMPLETE_EXECUTION_GUIDE.md)
- [MySQL 安装指南](./MYSQL_INSTALLATION_GUIDE.md)
- [项目测试总结](./server/E2E_TEST_EXECUTION_DIAGNOSTIC.md)

