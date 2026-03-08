import { options, BASE_URL } from './config.js';
import { makeRequest, checkResponse, randomSleep } from './utils.js';

export { options };

export default function () {
  // 测试登录接口性能
  const loginResponse = makeRequest('POST', '/auth/login', {
    phone: '13800138000',
    password: 'password123',
  });

  checkResponse(loginResponse, 200);
  randomSleep(1, 2);

  // 测试注册接口性能
  const registerResponse = makeRequest('POST', '/auth/register', {
    phone: `138001${Math.floor(Math.random() * 100000)}`,
    password: 'password123',
    nickname: `User${Math.random()}`,
  });

  checkResponse(registerResponse, 201);
  randomSleep(1, 2);

  // 测试 Token 刷新接口性能
  const refreshResponse = makeRequest('POST', '/auth/refresh', {});
  checkResponse(refreshResponse, 200);
  randomSleep(1, 2);
}
