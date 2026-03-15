# 服务器诊断 - 快速使用指南

## 方法 1：使用 Node.js 诊断脚本（推荐）

### 前置条件
```bash
# 安装依赖
npm install mysql2
```

### 运行诊断
```bash
# 基本用法（使用默认配置）
node diagnose.js

# 指定数据库配置
DB_HOST=localhost DB_USER=root DB_PASSWORD=password DB_NAME=xiaolingtong JOB_ID=1 node diagnose.js
```

### 输出示例
```
==========================================
招工详情界面 - 诊断脚本
==========================================

连接数据库...
✅ 数据库连接成功

1. 检查报名数据
   招工 ID 1 的报名数: 2
   ✅ 有报名数据

2. 检查 Worker 用户信息
   找到 2 个报名者:
   1. 应用 ID: 1, Worker ID: 1
      昵称: 张三
      信用分: 95, 订单数: 10, 完成度: 9
      评分: 4.5, 状态: pending
   2. 应用 ID: 2, Worker ID: 2
      昵称: 李四
      信用分: 85, 订单数: 5, 完成度: 4
      评分: 4.0, 状态: pending

3. 检查 Worker 认证信息
   找到 2 个认证记录:
   1. User ID: 1, 真实姓名: 张三, 状态: approved
   2. User ID: 2, 真实姓名: 李四, 状态: approved

4. 检查数据完整性
   Worker 用户总数: 10
   NULL totalOrders: 0
   NULL completedJobs: 0
   NULL averageRating: 0
   NULL creditScore: 0
   ✅ 数据完整

5. 检查孤立的报名记录
   孤立的报名记录: 0
   ✅ 没有孤立的报名记录

6. 检查招工信息
   招工 ID: 1
   标题: 招聘临时工
   状态: recruiting
   已报名: 2, 需要: 5
   ✅ 招工信息正常

==========================================
诊断完成
==========================================

建议:
1. ✅ 报名数据正常
2. ✅ 数据完整
3. ✅ 认证信息正常
```

## 方法 2：使用 MySQL 命令行

### 快速检查
```bash
# 1. 检查报名数
mysql -u root -p xiaolingtong -e "SELECT COUNT(*) FROM job_applications WHERE jobId = 1;"

# 2. 检查 Worker 数据
mysql -u root -p xiaolingtong -e "SELECT ja.id, ja.workerId, u.nickname, u.creditScore, u.totalOrders FROM job_applications ja LEFT JOIN users u ON ja.workerId = u.id WHERE ja.jobId = 1;"

# 3. 检查认证数据
mysql -u root -p xiaolingtong -e "SELECT userId, realName, status FROM worker_certs WHERE userId IN (SELECT DISTINCT workerId FROM job_applications WHERE jobId = 1);"
```

## 方法 3：使用 Bash 脚本

```bash
# 运行诊断脚本
bash quick-diagnose.sh

# 或者指定数据库配置
DB_USER=root DB_PASSWORD=password DB_HOST=localhost DB_NAME=xiaolingtong JOB_ID=1 bash quick-diagnose.sh
```

## 方法 4：使用 curl 测试 API

### 获取 Token
```bash
# 登录获取 Token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code"}' | jq '.token'
```

### 测试 API
```bash
# 获取报名者列表
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# 查看报名数
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.pending | length'

# 查看第一个报名者的详情
curl -X GET http://localhost:3000/jobs/1/applications \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.pending[0]'
```

## 诊断结果解读

### ✅ 正常情况
```
报名数: > 0
Worker 用户: 存在
认证信息: 存在
数据完整: 没有 NULL 值
孤立记录: 0
```

### ⚠️ 警告情况
```
报名数: 0 → 需要创建测试数据
Worker 用户: NULL → 需要检查数据库关系
认证信息: 缺失 → 可能影响显示
数据完整: 有 NULL 值 → 需要更新数据
孤立记录: > 0 → 需要清理数据
```

### ❌ 错误情况
```
数据库连接失败 → 检查数据库配置
招工不存在 → 检查 jobId 是否正确
Worker 用户不存在 → 数据库关系错误
```

## 常见问题

### Q1: 如何修改诊断的招工 ID？
```bash
# 方法 1：使用环境变量
JOB_ID=2 node diagnose.js

# 方法 2：编辑脚本
# 修改 diagnose.js 中的 jobId: process.env.JOB_ID || 1
```

### Q2: 如何修改数据库配置？
```bash
# 使用环境变量
DB_HOST=192.168.1.100 \
DB_USER=admin \
DB_PASSWORD=mypassword \
DB_NAME=xiaolingtong \
node diagnose.js
```

### Q3: 诊断显示没有报名数据怎么办？
```bash
# 创建测试数据
mysql -u root -p xiaolingtong << EOF
-- 创建测试 Worker 用户
INSERT INTO users (openid, role, nickname, creditScore, totalOrders, completedJobs, averageRating)
VALUES ('test_worker_1', 'worker', '张三', 95, 10, 9, 4.5);

-- 创建测试报名
INSERT INTO job_applications (jobId, workerId, status, createdAt)
VALUES (1, LAST_INSERT_ID(), 'pending', NOW());
EOF
```

### Q4: 诊断显示有 NULL 值怎么办？
```bash
# 更新 NULL 值
mysql -u root -p xiaolingtong << EOF
UPDATE users SET totalOrders = 0 WHERE totalOrders IS NULL;
UPDATE users SET completedJobs = 0 WHERE completedJobs IS NULL;
UPDATE users SET averageRating = 0 WHERE averageRating IS NULL;
UPDATE users SET creditScore = 100 WHERE creditScore IS NULL;
EOF
```

## 完整诊断流程

1. **运行诊断脚本**
   ```bash
   node diagnose.js
   ```

2. **查看输出结果**
   - 检查是否有错误或警告

3. **根据结果采取行动**
   - 如果有问题，按照建议修复

4. **重新运行诊断**
   ```bash
   node diagnose.js
   ```

5. **验证前端显示**
   - 打开微信开发者工具
   - 进入招工详情页面
   - 检查是否显示临工详情

## 获取诊断信息后的下一步

1. **收集所有诊断输出**
   ```bash
   node diagnose.js > diagnostic_report.txt 2>&1
   ```

2. **收集 API 响应**
   ```bash
   curl -X GET http://localhost:3000/jobs/1/applications \
     -H "Authorization: Bearer YOUR_TOKEN" > api_response.json
   ```

3. **收集服务器日志**
   ```bash
   tail -100 logs/app.log > server_logs.txt
   ```

4. **提供给开发者**
   - diagnostic_report.txt
   - api_response.json
   - server_logs.txt

这些信息将帮助快速定位问题。
