# 测试命令速查表

## 常用命令

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
npm test -- auth.spec.ts
```

### 运行特定测试套件
```bash
npm test -- --testNamePattern="UserService"
```

### 生成覆盖率报告
```bash
npm test -- --coverage
```

### 监听模式
```bash
npm test -- --watch
```

## E2E 测试命令

### 运行所有 E2E 测试
```bash
npx playwright test
```

### UI 模式
```bash
npx playwright test --ui
```

### 调试模式
```bash
npx playwright test --debug
```

## 性能测试命令

### 运行性能测试
```bash
k6 run test/performance/auth-performance.js
```

### 运行所有性能测试
```bash
bash test/performance/run-all-tests.sh
```

## 常见问题

### Q: 如何跳过某个测试?
```typescript
it.skip('跳过这个测试', () => {});
```

### Q: 如何只运行某个测试?
```typescript
it.only('只运行这个测试', () => {});
```

### Q: 如何调试测试?
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Q: 如何提高测试速度?
```bash
npm test -- --maxWorkers=4
```
