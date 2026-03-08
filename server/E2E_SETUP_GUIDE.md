# E2E 测试启动指南

## 📋 前置要求

### 1. MySQL 数据库
- **版本**: MySQL 5.7+ 或 MySQL 8.0+
- **状态**: 必须运行
- **连接**: localhost:3306

### 2. Node.js
- **版本**: 18.x 或 20.x
- **状态**: 已安装

### 3. Playwright
- **状态**: 已安装 (`npm install`)

---

## 🚀 快速启动

### 步骤 1: 启动 MySQL 数据库

#### Windows
```bash
# 方式 1: 使用 Services 启动
# 1. 按 Win + R，输入 services.msc
# 2. 找到 MySQL80 (或其他版本)
# 3. 右键 -> 启动

# 方式 2: 使用命令行
net start MySQL80

# 方式 3: 使用 MySQL 客户端验证连接
mysql -h localhost -u xlt -p
# 输入密码: XLT2026db
```

#### macOS
```bash
brew services start mysql
```

#### Linux
```bash
sudo systemctl start mysql
```

### 步骤 2: 初始化测试数据库

#### Windows (推荐)
```bash
cd server
scripts\init-test-db.bat
```

#### macOS/Linux
```bash
cd server
bash scripts/init-test-db.sh
```

#### 手动初始化
```bash
# 连接到 MySQL
mysql -h localhost -u xlt -p

# 输入密码: XLT2026db

# 在 MySQL 命令行执行
DROP DATABASE IF EXISTS `xiaolingtong_test`;
CREATE DATABASE `xiaolingtong_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `xiaolingtong_test`.* TO 'xlt'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 步骤 3: 运行 E2E 测试

```bash
cd server

# 运行所有 E2E 测试
npm run test:e2e

# 或使用 Playwright 命令
npx playwright test

# 查看测试报告
npx playwright show-report
```

---

## 📊 测试执行

### 运行所有 E2E 测试
```bash
npm run test:e2e
```

**预期输出**:
```
Running 20 tests using 2 workers

✓ Auth Module E2E › should register new user
✓ Auth Module E2E › should login user
✓ Post Module E2E › should create new post
✓ Post Module E2E › should search posts
...

20 passed (2.5s)
```

### 运行特定测试
```bash
# 运行认证测试
npx playwright test auth.e2e-spec.ts

# 运行支付测试
npx playwright test payment.e2e-spec.ts

# 运行特定测试用例
npx playwright test -g "should register new user"
```

### 调试模式
```bash
# 使用 Playwright Inspector
npx playwright test --debug

# 使用 headed 模式（显示浏览器）
npx playwright test --headed

# 使用特定浏览器
npx playwright test --project=chromium
npx playwright test --project=firefox
```

---

## 🔍 查看测试报告

### HTML 报告
```bash
# 自动打开报告
npx playwright show-report

# 或手动打开
# 浏览器打开: playwright-report/index.html
```

### 测试追踪
```bash
# 查看失败测试的追踪
npx playwright show-trace trace.zip
```

---

## ⚠️ 常见问题

### 问题 1: 无法连接到 MySQL

**错误信息**:
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案**:
1. 检查 MySQL 是否运行: `mysql -u xlt -p`
2. 检查连接信息是否正确
3. 检查防火墙设置
4. 重启 MySQL 服务

### 问题 2: 数据库权限错误

**错误信息**:
```
Error: Access denied for user 'xlt'@'localhost'
```

**解决方案**:
```bash
# 使用 root 用户重新授权
mysql -u root -p
# 输入 root 密码

# 在 MySQL 命令行执行
GRANT ALL PRIVILEGES ON xiaolingtong_test.* TO 'xlt'@'%' IDENTIFIED BY 'XLT2026db';
FLUSH PRIVILEGES;
EXIT;
```

### 问题 3: 浏览器驱动缺失

**错误信息**:
```
Playwright browsers not found
```

**解决方案**:
```bash
# 安装 Playwright 浏览器
npx playwright install

# 或安装特定浏览器
npx playwright install chromium
npx playwright install firefox
```

### 问题 4: 测试超时

**错误信息**:
```
Timeout waiting for webServer to be ready
```

**解决方案**:
1. 确保 Node.js 应用可以启动: `npm run start:dev`
2. 检查端口 3000 是否被占用
3. 增加超时时间在 `playwright.config.ts`

---

## 📈 测试覆盖范围

### 已覆盖的功能

| 模块 | 测试用例 | 覆盖范围 |
|------|---------|---------|
| Auth | 4 | 注册、登录、登录失败、令牌刷新 |
| Post | 5 | 创建、搜索、筛选、详情、更新 |
| Payment | 4 | 创建订单、钱包余额、交易、解锁 |
| Interaction | 7 | 收藏、消息、评分、个人资料 |
| **总计** | **20** | - |

---

## 🔧 配置文件

### playwright.config.ts
```typescript
// 基础 URL
baseURL: 'http://localhost:3000/api'

// 浏览器
projects: ['chromium', 'firefox']

// 报告
reporter: 'html'

// Web 服务器
webServer: {
  command: 'npm run start:dev',
  url: 'http://localhost:3000',
}
```

### 环境变量
```
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=xlt
DB_PASSWORD=XLT2026db
DB_DATABASE=xiaolingtong_test
```

---

## 📝 最佳实践

### 1. 测试隔离
- 每个测试应该独立运行
- 使用 `beforeEach` 清理数据
- 使用 `afterEach` 恢复状态

### 2. 等待策略
- 使用 `waitForNavigation()` 等待页面加载
- 使用 `waitForSelector()` 等待元素出现
- 避免使用固定延迟 `sleep()`

### 3. 错误处理
- 捕获和记录错误
- 生成失败截图
- 保存测试追踪

### 4. 性能优化
- 并行运行测试
- 重用浏览器上下文
- 缓存认证令牌

---

## 🎯 下一步

1. ✅ 启动 MySQL 数据库
2. ✅ 初始化测试数据库
3. ✅ 运行 E2E 测试
4. ✅ 查看测试报告
5. ✅ 分析测试结果

---

**最后更新**: 2026-03-08
**版本**: 1.0
**项目**: 小灵通 (XiaoLingTong)
