// utils/mock.js - 模拟数据

// 企业首页 - 采购需求
const purchaseList = [
  {
    id: 'p1',
    type: 'purchase',
    avatarText: '鑫',
    avatarColor: '#3B82F6',
    companyName: '鑫达贸易公司',
    companyMeta: '东莞 · 已认证',
    content: '采购 保温杯 3000个，需要304不锈钢保温杯，500ml容量，带保温盖，双层真空。预算¥10~15/个，30天内交货，有现货优先，长期合作，量大从优。',
    wechat: 'riYong_trade2024',
    images: [
      'https://picsum.photos/400/400?random=1',
      'https://picsum.photos/400/400?random=2',
      'https://picsum.photos/400/400?random=3'
    ],
    date: '02-07',
    time: '2小时前'
  },
  {
    id: 'p2',
    type: 'purchase',
    avatarText: '广',
    avatarColor: '#10B981',
    companyName: '广州数码科技',
    companyMeta: '广州 · 已认证',
    content: '采购 Type-C数据线 10000条，1米/2米，PD快充60W，需要3C认证，支持OEM。预算¥3~5/条，15天内交货。',
    wechat: 'dianzi_tech888',
    images: [
      'https://picsum.photos/400/400?random=4',
      'https://picsum.photos/400/400?random=5'
    ],
    date: '02-06',
    time: '5小时前'
  }
]

// 企业首页 - 工厂库存
const stockList = [
  {
    id: 's1',
    type: 'stock',
    avatarText: '深',
    avatarColor: '#F97316',
    companyName: '深圳蓝牙科技',
    companyMeta: '深圳 · 已认证',
    content: '库存 蓝牙耳机 5000副，TWS蓝牙耳机，入耳式，主动降噪，续航6小时。100副起订，单价面议，可OEM贴牌，量大价优。',
    wechat: 'gz_dianzi_stock',
    images: [
      'https://picsum.photos/400/400?random=6',
      'https://picsum.photos/400/400?random=7'
    ],
    date: '02-05',
    time: '1天前'
  }
]

// 企业首页 - 代加工
const processList = [
  {
    id: 'pr1',
    type: 'process',
    avatarText: '华',
    avatarColor: '#F97316',
    companyName: '华强注塑加工厂',
    companyMeta: '东莞 · 已认证',
    content: '代加工 手机壳 500个起，注塑加工，TPU材质，单价面议，交期15天。支持来图定制，丝印能力。',
    wechat: 'sz_moju_factory',
    images: [
      'https://picsum.photos/400/400?random=8',
      'https://picsum.photos/400/400?random=9'
    ],
    date: '02-06',
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
    title: '电子组装工',
    salary: '20元/小时',
    wechat: 'xinda_hr_001',
    desc: '需要15人，工期7天，08:00-18:00，包午餐，有空调车间。',
    urgent: true,
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
    distance: '3km',
    location: '东莞长安',
    need: 15,
    applied: 5,
    dateRange: '02-07',
    companyName: '鑫达电子厂',
    companyAvatar: '',
    tagText: '急招',
    tagColor: 'text-rose',
    wechat: 'xinda_hr_001',
    desc: '需要15人，工期7天，08:00-18:00，包午餐，有空调车间，长期合作优先。',
    images: []
  },
  {
    id: 'j2',
    title: '包装工',
    salary: '18',
    salaryUnit: '元/小时',
    distance: '5km',
    location: '深圳宝安',
    need: 20,
    applied: 12,
    dateRange: '02-06',
    companyName: '顺丰物流仓',
    companyAvatar: '',
    tagText: '长期',
    tagColor: 'text-fresh',
    wechat: 'sf_wuliu_hr',
    desc: '需要20人，长期岗位，08:30-17:30，提供工作餐，月结工资。',
    images: []
  },
  {
    id: 'j3',
    title: '缝纫工',
    salary: '计件 0.5',
    salaryUnit: '元/件',
    distance: '8km',
    location: '广州番禺',
    need: 10,
    applied: 3,
    dateRange: '02-05',
    companyName: '美华服装厂',
    companyAvatar: '',
    tagText: '',
    tagColor: '',
    wechat: 'meihua_fz_hr',
    desc: '需要10人，工期15天，09:00-18:00，熟手优先，有缝纫经验者优先录用。',
    images: []
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
  processList,
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
