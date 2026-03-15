# 数据库检查 - 快速参考

## 问题
招工详情页面无法显示报名者详情（名字、信用分、接单数）

## 根本原因
数据库中缺少必要的列：
- `users.totalOrders`
- `users.completedJobs`
- `users.averageRating`
- `job_applications.acceptedAt`
- `job_applications.confirmedAt`
- `job_applications.rejectedAt`

## 快速修复

### 方案 A: 自动同步 (推荐) ✅
```bash
# 重启后端服务器
cd server
npm run start
```

TypeORM 会自动创建缺失的列。

### 方案 B: 手动 SQL 修复
```bash
# 执行修复脚本
mysql -h localhost -u xlt -pXLT2026db xiaolingtong < server/fix-all-columns.sql
```

### 方案 C: 使用 Shell 脚本
```bash
bash server/fix-all-columns.sh
```

## 验证修复

```bash
# 1. 检查数据库列
mysql -h localhost -u xlt -pXLT2026db xiaolingtong -e "SHOW COLUMNS FROM users;"

# 2. 运行测试
cd server
npm test -- job.phase2.integration.spec.ts

# 3. 清除小程序缓存并重新加载页面
```

## 检查结果

✅ **代码**: 完全正确
- TypeORM 配置: synchronize: true
- 实体定义: 所有列都已定义
- 后端 API: 正确返回 worker 详情
- 前端代码: 正确处理 worker 信息
- 测试: 所有 38 个测试通过

⚠️ **数据库**: 未知状态（需要连接验证）

## 数据库连接信息
```
Host: localhost
Port: 3306
User: xlt
Password: XLT2026db
Database: xiaolingtong
```

## 相关文件
- 修复脚本: `server/fix-all-columns.sql`
- 详细指南: `DATABASE_SYNC_COMPLETE_GUIDE.md`
- 完整报告: `DATABASE_CHECK_FINAL_REPORT.md`
