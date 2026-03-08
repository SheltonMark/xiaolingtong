import { options, BASE_URL } from './config.js';
import { makeRequest, checkResponse, randomSleep } from './utils.js';

export { options };

const categories = ['procurement', 'factory_inventory', 'processing', 'recruitment'];

export default function () {
  // 测试创建发布接口性能
  const createResponse = makeRequest('POST', '/posts', {
    title: `Test Post ${Math.random()}`,
    description: 'Performance test post',
    category: categories[Math.floor(Math.random() * categories.length)],
    budget: Math.floor(Math.random() * 10000) + 1000,
  });

  checkResponse(createResponse, 201);
  randomSleep(1, 2);

  // 测试搜索接口性能
  const searchResponse = makeRequest('GET', '/posts/search?keyword=test&category=procurement');
  checkResponse(searchResponse, 200);
  randomSleep(1, 2);

  // 测试分类筛选接口性能
  const filterResponse = makeRequest('GET', '/posts?category=factory_inventory&page=1&limit=10');
  checkResponse(filterResponse, 200);
  randomSleep(1, 2);

  // 测试获取详情接口性能
  const detailResponse = makeRequest('GET', '/posts/1');
  checkResponse(detailResponse, 200);
  randomSleep(1, 2);
}
