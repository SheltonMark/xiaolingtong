import { options, BASE_URL } from './config.js';
import { makeRequest, checkResponse, randomSleep } from './utils.js';

export { options };

export default function () {
  // 测试创建支付订单接口性能
  const createOrderResponse = makeRequest('POST', '/payments/orders', {
    amount: Math.floor(Math.random() * 1000) + 100,
    description: 'Performance test payment',
    type: 'unlock_post',
  });

  checkResponse(createOrderResponse, 201);
  randomSleep(1, 2);

  // 测试获取钱包余额接口性能
  const balanceResponse = makeRequest('GET', '/wallet/balance');
  checkResponse(balanceResponse, 200);
  randomSleep(1, 2);

  // 测试查看交易记录接口性能
  const transactionsResponse = makeRequest('GET', '/wallet/transactions?page=1&limit=10');
  checkResponse(transactionsResponse, 200);
  randomSleep(1, 2);

  // 测试解锁发布接口性能
  const unlockResponse = makeRequest('POST', '/posts/1/unlock', {
    beanAmount: 10,
  });

  checkResponse(unlockResponse, 200);
  randomSleep(1, 2);
}
