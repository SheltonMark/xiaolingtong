// 测试临工提现
const axios = require('axios');

async function testWorkerWithdraw() {
  try {
    // 先获取 userId 8 的 token（需要从数据库或者用 JWT 生成）
    // 这里我们直接调用 API，假设已经登录

    // 方案：直接在服务器端调用 service 方法
    console.log('测试临工提现功能...');
    console.log('userId: 8');
    console.log('当前余额: 3.00元');
    console.log('提现金额: 3.00元');

    const response = await axios.post('http://localhost:3000/api/wallet/withdraw', {
      amount: 3.00
    }, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });

    console.log('提现结果:', response.data);
  } catch (error) {
    console.error('提现失败:', error.response?.data || error.message);
  }
}

testWorkerWithdraw();
