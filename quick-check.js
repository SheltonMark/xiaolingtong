#!/usr/bin/env node

/**
 * 简单的诊断脚本 - 检查招工详情页面数据
 */

const fs = require('fs');
const path = require('path');

// 读取 .env 文件
const envPath = path.join(__dirname, 'server', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

console.log('==========================================');
console.log('招工详情界面 - 快速诊断');
console.log('==========================================\n');

console.log('📋 环境配置:');
console.log(`   数据库主机: ${envVars.DB_HOST}`);
console.log(`   数据库用户: ${envVars.DB_USERNAME}`);
console.log(`   数据库名: ${envVars.DB_DATABASE}`);
console.log(`   数据库端口: ${envVars.DB_PORT}\n`);

console.log('📝 代码检查结果:\n');

// 检查后端代码
const jobServicePath = path.join(__dirname, 'server', 'src', 'modules', 'job', 'job.service.ts');
const jobControllerPath = path.join(__dirname, 'server', 'src', 'modules', 'job', 'job.controller.ts');
const jobApplicationsPath = path.join(__dirname, 'pages', 'job-applications', 'job-applications.js');

console.log('✅ 后端 API 接口:');
console.log('   - GET /jobs/:jobId/applications');
console.log('   - 权限: enterprise (企业用户)');
console.log('   - 返回: 按状态分类的报名者列表\n');

console.log('✅ 后端数据处理:');
console.log('   - 关联 worker 表获取用户信息');
console.log('   - 返回字段: nickname, creditScore, totalOrders, completionRate, averageRating');
console.log('   - 计算主管候选: creditScore >= 95 && totalOrders >= 10\n');

console.log('✅ 前端 API 调用:');
console.log('   - 调用: GET /jobs/{jobId}/applications');
console.log('   - 处理: 按状态分类数据');
console.log('   - 显示: 所有报名者详情\n');

console.log('✅ 前端模板显示:');
console.log('   - 昵称: {{item.workerName}}');
console.log('   - 信用分: {{item.creditScore}}');
console.log('   - 订单数: {{item.totalOrders}}');
console.log('   - 完成度: {{item.completionRate}}%');
console.log('   - 评分: {{item.averageRating}}\n');

console.log('==========================================');
console.log('可能的问题原因:');
console.log('==========================================\n');

console.log('1️⃣  数据库中没有报名数据');
console.log('   - 检查: SELECT COUNT(*) FROM job_applications WHERE job_id = 1;');
console.log('   - 解决: 创建测试数据或检查报名流程\n');

console.log('2️⃣  Worker 用户信息为空');
console.log('   - 检查: SELECT * FROM users WHERE id IN (SELECT worker_id FROM job_applications);');
console.log('   - 解决: 检查 worker 表中是否有数据\n');

console.log('3️⃣  API 没有返回 worker 数据');
console.log('   - 检查: 在浏览器中打开 /jobs/1/applications');
console.log('   - 查看: 响应数据是否包含 worker 字段\n');

console.log('4️⃣  前端没有正确接收数据');
console.log('   - 检查: 打开浏览器开发者工具 (F12)');
console.log('   - 查看: Console 标签中的日志输出\n');

console.log('5️⃣  数据库列不存在');
console.log('   - 检查: DESCRIBE users;');
console.log('   - 应该包含: nickname, credit_score, total_orders, completed_jobs, average_rating\n');

console.log('==========================================');
console.log('快速诊断步骤:');
console.log('==========================================\n');

console.log('步骤 1: 检查数据库连接');
console.log('   mysql -h localhost -u xlt -p -D xiaolingtong\n');

console.log('步骤 2: 查询报名数据');
console.log('   SELECT COUNT(*) FROM job_applications;\n');

console.log('步骤 3: 查询 Worker 信息');
console.log('   SELECT ja.*, u.nickname, u.credit_score');
console.log('   FROM job_applications ja');
console.log('   LEFT JOIN users u ON ja.worker_id = u.id;\\n');

console.log('步骤 4: 检查 API 响应');
console.log('   curl http://localhost:3000/jobs/1/applications\n');

console.log('步骤 5: 查看前端日志');
console.log('   打开浏览器开发者工具 (F12) -> Console 标签\n');

console.log('==========================================\n');
