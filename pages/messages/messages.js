Page({
  data: {
    currentTab: 0,
    chatUnreadCount: 4,
    systemUnreadCount: 4,
    chatMessages: [
      { id: 'c1', avatarText: '贸', avatarBg: '#3B82F6', name: '***贸易公司', lastMsg: '3000个的话可以给你12元/个，含logo丝印，交期25天', time: '14:35', unreadCount: 3 },
      { id: 'c2', avatarText: '鑫', avatarBg: '#10B981', name: '鑫达电子厂', lastMsg: '好的，明天8点准时到厂区门口集合', time: '昨天', unreadCount: 1 },
      { id: 'c3', avatarText: '张', avatarBg: '#F97316', name: '张师傅', lastMsg: '收到，我会准时到的', time: '02-15', unreadCount: 0 }
    ],
    systemMessages: [
      { id: 's1', icon: '\ue786', iconBg: '#EFF6FF', borderColor: '#3B82F6', title: '信息审核通过', desc: '您发布的「保温杯3000个采购」已审核通过，现已上架展示。', time: '10分钟前', unread: true, link: '/pages/post-detail/post-detail?id=p1' },
      { id: 's2', icon: '\ue600', iconBg: '#ECFDF5', borderColor: '#10B981', title: '有人查看了您的联系方式', desc: '***电子科技 查看了您「保温杯3000个采购」的联系方式。', time: '30分钟前', unread: true, link: '/pages/post-detail/post-detail?id=p1' },
      { id: 's3', icon: '\ue648', iconBg: '#FFF7ED', borderColor: '#F97316', title: '出勤确认提醒', desc: '您报名的「鑫达电子厂·电子组装工」明天开工，请在今天18:00前确认出勤。', time: '2小时前', unread: true, link: '/pages/my-applications/my-applications' },
      { id: 's7', icon: '\ue8a0', iconBg: '#FEF3C7', borderColor: '#F59E0B', title: '待结算通知', desc: '「鑫达电子厂·电子组装工」已收工，请尽快完成工资结算。', time: '1小时前', unread: true, link: '/pages/settlement/settlement?jobId=j1' },
      { id: 's4', icon: '\ue611', iconBg: '#FFFBEB', borderColor: '', title: '工资已到账', desc: '顺丰物流仓·包装工 工资¥1,152已发放至您的钱包。', time: '昨天', unread: false, link: '/pages/wallet/wallet' },
      { id: 's5', icon: '\ue678', iconBg: '#F1F5F9', borderColor: '', title: '系统公告', desc: '小灵通平台春节期间正常运营，客服工作时间调整为9:00-18:00。', time: '02-05', unread: false },
      { id: 's6', icon: '\ue671', iconBg: '#F1F5F9', borderColor: '', title: '举报处理结果', desc: '您举报的「虚假信息」已核实处理，相关信息已下架。感谢您的反馈。', time: '02-03', unread: false }
    ]
  },
  onTabChange(e) { this.setData({ currentTab: e.currentTarget.dataset.index }) },
  onReadAll() {
    const chats = this.data.chatMessages.map(m => ({ ...m, unreadCount: 0 }))
    const sys = this.data.systemMessages.map(m => ({ ...m, unread: false }))
    this.setData({ chatMessages: chats, systemMessages: sys, chatUnreadCount: 0, systemUnreadCount: 0 })
    wx.showToast({ title: '已全部已读', icon: 'success' })
  },
  onTapMsg(e) {
    const item = e.currentTarget.dataset.item
    if (item.link) {
      wx.navigateTo({ url: item.link })
    } else {
      wx.showToast({ title: '消息详情', icon: 'none' })
    }
  },
  onTapChat() { wx.navigateTo({ url: '/pages/chat/chat' }) },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const userRole = getApp().globalData.userRole || wx.getStorageSync('userRole') || 'enterprise'
      this.getTabBar().setData({ selected: userRole === 'enterprise' ? 3 : 2, userRole })
    }
  }
})
