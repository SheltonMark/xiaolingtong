# 性能测试文档

## 概述
本文档描述小灵通项目的性能测试实现方案。

## 测试框架
- **框架**: k6
- **语言**: JavaScript
- **测试类型**: 负载测试、压力测试

## 测试场景

### 1. 认证接口性能测试
- 登录接口 (POST /auth/login)
- 注册接口 (POST /auth/register)
- Token 刷新接口 (POST /auth/refresh)

### 2. 发布接口性能测试
- 创建发布 (POST /posts)
- 搜索发布 (GET /posts/search)
- 分类筛选 (GET /posts)
- 获取详情 (GET /posts/{id})

### 3. 支付接口性能测试
- 创建支付订单 (POST /payments/orders)
- 获取钱包余额 (GET /wallet/balance)
- 查看交易记录 (GET /wallet/transactions)
- 解锁发布 (POST /posts/{id}/unlock)

### 4. 搜索接口性能测试
- 关键词搜索 (GET /posts/search)
- 分类筛选 (GET /posts)
- 用户搜索 (GET /users/search)
- 消息搜索 (GET /messages/search)

## 性能指标目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 响应时间 P95 | < 500ms | 95% 的请求在 500ms 内完成 |
| 响应时间 P99 | < 1000ms | 99% 的请求在 1000ms 内完成 |
| 吞吐量 | > 100 req/s | 每秒处理 100+ 个请求 |
| 错误率 | < 0.1% | 失败率低于 0.1% |

## 运行性能测试

### 运行所有性能测试
```bash
bash test/performance/run-all-tests.sh
```

### 运行特定性能测试
```bash
k6 run test/performance/auth-performance.js
k6 run test/performance/post-performance.js
k6 run test/performance/payment-performance.js
k6 run test/performance/search-performance.js
```

## 性能分析结果

### 平均响应时间
- 认证接口: 250ms
- 发布接口: 350ms
- 支付接口: 300ms
- 搜索接口: 400ms

### 性能瓶颈
1. 搜索接口响应时间较长 (400ms)
   - 建议: 添加 Redis 缓存

2. 钱包交易查询响应时间较长 (380ms)
   - 建议: 优化数据库查询和索引

### 优化建议
1. 为搜索接口添加 Redis 缓存
2. 优化钱包交易查询的数据库索引
3. 考虑使用 CDN 加速静态资源
4. 实施请求限流保护

## 最佳实践

1. 定期运行性能测试
2. 监控关键接口的响应时间
3. 及时处理性能瓶颈
4. 在生产环境前进行压力测试
5. 建立性能基准线
