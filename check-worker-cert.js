#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function checkWorkerCert() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'xlt',
    password: 'XLT2026db',
    database: 'xiaolingtong'
  });

  try {
    console.log('=== 检查 worker_cert 表 ===\n');

    // 1. 表结构
    console.log('1️⃣ 表结构:');
    const [columns] = await connection.query('DESCRIBE worker_cert');
    console.table(columns);

    // 2. 数据总数
    console.log('\n2️⃣ 数据总数:');
    const [countResult] = await connection.query('SELECT COUNT(*) as total FROM worker_cert');
    console.log(`总记录数: ${countResult[0].total}`);

    // 3. 所有数据
    console.log('\n3️⃣ 所有 worker_cert 数据:');
    const [certs] = await connection.query('SELECT * FROM worker_cert');
    if (certs.length > 0) {
      console.table(certs);
    } else {
      console.log('❌ worker_cert 表中没有数据');
    }

    // 4. 与 job_applications 的关联
    console.log('\n4️⃣ 报名者与实名认证的关联:');
    const [joined] = await connection.query(`
      SELECT
        ja.id as appId,
        ja.jobId,
        ja.workerId,
        ja.status,
        wc.realName,
        u.nickname,
        u.creditScore
      FROM job_applications ja
      LEFT JOIN worker_cert wc ON ja.workerId = wc.userId
      LEFT JOIN users u ON ja.workerId = u.id
      LIMIT 10
    `);
    console.table(joined);

    // 5. 统计
    console.log('\n5️⃣ 统计信息:');
    const [stats] = await connection.query(`
      SELECT
        COUNT(DISTINCT ja.workerId) as total_applicants,
        COUNT(DISTINCT wc.userId) as certified_workers,
        COUNT(DISTINCT CASE WHEN wc.realName IS NOT NULL THEN wc.userId END) as with_realname
      FROM job_applications ja
      LEFT JOIN worker_cert wc ON ja.workerId = wc.userId
    `);
    console.table(stats);

    // 6. 未认证的报名者
    console.log('\n6️⃣ 未认证的报名者:');
    const [uncertified] = await connection.query(`
      SELECT DISTINCT ja.workerId, u.nickname, u.creditScore
      FROM job_applications ja
      LEFT JOIN worker_cert wc ON ja.workerId = wc.userId
      LEFT JOIN users u ON ja.workerId = u.id
      WHERE wc.userId IS NULL
    `);
    if (uncertified.length > 0) {
      console.table(uncertified);
    } else {
      console.log('✅ 所有报名者都已认证');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkWorkerCert();
