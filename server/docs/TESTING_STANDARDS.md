# 测试规范和标准

## 代码规范

### 文件命名
- 单元测试: `*.spec.ts`
- 集成测试: `*.integration.spec.ts`
- E2E 测试: `*.e2e-spec.ts`
- 性能测试: `*-performance.js`

### 目录结构
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── auth.integration.spec.ts
│   │   └── ...
│   └── ...
test/
├── e2e/
│   ├── auth.e2e-spec.ts
│   ├── fixtures/
│   └── ...
└── performance/
    ├── auth-performance.js
    └── ...
```

## 测试规范

### 测试结构
```typescript
describe('功能描述', () => {
  let service: UserService;
  let repository: any;

  beforeEach(() => {
    // 初始化
  });

  afterEach(() => {
    // 清理
  });

  it('应该...', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### 覆盖率要求
- 新代码: 100% 覆盖率
- 现有代码: ≥ 80% 覆盖率
- 关键路径: 100% 覆盖率

## 提交规范

### 提交信息格式
```
type: subject

body

footer
```

### 类型
- feat: 新功能
- fix: 修复
- test: 测试
- docs: 文档
- refactor: 重构
- perf: 性能优化

### 示例
```
test: 添加用户认证测试

- 添加登录测试用例
- 添加注册测试用例
- 添加 Token 刷新测试用例

覆盖率: 85%
```

## 审查标准

### 代码审查检查清单
- [ ] 测试覆盖率 ≥ 80%
- [ ] 所有测试通过
- [ ] 遵循命名规范
- [ ] 没有重复代码
- [ ] 文档已更新
- [ ] 提交信息清晰

### 性能审查
- [ ] 单元测试 < 2 分钟
- [ ] 集成测试 < 3 分钟
- [ ] E2E 测试 < 5 分钟
- [ ] 总计 < 10 分钟
