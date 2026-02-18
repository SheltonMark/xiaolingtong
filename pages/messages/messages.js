Page({
  data: {
    tabs: ['全部', '系统通知', '业务消息'],
    currentTab: 0,
    allMessages: [
      { id: 's1', type: 'system', icon: '✓', iconBg: '#EFF6FF', borderColor: '#3B82F6', title: '信息审核通过', desc: '您发布的「保温杯3000个采购」已审核通过，现已上架展示。', time: '10分钟前', unread: true },
      { id: 's2', type: 'system', icon: '👁', iconBg: '#ECFDF5', borderColor: '#10B981', title: '有人查看了您的联系方式', desc: '***电子科技 查看了您「保温杯3000个采购」的联系方式。', time: '30分钟前', unread: true },
      { id: 's3', type: 'system', icon: '⏰', iconBg: '#FFF7ED', borderColor: '#F97316', title: '出勤确认提醒', desc: '您报名的「鑫达电子厂·电子组装工」明天开工，请在今天18:00前确认出勤。', time: '2小时前', unread: true },
      { id: 's4', type: 'system', icon: '💰', iconBg: '#FFFBEB', borderColor: '', title: '工资已到账', desc: '顺丰物流仓·包装工 工资¥1,152已发放至您的钱包。', time: '昨天', unread: false },
      { id: 's5', type: 'system', icon: '📢', iconBg: '#F1F5F9', borderColor: '', title: '系统公告', desc: '小灵通平台春节期间正常运营，客服工作时间调整为9:00-18:00。', time: '02-05', unread: false },
      { id: 's6', type: 'system', icon: '🛡', iconBg: '#F1F5F9', borderColor: '', title: '举报处理结果', desc: '您举报的「虚假信息」已核实处理，相关信息已下架。感谢您的反馈。', time: '02-03', unread: false }
    ],
    systemMessages: [],
    chatMessages: [
      { id: 'c1', avatar: '🏭', name: '***贸易公司', lastMsg: '3000个的话可以给你12元/个，含logo丝印，交期25天', time: '14:35', unreadCount: 3 },
      { id: 'c2', avatar: '🏢', name: '鑫达电子厂', lastMsg: '好的，明天8点准时到厂区门口集合', time: '昨天', unreadCount: 1 },
      { id: 'c3', avatar: '👤', name: '张师傅', lastMsg: '收到，我会准时到的', time: '02-15', unreadCount: 0 }
    ]
  },
  onLoad() {
    this.setData({
      systemMessages: this.data.allMessages.filter(m => m.type === 'system')
    })
  },
  onTabChange(e) { this.setData({ currentTab: e.currentTarget.dataset.index }) },
  onReadAll() {
    const all = this.data.allMessages.map(m => ({ ...m, unread: false }))
    const chats = this.data.chatMessages.map(m => ({ ...m, unreadCount: 0 }))
    this.setData({ allMessages: all, systemMessages: all, chatMessages: chats })
    wx.showToast({ title: '已全部已读', icon: 'success' })
  },
  onTapMsg(e) {
    wx.showToast({ title: '消息详情', icon: 'none' })
  },
  onTapChat(e) {
    wx.navigateTo({ url: '/pages/chat/chat' })
  }
})
