#!/usr/bin/env node

/**
 * 招工详情界面诊断脚本
 * 用法: node diagnose.js
 */

const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xiaolingtong',
  jobId: process.env.JOB_ID || 1
};

async function diagnose() {
  let connection;

  try {
    console.log('==========================================');
    console.log('招工详情界面 - 诊断脚本');
    console.log('==========================================\n');

    // 连接数据库
    console.log('连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 1. 检查报名数据
    console.log('1. 检查报名数据');
    const [appCount] = await connection.query(
      'SELECT COUNT(*) as count FROM job_applications WHERE jobId = ?',
      [config.jobId]
    );
    const totalApps = appCount[0].count;
    console.log(`   招工 ID ${config.jobId} 的报名数: ${totalApps}`);
    if (totalApps === 0) {
      console.log('   ⚠️  没有报名数据\n');
    } else {
      console.log('   ✅ 有报名数据\n');
    }

    // 2. 检查 Worker 用户信息
    console.log('2. 检查 Worker 用户信息');
    const [workers] = await connection.query(
      `SELECT
        ja.id as app_id,
        ja.workerId,
        ja.status,
        u.id as user_id,
        u.nickname,
        u.creditScore,
        u.totalOrders,
        u.completedJobs,
        u.averageRating
      FROM job_applications ja
      LEFT JOIN users u ON ja.workerId = u.id
      WHERE ja.jobId = ?
      ORDER BY ja.createdAt DESC`,
      [config.jobId]
    );

    if (workers.length === 0) {
      console.log('   ⚠️  没有找到报名者\n');
    } else {
      console.log(`   找到 ${workers.length} 个报名者:`);
      workers.forEach((w, idx) => {
        console.log(`   ${idx + 1}. 应用 ID: ${w.app_id}, Worker ID: ${w.workerId}`);
        console.log(`      昵称: ${w.nickname || '(NULL)'}`);
        console.log(`      信用分: ${w.creditScore}, 订单数: ${w.totalOrders}, 完成度: ${w.completedJobs}`);
        console.log(`      评分: ${w.averageRating}, 状态: ${w.status}`);
        if (!w.user_id) {
          console.log(`      ❌ Worker 用户不存在!`);
        }
      });
      console.log();
    }

    // 3. 检查认证信息
    console.log('3. 检查 Worker 认证信息');
    const [certs] = await connection.query(
      `SELECT
        id,
        userId,
        realName,
        status,
        createdAt
      FROM worker_certs
      WHERE userId IN (
        SELECT DISTINCT workerId FROM job_applications WHERE jobId = ?
      )`,
      [config.jobId]
    );

    if (certs.length === 0) {
      console.log('   ⚠️  没有找到认证信息\n');
    } else {
      console.log(`   找到 ${certs.length} 个认证记录:`);
      certs.forEach((c, idx) => {
        console.log(`   ${idx + 1}. User ID: ${c.userId}, 真实姓名: ${c.realName}, 状态: ${c.status}`);
      });
      console.log();
    }

    // 4. 检查数据完整性
    console.log('4. 检查数据完整性');
    const [nullCheck] = await connection.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN totalOrders IS NULL THEN 1 ELSE 0 END) as null_totalOrders,
        SUM(CASE WHEN completedJobs IS NULL THEN 1 ELSE 0 END) as null_completedJobs,
        SUM(CASE WHEN averageRating IS NULL THEN 1 ELSE 0 END) as null_averageRating,
        SUM(CASE WHEN creditScore IS NULL THEN 1 ELSE 0 END) as null_creditScore
      FROM users
      WHERE role = 'worker'`
    );

    const check = nullCheck[0];
    console.log(`   Worker 用户总数: ${check.total}`);
    console.log(`   NULL totalOrders: ${check.null_totalOrders}`);
    console.log(`   NULL completedJobs: ${check.null_completedJobs}`);
    console.log(`   NULL averageRating: ${check.null_averageRating}`);
    console.log(`   NULL creditScore: ${check.null_creditScore}`);

    if (check.null_totalOrders > 0 || check.null_completedJobs > 0 || check.null_averageRating > 0) {
      console.log('   ⚠️  有 NULL 值，需要更新数据\n');
    } else {
      console.log('   ✅ 数据完整\n');
    }

    // 5. 检查孤立的报名记录
    console.log('5. 检查孤立的报名记录');
    const [orphaned] = await connection.query(
      `SELECT COUNT(*) as count
      FROM job_applications ja
      LEFT JOIN users u ON ja.workerId = u.id
      WHERE u.id IS NULL`
    );

    const orphanedCount = orphaned[0].count;
    console.log(`   孤立的报名记录: ${orphanedCount}`);
    if (orphanedCount > 0) {
      console.log('   ⚠️  有孤立的报名记录\n');
    } else {
      console.log('   ✅ 没有孤立的报名记录\n');
    }

    // 6. 检查招工信息
    console.log('6. 检查招工信息');
    const [job] = await connection.query(
      'SELECT id, title, status, applied, need FROM jobs WHERE id = ?',
      [config.jobId]
    );

    if (job.length === 0) {
      console.log(`   ❌ 招工 ID ${config.jobId} 不存在\n`);
    } else {
      const j = job[0];
      console.log(`   招工 ID: ${j.id}`);
      console.log(`   标题: ${j.title}`);
      console.log(`   状态: ${j.status}`);
      console.log(`   已报名: ${j.applied}, 需要: ${j.need}`);
      console.log('   ✅ 招工信息正常\n');
    }

    // 总结
    console.log('==========================================');
    console.log('诊断完成');
    console.log('==========================================\n');

    // 建议
    console.log('建议:');
    if (totalApps === 0) {
      console.log('1. ❌ 没有报名数据 - 需要创建测试数据');
    } else if (workers.some(w => !w.user_id)) {
      console.log('1. ❌ 有孤立的报名记录 - 需要检查 Worker 用户');
    } else if (workers.some(w => !w.nickname)) {
      console.log('1. ⚠️  有 Worker 昵称为空 - 需要更新数据');
    } else {
      console.log('1. ✅ 报名数据正常');
    }

    if (check.null_totalOrders > 0 || check.null_completedJobs > 0) {
      console.log('2. ⚠️  有 NULL 值 - 需要更新数据库');
    } else {
      console.log('2. ✅ 数据完整');
    }

    if (certs.length === 0) {
      console.log('3. ⚠️  没有认证信息 - 可能影响显示');
    } else {
      console.log('3. ✅ 认证信息正常');
    }

    console.log();

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行诊断
diagnose();
