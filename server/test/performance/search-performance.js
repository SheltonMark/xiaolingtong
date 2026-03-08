import { options, BASE_URL } from './config.js';
import { makeRequest, checkResponse, randomSleep } from './utils.js';

export { options };

const keywords = ['工人', '招聘', '采购', '工厂', '代加工'];
const categories = ['procurement', 'factory_inventory', 'processing', 'recruitment'];

export default function () {
  // 测试关键词搜索接口性能
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  const searchResponse = makeRequest('GET', `/posts/search?keyword=${keyword}&page=1&limit=10`);
  checkResponse(searchResponse, 200);
  randomSleep(1, 2);

  // 测试分类筛选接口性能
  const category = categories[Math.floor(Math.random() * categories.length)];
  const filterResponse = makeRequest('GET', `/posts?category=${category}&page=1&limit=10`);
  checkResponse(filterResponse, 200);
  randomSleep(1, 2);

  // 测试用户搜索接口性能
  const userSearchResponse = makeRequest('GET', '/users/search?keyword=test&page=1&limit=10');
  checkResponse(userSearchResponse, 200);
  randomSleep(1, 2);

  // 测试消息搜索接口性能
  const messageSearchResponse = makeRequest('GET', '/messages/search?keyword=test&page=1&limit=10');
  checkResponse(messageSearchResponse, 200);
  randomSleep(1, 2);
}
