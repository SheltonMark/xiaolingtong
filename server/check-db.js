const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'xlt',
    password: 'XLT2026db',
    database: 'xiaolingtong'
  });

  try {
    // Check users table structure
    const [columns] = await connection.execute('SHOW COLUMNS FROM users');
    console.log('📋 Users Table Columns:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(25)} | ${col.Type.padEnd(20)} | ${col.Null} | ${col.Key} | ${col.Default || 'NULL'}`);
    });

    // Check if totalOrders column exists
    const totalOrdersExists = columns.some(col => col.Field === 'totalOrders');
    console.log('\n' + '='.repeat(80));
    console.log(`✅ totalOrders column exists: ${totalOrdersExists}`);

    // Check other missing columns
    const missingColumns = [];
    const requiredColumns = ['totalOrders', 'completedJobs', 'averageRating', 'creditScore', 'nickname'];
    requiredColumns.forEach(col => {
      if (!columns.some(c => c.Field === col)) {
        missingColumns.push(col);
      }
    });

    if (missingColumns.length > 0) {
      console.log(`\n❌ Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('\n✅ All required columns exist');
    }

    // Check sample data
    console.log('\n' + '='.repeat(80));
    console.log('📊 Sample Worker Data:');
    const [workers] = await connection.execute(
      'SELECT id, nickname, creditScore, totalOrders FROM users WHERE role = "worker" LIMIT 3'
    );
    if (workers.length > 0) {
      workers.forEach(w => {
        console.log(`ID: ${w.id}, Nickname: ${w.nickname}, CreditScore: ${w.creditScore}, TotalOrders: ${w.totalOrders}`);
      });
    } else {
      console.log('No worker data found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase();
