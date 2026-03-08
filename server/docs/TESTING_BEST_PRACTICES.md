# 测试最佳实践指南

## 测试命名规范

### 单元测试
```typescript
describe('UserService', () => {
  it('应该在用户存在时返回用户信息', () => {});
  it('应该在用户不存在时抛出异常', () => {});
});
```

### 集成测试
```typescript
describe('UserController', () => {
  it('应该返回所有用户列表', () => {});
  it('应该创建新用户并返回用户信息', () => {});
});
```

## 测试隔离原则

1. 每个测试应该是独立的
2. 避免测试之间的依赖关系
3. 使用 beforeEach 和 afterEach 进行设置和清理
4. 使用 Mock 隔离外部依赖

## Mock 使用指南

### 创建 Mock
```typescript
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
};
```

### 配置 Mock 返回值
```typescript
mockRepository.find.mockResolvedValue([user1, user2]);
mockRepository.findOne.mockResolvedValue(user1);
```

## 覆盖率目标

| 指标 | 目标 |
|------|------|
| 语句覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 75% |
| 函数覆盖率 | ≥ 80% |
| 行覆盖率 | ≥ 80% |

## 常见错误和解决方案

### 错误 1: 测试间依赖
**问题**: 测试 A 的结果影响测试 B
**解决**: 使用 beforeEach 重新初始化状态

### 错误 2: 过度 Mock
**问题**: Mock 了太多不必要的依赖
**解决**: 只 Mock 外部依赖，测试真实逻辑

### 错误 3: 测试名称不清晰
**问题**: 无法理解测试的目的
**解决**: 使用清晰的 BDD 风格命名

## 最佳实践

1. 遵循 AAA 模式 (Arrange, Act, Assert)
2. 一个测试只测试一个功能
3. 使用有意义的变量名
4. 避免测试实现细节
5. 定期检查覆盖率报告
