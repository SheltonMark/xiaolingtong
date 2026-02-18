// utils/mock.js - 模拟数据

// 企业首页 - 采购需求
const purchaseList = [
  {
    id: 'p1',
    type: 'purchase',
    avatar: '',
    avatarText: '日',
    avatarBg: '#DBEAFE',
    avatarColor: '#3B82F6',
    location: '东莞',
    certText: '已认证贸易商',
    industry: '日用百货',
    fields: [
      { label: '物品', value: '304不锈钢保温杯' },
      { label: '数量', value: '3000个', bold: true },
      { label: '规格', value: '500ml，带保温盖，双层真空' },
      { label: '交期', value: '30天内' }
    ],
    time: '2小时前'
  },
  {
    id: 'p2',
    type: 'purchase',
    avatar: '',
    avatarText: '电',
    avatarBg: '#D1FAE5',
    avatarColor: '#10B981',
    location: '广州',
    certText: '已认证企业',
    industry: '电子数码',
    fields: [
      { label: '物品', value: 'Type-C数据线' },
      { label: '数量', value: '10000条', bold: true },
      { label: '规格', value: '1米/2米，PD快充60W' },
      { label: '交期', value: '15天内' }
    ],
    time: '5小时前'
  }
]

// 企业首页 - 工厂库存
const stockList = [
  {
    id: 's1',
    type: 'stock',
    avatar: '',
    avatarText: '加',
    avatarBg: '#FEF3C7',
    avatarColor: '#F59E0B',
    location: '深圳',
    certText: '已认证工厂',
    industry: '模具加工',
    fields: [
      { label: '产品', value: 'ABS塑料外壳' },
      { label: '库存', value: '50000件', bold: true },
      { label: '单价', value: '¥2.5-3.8/件' },
      { label: '状态', value: '现货' }
    ],
    time: '1天前'
  }
]

// 企业首页 - 招工信息
const jobListEnterprise = [
  {
    id: 'j1',
    companyName: '鑫达电子厂',
    companyAvatar: '',
    time: '02-07',
    location: '东莞长安',
    title: '电子组装工 · 需15人',
    salary: '22元/小时',
    salaryType: '计时',
    tags: ['包午餐', '有空调', '长期合作'],
    applied: 5,
    total: 15
  }
]

// 临工首页 - 用工列表
const jobListWorker = [
  {
    id: 'j1',
    title: '电子组装工',
    salary: '20',
    salaryUnit: '元/小时',
    salaryType: '计时',
    distance: '2.5km',
    location: '东莞长安镇xxx工业区',
    need: 15,
    applied: 5,
    dateRange: '02-10 至 02-17',
    companyName: '鑫达电子厂',
    creditScore: 92,
    tags: ['包午餐', '有空调', '长期合作']
  },
  {
    id: 'j2',
    title: '包装工',
    salary: '18',
    salaryUnit: '元/小时',
    salaryType: '计时',
    distance: '3.8km',
    location: '东莞虎门镇xxx路',
    need: 8,
    applied: 3,
    dateRange: '02-12 至 02-14',
    companyName: '顺丰包装厂',
    creditScore: 88,
    tags: ['包午餐', '日结']
  }
]

// 曝光榜
const exposureList = [
  {
    id: 'e1',
    publisher: '匿名用户',
    publishTime: '2026-02-05',
    category: '虚假信息',
    companyName: '***塑胶制品厂',
    personName: '王**',
    amount: 12800,
    description: '该公司在平台发布虚假库存信息，声称有大量现货，实际联系后发现根本没有货源，浪费了我们大量时间和精力。',
    images: ['/images/mock/evidence1.png', '/images/mock/evidence2.png', '/images/mock/evidence3.png'],
    comments: 8,
    views: 326
  },
  {
    id: 'e2',
    publisher: '匿名用户',
    publishTime: '2026-02-03',
    category: '欠薪',
    companyName: '***五金加工厂',
    personName: '李**',
    amount: 35600,
    description: '在该工厂做了两个月临时工，工资一直拖欠不发，多次沟通无果。',
    images: ['/images/mock/evidence4.png'],
    comments: 15,
    views: 892
  }
]

// 消息列表
const messageList = [
  {
    id: 'm1',
    type: 'system',
    title: '审核通过',
    content: '您发布的"保温杯库存"已审核通过',
    time: '15:30',
    read: false
  },
  {
    id: 'm2',
    type: 'system',
    title: '工资到账',
    content: '您有一笔工资¥160.00已到账',
    time: '14:00',
    read: true
  }
]

// 聊天会话列表
const chatSessions = [
  {
    id: 'c1',
    name: '***贸易公司',
    avatar: '',
    lastMessage: '3000个的话可以给你12元/个...',
    time: '14:35',
    unread: 2,
    online: true
  },
  {
    id: 'c2',
    name: '***电子厂',
    avatar: '',
    lastMessage: '好的，我们明天安排发货',
    time: '昨天',
    unread: 0,
    online: false
  }
]

// 聊天消息
const chatMessages = [
  { id: 1, type: 'system', content: '你正在咨询「保温杯3000个采购」' },
  { id: 2, type: 'received', content: '你好，我们这边有现货304不锈钢保温杯，500ml的，请问你需要什么颜色？', time: '14:30' },
  { id: 3, type: 'sent', content: '黑色和白色各1500个，能做logo定制吗？', time: '14:31' },
  { id: 4, type: 'received', content: '可以的，这是我们之前做的样品图，你看一下：', time: '14:32', image: '/images/mock/sample.png' },
  { id: 5, type: 'sent', content: '不错，单价多少？3000个的话能优惠吗？', time: '14:33' },
  { id: 6, type: 'received', content: '3000个的话可以给你12元/个，含logo丝印，交期25天，你看可以吗？', time: '14:35' }
]

// 会员套餐
const memberPlans = [
  { id: 'month', name: '月度会员', desc: '适合短期采购需求', price: 99, originalPrice: 199, selected: true },
  { id: 'quarter', name: '季度会员', desc: '平均每月仅¥79', price: 238, originalPrice: 597, badge: '推荐' },
  { id: 'year', name: '年度会员', desc: '平均每月仅¥66，最划算', price: 799, originalPrice: 2388, badge: '省¥1400' }
]

// 会员权益
const memberBenefits = [
  { icon: 'eye', title: '无限查看', desc: '联系方式免费查看' },
  { icon: 'top', title: '置顶特权', desc: '每月3次免费置顶' },
  { icon: 'badge', title: '认证标识', desc: '专属会员标识' },
  { icon: 'service', title: '专属客服', desc: '优先响应服务' }
]

// 我的报名
const applicationList = [
  {
    id: 'a1',
    title: '电子组装工',
    company: '鑫达电子厂',
    status: 'selected',
    statusText: '已入选',
    workDate: '02-10 08:00',
    needConfirm: true
  },
  {
    id: 'a2',
    title: '包装工',
    company: '顺丰包装厂',
    status: 'pending',
    statusText: '待确认',
    workDate: '02-12 08:00',
    needConfirm: false
  }
]

// 钱包
const walletData = {
  balance: 520.00,
  totalIncome: 3680.00,
  totalOrders: 23
}

// 收入明细
const incomeList = [
  { id: 'i1', amount: 160.00, title: '组装工 - 鑫达电子厂', date: '2026-02-06', detail: '工时：8小时 × ¥20/小时' },
  { id: 'i2', amount: 50.00, title: '监管服务费', date: '2026-02-06', detail: '监管人数：10人' },
  { id: 'i3', amount: 144.00, title: '包装工 - 顺丰包装厂', date: '2026-02-04', detail: '工时：8小时 × ¥18/小时' }
]

module.exports = {
  purchaseList,
  stockList,
  jobListEnterprise,
  jobListWorker,
  exposureList,
  messageList,
  chatSessions,
  chatMessages,
  memberPlans,
  memberBenefits,
  applicationList,
  walletData,
  incomeList
}
