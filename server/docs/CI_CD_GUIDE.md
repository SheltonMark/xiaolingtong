# CI/CD 自动化集成指南

## 概述
本文档描述小灵通项目的 CI/CD 自动化集成方案。

## GitHub Actions 工作流

### 工作流触发条件
- 代码推送到 main 或 master 分支
- 创建 Pull Request 到 main 或 master 分支

### 工作流任务

#### 1. 单元测试 (unit-tests)
- 在 Node.js 18.x 和 20.x 上运行
- 执行 Jest 单元测试
- 生成覆盖率报告
- 上传到 Codecov

#### 2. 集成测试 (integration-tests)
- 在 Node.js 20.x 上运行
- 执行 Jest 集成测试
- 生成覆盖率报告
- 上传到 Codecov

#### 3. E2E 测试 (e2e-tests)
- 在 Node.js 20.x 上运行
- 安装 Playwright 浏览器
- 执行 Playwright E2E 测试
- 上传测试报告

#### 4. 覆盖率检查 (coverage-check)
- 依赖单元测试和集成测试完成
- 生成完整覆盖率报告
- 检查覆盖率是否达到 80% 阈值
- 上传到 Codecov

## 覆盖率目标

| 指标 | 目标 |
|------|------|
| 语句覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 75% |
| 函数覆盖率 | ≥ 80% |
| 行覆盖率 | ≥ 80% |

## 本地测试命令

### 运行所有测试
```bash
npm run test:all
```

### 运行单元测试
```bash
npm run test:unit
```

### 运行集成测试
```bash
npm run test:integration
```

### 运行 E2E 测试
```bash
npm run test:e2e
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

## 故障排查

### 测试失败
1. 检查本地环境是否与 CI 环境一致
2. 运行 npm ci 重新安装依赖
3. 清除缓存: npm cache clean --force
4. 重新运行测试

### 覆盖率不足
1. 查看覆盖率报告: coverage/lcov-report/index.html
2. 识别未覆盖的代码
3. 添加相应的测试用例
4. 重新运行覆盖率检查

### Codecov 上传失败
1. 检查 Codecov 配置
2. 验证 GitHub 仓库权限
3. 检查网络连接
4. 查看 Codecov 日志

## 最佳实践

1. 在本地运行所有测试后再推送
2. 定期检查覆盖率报告
3. 及时修复失败的测试
4. 保持测试代码的可维护性
5. 使用有意义的提交信息

## 性能优化

### 缓存策略
- npm 依赖缓存
- Playwright 浏览器缓存

### 并行执行
- 单元测试和集成测试并行运行
- E2E 测试独立运行

### 执行时间目标
- 单元测试: < 2 分钟
- 集成测试: < 3 分钟
- E2E 测试: < 5 分钟
- 总计: < 10 分钟

## 工作流状态检查

### 查看工作流运行
访问 GitHub 仓库的 Actions 标签页查看所有工作流运行。

### 查看覆盖率
访问 Codecov 仪表板查看覆盖率趋势和详细报告。

### 查看测试报告
- E2E 测试报告: 在 Actions 中下载 playwright-report 工件
- 覆盖率报告: 在本地运行 npm run test:coverage 后查看 coverage/lcov-report/index.html
