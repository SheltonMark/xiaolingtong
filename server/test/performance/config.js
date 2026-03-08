export const options = {
  stages: [
    { duration: '30s', target: 20 },   // 30秒内增加到20个虚拟用户
    { duration: '1m30s', target: 100 }, // 1分30秒内增加到100个虚拟用户
    { duration: '20s', target: 0 },     // 20秒内降低到0个虚拟用户
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95%的请求在500ms内完成
    http_req_failed: ['rate<0.1'],                   // 失败率低于10%
  },
};

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
